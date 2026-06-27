'use server'

import { verifySession } from '@/lib/auth/dal'
import { invalidatePrefix } from '@/lib/cache'
import { getReport, setReportStatus as dbSetStatus } from '@/lib/api/reports'
import { SetReportStatusSchema } from '../validation'

export interface SetReportStatusState {
  success?: boolean
  errors?: { _form?: string[] }
}

/**
 * Server Action: pauses or resumes a report.
 * Ownership is checked  only the report owner can change status.
 *
 * @param state - Previous action state
 * @param input - { id, status }
 * @returns SetReportStatusState
 *
 * @example
 * await setReportStatus({}, { id: 'clx...', status: 'PAUSED' })
 */
export async function setReportStatus(
  state: SetReportStatusState,
  input: { id: string; status: string },
): Promise<SetReportStatusState> {
  const { user } = await verifySession()

  const parsed = SetReportStatusSchema.safeParse(input)
  if (!parsed.success) return { errors: { _form: ['Invalid input'] } }

  const report = await getReport(parsed.data.id, user.id)
  if (!report) return { errors: { _form: ['Report not found'] } }

  await dbSetStatus(report.id, parsed.data.status)
  await invalidatePrefix('db', 'reports')

  return { success: true }
}
