import 'server-only'

import { prisma } from '@/lib/prisma'
import { getOrSet } from '@/lib/cache'
import { auth } from '@/lib/auth/config'
import {
  aggregateSnapshots,
  buildSeries,
  predictEngagement,
  scoreContent,
  buildDailyTip,
  formatMetricValue,
} from '@/features/analytics'
import type {
  PostAnalytics,
  AnalyticsOverviewData,
  EngagementMetrics,
  AggregatedMetrics,
} from '@/features/analytics'

// ─── Private helpers ─────────────────────────────────────────────────────────

async function getAuthenticatedUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthenticated')
  return session.user.id
}

type RawSnapshot = {
  impressions: number
  reach: number
  views: number
  clicks: number
  shares: number
  comments: number
  capturedAt: Date
}

/**
 * Converts a raw Prisma snapshot into the shape expected by buildSeries.
 * likes is 0 here  it's added by the caller from _count.likes.
 */
function toSeriesEntry(snap: RawSnapshot): EngagementMetrics & { capturedAt: Date } {
  return {
    impressions: snap.impressions,
    reach:       snap.reach,
    views:       snap.views,
    clicks:      snap.clicks,
    shares:      snap.shares,
    comments:    snap.comments,
    likes:       0,
    capturedAt:  snap.capturedAt,
  }
}

/** Returns day seed: integer days since Unix epoch, for daily-tip determinism. */
function getDaySeed(): number {
  return Math.floor(Date.now() / 86_400_000)
}

// ─── Shared post-to-analytics mapping ────────────────────────────────────────

type PrismaPost = {
  id: string
  content: string | null
  platforms: string[]
  createdAt: Date
  authorId: string
  _count: { likes: number }
  metricSnapshots: RawSnapshot[]
  media: { id: string }[]
}

function mapPostToAnalytics(post: PrismaPost): PostAnalytics {
  const likeCount = post._count.likes
  const seriesEntries = post.metricSnapshots.map(toSeriesEntry)
  const metricsOnly: EngagementMetrics[] = seriesEntries.map((s) => ({
    impressions: s.impressions,
    reach:       s.reach,
    views:       s.views,
    clicks:      s.clicks,
    shares:      s.shares,
    comments:    s.comments,
    likes:       likeCount,
  }))
  const lastCapturedAt =
    seriesEntries.length > 0
      ? seriesEntries[seriesEntries.length - 1].capturedAt.toISOString()
      : null

  const metrics    = aggregateSnapshots(metricsOnly, likeCount, lastCapturedAt)
  const series     = buildSeries(seriesEntries.map((s) => ({ ...s, likes: likeCount })), likeCount)
  const prediction = predictEngagement(series, likeCount > 0 ? Math.min(100, likeCount * 2) : 10)
  const ageDays    = Math.max(0, (Date.now() - post.createdAt.getTime()) / 86_400_000)
  const contentScore = scoreContent({
    content:     post.content,
    platforms:   post.platforms,
    mediaCount:  post.media.length,
    likeCount,
    publishHour: post.createdAt.getHours(),
    ageDays,
  })

  return {
    postId:    post.id,
    content:   post.content,
    platforms: post.platforms,
    createdAt: post.createdAt.toISOString(),
    likeCount,
    metrics,
    series,
    prediction,
    contentScore,
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetches full analytics overview for the current user's posts.
 * Includes totals, per-post analytics, daily chart series, prediction, and daily tip.
 * Results are cached in Redis (db namespace, 300 s TTL).
 *
 * @returns AnalyticsOverviewData or null if not authenticated
 *
 * @example
 * const overview = await getPostsAnalyticsOverview()
 */
/**
 * Fetches full analytics overview for a given userId.
 * Shared by the web session flow and the MCP route (where no NextAuth session exists).
 *
 * @param userId - The user's ID
 * @returns AnalyticsOverviewData
 *
 * @example
 * const overview = await getPostsAnalyticsOverviewByUser(user.id)
 */
export async function getPostsAnalyticsOverviewByUser(userId: string): Promise<AnalyticsOverviewData> {
  return getOrSet(
    'db',
    async () => {
      const posts = await prisma.post.findMany({
        where:   { authorId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          _count:          { select: { likes: true } },
          metricSnapshots: { where: { platform: null }, orderBy: { capturedAt: 'asc' } },
          media:           { select: { id: true }, take: 1 },
        },
      })

      const daySeed       = getDaySeed()
      const postAnalytics = posts.map(mapPostToAnalytics)

      // Global totals
      const totals = postAnalytics.reduce<AggregatedMetrics>(
        (acc, p) => ({
          impressions:    acc.impressions    + p.metrics.impressions,
          reach:          acc.reach          + p.metrics.reach,
          views:          acc.views          + p.metrics.views,
          clicks:         acc.clicks         + p.metrics.clicks,
          shares:         acc.shares         + p.metrics.shares,
          comments:       acc.comments       + p.metrics.comments,
          likes:          acc.likes          + p.metrics.likes,
          engagementRate: 0,
          lastCapturedAt: null,
        }),
        {
          impressions: 0, reach: 0, views: 0, clicks: 0,
          shares: 0, comments: 0, likes: 0, engagementRate: 0, lastCapturedAt: null,
        },
      )
      totals.engagementRate =
        (totals.likes + totals.comments + totals.shares + totals.clicks) /
        Math.max(totals.impressions, 1)

      // Merge daily series across all posts (average by date)
      const seriesMap = new Map<string, { sum: number; count: number }>()
      for (const p of postAnalytics) {
        for (const point of p.series) {
          const existing = seriesMap.get(point.date)
          if (existing) {
            existing.sum   += point.value
            existing.count += 1
          } else {
            seriesMap.set(point.date, { sum: point.value, count: 1 })
          }
        }
      }
      const globalSeries = Array.from(seriesMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, { sum, count }]) => ({
          date,
          value: sum / count,
          metrics: { likes: 0, comments: 0, shares: 0, clicks: 0 } as const,
        }))

      const avgLikes = postAnalytics.length > 0
        ? totals.likes / postAnalytics.length
        : 0
      const prediction = predictEngagement(globalSeries, Math.min(100, avgLikes * 2))

      // Delta vs previous half of history
      const delta: AnalyticsOverviewData['delta'] = {}
      if (globalSeries.length >= 14) {
        const half      = Math.floor(globalSeries.length / 2)
        const recent    = globalSeries.slice(-half).map((p) => p.value)
        const prior     = globalSeries.slice(-half * 2, -half).map((p) => p.value)
        const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length
        const priorAvg  = prior.reduce((s, v)  => s + v, 0) / prior.length
        delta.engagementRate =
          priorAvg === 0 ? null : Math.round(((recentAvg - priorAvg) / priorAvg) * 100)
      }

      const dailyTip   = buildDailyTip(postAnalytics, daySeed)
      const sortedPosts = [...postAnalytics].sort(
        (a, b) => b.metrics.engagementRate - a.metrics.engagementRate,
      )

      return {
        totals,
        delta,
        series:   globalSeries,
        prediction,
        posts:    sortedPosts,
        dailyTip,
      } satisfies AnalyticsOverviewData
    },
    undefined,
    'analytics',
    'overview',
    userId,
  )
}

export async function getPostsAnalyticsOverview(): Promise<AnalyticsOverviewData | null> {
  const userId = await getAuthenticatedUserId().catch(() => null)
  if (!userId) return null
  return getPostsAnalyticsOverviewByUser(userId)
}

/**
 * Fetches detailed analytics for a single post (must belong to current user).
 * Results are cached in Redis (db namespace, 300 s TTL).
 *
 * @param postId - Post ID to fetch analytics for
 * @returns PostAnalytics or null if not found / not authorized
 *
 * @example
 * const analytics = await getPostAnalytics('clx123abc')
 */
export async function getPostAnalytics(postId: string): Promise<PostAnalytics | null> {
  const userId = await getAuthenticatedUserId().catch(() => null)
  if (!userId) return null

  return getOrSet(
    'db',
    async () => {
      const post = await prisma.post.findUnique({
        where:   { id: postId },
        include: {
          _count:          { select: { likes: true } },
          metricSnapshots: { where: { platform: null }, orderBy: { capturedAt: 'asc' } },
          media:           { select: { id: true } },
        },
      })

      if (!post || post.authorId !== userId) return null

      return mapPostToAnalytics(post)
    },
    undefined,
    'analytics',
    'post',
    postId,
    userId,
  )
}

/** Exported for use in the detail page UI. */
export { formatMetricValue }
