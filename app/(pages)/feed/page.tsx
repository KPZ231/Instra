import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo/metadata'
import { getFeed } from '@/lib/api/posts'
import { auth } from '@/lib/auth/config'
import { PostFeed } from '@/components/ui/posts/PostFeed'
import { UserRole } from '@/types/auth'

export const revalidate = 60

export const metadata: Metadata = buildMetadata({
  slug: 'feed',
  title: 'Feed — Instra',
  description: 'Discover the latest posts from the Instra community.',
  robots: { index: true, follow: true },
})

/** Public global feed — Server Component with ISR. */
export default async function FeedPage() {
  const [{ posts, nextCursor }, session] = await Promise.all([getFeed(), auth()])

  const currentUserId = session?.user?.id ?? null
  const currentUserRole = (session?.user as { role?: UserRole } | undefined)?.role ?? null

  return (
    <main className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <h1
        className="font-mono text-sm uppercase tracking-[0.1em]"
        style={{ color: 'var(--color-on-surface-variant)' }}
      >
        Feed
      </h1>
      <PostFeed
        initialPosts={posts}
        initialNextCursor={nextCursor}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
      />
    </main>
  )
}
