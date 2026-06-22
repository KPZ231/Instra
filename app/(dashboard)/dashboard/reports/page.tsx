import type { Metadata } from 'next'
import Link from 'next/link'
import { verifySession } from '@/lib/auth/dal'
import { listReports, listReportRuns } from '@/lib/api/reports'
import { ReportList } from '@/components/ui/reports/ReportList'

export const metadata: Metadata = {
  title: 'Reports — Instra',
  robots: { index: false, follow: false },
}

/**
 * Reports dashboard page.
 * Lists all report definitions with their latest runs.
 * Mutations (generate now, pause, delete) are handled client-side via server actions.
 */
export default async function ReportsPage() {
  const { user } = await verifySession()

  const reports = await listReports(user.id)

  const reportsWithRuns = await Promise.all(
    reports.map(async (report) => ({
      ...report,
      runs: await listReportRuns(report.id, 5),
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
            {'// REPORTS'}
          </p>
          <h1
            className="font-sans text-2xl font-semibold"
            style={{ color: 'var(--color-primary)' }}
          >
            Reports
          </h1>
        </div>
        {reports.length > 0 && (
          <Link
            href="/dashboard/reports/new"
            className="px-4 py-2 rounded-sm font-mono text-xs tracking-[0.08em] uppercase border transition-opacity hover:opacity-80 min-h-[44px] flex items-center"
            style={{ borderColor: 'rgba(232,227,217,0.3)', color: 'var(--color-accent-bone)' }}
          >
            + New Report
          </Link>
        )}
      </div>

      <ReportList reports={reportsWithRuns} />
    </div>
  )
}
