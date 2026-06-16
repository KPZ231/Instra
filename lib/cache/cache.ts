import { getRedis } from './client'
import { buildKey } from './keys'
import { TTL_PRESETS, type CacheNamespace } from './config'

/**
 * Reads a value from the cache.
 * @param namespace - Cache namespace ("db" or "api")
 * @param segments  - Key parts identifying the cached value
 * @returns Parsed value, or null on cache miss or Redis error
 * @example await get<User>("db", "user", "123")
 */
export async function get<T>(namespace: CacheNamespace, ...segments: string[]): Promise<T | null> {
  try {
    const raw = await getRedis().get<string>(buildKey(namespace, ...segments))
    return raw == null ? null : (raw as unknown as T)
  } catch (error) {
    console.error('[cache] get failed', error)
    return null
  }
}

/**
 * Writes a value to the cache.
 * @param value     - Value to cache (will be JSON-serialized)
 * @param ttl       - TTL override in seconds; defaults to the namespace preset
 * @param namespace - Cache namespace ("db" or "api")
 * @param segments  - Key parts identifying the cached value
 * @example await set(user, undefined, "db", "user", "123")
 */
export async function set<T>(
  value: T,
  ttl: number | undefined,
  namespace: CacheNamespace,
  ...segments: string[]
): Promise<void> {
  try {
    await getRedis().set(buildKey(namespace, ...segments), JSON.stringify(value), {
      ex: ttl ?? TTL_PRESETS[namespace],
    })
  } catch (error) {
    console.error('[cache] set failed', error)
  }
}

/**
 * Deletes a single cached value.
 * @param namespace - Cache namespace ("db" or "api")
 * @param segments  - Key parts identifying the cached value
 * @example await del("db", "user", "123")
 */
export async function del(namespace: CacheNamespace, ...segments: string[]): Promise<void> {
  try {
    await getRedis().del(buildKey(namespace, ...segments))
  } catch (error) {
    console.error('[cache] del failed', error)
  }
}

/**
 * Deletes all cached values sharing a key prefix.
 * @param namespace - Cache namespace ("db" or "api")
 * @param segments  - Key prefix parts shared by the values to invalidate
 * @example await invalidatePrefix("db", "user", "123")
 */
export async function invalidatePrefix(namespace: CacheNamespace, ...segments: string[]): Promise<void> {
  const redis = getRedis()
  const prefix = `${buildKey(namespace, ...segments)}:`

  try {
    let cursor = '0'
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: `${prefix}*`, count: 100 })
      cursor = nextCursor
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } while (cursor !== '0')
  } catch (error) {
    console.error('[cache] invalidatePrefix failed', error)
  }
}

/**
 * Fetches from cache, falling back to `fetcher` on a miss or Redis error, and
 * populates the cache with the freshly fetched value.
 * @param namespace - Cache namespace ("db" or "api")
 * @param fetcher   - Loads the value when not present in the cache
 * @param ttl       - TTL override in seconds; defaults to the namespace preset
 * @param segments  - Key parts identifying the cached value
 * @returns The cached or freshly fetched value
 * @example await getOrSet("db", () => prisma.user.findUnique({ where: { id } }), undefined, "user", id)
 */
export async function getOrSet<T>(
  namespace: CacheNamespace,
  fetcher: () => Promise<T>,
  ttl: number | undefined,
  ...segments: string[]
): Promise<T> {
  const cached = await get<T>(namespace, ...segments)
  if (cached !== null) {
    return cached
  }

  const value = await fetcher()
  await set(value, ttl, namespace, ...segments)
  return value
}
