import { RATE_LIMIT_PRESETS, type RateLimitPresetKey, type RateLimitPreset } from './config'
import { getLimiter } from './client'
import { RateLimitError } from './errors'
import { getIp } from './getIp'

/**
 * Enforces a sliding-window rate limit inside a server action.
 * Throws RateLimitError immediately when the caller exceeds the quota.
 *
 * @param preset  - Named preset from RATE_LIMIT_PRESETS or an inline {limit, window} config
 * @param keyFn   - Optional function that builds a custom identifier from the caller's IP.
 *                  Useful when you need per-account limits: (ip) => `${ip}:${email}`.
 *                  Defaults to the raw IP when omitted.
 * @throws RateLimitError with retryAfter in seconds
 *
 * @example
 * // Named preset, IP-only identifier
 * await rateLimit('login')
 *
 * @example
 * // Named preset, per-account identifier
 * await rateLimit('forgotPassword', (ip) => `${ip}:${email}`)
 *
 * @example
 * // Inline config (no preset entry needed)
 * await rateLimit({ limit: 10, window: '1 h' })
 */
export async function rateLimit(
  preset: RateLimitPresetKey | RateLimitPreset,
  keyFn?: (ip: string) => string,
): Promise<void> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return
  }

  const isNamed = typeof preset === 'string'
  const config = isNamed ? RATE_LIMIT_PRESETS[preset] : preset
  const actionKey = isNamed ? preset : 'custom'

  const ip = await getIp()
  const identifier = keyFn ? keyFn(ip) : ip

  const limiter = getLimiter(actionKey, config.limit, config.window)
  const result = await limiter.limit(identifier)

  console.log(`[rateLimit] action=${actionKey} ip=${identifier} success=${result.success} remaining=${result.remaining} reset=${result.reset}`)

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)
    throw new RateLimitError(retryAfter > 0 ? retryAfter : 60)
  }
}
