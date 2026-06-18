import { describe, it, expect, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/dal', () => ({
  verifySession: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}))
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(),
  RateLimitError: class extends Error {},
}))
vi.mock('@/lib/social/publisher', () => ({
  publishPost: vi.fn().mockResolvedValue([{ platform: 'FACEBOOK', success: true, platformPostId: 'fb-1' }]),
}))

const { publishPost } = await import('../actions/publishPost')

describe('publishPost action', () => {
  it('returns results on success', async () => {
    const result = await publishPost('post-1')
    expect(result.results).toHaveLength(1)
    expect(result.results![0].success).toBe(true)
  })
})
