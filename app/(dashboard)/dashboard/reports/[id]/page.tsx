import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/auth/dal'
import { getReport, listReportRuns } from '@/lib/api/reports'
import { ReportRuns } from '@/components/ui/reports/ReportRuns'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Report ${id}  Instra`,
    robots: { index: false, follow: false },
  }
}

/**
 * Report detail page: shows run history with a functional run picker.
 * Ownership checked via getReport (returns null → 404).
 */
export default async function ReportDetailPage({ params }: Props) {
  const { id } = await params
  const { user } = await verifySession()

  const report = await getReport(id, user.id)
  if (!report) notFound()

  const runs = await listReportRuns(report.id, 20)

  return <ReportRuns report={report} runs={runs} />
}
