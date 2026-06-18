'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Textarea } from '@/components/ui/Textarea'
import { MediaUploadPreview } from './MediaUploadPreview'
import { PlatformSelector, type PlatformId } from './PlatformSelector'
import { createPost, updatePost } from '@/features/posts'
import { MAX_POST_LENGTH, MAX_POST_MEDIA } from '@/features/posts/validation'
import type { FeedPost } from '@/lib/api/posts'
import type { PostActionState } from '@/features/posts/types'

/** Props for the PostComposer component */
interface PostComposerProps {
  /** "inline" collapses on the feed until focused; "full" is always expanded (dedicated page) */
  mode: 'inline' | 'full'
  /** When provided, the composer switches to edit mode and pre-fills content/media */
  existingPost?: FeedPost
}

const INITIAL_STATE: PostActionState = {}

/**
 * Create/edit form for posts. In "inline" mode the composer starts collapsed and
 * expands when the user focuses it. In "full" mode it is always fully visible,
 * used on `/dashboard/posts/new` and edit pages.
 *
 * File uploads are handled by collecting files in React state, syncing them into
 * a hidden `<input type="file" name="media" multiple>` via the DataTransfer API
 * so that the Server Action receives real File objects through FormData.
 *
 * @param mode         - "inline" (collapsible, on feed) or "full" (dedicated page)
 * @param existingPost - When provided, switches to edit mode (prefills content/media)
 *
 * @example
 * // Create mode on feed
 * <PostComposer mode="inline" />
 *
 * // Edit mode on dedicated page
 * <PostComposer mode="full" existingPost={post} />
 */
export function PostComposer({ mode, existingPost }: PostComposerProps) {
  const router = useRouter()
  const { t } = useTranslation()

  const [expanded, setExpanded] = useState(mode === 'full')
  const [content, setContent] = useState(existingPost?.content ?? '')
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [platforms, setPlatforms] = useState<PlatformId[]>(
    (existingPost?.platforms ?? []) as PlatformId[],
  )
  const [keepMediaIds, setKeepMediaIds] = useState<string[]>(
    existingPost?.media.map((m) => m.id) ?? [],
  )

  /** Ref to the hidden file input whose FileList is synced via DataTransfer */
  const hiddenFileInputRef = useRef<HTMLInputElement>(null)
  /** Ref to the visible trigger input (styled, not submitted) */
  const triggerInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const action = existingPost ? updatePost : createPost
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE)

  // Sync newFiles into the hidden <input type="file"> via DataTransfer so
  // the Server Action receives them as real File entries in FormData.
  useEffect(() => {
    const input = hiddenFileInputRef.current
    if (!input) return

    if (typeof DataTransfer === 'undefined') return

    const dt = new DataTransfer()
    newFiles.forEach((file) => dt.items.add(file))
    input.files = dt.files
  }, [newFiles])

  // Reset form and refresh server data after a successful submission.
  useEffect(() => {
    if (state.success) {
      setContent('')
      setNewFiles([])
      setPlatforms([])
      setKeepMediaIds(existingPost?.media.map((m) => m.id) ?? [])
      if (mode === 'inline') {
        setExpanded(false)
      }
      // Trigger a server re-render so PostFeed receives the new post immediately.
      router.refresh()
    }
  }, [state.success, existingPost, mode, router])

  /** Handles file selection from the trigger input and merges into state */
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length === 0) return

    const currentTotal = keepMediaIds.length + newFiles.length
    const remaining = MAX_POST_MEDIA - currentTotal
    const toAdd = selected.slice(0, remaining)

    setNewFiles((prev) => [...prev, ...toAdd])

    // Reset the trigger input so the same file can be re-selected
    if (triggerInputRef.current) {
      triggerInputRef.current.value = ''
    }
  }

  /** Removes a new (not-yet-uploaded) file by index */
  function removeNewFile(index: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index))
  }

  /** Removes an existing media item from the keep list (marks it for deletion) */
  function removeExistingMedia(id: string) {
    setKeepMediaIds((prev) => prev.filter((mid) => mid !== id))
  }

  /** Collapses the composer and resets its transient state */
  function handleCancel() {
    setExpanded(false)
    setContent('')
    setNewFiles([])
    setKeepMediaIds(existingPost?.media.map((m) => m.id) ?? [])
  }

  const existingMediaToShow = existingPost?.media.filter((m) => keepMediaIds.includes(m.id)) ?? []
  const charCount = content.length
  const totalMedia = keepMediaIds.length + newFiles.length
  const canAddMore = totalMedia < MAX_POST_MEDIA

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      {/* Edit mode: pass postId */}
      {existingPost && <input type="hidden" name="postId" value={existingPost.id} />}

      {/* Pass kept existing media IDs so the server action knows which to preserve */}
      {keepMediaIds.map((id) => (
        <input key={id} type="hidden" name="keepMediaIds" value={id} />
      ))}

      {/* mediaCount drives Zod validation (must equal files submitted + kept) */}
      <input type="hidden" name="mediaCount" value={totalMedia} />

      {/* Selected platforms submitted as repeated hidden inputs */}
      {platforms.map((p) => (
        <input key={p} type="hidden" name="platforms" value={p} />
      ))}

      {/* Hidden file input that actually submits files to the Server Action */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        name="media"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        readOnly
      />

      {/* ── Collapsed state (inline mode only) ── */}
      {mode === 'inline' && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full text-left px-4 py-3 rounded-sm border font-mono text-sm transition-opacity hover:opacity-80"
          style={{
            background: 'var(--color-surface-container-lowest)',
            borderColor: 'rgba(255,255,255,0.1)',
            color: 'var(--color-outline)',
          }}
        >
          {t('posts.composer.placeholder')}
        </button>
      )}

      {/* ── Expanded state ── */}
      {expanded && (
        <>
          <Textarea
            name="content"
            rows={mode === 'inline' ? 3 : 5}
            maxLength={MAX_POST_LENGTH}
            placeholder={t('posts.composer.placeholder')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            error={state.errors?.content?.[0]}
            autoFocus={mode === 'inline'}
          />

          {/* Character counter — only shown when content is non-empty */}
          {charCount > 0 && (
            <p
              className="font-mono text-[10px] text-right"
              style={{
                color:
                  charCount > MAX_POST_LENGTH * 0.9 ? '#ffb4ab' : 'var(--color-outline)',
              }}
              aria-live="polite"
              aria-label={t('posts.composer.char_counter_label', {
                current: charCount,
                max: MAX_POST_LENGTH,
              })}
            >
              {charCount}/{MAX_POST_LENGTH}
            </p>
          )}

          {/* Existing media thumbnails (edit mode only) */}
          {existingMediaToShow.length > 0 && (
            <div className="grid grid-cols-3 gap-2" role="list" aria-label="Existing media">
              {existingMediaToShow.map((m) => (
                <div
                  key={m.id}
                  className="relative aspect-square rounded-sm overflow-hidden"
                  role="listitem"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.url}
                    alt={t('posts.composer.existing_media_alt', { n: m.order + 1 })}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingMedia(m.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold hover:bg-black/90 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                    style={{ background: 'rgba(0,0,0,0.7)', color: 'white' }}
                    aria-label={t('posts.composer.remove_media_label', { n: m.order + 1 })}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New file previews */}
          <MediaUploadPreview files={newFiles} onRemove={removeNewFile} />

          {/* Media error */}
          {state.errors?.media?.[0] && (
            <p className="font-mono text-xs" style={{ color: '#ffb4ab' }} role="alert">
              {state.errors.media[0]}
            </p>
          )}

          {/* Form-level error */}
          {state.errors?._form?.[0] && (
            <p
              className="font-mono text-xs px-3 py-2 rounded-sm border"
              style={{
                color: '#ffb4ab',
                borderColor: 'rgba(255,75,75,0.3)',
                background: 'rgba(255,75,75,0.05)',
              }}
              role="alert"
            >
              {state.errors._form[0]}
            </p>
          )}

          {/* Success message */}
          {state.success && (
            <p className="font-mono text-xs" style={{ color: '#a8d5a2' }} role="status">
              {t('posts.composer.success')}
            </p>
          )}

          {/* Platform selector */}
          <div className="space-y-1">
            <p
              className="font-mono text-[10px] uppercase tracking-[0.08em]"
              style={{ color: 'var(--color-outline)' }}
            >
              {t('posts.composer.platforms_label')}
            </p>
            <PlatformSelector selected={platforms} onChange={setPlatforms} />
          </div>

          {/* Footer: add photo + action buttons */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Visible trigger input for file selection */}
              {canAddMore && (
                <>
                  <input
                    ref={triggerInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                    id="post-composer-media-trigger"
                  />
                  <label
                    htmlFor="post-composer-media-trigger"
                    className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--color-outline)' }}
                  >
                    <span aria-hidden="true">+</span>
                    {t('posts.composer.add_photo')}
                  </label>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Cancel button — inline mode only */}
              {mode === 'inline' && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="font-mono text-[11px] uppercase tracking-[0.08em] hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--color-outline)' }}
                >
                  {t('posts.composer.cancel')}
                </button>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 rounded-sm font-mono text-xs tracking-[0.08em] uppercase transition-opacity disabled:opacity-50"
                style={{
                  background: 'var(--color-primary)',
                  color: 'var(--color-on-primary)',
                }}
              >
                {isPending
                  ? t('posts.composer.publishing')
                  : existingPost
                    ? t('posts.composer.save')
                    : t('posts.composer.publish')}
              </button>
            </div>
          </div>
        </>
      )}
    </form>
  )
}
