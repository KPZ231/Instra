import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { deleteSocialAccount } from '@/lib/api/socialAccounts'
import { createNotification } from '@/lib/api/notifications'
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
  { params }: { params: Promise<{ platform: string }> },
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const platform = PLATFORM_MAP[(await params).platform.toLowerCase()]
  if (!platform) return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })

  try {
    await deleteSocialAccount(session.user.id, platform)

    void createNotification({
      userId: session.user.id,
      type: 'SOCIAL_DISCONNECTED',
      title: 'Account disconnected',
      message: `Your ${platform.toLowerCase()} account has been disconnected.`,
      link: '/dashboard/settings/social',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }
    console.error('Disconnect error:', error)
    return NextResponse.json({ error: 'Failed to disconnect account' }, { status: 500 })
  }
}
