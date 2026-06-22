'use server'

import { verifySession } from '@/lib/auth/dal'
import { rateLimit, RateLimitError } from '@/lib/rate-limit'
import { invalidatePrefix } from '@/lib/cache'
import { getReport } from '@/lib/api/reports'
import { generateReportRun } from '@/lib/reports/generate'
import { GenerateReportNowSchema } from '../validation'

export interface GenerateReportNowState {
  success?: boolean
  runId?: string
  errors?: { _form?: string[]; [field: string]: string[] | undefined }
}

/**
 * Server Action: generates a report run on-demand for the authenticated user.
 * Rate-limited to 5 generates/hour per user (analytics aggregation is expensive).
 *
 * @param state - Previous action state
 * @param input - { id: reportId }
 * @returns GenerateReportNowState
 *
 * @example
 * await generateReportNow({}, { id: 'clx...' })
 */
export async function generateReportNow(
  state: GenerateReportNowState,
  input: { id: string },
): Promise<GenerateReportNowState> {
  const { user } = await verifySession()

  try {
    await rateLimit('generateReport', (ip) => `${ip}:${user.id}`)
  } catch (error) {
    if (error instanceof RateLimitError) return { errors: { _form: [error.message] } }
    throw error
  }

  const parsed = GenerateReportNowSchema.safeParse(input)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as GenerateReportNowState['errors'] }
  }

  const report = await getReport(parsed.data.id, user.id)
  if (!report) return { errors: { _form: ['Report not found'] } }

  const run = await generateReportRun(report)

  await invalidatePrefix('db', 'reports')

  return { success: true, runId: run.id }
}
