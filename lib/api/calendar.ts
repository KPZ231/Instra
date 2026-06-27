import 'server-only'

import { prisma } from '@/lib/prisma'
import { getOrSet } from '@/lib/cache'
import type { CampaignStatus, Platform, PublishStatus } from '@prisma/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduledCalendarItem {
  type: 'scheduled'
  date: Date
  campaignId: string
  /** postId extracted from Campaign.payload  may be null if payload is malformed */
  postId: string | null
  campaignStatus: CampaignStatus
  postContent: string | null
}

export interface PublishedCalendarItem {
  type: 'published'
  date: Date
  postId: string
  content: string | null
  socialStatuses: Array<{
    platform: Platform
    status: PublishStatus
    publishedAt: Date | null
  }>
}

export type CalendarItem = ScheduledCalendarItem | PublishedCalendarItem

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Returns a merged, date-sorted list of scheduled and published posts
 * for a user within the given date range.
 *
 * Scheduled items come from ACTIVE/PAUSED PUBLISH_POST campaigns whose
 * nextRunAt falls within [from, to]. Published items come from posts
 * created within [from, to].
 *
 * Results are cached under the 'db' namespace at key 'calendar:<userId>:<from>:<to>'.
 *
 * @param userId - The authenticated user's ID
 * @param from   - Range start (inclusive)
 * @param to     - Range end (inclusive)
 * @returns Flat list of CalendarItem sorted by date ascending
 *
 * @example
 * const items = await getCalendarItems(user.id, startOfMonth, endOfMonth)
 */
export async function getCalendarItems(
  userId: string,
  from: Date,
  to: Date,
): Promise<CalendarItem[]> {
  const cacheKey = `${userId}:${from.toISOString()}:${to.toISOString()}`

  return getOrSet(
    'db',
    () => fetchCalendarItems(userId, from, to),
    undefined, // use default db TTL (300s)
    'calendar',
    cacheKey,
  )
}

async function fetchCalendarItems(
  userId: string,
  from: Date,
  to: Date,
): Promise<CalendarItem[]> {
  // 1. Scheduled: ACTIVE/PAUSED PUBLISH_POST campaigns with nextRunAt in range
  const campaigns = await prisma.campaign.findMany({
    where: {
      userId,
      actionType: 'PUBLISH_POST',
      status: { in: ['ACTIVE', 'PAUSED'] },
      nextRunAt: { gte: from, lte: to },
    },
    orderBy: { nextRunAt: 'asc' },
  })

  // Batch-resolve postIds to Post rows (guard missing/deleted posts)
  const rawPostIds = campaigns
    .map((c) => {
      const payload = c.payload as Record<string, unknown>
      const id = payload?.postId
      return typeof id === 'string' && id.length > 0 ? id : null
    })
    .filter((id): id is string => id !== null)

  const postRows =
    rawPostIds.length > 0
      ? await prisma.post.findMany({
          where: { id: { in: rawPostIds } },
          select: { id: true, content: true },
        })
      : []

  const postContentMap = new Map(postRows.map((p) => [p.id, p.content]))

  const scheduledItems: ScheduledCalendarItem[] = campaigns.map((c) => {
    const payload = c.payload as Record<string, unknown>
    const postId = typeof payload?.postId === 'string' ? payload.postId : null
    return {
      type: 'scheduled',
      date: c.nextRunAt,
      campaignId: c.id,
      postId,
      campaignStatus: c.status,
      postContent: postId ? (postContentMap.get(postId) ?? null) : null,
    }
  })

  // 2. Published: posts created in range, with per-platform social status
  const posts = await prisma.post.findMany({
    where: {
      authorId: userId,
      createdAt: { gte: from, lte: to },
    },
    include: {
      socialStatuses: {
        select: { platform: true, status: true, publishedAt: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const publishedItems: PublishedCalendarItem[] = posts.map((p) => ({
    type: 'published',
    date: p.createdAt,
    postId: p.id,
    content: p.content,
    socialStatuses: p.socialStatuses,
  }))

  // Merge and sort by date ascending
  return [...scheduledItems, ...publishedItems].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  )
}
