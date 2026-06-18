import { describe, it, expect, vi } from 'vitest'

// Mock 'server-only' so vitest doesn't error on import
vi.mock('server-only', () => ({}))

// Must set env before import
process.env.SOCIAL_ENCRYPTION_KEY = 'a'.repeat(64) // 32 bytes hex

const { encrypt, decrypt } = await import('../crypto')

describe('crypto', () => {
  it('round-trips plaintext', () => {
    const plaintext = 'my-secret-token-abc123'
    expect(decrypt(encrypt(plaintext))).toBe(plaintext)
  })

  it('produces different ciphertext each call (random IV)', () => {
    const a = encrypt('same')
    const b = encrypt('same')
    expect(a).not.toBe(b)
  })

  it('throws on tampered ciphertext', () => {
    const ct = encrypt('token')
    const parts = ct.split(':')
    parts[2] = 'deadbeef'
    expect(() => decrypt(parts.join(':'))).toThrow()
  })
})
