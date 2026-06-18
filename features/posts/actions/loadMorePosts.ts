'use server'

import { getFeed } from '@/lib/api/posts'
import type { FeedPost } from '@/lib/api/posts'

/**
 * Server Action: loads the next page of feed posts using cursor pagination.
 * Designed for the "Load more" button in PostFeed.
 *
 * @param cursor - Cursor string in format "{createdAt}_{id}" or empty string for first page
 * @returns Object with posts array and nextCursor (null if no more pages)
 *
 * @example
 * const { posts, nextCursor } = await loadMorePosts("2024-01-01T00:00:00.000Z_clx123")
 */
export async function loadMorePosts(
  cursor: string,
): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  return getFeed(cursor || undefined)
}
