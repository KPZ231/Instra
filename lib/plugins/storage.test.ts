import { describe, it, expect, vi, beforeEach } from 'vitest'

const uploadMock = vi.fn()
const downloadMock = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      from: () => ({ upload: uploadMock, download: downloadMock }),
    },
  }),
}))

import { uploadBundle, downloadBundle, buildBundleKey } from './storage'

beforeEach(() => {
  uploadMock.mockReset()
  downloadMock.mockReset()
})

describe('plugin bundle storage', () => {
  it('builds a deterministic storage key per plugin+version', () => {
    expect(buildBundleKey('my-plugin', '1.0.0')).toBe('plugins/my-plugin/1.0.0/bundle.js')
  })

  it('uploads bundle code under the expected key', async () => {
    uploadMock.mockResolvedValue({ error: null })
    await uploadBundle('my-plugin', '1.0.0', 'module.exports = {}')
    expect(uploadMock).toHaveBeenCalledWith(
      'plugins/my-plugin/1.0.0/bundle.js',
      'module.exports = {}',
      { contentType: 'application/javascript', upsert: false },
    )
  })

  it('throws when the upload fails', async () => {
    uploadMock.mockResolvedValue({ error: new Error('disk full') })
    await expect(uploadBundle('my-plugin', '1.0.0', 'code')).rejects.toThrow('disk full')
  })

  it('downloads and returns bundle text', async () => {
    downloadMock.mockResolvedValue({ data: new Blob(['code']), error: null })
    const text = await downloadBundle('plugins/my-plugin/1.0.0/bundle.js')
    expect(text).toBe('code')
  })
})
