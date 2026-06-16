import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: { pluginData: { findUnique: vi.fn(), upsert: vi.fn() } },
}))

import { getPluginData, setPluginData } from './kv'
import { prisma } from '@/lib/prisma'

const findUnique = vi.mocked(prisma).pluginData.findUnique
const upsert = vi.mocked(prisma).pluginData.upsert

beforeEach(() => {
  findUnique.mockReset()
  upsert.mockReset()
})

describe('plugin kv storage', () => {
  it('returns null when no value is stored', async () => {
    findUnique.mockResolvedValue(null)
    const value = await getPluginData('plugin-1', 'user-1', 'count')
    expect(value).toBeNull()
  })

  it('returns the stored value', async () => {
    findUnique.mockResolvedValue({ value: 42 })
    const value = await getPluginData('plugin-1', 'user-1', 'count')
    expect(value).toBe(42)
  })

  it('upserts scoped by pluginId+userId+key', async () => {
    upsert.mockResolvedValue({})
    await setPluginData('plugin-1', 'user-1', 'count', 42)
    expect(upsert).toHaveBeenCalledWith({
      where: { pluginId_userId_key: { pluginId: 'plugin-1', userId: 'user-1', key: 'count' } },
      create: { pluginId: 'plugin-1', userId: 'user-1', key: 'count', value: 42 },
      update: { value: 42 },
    })
  })
})
