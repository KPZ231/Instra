import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

const mockFetch = vi.fn()
global.fetch = mockFetch

const { publishToLinkedIn } = await import('../linkedin')

describe('publishToLinkedIn', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns post URN on text-only success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'urn:li:ugcPost:123' },
      json: async () => ({}),
    })
    const id = await publishToLinkedIn('urn:li:person:abc', 'token', {
      content: 'Hello LinkedIn',
      media: [],
    })
    expect(id).toBe('urn:li:ugcPost:123')
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      headers: { get: () => null },
      json: async () => ({ message: 'Unauthorized' }),
    })
    await expect(
      publishToLinkedIn('urn:li:person:abc', 'bad', { content: 'Hi', media: [] }),
    ).rejects.toThrow('Unauthorized')
  })
})
