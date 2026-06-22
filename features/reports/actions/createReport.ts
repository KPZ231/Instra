'use server'

import { verifySession } from '@/lib/auth/dal'
import { rateLimit, RateLimitError } from '@/lib/rate-limit'
import { invalidatePrefix } from '@/lib/cache'
import { createReport as dbCreateReport } from '@/lib/api/reports'
import { CreateReportSchema, type CreateReportInput } from '../validation'

export interface CreateReportState {
  success?: boolean
  reportId?: string
  errors?: { _form?: string[]; [field: string]: string[] | undefined }
}

/**
 * Server Action: creates a new report definition for the authenticated user.
 * Rate-limited to 10 creates/hour per user.
 *
 * @param state - Previous action state (from useActionState)
 * @param input - Report creation input
 * @returns CreateReportState
 *
 * @example
 * await createReport({}, { name: 'Weekly', sections: ['stats', 'chart'], intervalDays: 7 })
 */
export async function createReport(
  state: CreateReportState,
  input: CreateReportInput,
): Promise<CreateReportState> {
  const { user } = await verifySession()

  try {
    await rateLimit('createReport', (ip) => `${ip}:${user.id}`)
  } catch (error) {
    if (error instanceof RateLimitError) return { errors: { _form: [error.message] } }
    throw error
  }

  const parsed = CreateReportSchema.safeParse(input)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as CreateReportState['errors'] }
  }

  const intervalDays = parsed.data.intervalDays
  const nextRunAt    = intervalDays ? (() => {
    const d = new Date()
    d.setDate(d.getDate() + intervalDays)
    return d
  })() : undefined

  const report = await dbCreateReport({
    userId:      user.id,
    name:        parsed.data.name,
    config:      { sections: parsed.data.sections },
    intervalDays,
    nextRunAt,
  })

  await invalidatePrefix('db', 'reports')

  return { success: true, reportId: report.id }
}
