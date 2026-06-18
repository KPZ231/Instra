import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { deleteSocialAccount } from '@/lib/api/socialAccounts'
import type { SocialPlatform } from '@/lib/social/types'

const PLATFORM_MAP: Record<string, SocialPlatform> = {
  facebook: 'FACEBOOK',
  instagram: 'INSTAGRAM',
  linkedin: 'LINKEDIN',
}

/**
 * DELETE /api/social/disconnect/[platform]
 * Removes the user's connected social account for the given platform.
 *
 * @param req    - The incoming request
 * @param params - Route params containing the platform name
 * @returns JSON `{ success: true }` or an error response
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { platform: string } },
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const platform = PLATFORM_MAP[params.platform.toLowerCase()]
  if (!platform) return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })

  try {
    await deleteSocialAccount(session.user.id, platform)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }
}
