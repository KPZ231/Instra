import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../crypto', () => ({
  decrypt: (v: string) => `plain:${v}`,
  encrypt: (v: string) => `enc:${v}`,
}))

const mockUpsert = vi.fn()
vi.mock('@/lib/api/socialAccounts', () => ({ upsertSocialAccount: mockUpsert }))

const mockFetch = vi.fn()
global.fetch = mockFetch

// Set required env vars
process.env.META_APP_ID = 'app123'
process.env.META_APP_SECRET = 'secret123'

const { ensureFreshToken } = await import('../refresh')

const FRESH = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
const EXPIRING = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days
const EXPIRED = new Date(Date.now() - 1000)

function makeAccount(overrides = {}) {
  return {
    id: 'acc-1',
    userId: 'user-1',
    platform: 'FACEBOOK' as const,
    accessToken: 'enc-token',
    refreshToken: null,
    expiresAt: FRESH,
    platformUserId: 'u1',
    platformUsername: 'Test User',
    pageId: 'page-1',
    pageAccessToken: 'enc-page-token',
    ...overrides,
  }
}

describe('ensureFreshToken', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns decrypted token without API call when fresh', async () => {
    const token = await ensureFreshToken(makeAccount({ expiresAt: FRESH }))
    expect(token).toBe('plain:enc-token')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns decrypted token without API call when expiresAt is null', async () => {
    const token = await ensureFreshToken(makeAccount({ expiresAt: null }))
    expect(token).toBe('plain:enc-token')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('calls fb_exchange_token and updates DB for Facebook expiring soon', async () => {
    // exchange token response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'new-token', expires_in: 5184000 }),
    })
    // /me/accounts response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'page-1', access_token: 'new-page-token' }] }),
    })
    mockUpsert.mockResolvedValue(undefined)

    const token = await ensureFreshToken(makeAccount({ expiresAt: EXPIRING }))

    expect(token).toBe('new-token')
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'enc:new-token', platform: 'FACEBOOK' }),
    )
  })

  it('throws for LinkedIn with expired token', async () => {
    await expect(
      ensureFreshToken(makeAccount({ platform: 'LINKEDIN', expiresAt: EXPIRED })),
    ).rejects.toThrow('Token LinkedIn wygasł')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('throws if Meta exchange call fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'Invalid token' } }),
    })
    await expect(
      ensureFreshToken(makeAccount({ expiresAt: EXPIRING })),
    ).rejects.toThrow('Invalid token')
  })
})
