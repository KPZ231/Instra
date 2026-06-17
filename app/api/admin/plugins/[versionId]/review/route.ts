import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/config'
import { approveVersion, rejectVersion } from '@/lib/plugins/registry'
import { prisma } from '@/lib/prisma'

const reviewSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('approve') }),
  z.object({ decision: z.literal('reject'), reason: z.string().min(1).max(500) }),
])

/**
 * POST /api/admin/plugins/[versionId]/review
 * Approves or rejects a PENDING_REVIEW plugin version. Admin-only.
 *
 * @param request - The incoming request with JSON body `{ decision: 'approve' | 'reject', reason?: string }`
 * @param params - Route params containing `versionId`
 * @returns {NextResponse} JSON `{ ok: true }` on success or error
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ versionId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { versionId } = await params
  const parsed = reviewSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const version = await prisma.pluginVersion.findUnique({ where: { id: versionId } })
  if (!version) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 })
  }

  if (parsed.data.decision === 'approve') {
    await approveVersion(versionId, session.user.id)
  } else {
    await rejectVersion(versionId, session.user.id, parsed.data.reason)
  }

  return NextResponse.json({ ok: true })
}
