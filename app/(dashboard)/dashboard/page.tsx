import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo/metadata'
import { getFeed } from '@/lib/api/posts'
import { getCurrentUser } from '@/lib/auth/dal'
import { PostComposer } from '@/components/ui/posts/PostComposer'
import { PostFeed } from '@/components/ui/posts/PostFeed'
import { Card } from '@/components/ui/Card'
import DashboardWidgetSlot from '@/components/dashboard/DashboardWidgetSlot'
import { UserRole } from '@/types/auth'

export const metadata: Metadata = buildMetadata({
  slug: 'dashboard',
  title: 'Dashboard — Instra',
  description: "Your Instra feed. Create posts and see what's happening.",
  robots: { index: false, follow: false },
})

/** Dashboard feed page — Server Component. Renders inline post composer and live feed. */
export default async function DashboardPage() {
  const [{ posts, nextCursor }, user] = await Promise.all([getFeed(), getCurrentUser()])

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Inline composer */}
      <Card className="p-4">
        <PostComposer mode="inline" />
      </Card>

      {/* Feed */}
      <PostFeed
        initialPosts={posts}
        initialNextCursor={nextCursor}
        currentUserId={user?.id ?? null}
        currentUserRole={(user?.role as UserRole) ?? null}
      />

      <DashboardWidgetSlot />
    </div>
  )
}
