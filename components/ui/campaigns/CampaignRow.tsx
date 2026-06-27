'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Campaign, CampaignRun } from '@prisma/client'
import { CampaignStatusBadge } from './CampaignStatusBadge'
import { CampaignActions } from './CampaignActions'
import { CampaignRuns } from './CampaignRuns'

interface CampaignRowProps {
  campaign: Campaign
  runs: CampaignRun[]
}

const ACTION_LABEL_KEY: Record<string, string> = {
  PUBLISH_POST: 'campaigns.action.publish_post',
  WEBHOOK: 'campaigns.action.webhook',
}

/**
 * Card-style row for a single campaign in the list.
 * Shows metadata, progress bar, status, and expandable run history.
 *
 * @param campaign - Campaign DB row
 * @param runs     - Pre-fetched run history (latest first)
 * @example
 * <CampaignRow campaign={campaign} runs={runs} />
 */
export function CampaignRow({ campaign, runs }: CampaignRowProps) {
  const { t } = useTranslation('common')
  const [historyOpen, setHistoryOpen] = useState(false)

  const progress = campaign.totalRuns > 0 ? campaign.completedRuns / campaign.totalRuns : 0
  const progressPct = Math.round(progress * 100)

  const nextRunAt = campaign.nextRunAt ? new Date(campaign.nextRunAt) : null
  const lastRunAt = campaign.lastRunAt ? new Date(campaign.lastRunAt) : null

  return (
    <div
      className="rounded-sm border p-4 space-y-3 transition-colors"
      style={{
        background: 'var(--color-surface-container-lowest)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      {/* Top row: name + badge + action type */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1 min-w-0">
          <h3
            className="font-sans text-sm font-semibold truncate"
            style={{ color: 'var(--color-on-surface)' }}
          >
            {campaign.name}
          </h3>
          <p
            className="font-mono text-[10px] uppercase tracking-[0.08em]"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            {t(ACTION_LABEL_KEY[campaign.actionType] ?? 'campaigns.action.webhook')}
          </p>
        </div>
        <CampaignStatusBadge status={campaign.status} />
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span
            className="font-mono text-[10px] tabular-nums"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            {t('campaigns.progress', {
              done: campaign.completedRuns,
              total: campaign.totalRuns,
            })}
          </span>
          <span
            className="font-mono text-[10px] tabular-nums"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            {progressPct}%
          </span>
        </div>
        {/* Progress bar  transform-based animation respects reduced-motion */}
        <div
          className="h-0.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.08)' }}
          role="progressbar"
          aria-valuenow={campaign.completedRuns}
          aria-valuemin={0}
          aria-valuemax={campaign.totalRuns}
        >
          <div
            className="h-full rounded-full motion-safe:transition-all motion-safe:duration-300"
            style={{
              width: `${progressPct}%`,
              background:
                campaign.status === 'FAILED'
                  ? '#ffb4ab'
                  : campaign.status === 'COMPLETED'
                    ? 'var(--color-on-surface-variant)'
                    : 'var(--color-success-green)',
            }}
          />
        </div>
      </div>

      {/* Meta row: interval + next/last run */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span
          className="font-mono text-[10px] tabular-nums"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          {t('campaigns.interval_label', { minutes: campaign.intervalMinutes })}
        </span>
        {nextRunAt && campaign.status === 'ACTIVE' && (
          <span
            className="font-mono text-[10px] tabular-nums"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            {t('campaigns.next_run')}: {nextRunAt.toLocaleString()}
          </span>
        )}
        {lastRunAt && (
          <span
            className="font-mono text-[10px] tabular-nums"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            {t('campaigns.last_run')}: {lastRunAt.toLocaleString()}
          </span>
        )}
      </div>

      {/* Actions */}
      <CampaignActions
        campaignId={campaign.id}
        campaignName={campaign.name}
        status={campaign.status}
        onHistoryToggle={() => setHistoryOpen((v) => !v)}
        isHistoryOpen={historyOpen}
      />

      {/* Expandable run history */}
      {historyOpen && (
        <div
          className="pt-2 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <CampaignRuns runs={runs} />
        </div>
      )}
    </div>
  )
}
