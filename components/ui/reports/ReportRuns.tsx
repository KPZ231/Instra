'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import type { Report, ReportRun } from '@prisma/client'
import { ReportView } from '@/components/ui/reports/ReportView'

interface ReportRunsProps {
  report: Pick<Report, 'name' | 'intervalDays'>
  runs: ReportRun[]
}

/**
 * Renders the report detail header, a functional run-picker, and the selected run's snapshot.
 * Holds selected-run state client-side; chips are focusable buttons with aria-pressed.
 *
 * @param report - Report metadata (name, intervalDays)
 * @param runs   - Ordered list of ReportRun rows (most recent first)
 *
 * @example
 * <ReportRuns report={report} runs={runs} />
 */
export function ReportRuns({ report, runs }: ReportRunsProps) {
  const { t } = useTranslation('common')
  const [selectedId, setSelectedId] = useState<string>(runs[0]?.id ?? '')

  const selectedRun = runs.find((r) => r.id === selectedId) ?? runs[0]

  const subtitle = report.intervalDays
    ? t('reports.detail.every_days', { days: report.intervalDays })
    : t('reports.detail.on_demand')

  const runsLabel = t(
    runs.length === 1 ? 'reports.detail.runs_one' : 'reports.detail.runs_other',
    { count: runs.length },
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/reports"
          className="font-mono text-xs uppercase tracking-[0.08em] hover:underline"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          {t('reports.detail.back')}
        </Link>
        <h1
          className="font-sans text-2xl font-semibold mt-2"
          style={{ color: 'var(--color-primary)' }}
        >
          {report.name}
        </h1>
        <p
          className="font-mono text-xs mt-1"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          {subtitle} · {runsLabel}
        </p>
      </div>

      {selectedRun ? (
        <>
          {/* Run picker */}
          {runs.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t('reports.page.title')}>
              {runs.map((run) => {
                const isSelected = run.id === selectedId
                return (
                  <button
                    key={run.id}
                    role="tab"
                    aria-selected={isSelected}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedId(run.id)}
                    className="font-mono text-[10px] px-2 py-1 rounded-sm border shrink-0 transition-colors cursor-pointer"
                    style={{
                      borderColor: isSelected ? 'rgba(232,227,217,0.4)' : 'rgba(232,227,217,0.1)',
                      color: isSelected ? 'var(--color-accent-bone)' : 'var(--color-on-surface-variant)',
                    }}
                  >
                    {new Date(run.generatedAt).toLocaleDateString()}
                  </button>
                )
              })}
            </div>
          )}

          <ReportView run={selectedRun} />
        </>
      ) : (
        <p
          className="font-mono text-sm"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          {t('reports.detail.no_runs')}
        </p>
      )}
    </div>
  )
}
