import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo/metadata'
import { getFeed } from '@/lib/api/posts'
import { getCurrentUser } from '@/lib/auth/dal'
import { getDashboardMetrics } from '@/lib/api/dashboardMetrics'
import { PostComposer } from '@/components/ui/posts/PostComposer'
import { PostFeed } from '@/components/ui/posts/PostFeed'
import { Card } from '@/components/ui/Card'
import DashboardWidgetSlot from '@/components/dashboard/DashboardWidgetSlot'
import DashboardOverview from '@/components/dashboard/DashboardOverview'
import { UserRole } from '@/types/auth'

export const metadata: Metadata = buildMetadata({
  slug: 'dashboard',
  title: 'Dashboard — Instra',
  description: "Your Instra feed. Create posts and see what's happening.",
  robots: { index: false, follow: false },
})

/** Dashboard feed page — Server Component. Renders overview metrics, inline post composer, and live feed. */
export default async function DashboardPage() {
  const user = await getCurrentUser()

  const [{ posts, nextCursor }, metrics] = await Promise.all([
    getFeed(),
    user?.id
      ? getDashboardMetrics(user.id)
      : Promise.resolve({
          stats: [],
          chartSeries: { '7D': [], '30D': [], '90D': [] },
          activity: [],
        }),
  ])

  return (
    <div className="space-y-8">
      {/* Overview — KPI cards, chart, activity, quick actions */}
      <DashboardOverview metrics={metrics} />

      {/* Inline composer */}
      <div className="space-y-2">
        <p
          className="font-mono text-[10px] uppercase tracking-[0.1em] flex items-center gap-2"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--color-primary)' }}
            aria-hidden="true"
          />
          New Post
        </p>
        <Card
          className="p-4 ring-1 transition-shadow hover:ring-white/10"
          style={{ ['--tw-ring-color' as string]: 'rgba(255,255,255,0.06)' }}
        >
          <PostComposer mode="inline" />
        </Card>
      </div>

      {/* Feed */}
      <PostFeed
        initialPosts={posts}
        initialNextCursor={nextCursor}
        currentUserId={user?.id ?? null}
        currentUserRole={
          Object.values(UserRole).includes(user?.role as UserRole)
            ? (user!.role as UserRole)
            : null
        }
      />

      <DashboardWidgetSlot />
    </div>
  )
}
