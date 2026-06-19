'use client'

import { useEffect, useState, useTransition } from 'react'
import { useTranslation } from 'react-i18next'
import { PostCard } from './PostCard'
import { loadMorePosts } from '@/features/posts'
import type { FeedPost } from '@/lib/api/posts'
import { UserRole } from '@/types/auth'

interface PostFeedProps {
  initialPosts: FeedPost[]
  initialNextCursor: string | null
  currentUserId: string | null
  currentUserRole: UserRole | null
}

/**
 * Paginated feed of PostCards with a "Load more" button for cursor-based pagination.
 * Initialised with server-rendered posts; subsequent pages are fetched client-side
 * via the loadMorePosts server action.
 *
 * @param initialPosts       - First page of posts from the server
 * @param initialNextCursor  - Cursor for the next page, or null if none
 * @param currentUserId      - Logged-in user's ID (null for guests)
 * @param currentUserRole    - Logged-in user's role (null for guests)
 *
 * @example
 * <PostFeed initialPosts={posts} initialNextCursor={nextCursor} currentUserId={userId} currentUserRole={role} />
 */
export function PostFeed({
  initialPosts,
  initialNextCursor,
  currentUserId,
  currentUserRole,
}: PostFeedProps) {
  const { t } = useTranslation()
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts)
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor)
  const [isPending, startTransition] = useTransition()

  // Sync local state when the server refreshes the feed (e.g. after a new post).
  // router.refresh() re-renders the server component, which passes new initialPosts here.
  useEffect(() => {
    setPosts(initialPosts)
    setNextCursor(initialNextCursor)
  }, [initialPosts, initialNextCursor])

  function handleLoadMore() {
    if (!nextCursor) return
    startTransition(async () => {
      const result = await loadMorePosts(nextCursor)
      setPosts((prev) => [...prev, ...result.posts])
      setNextCursor(result.nextCursor)
    })
  }

  if (posts.length === 0) {
    return (
      <p
        className="text-center font-mono text-sm py-12"
        style={{ color: 'var(--color-outline)' }}
      >
        {t('posts.feed.empty')}
      </p>
    )
  }

  return (
    <div className="columns-1 md:columns-2 xl:columns-3 gap-4">
      {posts.map((post) => (
        <div key={post.id} className="break-inside-avoid mb-4">
          <PostCard
            post={post}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        </div>
      ))}

      {nextCursor && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleLoadMore}
            disabled={isPending}
            className="px-6 py-2.5 rounded-sm font-mono text-xs tracking-[0.08em] uppercase border transition-opacity disabled:opacity-50 hover:opacity-80"
            style={{
              borderColor: 'rgba(255,255,255,0.2)',
              color: 'var(--color-on-surface-variant)',
            }}
          >
            {isPending ? t('posts.feed.loading') : t('posts.feed.load_more')}
          </button>
        </div>
      )}
    </div>
  )
}
