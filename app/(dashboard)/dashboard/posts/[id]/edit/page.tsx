import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo/metadata'
import { getPostById } from '@/lib/api/posts'
import { verifySession } from '@/lib/auth/dal'
import { getConnectedAccounts } from '@/lib/api/socialAccounts'
import { Card } from '@/components/ui/Card'
import { PostComposer } from '@/components/ui/posts/PostComposer'
import type { PlatformId } from '@/components/ui/posts/PlatformSelector'
import { UserRole } from '@/types/auth'

export const metadata: Metadata = buildMetadata({
  slug: 'edit-post',
  title: 'Edit Post  Instra',
  description: 'Edit your post on Instra.',
  robots: { index: false, follow: false },
})

interface EditPostPageProps {
  params: Promise<{ id: string }>
}

/** Edit page  authorisation enforced server-side before rendering. */
export default async function EditPostPage({ params }: EditPostPageProps) {
  const { id } = await params
  const [post, { user }] = await Promise.all([getPostById(id), verifySession()])
  const accounts = await getConnectedAccounts(user.id)
  const connectedPlatforms = accounts.map((a) => a.platform.toLowerCase() as PlatformId)

  if (!post) notFound()

  const canEdit = post.author.id === user.id || user.role === UserRole.ADMIN
  if (!canEdit) notFound()

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1
        className="font-mono text-sm uppercase tracking-[0.1em]"
        style={{ color: 'var(--color-on-surface-variant)' }}
      >
        Edit Post
      </h1>
      <Card className="p-6">
        <PostComposer mode="full" existingPost={post} connectedPlatforms={connectedPlatforms} />
      </Card>
    </div>
  )
}
