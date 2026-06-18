import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { rateLimit, RateLimitError } from '@/lib/rate-limit'
import { getIp } from '@/lib/rate-limit/getIp'
import { randomUUID } from 'crypto'

const OAUTH_URLS: Record<string, string> = {
  facebook: 'https://www.facebook.com/v19.0/dialog/oauth',
  instagram: 'https://www.facebook.com/v19.0/dialog/oauth', // same as FB — Meta handles both
  linkedin: 'https://www.linkedin.com/oauth/v2/authorization',
}

const SCOPES: Record<string, string> = {
  facebook: 'pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish',
  instagram: 'pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish',
  linkedin: 'w_member_social,r_liteprofile',
}

/**
 * GET /api/social/connect/[platform]
 * Initiates the OAuth flow for the given platform.
 * Stores a CSRF state token in a cookie.
 *
 * @param req      - The incoming request
 * @param params   - Route params containing the platform name
 * @returns Redirect to the platform's OAuth authorization URL
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { platform: string } },
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const platform = params.platform.toLowerCase()
  const oauthUrl = OAUTH_URLS[platform]
  if (!oauthUrl) {
    return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
  }

  try {
    const ip = await getIp()
    await rateLimit('socialConnect', () => `${ip}:${session.user!.id}`)
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }
    throw error
  }

  const state = randomUUID()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const callbackUrl = `${appUrl}/api/social/callback/${platform}`

  const url = new URL(oauthUrl)
  url.searchParams.set('client_id', platform === 'linkedin'
    ? process.env.LINKEDIN_CLIENT_ID!
    : process.env.META_APP_ID!
  )
  url.searchParams.set('redirect_uri', callbackUrl)
  url.searchParams.set('scope', SCOPES[platform])
  url.searchParams.set('state', state)
  if (platform !== 'linkedin') url.searchParams.set('response_type', 'code')

  const response = NextResponse.redirect(url.toString())
  response.cookies.set('social_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })
  return response
}
