export type CacheNamespace = 'db' | 'api'

/** Default TTL (in seconds) per cache namespace. */
export const TTL_PRESETS: Record<CacheNamespace, number> = {
  db: 300,
  api: 900,
}
