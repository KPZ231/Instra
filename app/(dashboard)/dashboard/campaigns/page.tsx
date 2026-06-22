import type { Metadata } from 'next'
import Link from 'next/link'
import { verifySession } from '@/lib/auth/dal'
import { listCampaigns, listCampaignRuns } from '@/lib/api/campaigns'
import { CampaignsList } from '@/components/ui/campaigns/CampaignsList'

export const metadata: Metadata = {
  title: 'Campaigns — Instra',
  robots: { index: false, follow: false },
}

/**
 * Campaigns dashboard page.
 * Fetches all user campaigns and their latest runs server-side,
 * then passes to the CampaignsList client component for filtering and mutation.
 */
export default async function CampaignsPage() {
  const { user } = await verifySession()

  const campaigns = await listCampaigns(user.id)

  // Fetch runs for each campaign in parallel (limited to 20 per campaign)
  const campaignsWithRuns = await Promise.all(
    campaigns.map(async (campaign) => ({
      ...campaign,
      runs: await listCampaignRuns(campaign.id, 20),
    })),
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p
            className="font-mono text-xs tracking-[0.12em] uppercase mb-1"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            {'// CAMPAIGNS'}
          </p>
          <h1
            className="font-sans text-2xl font-semibold"
            style={{ color: 'var(--color-primary)' }}
          >
            Campaigns
          </h1>
        </div>
        {campaigns.length > 0 && (
          <Link
            href="/dashboard/campaigns/new"
            className="px-4 py-2 rounded-sm font-mono text-xs tracking-[0.08em] uppercase border transition-opacity hover:opacity-80 min-h-[44px] flex items-center"
            style={{
              borderColor: 'rgba(232,227,217,0.3)',
              color: 'var(--color-accent-bone)',
            }}
          >
            + New Campaign
          </Link>
        )}
      </div>

      {/* List */}
      <CampaignsList campaigns={campaignsWithRuns} />
    </div>
  )
}
