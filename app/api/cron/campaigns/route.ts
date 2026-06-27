import { NextResponse } from 'next/server'
import { getDueCampaigns, recordRun, advanceCampaign } from '@/lib/api/campaigns'
import { createNotification } from '@/lib/api/notifications'
import { runCampaignHandler } from '@/lib/campaigns/handlers'
import { invalidatePrefix } from '@/lib/cache'

// Allow up to 60 s on Vercel Pro/Enterprise to process a batch of campaigns.
export const maxDuration = 60

/**
 * Cron endpoint: processes all campaigns due for execution.
 * Called by Vercel Cron (see vercel.json). Gated by CRON_SECRET.
 *
 * ponytail: brak per-campaign lockowania  jeden cron co minutę.
 * Jeśli ticki zaczną się nakładać przy dużym wolumenie →
 * claim kampanii (UPDATE status=RUNNING) przed wykonaniem.
 *
 * @returns { processed, failed } counts
 */
export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const campaigns = await getDueCampaigns(50)

  let processed = 0
  let failed = 0

  await Promise.allSettled(
    campaigns.map(async (campaign) => {
      let success = true
      let error: string | undefined

      try {
        await runCampaignHandler(campaign)
      } catch (err) {
        success = false
        error = err instanceof Error ? err.message : String(err)
        failed++
      }

      if (success) processed++

      await recordRun(campaign.id, success, error)
      await advanceCampaign(campaign)

      if (!success) {
        // ponytail: best-effort notification for failed run
        void createNotification({
          userId: campaign.userId,
          type: campaign.actionType === 'WEBHOOK' ? 'WEBHOOK_FAILED' : 'CAMPAIGN_FAILED',
          title: campaign.actionType === 'WEBHOOK' ? 'Webhook failed' : 'Campaign run failed',
          message: `"${campaign.name}": ${error ?? 'Unknown error'}`,
          link: '/dashboard/campaigns',
        })
      }
    }),
  )

  if (campaigns.length > 0) {
    await invalidatePrefix('db', 'campaigns')
  }

  return NextResponse.json({ processed, failed, total: campaigns.length })
}
