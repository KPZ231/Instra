import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { getPostsByUsername } from '@/lib/api/posts'
import { auth } from '@/lib/auth/config'
import { PostFeed } from '@/components/ui/posts/PostFeed'
import { UserRole } from '@/types/auth'

export const revalidate = 60

interface ProfilePageProps {
  params: Promise<{ username: string }>
}

/**
 * Generates dynamic metadata for a user profile page.
 * @param params - Route params containing the username.
 * @returns Next.js Metadata object with title, description, canonical, and hreflang.
 */
export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params
  const user = await prisma.user.findUnique({ where: { username }, select: { name: true } })
  if (!user) return {}

  const displayName = user.name ?? username
  const canonical = `/profile/${username}`

  return {
    title: `${displayName} — Instra`,
    description: `Posts by ${displayName} on Instra.`,
    robots: { index: true, follow: true },
    alternates: {
      canonical,
      languages: {
        en: `${canonical}?lang=en`,
        pl: `${canonical}?lang=pl`,
      },
    },
  }
}

/** Public user profile page — Server Component with ISR. */
export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, name: true, username: true, image: true },
  })

  if (!user) notFound()

  const [{ posts, nextCursor }, session] = await Promise.all([
    getPostsByUsername(username),
    auth(),
  ])

  const currentUserId = session?.user?.id ?? null
  const currentUserRole = (session?.user as { role?: UserRole } | undefined)?.role ?? null
  const displayName = user.name ?? username

  return (
    <main className="max-w-xl mx-auto px-4 py-8 space-y-6">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        {user.image ? (
          <Image
            src={user.image}
            alt={displayName}
            width={64}
            height={64}
            className="rounded-full"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center font-mono text-2xl"
            style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
          >
            {displayName[0].toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="font-mono text-base font-bold" style={{ color: 'var(--color-primary)' }}>
            {displayName}
          </h1>
          <p className="font-mono text-xs" style={{ color: 'var(--color-outline)' }}>
            @{username}
          </p>
        </div>
      </div>

      <PostFeed
        initialPosts={posts}
        initialNextCursor={nextCursor}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
      />
    </main>
  )
}
