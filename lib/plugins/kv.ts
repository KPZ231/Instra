import { prisma } from '@/lib/prisma'

/**
 * Reads a plugin's stored value for the given user, scoped to that plugin.
 * @param pluginId - Owning plugin id
 * @param userId - Owning user id
 * @param key - Storage key
 * @example await getPluginData(pluginId, userId, "lastSeenId")
 */
export async function getPluginData(pluginId: string, userId: string, key: string): Promise<unknown> {
  const row = await prisma.pluginData.findUnique({
    where: { pluginId_userId_key: { pluginId, userId, key } },
  })
  return row ? row.value : null
}

/**
 * Writes (or overwrites) a plugin's stored value for the given user.
 * @param pluginId - Owning plugin id
 * @param userId - Owning user id
 * @param key - Storage key
 * @param value - JSON-serializable value
 * @example await setPluginData(pluginId, userId, "lastSeenId", "abc123")
 */
export async function setPluginData(
  pluginId: string,
  userId: string,
  key: string,
  value: unknown,
): Promise<void> {
  await prisma.pluginData.upsert({
    where: { pluginId_userId_key: { pluginId, userId, key } },
    create: { pluginId, userId, key, value },
    update: { value },
  })
}
