import type { Metadata } from 'next'
import { verifySession } from '@/lib/auth/dal'
import { getUserPosts } from '@/lib/api/posts'
import { CreateCampaignForm } from '@/components/ui/campaigns/CreateCampaignForm'
import { Zap, Clock, RefreshCw } from 'lucide-react'

export const metadata: Metadata = {
  title: 'New Campaign  Instra',
  robots: { index: false, follow: false },
}

const HOW_IT_WORKS = [
  {
    icon: Zap,
    title: 'Automated execution',
    body: 'Campaigns run on a schedule without you having to open the app. Instra handles the timing.',
  },
  {
    icon: Clock,
    title: 'Interval-based',
    body: 'Set how often the action fires  every 15 minutes, hourly, or once a day. Your choice.',
  },
  {
    icon: RefreshCw,
    title: 'Runs to completion',
    body: 'The campaign executes a fixed number of times, then stops automatically and marks itself complete.',
  },
]

/**
 * New campaign creation page.
 * Two-column layout on lg+: form on left, info panel on right.
 */
export default async function NewCampaignPage() {
  const { user } = await verifySession()
  const posts = await getUserPosts(user.id)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p
          className="font-mono text-xs tracking-[0.12em] uppercase mb-1"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          {'// NEW CAMPAIGN'}
        </p>
        <h1 className="font-sans text-2xl font-semibold" style={{ color: 'var(--color-primary)' }}>
          New Campaign
        </h1>
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-8 items-start">
        {/* Form card */}
        <div
          className="rounded-sm border p-6 lg:p-8"
          style={{
            background: 'var(--color-surface-container-low)',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <CreateCampaignForm posts={posts} />
        </div>

        {/* Info panel */}
        <aside className="space-y-2 lg:sticky lg:top-8">
          <p
            className="font-mono text-[10px] uppercase tracking-[0.12em] mb-4"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            {'// HOW IT WORKS'}
          </p>

          {HOW_IT_WORKS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-sm border p-4"
              style={{
                background: 'var(--color-surface-container)',
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-start gap-3">
                <Icon
                  size={14}
                  className="mt-0.5 shrink-0"
                  style={{ color: 'var(--color-accent-bone)' }}
                  strokeWidth={1.5}
                />
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-on-surface)' }}>
                    {title}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
                    {body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  )
}
