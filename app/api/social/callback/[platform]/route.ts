import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { encrypt } from '@/lib/social/crypto'
import { upsertSocialAccount } from '@/lib/api/socialAccounts'
import type { SocialPlatform } from '@/lib/social/types'

const PLATFORM_MAP: Record<string, SocialPlatform> = {
  facebook: 'FACEBOOK',
  instagram: 'INSTAGRAM',
  linkedin: 'LINKEDIN',
}

/**
 * GET /api/social/callback/[platform]
 * Handles OAuth callback: exchanges code for token, fetches profile, stores encrypted account.
 *
 * @param req    - The incoming request with `code` and `state` search params
 * @param params - Route params containing the platform name
 * @returns Redirect to /dashboard/settings/social with success or error query param
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { platform: string } },
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.redirect(new URL('/signin', req.url))

  const platform = params.platform.toLowerCase()
  const socialPlatform = PLATFORM_MAP[platform]
  if (!socialPlatform) return NextResponse.redirect(new URL('/dashboard/settings/social?error=unsupported', req.url))

  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const storedState = req.cookies.get('social_oauth_state')?.value

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(new URL('/dashboard/settings/social?error=invalid_state', req.url))
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const redirectUri = `${appUrl}/api/social/callback/${platform}`

  try {
    if (platform === 'linkedin') {
      await handleLinkedIn(session.user.id, code, redirectUri)
    } else {
      await handleMeta(session.user.id, platform as 'facebook' | 'instagram', code, redirectUri)
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'oauth_error'
    const response = NextResponse.redirect(
      new URL(`/dashboard/settings/social?error=${encodeURIComponent(msg)}`, req.url),
    )
    response.cookies.delete('social_oauth_state')
    return response
  }

  const response = NextResponse.redirect(
    new URL('/dashboard/settings/social?success=true', req.url),
  )
  response.cookies.delete('social_oauth_state')
  return response
}

/**
 * Exchanges a LinkedIn auth code for tokens and saves the account.
 *
 * @param userId      - The authenticated user's ID
 * @param code        - Authorization code from LinkedIn
 * @param redirectUri - Callback URL registered with LinkedIn
 */
async function handleLinkedIn(userId: string, code: string, redirectUri: string): Promise<void> {
  // Exchange code for token
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  })
  if (!tokenRes.ok) throw new Error('LinkedIn token exchange failed')
  const tokenData = (await tokenRes.json()) as { access_token: string; expires_in: number }

  // Fetch profile
  const profileRes = await fetch('https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  if (!profileRes.ok) throw new Error('LinkedIn profile fetch failed')
  const profile = (await profileRes.json()) as { id: string; localizedFirstName: string; localizedLastName: string }

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

  await upsertSocialAccount({
    userId,
    platform: 'LINKEDIN',
    accessToken: encrypt(tokenData.access_token),
    expiresAt,
    platformUserId: `urn:li:person:${profile.id}`,
    platformUsername: `${profile.localizedFirstName} ${profile.localizedLastName}`,
  })
}

/**
 * Exchanges a Meta auth code for tokens and saves the Facebook (and optionally Instagram) account.
 *
 * @param userId      - The authenticated user's ID
 * @param platform    - 'facebook' or 'instagram'
 * @param code        - Authorization code from Meta
 * @param redirectUri - Callback URL registered with Meta
 */
async function handleMeta(
  userId: string,
  platform: 'facebook' | 'instagram',
  code: string,
  redirectUri: string,
): Promise<void> {
  const appId = process.env.META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!

  // Short-lived token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`,
  )
  if (!tokenRes.ok) throw new Error('Meta token exchange failed')
  const tokenData = (await tokenRes.json()) as { access_token: string }

  // Exchange for long-lived token (60 days)
  const longRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`,
  )
  if (!longRes.ok) throw new Error('Meta long-lived token exchange failed')
  const longData = (await longRes.json()) as { access_token: string; expires_in: number }
  const longToken = longData.access_token
  const expiresAt = new Date(Date.now() + (longData.expires_in ?? 5184000) * 1000)

  // Get user profile
  const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${longToken}`)
  if (!meRes.ok) throw new Error('Meta profile fetch failed')
  const me = (await meRes.json()) as { id: string; name: string }

  // Get Pages the user manages
  const pagesRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?access_token=${longToken}`,
  )
  if (!pagesRes.ok) throw new Error('Meta pages fetch failed')
  const pagesData = (await pagesRes.json()) as { data: { id: string; name: string; access_token: string }[] }
  const page = pagesData.data[0]
  if (!page) throw new Error('No Facebook Pages found. Create a Facebook Page first.')

  // Save Facebook account
  await upsertSocialAccount({
    userId,
    platform: 'FACEBOOK',
    accessToken: encrypt(longToken),
    expiresAt,
    platformUserId: me.id,
    platformUsername: page.name,
    pageId: page.id,
    pageAccessToken: encrypt(page.access_token),
  })

  if (platform === 'instagram') {
    // Get Instagram Business Account linked to the Page
    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
    )
    if (!igRes.ok) throw new Error('Instagram account fetch failed')
    const igData = (await igRes.json()) as { instagram_business_account?: { id: string } }
    if (!igData.instagram_business_account) {
      throw new Error('No Instagram Business Account linked to this Facebook Page.')
    }
    const igId = igData.instagram_business_account.id

    // Get IG username
    const igProfileRes = await fetch(
      `https://graph.facebook.com/v19.0/${igId}?fields=username&access_token=${page.access_token}`,
    )
    const igProfile = (await igProfileRes.json()) as { username: string }

    await upsertSocialAccount({
      userId,
      platform: 'INSTAGRAM',
      accessToken: encrypt(page.access_token),
      expiresAt,
      platformUserId: igId,
      platformUsername: igProfile.username ?? igId,
    })
  }
}
