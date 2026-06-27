'use server'

import { verifySession } from '@/lib/auth/dal'
import { invalidatePrefix } from '@/lib/cache'
import { getReport, deleteReport as dbDeleteReport } from '@/lib/api/reports'
import { DeleteReportSchema } from '../validation'

export interface DeleteReportState {
  success?: boolean
  errors?: { _form?: string[] }
}

/**
 * Server Action: permanently deletes a report and all its runs.
 * Ownership is checked  only the report owner can delete.
 *
 * @param state - Previous action state
 * @param input - { id }
 * @returns DeleteReportState
 *
 * @example
 * await deleteReport({}, { id: 'clx...' })
 */
export async function deleteReport(
  state: DeleteReportState,
  input: { id: string },
): Promise<DeleteReportState> {
  const { user } = await verifySession()

  const parsed = DeleteReportSchema.safeParse(input)
  if (!parsed.success) return { errors: { _form: ['Invalid input'] } }

  const report = await getReport(parsed.data.id, user.id)
  if (!report) return { errors: { _form: ['Report not found'] } }

  await dbDeleteReport(report.id)
  await invalidatePrefix('db', 'reports')

  return { success: true }
}
