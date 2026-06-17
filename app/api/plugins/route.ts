import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { listApprovedPlugins } from '@/lib/plugins/registry'

/**
 * GET /api/plugins
 * Lists all approved plugin versions available to install.
 * @returns JSON with `versions` array of approved plugin versions
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const versions = await listApprovedPlugins()
  return NextResponse.json({ versions })
}
