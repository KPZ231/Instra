/**
 * Heuristic rule definitions for content scoring and daily-tip generation.
 * Add new rules here  the engine in contentScore.ts and dailyTip.ts will pick them up.
 * Open/Closed: extend by adding entries; never modify the engine code.
 */

import type { ContentIssue } from '../types'

/** Shape of a content scoring rule. */
export interface ScoringRule {
  /** Unique key matching analytics.issues.<key> in i18n */
  key: string
  /** Max points this rule can deduct (1–20) */
  penalty: number
  /** Priority for daily-tip selection (1–10) */
  priority: number
  /** Returns true when the issue is present */
  check: (post: ScoringInput) => boolean
  /** Optional i18n interpolation params */
  params?: (post: ScoringInput) => Record<string, string | number>
}

/** Minimal post data required for content scoring. */
export interface ScoringInput {
  content: string | null
  platforms: string[]
  mediaCount: number
  likeCount: number
  publishHour: number | null
  /** Days since creation */
  ageDays: number
}

/** All scoring rules, checked in order. */
export const SCORING_RULES: ScoringRule[] = [
  {
    key: 'no_content',
    penalty: 20,
    priority: 10,
    check: (p) => !p.content || p.content.trim().length === 0,
  },
  {
    key: 'content_too_short',
    penalty: 15,
    priority: 9,
    check: (p) =>
      !!p.content && p.content.trim().length > 0 && p.content.trim().length < 30,
    params: (p) => ({ length: p.content?.trim().length ?? 0 }),
  },
  {
    key: 'content_too_long',
    penalty: 10,
    priority: 5,
    check: (p) => !!p.content && p.content.trim().length > 2200,
    params: (p) => ({ length: p.content?.trim().length ?? 0 }),
  },
  {
    key: 'no_media',
    penalty: 15,
    priority: 8,
    check: (p) => p.mediaCount === 0,
  },
  {
    key: 'no_hashtags',
    penalty: 10,
    priority: 7,
    check: (p) => !p.content || !p.content.includes('#'),
  },
  {
    key: 'too_many_hashtags',
    penalty: 8,
    priority: 4,
    check: (p) => {
      const count = (p.content?.match(/#\w+/g) ?? []).length
      return count > 30
    },
    params: (p) => ({ count: (p.content?.match(/#\w+/g) ?? []).length }),
  },
  {
    key: 'no_platforms',
    penalty: 20,
    priority: 10,
    check: (p) => p.platforms.length === 0,
  },
  {
    key: 'single_platform',
    penalty: 5,
    priority: 3,
    check: (p) => p.platforms.length === 1,
  },
  {
    key: 'poor_timing',
    penalty: 8,
    priority: 6,
    check: (p) =>
      p.publishHour !== null &&
      (p.publishHour < 7 || p.publishHour > 22),
    params: (p) => ({ hour: p.publishHour ?? 0 }),
  },
  {
    key: 'no_cta',
    penalty: 10,
    priority: 6,
    check: (p) => {
      if (!p.content) return true
      const lower = p.content.toLowerCase()
      const ctaPatterns = [
        'click', 'link', 'bio', 'swipe', 'learn more', 'check out',
        'visit', 'shop', 'buy', 'comment', 'share', 'tag', 'follow',
        'sign up', 'subscribe', 'join', 'read', 'dm', 'message',
        'kliknij', 'sprawdź', 'odwiedź', 'kup', 'skomentuj',
        'udostępnij', 'śledź', 'zapisz', 'dołącz',
      ]
      return !ctaPatterns.some((cta) => lower.includes(cta))
    },
  },
]

/**
 * Evaluates all scoring rules against a post and returns triggered issues.
 *
 * @param post - Scored post data
 * @returns Array of triggered ContentIssue, ordered by priority descending
 *
 * @example
 * const issues = evaluateRules({ content: null, platforms: [], mediaCount: 0, likeCount: 0, publishHour: 3, ageDays: 1 })
 */
export function evaluateRules(post: ScoringInput): ContentIssue[] {
  return SCORING_RULES
    .filter((rule) => rule.check(post))
    .map((rule) => ({
      key: rule.key,
      priority: rule.priority,
      params: rule.params?.(post),
    }))
    .sort((a, b) => b.priority - a.priority)
}
