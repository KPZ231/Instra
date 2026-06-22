import 'server-only'

import { prisma } from '@/lib/prisma'
import type { Report, ReportRun, ReportStatus } from '@prisma/client'

export type { Report, ReportRun }

export type ReportConfig = {
  sections: string[]
}

export type CreateReportInput = {
  userId: string
  name: string
  config: ReportConfig
  intervalDays?: number
  nextRunAt?: Date
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns all reports for a user, newest first.
 *
 * @param userId - The user's ID
 * @returns Array of Report rows
 *
 * @example
 * const reports = await listReports(user.id)
 */
export async function listReports(userId: string): Promise<Report[]> {
  return prisma.report.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Returns a single report by ID, with ownership check.
 *
 * @param id     - Report ID
 * @param userId - Must match report.userId
 * @returns Report or null if not found / not owned by user
 *
 * @example
 * const report = await getReport('clx...', user.id)
 */
export async function getReport(id: string, userId: string): Promise<Report | null> {
  const report = await prisma.report.findUnique({ where: { id } })
  if (!report || report.userId !== userId) return null
  return report
}

/**
 * Returns reports due for execution: ACTIVE and nextRunAt <= now.
 * Ordered by nextRunAt ascending (oldest due first).
 *
 * @param limit - Max rows to fetch (default 50)
 * @returns Array of Report rows
 *
 * @example
 * const due = await getDueReports(50)
 */
export async function getDueReports(limit = 50): Promise<Report[]> {
  return prisma.report.findMany({
    where: { status: 'ACTIVE', nextRunAt: { lte: new Date() } },
    orderBy: { nextRunAt: 'asc' },
    take: limit,
  })
}

/**
 * Returns recent run history for a report, newest first.
 *
 * @param reportId - Report ID
 * @param limit    - Max rows (default 20)
 * @returns Array of ReportRun rows
 *
 * @example
 * const runs = await listReportRuns('clx...')
 */
export async function listReportRuns(reportId: string, limit = 20): Promise<ReportRun[]> {
  return prisma.reportRun.findMany({
    where: { reportId },
    orderBy: { generatedAt: 'desc' },
    take: limit,
  })
}

/**
 * Returns a single report run, with ownership check via the parent report.
 *
 * @param runId  - ReportRun ID
 * @param userId - Must match run.report.userId
 * @returns ReportRun or null
 *
 * @example
 * const run = await getReportRun('clx...', user.id)
 */
export async function getReportRun(runId: string, userId: string): Promise<ReportRun | null> {
  const run = await prisma.reportRun.findUnique({
    where: { id: runId },
    include: { report: { select: { userId: true } } },
  })
  if (!run || (run as ReportRun & { report: { userId: string } }).report.userId !== userId)
    return null
  return run
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Creates a new report definition.
 *
 * @param data - Report creation input
 * @returns Created Report
 *
 * @example
 * const report = await createReport({ userId, name: 'Weekly', config: { sections: ['stats'] } })
 */
export async function createReport(data: CreateReportInput): Promise<Report> {
  return prisma.report.create({
    data: {
      userId:      data.userId,
      name:        data.name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config:      data.config as any,
      intervalDays: data.intervalDays ?? null,
      nextRunAt:   data.nextRunAt ?? null,
    },
  })
}

/**
 * Sets the status of a report (pause / resume).
 *
 * @param id     - Report ID
 * @param status - Target status
 * @returns Updated Report
 *
 * @example
 * await setReportStatus('clx...', 'PAUSED')
 */
export async function setReportStatus(id: string, status: ReportStatus): Promise<Report> {
  return prisma.report.update({ where: { id }, data: { status } })
}

/**
 * Permanently deletes a report and all its runs.
 *
 * @param id - Report ID
 *
 * @example
 * await deleteReport('clx...')
 */
export async function deleteReport(id: string): Promise<void> {
  await prisma.report.delete({ where: { id } })
}

/**
 * Advances a report after a scheduled run: pushes nextRunAt forward by intervalDays.
 *
 * @param report - The report row
 * @returns Updated Report
 *
 * @example
 * await advanceReport(report)
 */
export async function advanceReport(report: Report): Promise<Report> {
  if (!report.intervalDays || !report.nextRunAt) {
    // on-demand only — should never reach here from cron, but guard defensively
    return report
  }

  const nextRunAt = new Date(report.nextRunAt)
  nextRunAt.setDate(nextRunAt.getDate() + report.intervalDays)

  return prisma.report.update({
    where: { id: report.id },
    data:  { nextRunAt, lastRunAt: new Date() },
  })
}
