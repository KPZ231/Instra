import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

const mockFetch = vi.fn()
global.fetch = mockFetch

const { publishToLinkedIn } = await import('../linkedin')

describe('publishToLinkedIn', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns post URN on text-only success', async () => {
    // rest/posts call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: (h: string) => (h === 'x-restli-id' ? 'urn:li:share:123' : null) },
      json: async () => ({}),
    })
    const id = await publishToLinkedIn('urn:li:person:abc', 'token', {
      content: 'Hello LinkedIn',
      media: [],
    })
    expect(id).toBe('urn:li:share:123')

    // Verify it called rest/posts (not old ugcPosts)
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.linkedin.com/rest/posts')
    expect(JSON.parse(init.body as string)).toMatchObject({
      commentary: 'Hello LinkedIn',
      lifecycleState: 'PUBLISHED',
      visibility: 'PUBLIC',
    })
    // Verify versioning header
    expect((init.headers as Record<string, string>)['LinkedIn-Version']).toBe('202401')
  })

  it('uploads image via initializeUpload then creates post', async () => {
    // initializeUpload
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        value: { uploadUrl: 'https://upload.linkedin.com/img', image: 'urn:li:image:xyz' },
      }),
      headers: { get: () => null },
    })
    // fetch image bytes from storage
    mockFetch.mockResolvedValueOnce({ ok: true, blob: async () => new Blob(['img']) })
    // PUT upload
    mockFetch.mockResolvedValueOnce({ ok: true })
    // rest/posts
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: (h: string) => (h === 'x-restli-id' ? 'urn:li:share:456' : null) },
      json: async () => ({}),
    })

    const id = await publishToLinkedIn('urn:li:person:abc', 'token', {
      content: 'Image post',
      media: [{ url: 'https://cdn.example.com/img.jpg', mimeType: 'image/jpeg', order: 0 }],
    })

    expect(id).toBe('urn:li:share:456')
    // post body should reference image URN
    const postCall = mockFetch.mock.calls[3] as [string, RequestInit]
    const body = JSON.parse(postCall[1].body as string)
    expect(body.content).toEqual({ media: { id: 'urn:li:image:xyz' } })
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

  it('throws when post URN missing from response header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => null },
      json: async () => ({}),
    })
    await expect(
      publishToLinkedIn('urn:li:person:abc', 'token', { content: 'Hi', media: [] }),
    ).rejects.toThrow('LinkedIn did not return post URN')
  })
})
