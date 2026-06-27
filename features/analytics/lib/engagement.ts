/**
 * Pure engagement computation functions.
 * No side effects, no I/O  easily unit-testable.
 */

import type { EngagementMetrics, AggregatedMetrics, MetricDataPoint } from '../types'

/**
 * Computes the engagement rate for a set of raw metrics.
 * Formula: (likes + comments + shares + clicks) / max(impressions, 1)
 *
 * @param metrics - Raw metric values
 * @returns Engagement rate as a 0–1 fraction
 *
 * @example
 * computeEngagementRate({ impressions: 1000, likes: 50, comments: 10, shares: 5, clicks: 20, reach: 900, views: 800 })
 * // => 0.085
 */
export function computeEngagementRate(metrics: EngagementMetrics): number {
  const interactions = metrics.likes + metrics.comments + metrics.shares + metrics.clicks
  return interactions / Math.max(metrics.impressions, 1)
}

/**
 * Aggregates an array of raw metric snapshots into a single totals object.
 * Returns zero-value metrics when the array is empty.
 *
 * @param snapshots - Array of raw metric values (each snapshot is one time-point)
 * @param likeCount - Separate like count from the Like model (not in snapshots)
 * @param lastCapturedAt - ISO string of the most recent snapshot, or null
 * @returns Aggregated metrics with engagementRate and lastCapturedAt
 *
 * @example
 * aggregateSnapshots(snapshots, 42, '2026-06-20T00:00:00.000Z')
 */
export function aggregateSnapshots(
  snapshots: EngagementMetrics[],
  likeCount: number,
  lastCapturedAt: string | null,
): AggregatedMetrics {
  if (snapshots.length === 0) {
    const empty: EngagementMetrics = {
      impressions: 0,
      reach: 0,
      views: 0,
      clicks: 0,
      shares: 0,
      comments: 0,
      likes: likeCount,
    }
    return { ...empty, engagementRate: 0, lastCapturedAt }
  }

  const totals = snapshots.reduce<EngagementMetrics>(
    (acc, snap) => ({
      impressions: acc.impressions + snap.impressions,
      reach:       acc.reach       + snap.reach,
      views:       acc.views       + snap.views,
      clicks:      acc.clicks      + snap.clicks,
      shares:      acc.shares      + snap.shares,
      comments:    acc.comments    + snap.comments,
      likes:       likeCount,
    }),
    { impressions: 0, reach: 0, views: 0, clicks: 0, shares: 0, comments: 0, likes: likeCount },
  )

  return {
    ...totals,
    engagementRate: computeEngagementRate(totals),
    lastCapturedAt,
  }
}

/**
 * Converts raw snapshots into a daily time-series for chart rendering.
 * Multiple snapshots on the same day are averaged.
 *
 * @param snapshots - Snapshots sorted by capturedAt ascending
 * @param likeCount - Used for fallback when no snapshot data
 * @returns Array of MetricDataPoint sorted by date ascending
 *
 * @example
 * buildSeries(snapshots, 10)
 */
export function buildSeries(
  snapshots: Array<EngagementMetrics & { capturedAt: Date }>,
  likeCount: number,
): MetricDataPoint[] {
  if (snapshots.length === 0) return []

  // Group by YYYY-MM-DD
  const byDay = new Map<string, { rates: number[]; metrics: Pick<EngagementMetrics, 'likes' | 'comments' | 'shares' | 'clicks'> }>()

  for (const snap of snapshots) {
    const date = snap.capturedAt.toISOString().slice(0, 10)
    const rate = computeEngagementRate({ ...snap, likes: likeCount })
    const existing = byDay.get(date)
    if (existing) {
      existing.rates.push(rate)
      existing.metrics.clicks   += snap.clicks
      existing.metrics.comments += snap.comments
      existing.metrics.shares   += snap.shares
    } else {
      byDay.set(date, {
        rates: [rate],
        metrics: { likes: likeCount, clicks: snap.clicks, comments: snap.comments, shares: snap.shares },
      })
    }
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { rates, metrics }]) => ({
      date,
      value: Math.min(100, (rates.reduce((s, r) => s + r, 0) / rates.length) * 100),
      metrics,
    }))
}

/**
 * Formats a large number for display (e.g. 1234 → "1.2K").
 *
 * @param n - Raw number
 * @returns Formatted string
 *
 * @example
 * formatMetricValue(12345) // => "12.3K"
 */
export function formatMetricValue(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
