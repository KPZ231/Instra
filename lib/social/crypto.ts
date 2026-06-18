import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

/** Returns the 32-byte key from SOCIAL_ENCRYPTION_KEY env (64 hex chars). */
function getKey(): Buffer {
  const hex = process.env.SOCIAL_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('SOCIAL_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)')
  }
  return Buffer.from(hex, 'hex')
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns "iv:authTag:ciphertext" as hex-encoded string.
 *
 * @param plaintext - The string to encrypt (e.g. an OAuth access token)
 * @returns Hex-encoded "iv:tag:ciphertext"
 *
 * @example
 * const stored = encrypt(accessToken)
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':')
}

/**
 * Decrypts a ciphertext produced by encrypt().
 *
 * @param ciphertext - Hex-encoded "iv:tag:ciphertext"
 * @returns Original plaintext
 *
 * @example
 * const token = decrypt(stored)
 */
export function decrypt(ciphertext: string): string {
  const key = getKey()
  const [ivHex, tagHex, encryptedHex] = ciphertext.split(':')
  if (!ivHex || !tagHex || !encryptedHex) throw new Error('Invalid ciphertext format')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
