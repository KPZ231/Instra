import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo/metadata'
import { Card } from '@/components/ui/Card'
import { PostComposer } from '@/components/ui/posts/PostComposer'

export const metadata: Metadata = buildMetadata({
  slug: 'new-post',
  title: 'New Post — Instra',
  description: 'Create a new post on Instra.',
  robots: { index: false, follow: false },
})

/** Full-page post creation form. */
export default function NewPostPage() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1
        className="font-mono text-sm uppercase tracking-[0.1em]"
        style={{ color: 'var(--color-on-surface-variant)' }}
      >
        New Post
      </h1>
      <Card className="p-6">
        <PostComposer mode="full" />
      </Card>
    </div>
  )
}
