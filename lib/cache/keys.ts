import type { CacheNamespace } from './config'

/**
 * Builds a namespaced Redis key from a cache namespace and arbitrary segments.
 * @param namespace - Cache namespace ("db" or "api")
 * @param segments  - Key parts, e.g. ["user", "123"]
 * @returns Key in the form "instra:cache:<namespace>:<segments...>"
 * @example buildKey("db", "user", "123") // "instra:cache:db:user:123"
 */
export function buildKey(namespace: CacheNamespace, ...segments: string[]): string {
  return ['instra', 'cache', namespace, ...segments].join(':')
}
