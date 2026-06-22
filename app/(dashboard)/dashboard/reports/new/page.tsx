import type { Metadata } from 'next'
import { ReportForm } from '@/components/ui/reports/ReportForm'

export const metadata: Metadata = {
  title: 'New Report — Instra',
  robots: { index: false, follow: false },
}

/**
 * Page for creating a new report definition.
 * On success, redirects to the reports list.
 */
export default function NewReportPage() {
  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <p
          className="font-mono text-xs tracking-[0.12em] uppercase mb-1"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          {'// NEW REPORT'}
        </p>
        <h1
          className="font-sans text-2xl font-semibold"
          style={{ color: 'var(--color-primary)' }}
        >
          New Report
        </h1>
      </div>

      {/* ponytail: redirect via server action onSuccess in client form */}
      <ReportForm />
    </div>
  )
}
