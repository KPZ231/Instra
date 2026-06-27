import { NextResponse } from 'next/server'
import { getDueReports, advanceReport } from '@/lib/api/reports'
import { generateReportRun } from '@/lib/reports/generate'
import { invalidatePrefix } from '@/lib/cache'

// Allow up to 60 s on Vercel Pro/Enterprise to process a batch of reports.
export const maxDuration = 60

/**
 * Cron endpoint: processes all reports due for execution.
 * Called by Vercel Cron (see vercel.json). Gated by CRON_SECRET.
 *
 * ponytail: brak per-report locking  cron co godzinę, min. interwał tygodniowy,
 * więc nakładanie ticków praktycznie niemożliwe. Gdyby wolumen wzrósł →
 * claim (UPDATE status=RUNNING) przed wykonaniem.
 *
 * @returns { processed, failed, total }
 */
export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET
  const auth   = request.headers.get('authorization')

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const reports = await getDueReports(50)

  let processed = 0
  let failed    = 0

  await Promise.allSettled(
    reports.map(async (report) => {
      try {
        await generateReportRun(report)
        await advanceReport(report)
        processed++
      } catch (err) {
        failed++
        console.error(`[cron/reports] report ${report.id} failed:`, err)
      }
    }),
  )

  if (reports.length > 0) {
    await invalidatePrefix('db', 'reports')
  }

  return NextResponse.json({ processed, failed, total: reports.length })
}
