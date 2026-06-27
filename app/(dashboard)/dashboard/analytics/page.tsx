import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo/metadata'
import { getPostsAnalyticsOverview } from '@/lib/api/analytics'
import AnalyticsOverview from '@/components/ui/analytics/AnalyticsOverview'

export const metadata: Metadata = buildMetadata({
  slug: 'dashboard/analytics',
  title: 'Post Analytics  Instra',
  description:
    'Track reach, engagement, and content quality across all your posts. Heuristic predictions and daily improvement tips included.',
  robots: { index: false, follow: false },
})

/**
 * Analytics overview page  Server Component.
 * Fetches real aggregated analytics for the authenticated user's posts
 * and passes them to the client-side AnalyticsOverview bento grid.
 */
export default async function AnalyticsPage() {
  const overview = await getPostsAnalyticsOverview()

  if (!overview) {
    return (
      <div className="flex items-center justify-center py-24">
        <p
          className="font-mono text-xs tracking-[0.08em] uppercase"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          Unauthenticated
        </p>
      </div>
    )
  }

  return <AnalyticsOverview data={overview} />
}
