import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo/metadata'
import { getPostAnalytics } from '@/lib/api/analytics'
import { formatMetricValue } from '@/lib/api/analytics'
import EngagementChart from '@/components/ui/analytics/EngagementChart'
import StatCard from '@/components/dashboard/StatCard'

export async function generateMetadata(
  { params }: { params: Promise<{ postId: string }> },
): Promise<Metadata> {
  const { postId } = await params
  return buildMetadata({
    slug: `dashboard/analytics/${postId}`,
    title: 'Post Detail  Instra Analytics',
    description: 'Detailed engagement metrics, trend chart, and content score for a single post.',
    robots: { index: false, follow: false },
  })
}

/**
 * Single-post analytics detail page  Server Component.
 * Shows full metric breakdown, trend chart with prediction, and content improvement issues.
 */
export default async function PostAnalyticsDetailPage(
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params
  const data = await getPostAnalytics(postId)

  if (!data) notFound()

  const { metrics, series, prediction, contentScore } = data
  const deltaLabel = ''

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/analytics"
        className="font-mono text-xs tracking-[0.08em] uppercase transition-opacity hover:opacity-70 inline-block"
        style={{ color: 'var(--color-on-surface-variant)' }}
      >
        ← Back to Analytics
      </Link>

      {/* Post excerpt */}
      <div
        className="rounded-sm border p-5"
        style={{
          background: 'var(--color-surface-container)',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <p
          className="font-mono text-xs tracking-[0.08em] uppercase mb-2"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          {new Date(data.createdAt).toLocaleDateString()} · {data.platforms.join(', ')}
        </p>
        <p className="font-sans text-sm leading-relaxed" style={{ color: 'var(--color-primary)' }}>
          {data.content ?? '(no text content)'}
        </p>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Impressions"
          value={metrics.impressions > 0 ? formatMetricValue(metrics.impressions) : null}
          delta={null}
          deltaLabel={deltaLabel}
        />
        <StatCard
          label="Reach"
          value={metrics.reach > 0 ? formatMetricValue(metrics.reach) : null}
          delta={null}
          deltaLabel={deltaLabel}
        />
        <StatCard
          label="Likes"
          value={formatMetricValue(data.likeCount)}
          delta={null}
          deltaLabel={deltaLabel}
        />
        <StatCard
          label="Engagement Rate"
          value={`${(metrics.engagementRate * 100).toFixed(2)}%`}
          delta={null}
          deltaLabel={deltaLabel}
        />
      </div>

      {/* Chart */}
      <EngagementChart series={series} prediction={prediction} />

      {/* Content score + issues */}
      <div
        className="rounded-sm border p-5 flex flex-col gap-4"
        style={{
          background: 'var(--color-surface-container)',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center justify-between">
          <p
            className="font-mono text-xs tracking-[0.1em] uppercase"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            {'// CONTENT SCORE'}
          </p>
          <span
            className="font-mono text-2xl font-semibold tabular-nums"
            style={{
              color:
                contentScore.score >= 75
                  ? '#00FF41'
                  : contentScore.score >= 50
                  ? 'var(--color-primary)'
                  : '#FF4444',
            }}
          >
            {contentScore.score}/100
          </span>
        </div>

        {contentScore.issues.length === 0 ? (
          <p className="font-sans text-sm" style={{ color: '#00FF41' }}>
            All content checks passed!
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {contentScore.issues.map((issue) => (
              <li
                key={issue.key}
                className="flex items-start gap-2 font-sans text-sm"
                style={{ color: 'var(--color-primary)' }}
              >
                <span
                  className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm border shrink-0 mt-0.5"
                  style={{
                    color: issue.priority >= 8 ? '#FF4444' : 'var(--color-on-surface-variant)',
                    borderColor:
                      issue.priority >= 8 ? '#FF4444' : 'rgba(255,255,255,0.1)',
                  }}
                >
                  P{issue.priority}
                </span>
                {issue.key.replace(/_/g, ' ')}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
