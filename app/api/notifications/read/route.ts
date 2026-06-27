import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth/dal'
import { markRead, markAllRead } from '@/lib/api/notifications'

/**
 * POST /api/notifications/read
 * Body: { id?: string }  omit id to mark all as read.
 *
 * @param req - Request with optional JSON body { id?: string }
 * @returns JSON { ok: true }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { user } = await verifySession()
  const body = (await req.json()) as { id?: string }

  if (body.id) {
    await markRead(user.id, body.id)
  } else {
    await markAllRead(user.id)
  }

  return NextResponse.json({ ok: true })
}
