import 'server-only'

import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import type { ApiToken } from '@prisma/client'

export type { ApiToken }

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** SHA-256 hex of the raw token string. ponytail: fast hash is fine  43-char random token has no brute-force surface. */
function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

/** Generates a raw PAT: "instra_<43 base64url chars>". */
function generateRaw(): string {
  return `instra_${randomBytes(32).toString('base64url')}`
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates a new API token for a user.
 * The raw token is returned ONCE and never stored  only its SHA-256 hash is persisted.
 *
 * @param userId    - Owner's user ID
 * @param name      - Human label (e.g. "CLI laptop")
 * @param expiresAt - Optional expiry; defaults to 90 days from now
 * @returns { token: raw string (show once), record: ApiToken row }
 *
 * @example
 * const { token, record } = await createApiToken(user.id, 'My CLI')
 */
export async function createApiToken(
  userId: string,
  name: string,
  expiresAt?: Date,
): Promise<{ token: string; record: ApiToken }> {
  const token = generateRaw()
  const tokenHash = hashToken(token)
  const prefix = token.slice(0, 12) // "instra_XXXXX"
  const expires = expiresAt ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)

  const record = await prisma.apiToken.create({
    data: { userId, name, tokenHash, prefix, expiresAt: expires },
  })

  return { token, record }
}

/**
 * Lists all API tokens for a user (no tokenHash returned to caller).
 *
 * @param userId - Owner's user ID
 * @returns Array of ApiToken rows (tokenHash excluded)
 *
 * @example
 * const tokens = await listApiTokens(user.id)
 */
export async function listApiTokens(
  userId: string,
): Promise<Omit<ApiToken, 'tokenHash'>[]> {
  return prisma.apiToken.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userId: true,
      name: true,
      prefix: true,
      lastUsed: true,
      expiresAt: true,
      createdAt: true,
    },
  })
}

/**
 * Revokes (deletes) an API token, verifying ownership before deletion.
 *
 * @param userId  - Must match token.userId
 * @param tokenId - ApiToken primary key
 *
 * @example
 * await revokeApiToken(user.id, 'clx123')
 */
export async function revokeApiToken(userId: string, tokenId: string): Promise<void> {
  await prisma.apiToken.deleteMany({ where: { id: tokenId, userId } })
}

/**
 * Verifies a raw Bearer token and returns the associated userId, or null.
 * Rejects expired tokens. Bumps lastUsed on success.
 *
 * @param raw - Raw token string from the Authorization header
 * @returns userId string if valid, null otherwise
 *
 * @example
 * const userId = await verifyApiToken(bearerValue)
 * if (!userId) return new Response('Unauthorized', { status: 401 })
 */
export async function verifyApiToken(raw: string): Promise<string | null> {
  const tokenHash = hashToken(raw)
  const record = await prisma.apiToken.findUnique({ where: { tokenHash } })
  if (!record) return null
  if (record.expiresAt && record.expiresAt < new Date()) return null

  // Bump lastUsed async  don't block the response
  void prisma.apiToken.update({
    where: { id: record.id },
    data: { lastUsed: new Date() },
  })

  return record.userId
}
