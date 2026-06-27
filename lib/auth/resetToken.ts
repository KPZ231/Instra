import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

const EXPIRY_MINUTES = 15

/**
 * Generates a secure password reset token, stores its SHA-256 hash in the DB,
 * and returns the raw token (to be sent in the reset link).
 * Any previous tokens for this email are deleted first.
 * @param email - The user's email address
 * @returns Raw token string to embed in the reset URL
 */
export async function createPasswordResetToken(email: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(rawToken)
  const expires = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000)

  // Remove any existing tokens for this email before creating a new one
  await db.passwordResetToken.deleteMany({ where: { email } })

  await db.passwordResetToken.create({
    data: { email, tokenHash, expires },
  })

  return rawToken
}

/**
 * Validates a raw reset token from the URL.
 * Returns the email if valid and not expired, null otherwise.
 * Deletes the token from DB after validation (single-use).
 * @param rawToken - Token from the reset URL query param
 * @returns Email string if valid, null if expired/invalid
 */
export async function validatePasswordResetToken(rawToken: string): Promise<string | null> {
  const tokenHash = hashToken(rawToken)

  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } })

  if (!record) return null
  if (record.expires < new Date()) {
    await db.passwordResetToken.delete({ where: { tokenHash } })
    return null
  }

  await db.passwordResetToken.delete({ where: { tokenHash } })
  return record.email
}

/** SHA-256 hash of the raw token  only the hash is ever stored in DB. */
function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}
