'use client'

import { useTranslation } from 'react-i18next'
import type { CampaignRun } from '@prisma/client'

interface CampaignRunsProps {
  runs: CampaignRun[]
}

/**
 * Collapsible run history table for a campaign.
 * Each row shows timestamp, success/fail icon, and error message.
 *
 * @param runs - Array of CampaignRun rows (newest first)
 * @example
 * <CampaignRuns runs={runs} />
 */
export function CampaignRuns({ runs }: CampaignRunsProps) {
  const { t } = useTranslation('common')

  if (runs.length === 0) {
    return (
      <p
        className="font-mono text-xs tracking-[0.08em] py-3 text-center"
        style={{ color: 'var(--color-on-surface-variant)' }}
      >
        {t('campaigns.runs.empty')}
      </p>
    )
  }

  return (
    <div className="space-y-1">
      <p
        className="font-mono text-[10px] uppercase tracking-[0.1em] mb-2"
        style={{ color: 'var(--color-on-surface-variant)' }}
      >
        {t('campaigns.runs.title')}
      </p>
      <ul className="space-y-1" role="list">
        {runs.map((run) => (
          <li
            key={run.id}
            className="flex items-start gap-2 py-1.5 px-2 rounded-sm"
            style={{ background: 'var(--color-surface-container-lowest)' }}
          >
            {/* Success/fail icon  not color alone (text label also) */}
            <span
              aria-label={run.success ? t('campaigns.runs.success') : t('campaigns.runs.failed')}
              className="font-mono text-xs mt-0.5 shrink-0 tabular-nums"
              style={{ color: run.success ? 'var(--color-success-green)' : '#ffb4ab' }}
            >
              {run.success ? '✓' : '✗'}
            </span>
            <div className="min-w-0 flex-1">
              <span
                className="font-mono text-[10px] tabular-nums"
                style={{ color: 'var(--color-on-surface-variant)' }}
              >
                {new Date(run.runAt).toLocaleString()}
              </span>
              {run.error && (
                <p
                  className="text-xs mt-0.5 break-words"
                  style={{ color: '#ffb4ab' }}
                >
                  {run.error}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
