import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../crypto', () => ({ decrypt: (v: string) => `decrypted:${v}` }))
vi.mock('../refresh', () => ({ ensureFreshToken: vi.fn().mockResolvedValue('fresh-token') }))
vi.mock('../meta', () => ({
  publishToFacebook: vi.fn().mockResolvedValue('fb-123'),
  publishToInstagram: vi.fn().mockResolvedValue('ig-456'),
}))
vi.mock('../linkedin', () => ({
  publishToLinkedIn: vi.fn().mockResolvedValue('urn:li:share:789'),
}))

const mockPostFindUnique = vi.fn()
const mockStatusUpsert = vi.fn()
const mockAccountFindUnique = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    post: { findUnique: mockPostFindUnique },
    socialPostStatus: { upsert: mockStatusUpsert },
    socialAccount: { findUnique: mockAccountFindUnique },
  },
}))

const { publishPost } = await import('../publisher')
const { publishToFacebook } = await import('../meta')
const { publishToLinkedIn } = await import('../linkedin')

const FB_ACCOUNT = {
  platform: 'FACEBOOK',
  accessToken: 'enc-fb',
  pageAccessToken: 'enc-page',
  pageId: 'page-1',
  platformUserId: 'u1',
  expiresAt: null,
}
const LI_ACCOUNT = {
  platform: 'LINKEDIN',
  accessToken: 'enc-li',
  platformUserId: 'urn:li:person:abc',
  expiresAt: null,
  pageId: null,
  pageAccessToken: null,
}

describe('publishPost', () => {
  beforeEach(() => vi.clearAllMocks())

  it('publishes to selected platforms and returns results', async () => {
    mockPostFindUnique.mockResolvedValue({
      id: 'post-1',
      content: 'Hello',
      platforms: ['FACEBOOK', 'LINKEDIN'],
      media: [],
    })
    // Return account by platform — parallel calls safe
    mockAccountFindUnique.mockImplementation(({ where }: { where: { userId_platform: { platform: string } } }) => {
      return Promise.resolve(
        where.userId_platform.platform === 'FACEBOOK' ? FB_ACCOUNT : LI_ACCOUNT,
      )
    })
    mockStatusUpsert.mockResolvedValue({})

    const results = await publishPost('post-1', 'user-1')

    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({ platform: 'FACEBOOK', success: true, platformPostId: 'fb-123' })
    expect(results[1]).toMatchObject({ platform: 'LINKEDIN', success: true, platformPostId: 'urn:li:share:789' })
    expect(publishToFacebook).toHaveBeenCalledWith('page-1', expect.any(String), expect.objectContaining({ content: 'Hello' }))
    expect(publishToLinkedIn).toHaveBeenCalledWith('urn:li:person:abc', 'fresh-token', expect.any(Object))
  })

  it('returns failed result when account not connected', async () => {
    mockPostFindUnique.mockResolvedValue({
      id: 'post-2', content: 'Hi', platforms: ['INSTAGRAM'], media: [],
    })
    mockAccountFindUnique.mockResolvedValue(null)
    mockStatusUpsert.mockResolvedValue({})

    const results = await publishPost('post-2', 'user-1')
    expect(results[0]).toMatchObject({ platform: 'INSTAGRAM', success: false, error: 'Brak połączonego konta' })
  })

  it('throws when post not found', async () => {
    mockPostFindUnique.mockResolvedValue(null)
    await expect(publishPost('missing', 'user-1')).rejects.toThrow('Post not found')
  })
})
