/**
 * Daily tip builder.
 * Selects the single highest-priority improvement recommendation across all scored posts.
 * Returns an i18n key  no hardcoded strings.
 */

import type { DailyTip, PostAnalytics } from '../types'

/**
 * Builds the daily tip from the scored post list.
 * Priority: highest-priority issue across all posts.
 * When priorities tie, prefer the post with the lowest content score.
 * The seed parameter allows deterministic selection for the same day
 * (pass Math.floor(Date.now() / 86400000) from the caller).
 *
 * @param posts     - All analytics posts for the current user
 * @param daySeed   - Integer day seed for tie-breaking (pass from server, not Date.now() inline)
 * @returns DailyTip with i18n key, params, related postId, and priority bucket
 *
 * @example
 * const tip = buildDailyTip(posts, 20000)
 */
export function buildDailyTip(
  posts: Array<Pick<PostAnalytics, 'postId' | 'contentScore'>>,
  daySeed: number,
): DailyTip {
  if (posts.length === 0) {
    return {
      key: 'no_posts',
      priority: 'low',
    }
  }

  // Flatten all issues across all posts, carrying postId
  const candidates: Array<{
    key: string
    priority: number
    params?: Record<string, string | number>
    postId: string
    score: number
  }> = []

  for (const post of posts) {
    for (const issue of post.contentScore.issues) {
      candidates.push({
        key: issue.key,
        priority: issue.priority,
        params: issue.params,
        postId: post.postId,
        score: post.contentScore.score,
      })
    }
  }

  if (candidates.length === 0) {
    return {
      key: 'all_good',
      priority: 'low',
    }
  }

  // Sort: highest priority first, then lowest score (worst post), then deterministic by seed
  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    if (a.score !== b.score) return a.score - b.score
    // Tie-break deterministically using day seed + key hash
    return (a.key.charCodeAt(0) + daySeed) % 2 === 0 ? -1 : 1
  })

  const best = candidates[0]
  const priority: DailyTip['priority'] =
    best.priority >= 8 ? 'high' : best.priority >= 5 ? 'medium' : 'low'

  return {
    key: best.key,
    params: best.params,
    postId: best.postId,
    priority,
  }
}
