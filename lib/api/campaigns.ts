import 'server-only'

import { prisma } from '@/lib/prisma'
import { createNotification } from './notifications'
import type { Campaign, CampaignRun, CampaignStatus } from '@prisma/client'

export type { Campaign, CampaignRun }

export type CreateCampaignInput = {
  userId: string
  name: string
  actionType: 'PUBLISH_POST' | 'WEBHOOK'
  payload: Record<string, unknown>
  intervalMinutes: number
  totalRuns: number
  nextRunAt: Date
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns all campaigns for a user, newest first.
 *
 * @param userId - The user's ID
 * @returns Array of Campaign rows
 *
 * @example
 * const campaigns = await listCampaigns(user.id)
 */
export async function listCampaigns(userId: string): Promise<Campaign[]> {
  return prisma.campaign.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Returns a single campaign by ID.
 *
 * @param id - Campaign ID
 * @returns Campaign or null
 *
 * @example
 * const campaign = await getCampaign('clx...')
 */
export async function getCampaign(id: string): Promise<Campaign | null> {
  return prisma.campaign.findUnique({ where: { id } })
}

/**
 * Returns campaigns due for execution: ACTIVE and nextRunAt <= now.
 * Ordered by nextRunAt ascending (oldest due first).
 *
 * @param limit - Max rows to fetch (default 50)
 * @returns Array of Campaign rows
 *
 * @example
 * const due = await getDueCampaigns(50)
 */
export async function getDueCampaigns(limit = 50): Promise<Campaign[]> {
  return prisma.campaign.findMany({
    where: { status: 'ACTIVE', nextRunAt: { lte: new Date() } },
    orderBy: { nextRunAt: 'asc' },
    take: limit,
  })
}

/**
 * Returns recent run history for a campaign, newest first.
 *
 * @param campaignId - Campaign ID
 * @param limit      - Max rows (default 20)
 * @returns Array of CampaignRun rows
 *
 * @example
 * const runs = await listCampaignRuns('clx...')
 */
export async function listCampaignRuns(campaignId: string, limit = 20): Promise<CampaignRun[]> {
  return prisma.campaignRun.findMany({
    where: { campaignId },
    orderBy: { runAt: 'desc' },
    take: limit,
  })
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Creates a new campaign.
 *
 * @param data - Campaign creation input
 * @returns Created Campaign
 *
 * @example
 * const campaign = await createCampaign({ userId, name: 'Launch', ... })
 */
export async function createCampaign(data: CreateCampaignInput): Promise<Campaign> {
  return prisma.campaign.create({
    data: {
      userId: data.userId,
      name: data.name,
      actionType: data.actionType,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: data.payload as any,
      intervalMinutes: data.intervalMinutes,
      totalRuns: data.totalRuns,
      nextRunAt: data.nextRunAt,
    },
  })
}

/**
 * Sets the status of a campaign (pause, resume, etc.).
 *
 * @param id     - Campaign ID
 * @param status - Target status
 * @returns Updated Campaign
 *
 * @example
 * await setStatus('clx...', 'PAUSED')
 */
export async function setStatus(id: string, status: CampaignStatus): Promise<Campaign> {
  return prisma.campaign.update({ where: { id }, data: { status } })
}

/**
 * Permanently deletes a campaign and its run history.
 *
 * @param id - Campaign ID
 * @returns void
 *
 * @example
 * await deleteCampaign('clx...')
 */
export async function deleteCampaign(id: string): Promise<void> {
  await prisma.campaign.delete({ where: { id } })
}

/**
 * Logs a single execution attempt for a campaign.
 *
 * @param campaignId - Campaign ID
 * @param success    - Whether the handler succeeded
 * @param error      - Error message if it failed
 * @returns Created CampaignRun
 *
 * @example
 * await recordRun('clx...', false, 'Webhook returned 500')
 */
export async function recordRun(
  campaignId: string,
  success: boolean,
  error?: string,
): Promise<CampaignRun> {
  return prisma.campaignRun.create({
    data: { campaignId, success, error: error ?? null },
  })
}

/**
 * Updates the scheduled run time of a campaign (reschedule).
 *
 * @param id        - Campaign ID
 * @param nextRunAt - New scheduled run time
 * @returns Updated Campaign
 *
 * @example
 * await updateNextRunAt('clx...', new Date('2026-07-01T10:00:00Z'))
 */
export async function updateNextRunAt(id: string, nextRunAt: Date): Promise<Campaign> {
  return prisma.campaign.update({ where: { id }, data: { nextRunAt } })
}

/**
 * Advances a campaign after a successful (or failed) run:
 * - increments completedRuns
 * - marks COMPLETED when totalRuns reached, otherwise pushes nextRunAt forward
 * - updates lastRunAt
 *
 * @param campaign - The campaign row (needs id, completedRuns, totalRuns, intervalMinutes, nextRunAt)
 * @returns Updated Campaign
 *
 * @example
 * await advanceCampaign(campaign)
 */
export async function advanceCampaign(campaign: Campaign): Promise<Campaign> {
  const completedRuns = campaign.completedRuns + 1
  const done = completedRuns >= campaign.totalRuns

  const nextRunAt = new Date(campaign.nextRunAt)
  nextRunAt.setMinutes(nextRunAt.getMinutes() + campaign.intervalMinutes)

  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      completedRuns,
      lastRunAt: new Date(),
      status: done ? 'COMPLETED' : 'ACTIVE',
      nextRunAt: done ? campaign.nextRunAt : nextRunAt, // freeze nextRunAt when done
    },
  })

  if (done) {
    // ponytail: best-effort, createNotification never throws
    void createNotification({
      userId: campaign.userId,
      type: 'CAMPAIGN_COMPLETED',
      title: 'Campaign completed',
      message: `"${campaign.name}" has finished all ${campaign.totalRuns} scheduled runs.`,
      link: '/dashboard/campaigns',
    })
  }

  return updated
}
