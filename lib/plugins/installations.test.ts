import { describe, it, expect, vi, beforeEach } from 'vitest'

const { upsert, deleteMany, update, findMany, versionFindFirst } = vi.hoisted(() => ({
  upsert: vi.fn(),
  deleteMany: vi.fn(),
  update: vi.fn(),
  findMany: vi.fn(),
  versionFindFirst: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pluginInstallation: { upsert, deleteMany, update, findMany },
    pluginVersion: { findFirst: versionFindFirst },
  },
}))

vi.mock('@/lib/plugins/audit', () => ({
  logPluginAction: vi.fn(),
}))

import { installPlugin, uninstallPlugin, togglePlugin, getUserInstallations, getAvailableUpdate } from './installations'

beforeEach(() => {
  upsert.mockReset()
  deleteMany.mockReset()
  update.mockReset()
  findMany.mockReset()
  versionFindFirst.mockReset()
})

describe('plugin installations', () => {
  it('installs a specific approved version for a user', async () => {
    upsert.mockResolvedValue({ id: 'inst-1' })
    await installPlugin('user-1', 'plugin-1', 'version-1')
    expect(upsert).toHaveBeenCalledWith({
      where: { userId_pluginId: { userId: 'user-1', pluginId: 'plugin-1' } },
      create: { userId: 'user-1', pluginId: 'plugin-1', pluginVersionId: 'version-1', enabled: true },
      update: { pluginVersionId: 'version-1', enabled: true },
    })
  })

  it('uninstalls by deleting the installation row', async () => {
    deleteMany.mockResolvedValue({ count: 1 })
    await uninstallPlugin('user-1', 'plugin-1')
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1', pluginId: 'plugin-1' } })
  })

  it('toggles enabled state', async () => {
    update.mockResolvedValue({})
    await togglePlugin('user-1', 'plugin-1', false)
    expect(update).toHaveBeenCalledWith({
      where: { userId_pluginId: { userId: 'user-1', pluginId: 'plugin-1' } },
      data: { enabled: false },
    })
  })

  it('lists enabled installations for rendering', async () => {
    findMany.mockResolvedValue([])
    await getUserInstallations('user-1')
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', enabled: true } }),
    )
  })

  it('reports an available update when a newer approved version exists', async () => {
    versionFindFirst.mockResolvedValue({ id: 'version-2', version: '1.1.0' })
    const result = await getAvailableUpdate('plugin-1', '1.0.0')
    expect(result?.version).toBe('1.1.0')
  })
})
