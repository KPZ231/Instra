import { describe, it, expect, vi, beforeEach } from 'vitest'

const { pluginCreate, pluginFindUnique, versionCreate, versionUpdate, versionFindMany, versionFindUnique } = vi.hoisted(() => ({
  pluginCreate: vi.fn(),
  pluginFindUnique: vi.fn(),
  versionCreate: vi.fn(),
  versionUpdate: vi.fn(),
  versionFindMany: vi.fn(),
  versionFindUnique: vi.fn(),
}))

const { logPluginAction } = vi.hoisted(() => ({ logPluginAction: vi.fn() }))
const { parseManifest } = vi.hoisted(() => ({ parseManifest: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    plugin: { create: pluginCreate, findUnique: pluginFindUnique },
    pluginVersion: { create: versionCreate, update: versionUpdate, findMany: versionFindMany, findUnique: versionFindUnique },
  },
}))

vi.mock('./audit', () => ({ logPluginAction }))
vi.mock('./manifest', () => ({
  parseManifest,
  manifestSchema: {},
}))

import { createPlugin, submitVersionForReview, approveVersion, rejectVersion, listApprovedPlugins } from './registry'

beforeEach(() => {
  pluginCreate.mockReset()
  pluginFindUnique.mockReset()
  versionCreate.mockReset()
  versionUpdate.mockReset()
  versionFindMany.mockReset()
  versionFindUnique.mockReset()
  logPluginAction.mockReset()
  parseManifest.mockReset()

  // Default: no duplicate slug, valid manifest
  pluginFindUnique.mockResolvedValue(null)
  parseManifest.mockReturnValue({ success: true, data: { version: '1.0.0' } })
  logPluginAction.mockResolvedValue(undefined)
})

describe('plugin registry', () => {
  it('creates a plugin with its first DRAFT version', async () => {
    pluginCreate.mockResolvedValue({ id: 'plugin-1', slug: 'my-plugin' })
    versionCreate.mockResolvedValue({ id: 'v1', status: 'DRAFT' })
    const result = await createPlugin({
      slug: 'my-plugin',
      name: 'My Plugin',
      description: 'desc',
      authorId: 'user-1',
      manifest: { version: '1.0.0' } as never,
      bundleStorageKey: 'plugins/my-plugin/1.0.0/bundle.js',
    })
    expect(pluginCreate).toHaveBeenCalled()
    expect(versionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'DRAFT', version: '1.0.0' }) }),
    )
    expect(result.version.status).toBe('DRAFT')
    expect(logPluginAction).toHaveBeenCalledWith('plugin-1', 'user-1', 'plugin.created', expect.any(Object))
  })

  it('throws if slug is already taken', async () => {
    pluginFindUnique.mockResolvedValue({ id: 'existing' })
    await expect(
      createPlugin({
        slug: 'my-plugin',
        name: 'My Plugin',
        description: 'desc',
        authorId: 'user-1',
        manifest: { version: '1.0.0' } as never,
        bundleStorageKey: 'plugins/my-plugin/1.0.0/bundle.js',
      }),
    ).rejects.toThrow('Plugin slug "my-plugin" is already taken')
  })

  it('throws if manifest is invalid', async () => {
    parseManifest.mockReturnValue({ success: false, error: { message: 'bad manifest' } })
    await expect(
      createPlugin({
        slug: 'my-plugin',
        name: 'My Plugin',
        description: 'desc',
        authorId: 'user-1',
        manifest: { version: '1.0.0' } as never,
        bundleStorageKey: 'plugins/my-plugin/1.0.0/bundle.js',
      }),
    ).rejects.toThrow('Invalid manifest')
  })

  it('moves a version from DRAFT to PENDING_REVIEW', async () => {
    versionFindUnique.mockResolvedValue({ id: 'v1', status: 'DRAFT', pluginId: 'plugin-1' })
    versionUpdate.mockResolvedValue({ status: 'PENDING_REVIEW', pluginId: 'plugin-1' })
    await submitVersionForReview('v1')
    expect(versionUpdate).toHaveBeenCalledWith({
      where: { id: 'v1' },
      data: { status: 'PENDING_REVIEW' },
    })
    expect(logPluginAction).toHaveBeenCalledWith('plugin-1', null, 'version.submitted', { versionId: 'v1' })
  })

  it('approves a version with the reviewer id', async () => {
    versionUpdate.mockResolvedValue({ status: 'APPROVED', pluginId: 'plugin-1' })
    await approveVersion('v1', 'admin-1')
    expect(versionUpdate).toHaveBeenCalledWith({
      where: { id: 'v1' },
      data: expect.objectContaining({ status: 'APPROVED', reviewedById: 'admin-1' }),
    })
    expect(logPluginAction).toHaveBeenCalledWith('plugin-1', 'admin-1', 'version.approved', { versionId: 'v1' })
  })

  it('rejects a version with a reason', async () => {
    versionUpdate.mockResolvedValue({ status: 'REJECTED', pluginId: 'plugin-1' })
    await rejectVersion('v1', 'admin-1', 'unsafe code')
    expect(versionUpdate).toHaveBeenCalledWith({
      where: { id: 'v1' },
      data: expect.objectContaining({ status: 'REJECTED', rejectionReason: 'unsafe code' }),
    })
    expect(logPluginAction).toHaveBeenCalledWith('plugin-1', 'admin-1', 'version.rejected', { versionId: 'v1', reason: 'unsafe code' })
  })

  it('lists only APPROVED versions', async () => {
    versionFindMany.mockResolvedValue([])
    await listApprovedPlugins()
    expect(versionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'APPROVED' } }),
    )
  })
})
