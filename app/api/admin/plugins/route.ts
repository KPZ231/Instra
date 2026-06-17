import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth/config'

/**
 * GET /api/admin/plugins
 * Lists all plugin versions awaiting review. Admin-only.
 *
 * @returns {NextResponse} JSON with `versions` array or error
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const versions = await prisma.pluginVersion.findMany({
    where: { status: 'PENDING_REVIEW' },
    include: { plugin: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ versions })
}
