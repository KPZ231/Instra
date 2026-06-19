import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth/dal'
import { getConnectedAccounts } from '@/lib/api/socialAccounts'

/**
 * GET /api/social/accounts
 * Returns the current user's connected social accounts (no tokens).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const { user } = await verifySession()
    const accounts = await getConnectedAccounts(user.id)
    return NextResponse.json({ accounts })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
