import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

const mockFindMany = vi.fn()
const mockFindUnique = vi.fn()
const mockUpsert = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    socialAccount: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      upsert: mockUpsert,
      delete: mockDelete,
    },
    socialPostStatus: {
      findMany: mockFindMany,
    },
  },
}))

const { getConnectedAccounts, deleteSocialAccount } = await import('../socialAccounts')

describe('getConnectedAccounts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns mapped ConnectedAccount array', async () => {
    mockFindMany.mockResolvedValue([
      { platform: 'FACEBOOK', platformUsername: 'mypage', expiresAt: null },
    ])
    const result = await getConnectedAccounts('user-1')
    expect(result).toEqual([{ platform: 'FACEBOOK', platformUsername: 'mypage', expiresAt: null }])
  })
})

describe('deleteSocialAccount', () => {
  it('calls prisma.delete with correct args', async () => {
    mockDelete.mockResolvedValue({})
    await deleteSocialAccount('user-1', 'LINKEDIN')
    expect(mockDelete).toHaveBeenCalledWith({
      where: { userId_platform: { userId: 'user-1', platform: 'LINKEDIN' } },
    })
  })
})
