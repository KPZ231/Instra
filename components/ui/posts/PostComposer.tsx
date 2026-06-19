'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Textarea } from '@/components/ui/Textarea'
import { MediaUploadPreview } from './MediaUploadPreview'
import { PlatformSelector, type PlatformId, PLATFORMS } from './PlatformSelector'
import {
  PlatformFields,
  PlatformHint,
  PlatformIcon,
  PLATFORM_CHAR_LIMITS,
  type AllPlatformData,
} from './PlatformFields'
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
 * Create/edit form for posts. Adapts dynamically based on the selected platform(s):
 * - Zero/no platform: generic composer
 * - One platform: immersive single-platform view with that platform's char limit and
 *   specific extra fields (hashtags, alt-text, thread mode, video title, etc.)
 * - Multiple platforms: unified content area with limit warning + tabbed per-platform extras
 *
 * @param mode         - "inline" (collapsible, on feed) or "full" (dedicated page)
 * @param existingPost - When provided, switches to edit mode (prefills content/media)
 *
 * @example
 * <PostComposer mode="inline" />
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
  const [platformData, setPlatformData] = useState<AllPlatformData>({})

  const hiddenFileInputRef = useRef<HTMLInputElement>(null)
  const triggerInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const action = existingPost ? updatePost : createPost
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE)

  // Sync newFiles into hidden file input via DataTransfer
  useEffect(() => {
    const input = hiddenFileInputRef.current
    if (!input || typeof DataTransfer === 'undefined') return
    const dt = new DataTransfer()
    newFiles.forEach((file) => dt.items.add(file))
    input.files = dt.files
  }, [newFiles])

  // Reset after successful submission
  useEffect(() => {
    if (state.success) {
      setContent('')
      setNewFiles([])
      setPlatforms([])
      setPlatformData({})
      setKeepMediaIds(existingPost?.media.map((m) => m.id) ?? [])
      if (mode === 'inline') setExpanded(false)
      router.refresh()
    }
  }, [state.success, existingPost, mode, router])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length === 0) return
    const remaining = MAX_POST_MEDIA - (keepMediaIds.length + newFiles.length)
    setNewFiles((prev) => [...prev, ...selected.slice(0, remaining)])
    if (triggerInputRef.current) triggerInputRef.current.value = ''
  }

  function removeNewFile(index: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function removeExistingMedia(id: string) {
    setKeepMediaIds((prev) => prev.filter((mid) => mid !== id))
  }

  function handleCancel() {
    setExpanded(false)
    setContent('')
    setNewFiles([])
    setKeepMediaIds(existingPost?.media.map((m) => m.id) ?? [])
  }

  /** Updates a single platform's extra field data */
  function handlePlatformData(id: PlatformId, patch: Partial<AllPlatformData[PlatformId]>) {
    setPlatformData((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...patch } }))
  }

  // ── Derived state ────────────────────────────────────────────────────────────
  const existingMediaToShow = existingPost?.media.filter((m) => keepMediaIds.includes(m.id)) ?? []
  const totalMedia = keepMediaIds.length + newFiles.length
  const canAddMore = totalMedia < MAX_POST_MEDIA
  const charCount = content.length

  const isSinglePlatform = platforms.length === 1
  const isMultiPlatform = platforms.length > 1
  const activeSinglePlatform = isSinglePlatform ? platforms[0] : null

  // Character limit: platform limit in single mode, default in multi/generic mode
  const effectiveCharLimit = activeSinglePlatform
    ? PLATFORM_CHAR_LIMITS[activeSinglePlatform]
    : MAX_POST_LENGTH

  // Most restrictive limit across selected platforms (for multi-platform warning)
  const mostRestrictiveLimit = isMultiPlatform
    ? Math.min(...platforms.map((p) => PLATFORM_CHAR_LIMITS[p]))
    : null
  const mostRestrictivePlatform = isMultiPlatform
    ? platforms.find((p) => PLATFORM_CHAR_LIMITS[p] === mostRestrictiveLimit) ?? null
    : null

  const activeColor = activeSinglePlatform
    ? PLATFORMS.find((p) => p.id === activeSinglePlatform)?.color
    : undefined

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      {/* Hidden inputs for server action */}
      {existingPost && <input type="hidden" name="postId" value={existingPost.id} />}
      {keepMediaIds.map((id) => (
        <input key={id} type="hidden" name="keepMediaIds" value={id} />
      ))}
      <input type="hidden" name="mediaCount" value={totalMedia} />
      {platforms.map((p) => (
        <input key={p} type="hidden" name="platforms" value={p} />
      ))}
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
          {/* ── Platform selector ── */}
          <div className="space-y-1">
            <p
              className="font-mono text-[10px] uppercase tracking-[0.08em]"
              style={{ color: 'var(--color-outline)' }}
            >
              {t('posts.composer.platforms_label')}
            </p>
            <PlatformSelector selected={platforms} onChange={setPlatforms} />
          </div>

          {/* ── Single-platform header ── */}
          {isSinglePlatform && activeSinglePlatform && (
            <SinglePlatformHeader platformId={activeSinglePlatform} color={activeColor!} t={t} />
          )}

          {/* ── Multi-platform limit warning ── */}
          {isMultiPlatform && mostRestrictiveLimit !== null && charCount > mostRestrictiveLimit && (
            <div
              className="flex items-start gap-2 px-3 py-2 rounded-sm border font-mono text-[10px]"
              style={{
                borderColor: 'rgba(255,180,0,0.3)',
                background: 'rgba(255,180,0,0.05)',
                color: '#ffcf77',
              }}
              role="alert"
            >
              <span aria-hidden="true">⚠</span>
              <span>
                {t('posts.composer.limit_exceeded_warning', {
                  platform: PLATFORMS.find((p) => p.id === mostRestrictivePlatform)?.label,
                  limit: mostRestrictiveLimit,
                })}
              </span>
            </div>
          )}

          {/* ── Multi-platform soft warning (approaching limit) ── */}
          {isMultiPlatform && mostRestrictiveLimit !== null && charCount <= mostRestrictiveLimit && charCount > 0 && (
            <p
              className="font-mono text-[10px]"
              style={{ color: 'var(--color-outline)' }}
            >
              {t('posts.composer.multi_platform_limit_note', {
                platform: PLATFORMS.find((p) => p.id === mostRestrictivePlatform)?.label,
                limit: mostRestrictiveLimit,
              })}
            </p>
          )}

          {/* ── Content textarea ── */}
          <div className="relative">
            <Textarea
              name="content"
              rows={mode === 'inline' ? 3 : isSinglePlatform ? 6 : 5}
              maxLength={effectiveCharLimit}
              placeholder={
                activeSinglePlatform
                  ? t(`posts.composer.placeholder_${activeSinglePlatform}`, {
                      defaultValue: t('posts.composer.placeholder'),
                    })
                  : t('posts.composer.placeholder')
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              error={state.errors?.content?.[0]}
              autoFocus={mode === 'inline'}
              style={
                activeSinglePlatform
                  ? {
                      borderColor: charCount > effectiveCharLimit * 0.9
                        ? 'rgba(255,75,75,0.5)'
                        : `${activeColor}30`,
                      transition: 'border-color 200ms',
                    }
                  : undefined
              }
            />
          </div>

          {/* Character counter */}
          {charCount > 0 && (
            <p
              className="font-mono text-[10px] text-right"
              style={{
                color:
                  charCount > effectiveCharLimit
                    ? '#ffb4ab'
                    : charCount > effectiveCharLimit * 0.9
                      ? '#ffcf77'
                      : 'var(--color-outline)',
              }}
              aria-live="polite"
              aria-label={t('posts.composer.char_counter_label', {
                current: charCount,
                max: effectiveCharLimit,
              })}
            >
              {charCount}/{effectiveCharLimit}
            </p>
          )}

          {/* Platform hint (single mode) */}
          {isSinglePlatform && activeSinglePlatform && (
            <PlatformHint platformId={activeSinglePlatform} />
          )}

          {/* ── Platform-specific extra fields ── */}
          {platforms.length > 0 && (
            <div
              className="rounded-sm border p-3 space-y-3"
              style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
            >
              <p
                className="font-mono text-[10px] uppercase tracking-[0.08em]"
                style={{ color: 'var(--color-outline)' }}
              >
                {isSinglePlatform
                  ? t('posts.composer.platform_fields.section_label_single')
                  : t('posts.composer.platform_fields.section_label_multi')}
              </p>
              <PlatformFields
                platforms={platforms}
                data={platformData}
                onChange={handlePlatformData}
                mode={isSinglePlatform ? 'single' : 'multi'}
              />
            </div>
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

          {/* Errors */}
          {state.errors?.media?.[0] && (
            <p className="font-mono text-xs" style={{ color: '#ffb4ab' }} role="alert">
              {state.errors.media[0]}
            </p>
          )}
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
          {state.success && (
            <p className="font-mono text-xs" style={{ color: '#a8d5a2' }} role="status">
              {t('posts.composer.success')}
            </p>
          )}

          {/* ── Footer: media + actions ── */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
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
                className="px-5 py-2 rounded-sm font-mono text-xs tracking-[0.08em] uppercase transition-all duration-150 disabled:opacity-50"
                style={
                  activeSinglePlatform && activeColor
                    ? {
                        background: activeColor,
                        color: '#000',
                        boxShadow: `0 0 0 0 ${activeColor}`,
                      }
                    : {
                        background: 'var(--color-primary)',
                        color: 'var(--color-on-primary)',
                      }
                }
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

// ── Internal subcomponents ────────────────────────────────────────────────────

interface SinglePlatformHeaderProps {
  platformId: PlatformId
  color: string
  t: (key: string, opts?: Record<string, unknown>) => string
}

/** Decorative platform identity strip shown in single-platform mode */
function SinglePlatformHeader({ platformId, color, t }: SinglePlatformHeaderProps) {
  const meta = PLATFORMS.find((p) => p.id === platformId)!
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 rounded-sm border"
      style={{
        borderColor: `${color}25`,
        background: `${color}08`,
      }}
    >
      <span style={{ color }} aria-hidden="true">
        <PlatformIcon id={platformId} size={14} />
      </span>
      <span
        className="font-mono text-[10px] uppercase tracking-[0.1em]"
        style={{ color }}
      >
        {t('posts.composer.composing_for', { platform: meta.label })}
      </span>
    </div>
  )
}
