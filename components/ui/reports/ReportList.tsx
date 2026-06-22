'use client'

import { useActionState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Report, ReportRun } from '@prisma/client'
import { generateReportNow } from '@/features/reports/actions/generateReportNow'
import { setReportStatus }   from '@/features/reports/actions/setReportStatus'
import { deleteReport }      from '@/features/reports/actions/deleteReport'

type ReportWithRuns = Report & { runs: ReportRun[] }

interface ReportListProps {
  reports: ReportWithRuns[]
}

/**
 * Displays the list of reports with actions: generate now, pause/resume, delete, view.
 *
 * @param reports - Array of Report rows with pre-fetched runs
 *
 * @example
 * <ReportList reports={reportsWithRuns} />
 */
export function ReportList({ reports }: ReportListProps) {
  const { t } = useTranslation('common')
  const router = useRouter()

  if (reports.length === 0) {
    return (
      <div
        className="rounded-sm border flex flex-col items-center justify-center py-16 gap-4"
        style={{ borderColor: 'rgba(255,255,255,0.06)', borderStyle: 'dashed' }}
      >
        <p
          className="font-mono text-xs tracking-[0.1em] uppercase"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          {t('reports.page.empty')}
        </p>
        <Link
          href="/dashboard/reports/new"
          className="font-mono text-xs uppercase tracking-[0.08em] px-4 py-2 rounded-sm border transition-opacity hover:opacity-80 min-h-[44px] flex items-center"
          style={{ borderColor: 'rgba(232,227,217,0.3)', color: 'var(--color-accent-bone)' }}
        >
          {t('reports.page.new')}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <ReportRow key={report.id} report={report} onMutate={() => router.refresh()} t={t} />
      ))}
    </div>
  )
}

// ─── Row ─────────────────────────────────────────────────────────────────────

interface ReportRowProps {
  report: ReportWithRuns
  onMutate: () => void
  t: (key: string) => string
}

function ReportRow({ report, onMutate, t }: ReportRowProps) {
  const [genState, genAction, genPending] = useActionState(
    async () => {
      const r = await generateReportNow({}, { id: report.id })
      if (r.success) onMutate()
      return r
    },
    {},
  )

  const [statusState, statusAction, statusPending] = useActionState(
    async () => {
      const next = report.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
      const r = await setReportStatus({}, { id: report.id, status: next })
      if (r.success) onMutate()
      return r
    },
    {},
  )

  const [deleteState, deleteAction, deletePending] = useActionState(
    async () => {
      const r = await deleteReport({}, { id: report.id })
      if (r.success) onMutate()
      return r
    },
    {},
  )

  const latestRun = report.runs[0]
  const intervalLabel = report.intervalDays
    ? t('reports.row.interval').replace('{{days}}', String(report.intervalDays))
    : t('reports.row.on_demand')

  const error = genState.errors?._form?.[0] ?? statusState.errors?._form?.[0] ?? deleteState.errors?._form?.[0]

  return (
    <div
      className="rounded-sm border p-4 flex flex-col sm:flex-row sm:items-center gap-4"
      style={{ borderColor: 'rgba(232,227,217,0.1)' }}
    >
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/dashboard/reports/${report.id}`}
            className="font-mono text-sm font-medium hover:underline truncate"
            style={{ color: 'var(--color-primary)' }}
          >
            {report.name}
          </Link>
          <span
            className="font-mono text-[10px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-sm"
            style={{
              background: report.status === 'ACTIVE' ? 'rgba(0,200,100,0.1)' : 'rgba(200,150,0,0.1)',
              // ponytail: no warning token; add --color-warning if a 3rd status appears
              color: report.status === 'ACTIVE' ? 'var(--color-success-green)' : '#fbbf24',
            }}
          >
            {t(`reports.status.${report.status.toLowerCase()}`)}
          </span>
        </div>
        <div className="flex gap-3 mt-1 flex-wrap">
          <span
            className="font-mono text-[11px]"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            {intervalLabel}
          </span>
          {latestRun && (
            <span
              className="font-mono text-[11px]"
              style={{ color: 'var(--color-on-surface-variant)' }}
            >
              {t('reports.row.last_run')} {new Date(latestRun.generatedAt).toLocaleDateString()}
            </span>
          )}
          <span
            className="font-mono text-[11px]"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            {report.runs.length} {t('reports.row.runs')}
          </span>
        </div>
        {(genState as { success?: boolean }).success && (
          <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-success-green)' }}>{t('reports.row.generated_ok')}</p>
        )}
        {error && (
          <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-error)' }}>{error}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap shrink-0">
        <form action={genAction}>
          <button
            type="submit"
            disabled={genPending}
            className="font-mono text-xs uppercase tracking-[0.08em] px-3 py-1.5 rounded-sm border transition-opacity hover:opacity-80 disabled:opacity-50 min-h-[36px]"
            style={{ borderColor: 'rgba(232,227,217,0.3)', color: 'var(--color-accent-bone)' }}
          >
            {genPending ? '…' : t('reports.row.generate')}
          </button>
        </form>

        {latestRun && (
          <Link
            href={`/dashboard/reports/${report.id}`}
            className="font-mono text-xs uppercase tracking-[0.08em] px-3 py-1.5 rounded-sm border transition-opacity hover:opacity-80 min-h-[36px] flex items-center"
            style={{ borderColor: 'rgba(232,227,217,0.2)', color: 'var(--color-on-surface-variant)' }}
          >
            {t('reports.row.view')}
          </Link>
        )}

        <form action={statusAction}>
          <button
            type="submit"
            disabled={statusPending || !report.intervalDays}
            title={!report.intervalDays ? t('reports.row.pause_na') : undefined}
            className="font-mono text-xs uppercase tracking-[0.08em] px-3 py-1.5 rounded-sm border transition-opacity hover:opacity-80 disabled:opacity-50 min-h-[36px]"
            style={{ borderColor: 'rgba(232,227,217,0.2)', color: 'var(--color-on-surface-variant)' }}
          >
            {report.status === 'ACTIVE' ? t('reports.row.pause') : t('reports.row.resume')}
          </button>
        </form>

        <form action={deleteAction} onSubmit={(e) => {
          if (!window.confirm(t('reports.row.confirm_delete'))) e.preventDefault()
        }}>
          <button
            type="submit"
            disabled={deletePending}
            className="font-mono text-xs uppercase tracking-[0.08em] px-3 py-1.5 rounded-sm border transition-opacity hover:opacity-80 disabled:opacity-50 min-h-[36px]"
            style={{ borderColor: 'rgba(200,0,0,0.3)', color: 'var(--color-error)' }}
          >
            {deletePending ? '…' : t('reports.row.delete')}
          </button>
        </form>
      </div>
    </div>
  )
}
