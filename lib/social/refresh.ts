import 'server-only'

import { decrypt, encrypt } from './crypto'
import { upsertSocialAccount } from '@/lib/api/socialAccounts'
import type { SocialAccountRow } from '@/lib/api/socialAccounts'

const REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const META_GRAPH = 'https://graph.facebook.com/v19.0'

/**
 * Returns a plaintext, fresh access token for the given account.
 *
 * - If `expiresAt` is null or more than 7 days away → decrypt and return immediately (no API call).
 * - FACEBOOK / INSTAGRAM expiring within 7 days → call fb_exchange_token to extend by 60 days,
 *   persist the new token + expiresAt, return plaintext new token.
 * - LINKEDIN → basic tier has no refresh tokens; throw a user-friendly error so the caller
 *   can surface "reconnect your account" to the user.
 *
 * ponytail: lazy refresh only — no cron; LinkedIn basic tier has no refresh tokens → reconnect path
 *
 * @param account - Full SocialAccountRow including encrypted accessToken
 * @returns Plaintext access token (fresh or already valid)
 *
 * @example
 * const token = await ensureFreshToken(account)
 */
export async function ensureFreshToken(account: SocialAccountRow): Promise<string> {
  const plaintext = decrypt(account.accessToken)

  const needsRefresh =
    account.expiresAt !== null &&
    account.expiresAt.getTime() - Date.now() < REFRESH_THRESHOLD_MS

  if (!needsRefresh) return plaintext

  if (account.platform === 'LINKEDIN') {
    throw new Error('Token LinkedIn wygasł — połącz konto ponownie w ustawieniach')
  }

  // Meta: extend via fb_exchange_token
  const appId = process.env.META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!

  const tokenToExchange =
    account.platform === 'INSTAGRAM' && account.pageAccessToken
      ? decrypt(account.pageAccessToken)
      : plaintext

  const res = await fetch(`${META_GRAPH}/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: tokenToExchange,
    }),
  })
  if (!res.ok) {
    // Non-fatal: return current token and let the API call fail naturally
    const err = (await res.json()) as { error?: { message?: string } }
    const msg = err.error?.message ?? `Meta token refresh failed ${res.status}`
    throw new Error(msg)
  }
  const data = (await res.json()) as { access_token: string; expires_in?: number }
  const newToken = data.access_token
  const newExpiresAt = new Date(Date.now() + (data.expires_in ?? 5184000) * 1000)

  if (account.platform === 'FACEBOOK') {
    // Also refresh page access token (page tokens don't expire when user token is refreshed via exchange)
    // Get fresh page token from /me/accounts
    let newPageAccessToken: string | undefined
    const pagesRes = await fetch(`${META_GRAPH}/me/accounts?access_token=${newToken}`)
    if (pagesRes.ok) {
      const pages = (await pagesRes.json()) as { data: { id: string; access_token: string }[] }
      const page = pages.data.find((p) => p.id === account.pageId) ?? pages.data[0]
      if (page) newPageAccessToken = page.access_token
    }

    await upsertSocialAccount({
      userId: account.userId,
      platform: 'FACEBOOK',
      accessToken: encrypt(newToken),
      expiresAt: newExpiresAt,
      platformUserId: account.platformUserId,
      platformUsername: account.platformUsername,
      pageId: account.pageId ?? undefined,
      pageAccessToken: newPageAccessToken ? encrypt(newPageAccessToken) : undefined,
    })
    // Return user token; publisher uses pageAccessToken separately from the refreshed account row
    return newToken
  }

  // INSTAGRAM — token IS the page token; update it
  await upsertSocialAccount({
    userId: account.userId,
    platform: 'INSTAGRAM',
    accessToken: encrypt(newToken),
    expiresAt: newExpiresAt,
    platformUserId: account.platformUserId,
    platformUsername: account.platformUsername,
  })
  return newToken
}
