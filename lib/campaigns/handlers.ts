import 'server-only'

import dns from 'node:dns/promises'
import { publishPost } from '@/lib/social/publisher'
import type { Campaign, CampaignAction } from '@prisma/client'

/**
 * Payload shape for PUBLISH_POST campaigns.
 * postIds (array) is the canonical form; postId (legacy single) is kept for backwards compat.
 */
type PublishPostPayload = { postIds?: string[]; postId?: string }

/**
 * Payload shape for WEBHOOK campaigns.
 */
type WebhookPayload = {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: string
}

// ─── SSRF guard ───────────────────────────────────────────────────────────────

const PRIVATE_RANGES_V4 = [
  /^127\./,          // loopback 127/8
  /^0\./,            // 0.0.0.0/8
  /^10\./,           // RFC1918 10/8
  /^172\.(1[6-9]|2\d|3[01])\./,  // RFC1918 172.16/12
  /^192\.168\./,     // RFC1918 192.168/16
  /^169\.254\./,     // link-local
  /^100\.(6[4-9]|[7-9]\d|1([01]\d|2[0-7]))\./,  // CGNAT 100.64/10
]

function isPrivateIPv4(ip: string): boolean {
  return PRIVATE_RANGES_V4.some((re) => re.test(ip))
}

function hexToDottedQuad(hex: string): string {
  // converts "c0a80001" or "c0a8:0001" style to "192.168.0.1"
  const clean = hex.replace(/:/g, '').padStart(8, '0')
  return [0, 2, 4, 6].map((i) => parseInt(clean.slice(i, i + 2), 16)).join('.')
}

function isPrivateIPv6(ip: string): boolean {
  const n = ip.toLowerCase()
  if (n === '::1' || n === '::') return true
  // IPv4-mapped (::ffff:a.b.c.d or ::ffff:hhhh:hhhh) and IPv4-compatible (::a.b.c.d)
  const v4mapped = n.match(/^::(?:ffff:)?([0-9a-f.:]+)$/)
  if (v4mapped) {
    const v4 = v4mapped[1].includes('.') ? v4mapped[1] : hexToDottedQuad(v4mapped[1])
    return isPrivateIPv4(v4)
  }
  if (/^fe[89ab]/i.test(n)) return true  // fe80::/10 link-local
  if (/^f[cd]/i.test(n)) return true     // fc00::/7 unique-local
  return false
}

/**
 * Validates a webhook URL against SSRF vectors:
 * - Only http/https schemes allowed
 * - Resolves ALL DNS addresses and rejects if any resolve to a private/loopback range
 *
 * Must be called again at execution time (not just at creation time) because
 * DNS TTL can expire and re-resolve to a different address (DNS rebinding).
 *
 * @param rawUrl - Raw URL string from user payload
 * @returns Validated URL object
 * @throws Error if the URL is disallowed
 */
async function assertSafeWebhookUrl(rawUrl: string): Promise<URL> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error('WEBHOOK url is not a valid URL')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('WEBHOOK url must use http or https')
  }

  const hostname = parsed.hostname

  // Reject numeric IPv4/IPv6 literals directly without DNS lookup
  if (isPrivateIPv4(hostname)) {
    throw new Error('WEBHOOK url resolves to a disallowed private address')
  }
  if (hostname.startsWith('[')) {
    // IPv6 literal: strip brackets
    const ipv6 = hostname.slice(1, -1)
    if (isPrivateIPv6(ipv6)) {
      throw new Error('WEBHOOK url resolves to a disallowed private address')
    }
  }

  // DNS resolution check  all returned addresses must be public
  const addresses = await dns.lookup(hostname, { all: true })
  for (const { address, family } of addresses) {
    if (family === 4 && isPrivateIPv4(address)) {
      throw new Error(`WEBHOOK url resolves to a disallowed private address (${address})`)
    }
    if (family === 6 && isPrivateIPv6(address)) {
      throw new Error(`WEBHOOK url resolves to a disallowed private address (${address})`)
    }
  }

  return parsed
}

// ─── Handler registry ─────────────────────────────────────────────────────────
// ponytail: prosty registry  dorzucenie nowego typu = 1 wpis tutaj + wariant w schema.prisma

const handlers: Record<CampaignAction, (campaign: Campaign) => Promise<void>> = {
  /**
   * Publishes the referenced post to all platforms it targets.
   * Delegates entirely to the existing publisher  token handling, per-platform
   * status recording, and error capture are all managed there.
   */
  PUBLISH_POST: async (campaign) => {
    const payload = campaign.payload as PublishPostPayload
    // ponytail: legacy postId → [postId] for campaigns created before the multi-post migration
    const ids = payload?.postIds ?? (payload?.postId ? [payload.postId] : [])
    if (!ids.length) throw new Error('PUBLISH_POST payload missing postIds')
    for (const id of ids) {
      await publishPost(id, campaign.userId)
    }
  },

  /**
   * Fires an HTTP request to the configured URL.
   * SSRF-safe: URL scheme and DNS-resolved addresses are validated before fetch.
   * redirect: 'manual' prevents following redirects to private addresses.
   * Throws on non-2xx so the run is recorded as failed.
   */
  WEBHOOK: async (campaign) => {
    const payload = campaign.payload as WebhookPayload
    if (!payload?.url) throw new Error('WEBHOOK payload missing url')

    // Re-validate at execution time (guards against DNS rebinding)
    await assertSafeWebhookUrl(payload.url)

    const res = await fetch(payload.url, {
      method: payload.method ?? 'POST',
      headers: payload.body ? { 'Content-Type': 'application/json' } : undefined,
      body: payload.body ?? undefined,
      redirect: 'manual', // never follow redirects to potentially private targets
    })

    // Manual redirect: treat 3xx as an error to avoid SSRF via Location header
    if (res.type === 'opaqueredirect') {
      throw new Error('WEBHOOK returned a redirect; redirects are not followed for security')
    }

    if (!res.ok) {
      throw new Error(`Webhook returned ${res.status} ${res.statusText}`)
    }
  },
}

/**
 * Executes the appropriate handler for a campaign's actionType.
 * Throws on failure  caller is responsible for catching and recording the run.
 *
 * @param campaign - The campaign to execute
 * @returns void
 *
 * @example
 * await runCampaignHandler(campaign)
 */
export async function runCampaignHandler(campaign: Campaign): Promise<void> {
  const handler = handlers[campaign.actionType]
  if (!handler) throw new Error(`Unknown actionType: ${campaign.actionType}`)
  await handler(campaign)
}
