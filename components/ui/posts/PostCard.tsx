'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { MediaCarousel } from './MediaCarousel'
import { toggleLike, deletePost } from '@/features/posts'
import type { FeedPost } from '@/lib/api/posts'
import { UserRole } from '@/types/auth'

interface PostCardProps {
  post: FeedPost
  currentUserId: string | null
  currentUserRole: UserRole | null
}

/**
 * Displays a single post with author info, media carousel, content, like button,
 * and edit/delete controls for the author or ADMIN.
 *
 * @param post            - The post data including author, media, and like info
 * @param currentUserId   - The logged-in user's ID (null if guest)
 * @param currentUserRole - The logged-in user's role (null if guest)
 *
 * @example
 * <PostCard post={post} currentUserId={session.user.id} currentUserRole={session.user.role} />
 */
export function PostCard({ post, currentUserId, currentUserRole }: PostCardProps) {
  const { t } = useTranslation()
  const [isPending, startTransition] = useTransition()

  const canEdit = currentUserId === post.author.id
  const canDelete = currentUserId === post.author.id || currentUserRole === UserRole.ADMIN

  function handleLike() {
    if (!currentUserId) return
    startTransition(() => toggleLike(post.id))
  }

  function handleDelete() {
    if (!confirm(t('posts.delete_confirm'))) return
    startTransition(() => deletePost(post.id))
  }

  return (
    <Card className="overflow-hidden">
      {/* Author header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <Link
          href={post.author.username ? `/profile/${post.author.username}` : '#'}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {post.author.image ? (
            <Image
              src={post.author.image}
              alt={post.author.name ?? post.author.username ?? 'User'}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs"
              style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
            >
              {(post.author.name ?? post.author.username ?? '?')[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-mono text-xs font-bold" style={{ color: 'var(--color-primary)' }}>
              {post.author.username ?? post.author.name}
            </p>
            <p className="font-mono text-[10px]" style={{ color: 'var(--color-outline)' }}>
              {new Date(post.createdAt).toLocaleDateString()}
            </p>
          </div>
        </Link>

        {(canEdit || canDelete) && (
          <div className="flex items-center gap-2">
            {canEdit && (
              <Link
                href={`/dashboard/posts/${post.id}/edit`}
                className="font-mono text-[10px] uppercase tracking-[0.08em] hover:opacity-80 transition-opacity"
                style={{ color: 'var(--color-outline)' }}
              >
                {t('posts.edit')}
              </Link>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="font-mono text-[10px] uppercase tracking-[0.08em] hover:opacity-80 transition-opacity disabled:opacity-40"
                style={{ color: '#ffb4ab' }}
              >
                {t('posts.delete')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Media carousel */}
      {post.media.length > 0 && <MediaCarousel items={post.media} />}

      {/* Content */}
      {post.content && (
        <p
          className="px-4 pt-3 text-sm font-sans leading-relaxed whitespace-pre-wrap"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          {post.content}
        </p>
      )}

      {/* Like button */}
      <div className="px-4 py-3">
        <button
          onClick={handleLike}
          disabled={!currentUserId || isPending}
          className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.08em] hover:opacity-80 transition-opacity disabled:opacity-40"
          style={{ color: post.likedByMe ? 'var(--color-primary)' : 'var(--color-outline)' }}
          aria-label={post.likedByMe ? t('posts.unlike') : t('posts.like')}
        >
          <span>{post.likedByMe ? '♥' : '♡'}</span>
          <span>{post.likeCount}</span>
        </button>
      </div>
    </Card>
  )
}
