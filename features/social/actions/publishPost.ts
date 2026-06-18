'use server'

import { verifySession } from '@/lib/auth/dal'
import { rateLimit, RateLimitError } from '@/lib/rate-limit'
import { publishPost as publishPostToSocial } from '@/lib/social/publisher'
import type { PublishResult } from '@/lib/social/types'

/**
 * Server Action: publishes an existing Instra post to connected social platforms.
 * Enforces rate limit (10/h per user).
 *
 * @param postId - The Instra post ID to publish
 * @returns Object with results array or error string
 *
 * @example
 * const { results, error } = await publishPost(post.id)
 */
export async function publishPost(
  postId: string,
): Promise<{ results?: PublishResult[]; error?: string }> {
  const { user } = await verifySession()

  try {
    await rateLimit('publishPost', (ip) => `${ip}:${user.id}`)
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { error: error.message }
    }
    throw error
  }

  try {
    const results = await publishPostToSocial(postId, user.id)
    return { results }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to publish post'
    return { error: message }
  }
}
