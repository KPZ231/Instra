import 'server-only'

import { prisma } from '@/lib/prisma'
import { getPostsAnalyticsOverview } from '@/lib/api/analytics'
import { createNotification } from '@/lib/api/notifications'
import type { Report, ReportRun } from '@prisma/client'
import type { ReportConfig } from '@/lib/api/reports'
import type { AnalyticsOverviewData } from '@/features/analytics'

export type ReportSection = 'stats' | 'chart' | 'posts' | 'prediction' | 'tip'

export const VALID_SECTIONS: ReportSection[] = ['stats', 'chart', 'posts', 'prediction', 'tip']

/** Subset of AnalyticsOverviewData keyed by section name. */
type ReportSnapshot = Partial<{
  stats:      Pick<AnalyticsOverviewData, 'totals' | 'delta'>
  chart:      Pick<AnalyticsOverviewData, 'series'>
  posts:      Pick<AnalyticsOverviewData, 'posts'>
  prediction: Pick<AnalyticsOverviewData, 'prediction'>
  tip:        Pick<AnalyticsOverviewData, 'dailyTip'>
}>

/**
 * Generates a ReportRun for the given report.
 * Fetches the current analytics overview and snapshots only the requested sections.
 * Sends an in-app notification when done.
 *
 * @param report - The report to generate (must include userId, config, id)
 * @returns Created ReportRun
 *
 * @example
 * const run = await generateReportRun(report)
 */
export async function generateReportRun(report: Report): Promise<ReportRun> {
  const overview = await getPostsAnalyticsOverview()
  if (!overview) throw new Error('Unable to retrieve analytics  user not authenticated')

  const config = report.config as unknown as ReportConfig
  const sections = config.sections as ReportSection[]

  const data: ReportSnapshot = {}

  if (sections.includes('stats'))      data.stats      = { totals: overview.totals, delta: overview.delta }
  if (sections.includes('chart'))      data.chart      = { series: overview.series }
  if (sections.includes('posts'))      data.posts      = { posts: overview.posts }
  if (sections.includes('prediction')) data.prediction = { prediction: overview.prediction }
  if (sections.includes('tip'))        data.tip        = { dailyTip: overview.dailyTip }

  const run = await prisma.reportRun.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { reportId: report.id, data: data as any },
  })

  await prisma.report.update({
    where: { id: report.id },
    data:  { lastRunAt: new Date() },
  })

  void createNotification({
    userId:  report.userId,
    type:    'REPORT_READY',
    title:   'Report ready',
    message: `"${report.name}" has been generated.`,
    link:    `/dashboard/reports/${report.id}`,
  })

  return run
}
