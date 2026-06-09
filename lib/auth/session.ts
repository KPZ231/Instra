import 'server-only'
import { createHmac } from 'crypto'

export const FINGERPRINT_COOKIE_NAME = '__fp'

export const FINGERPRINT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
}

/**
 * Computes a fingerprint HMAC for a given user-agent string.
 * Bound to AUTH_SECRET so fingerprints from different deployments don't collide.
 * @param userAgent - The User-Agent header value from the HTTP request
 * @returns Hex-encoded HMAC-SHA256 digest
 */
export async function computeFingerprint(userAgent: string): Promise<string> {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')

  return createHmac('sha256', secret).update(userAgent).digest('hex')
}
