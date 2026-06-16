# `/lib/cache`

Server-side caching layer on top of Upstash Redis. Reduces load on Prisma/DB and external APIs by storing query results with sub-millisecond access. Implements the design in `docs/superpowers/specs/2026-06-15-redis-cache-design.md`.

## Technologie
- `@upstash/redis` (shared connection, reused from `lib/rate-limit/client.ts`)

## Struktura
- `client.ts` — `getRedis()`, singleton Redis instance
- `keys.ts` — `buildKey(namespace, ...segments)` → `"instra:cache:<namespace>:<segments>"`
- `config.ts` — `TTL_PRESETS`: `{ db: 300, api: 900 }` (seconds)
- `cache.ts` — `get`, `set`, `del`, `invalidatePrefix`, `getOrSet`
- `index.ts` — barrel export

## Parametry
- `namespace: "db" | "api"` — isolates DB-query caches from external-API caches
- `segments: string[]` — key parts identifying the cached value (e.g. `"user", "123"`)
- `ttl?: number` — per-call override; defaults to `TTL_PRESETS[namespace]`

## Błędy
Redis failures are non-fatal: `get` returns `null` (treated as a miss), `set`/`del`/`invalidatePrefix` log and return silently, `getOrSet` falls back to calling `fetcher()` directly.

## Przykład

```ts
import { getOrSet, invalidatePrefix } from '@/lib/cache'

// DB query
const user = await getOrSet('db', () => prisma.user.findUnique({ where: { id } }), undefined, 'user', id)

// External API
const report = await getOrSet('api', () => fetchGoogleAnalytics(accountId), undefined, 'google', accountId)

// Manual invalidation after a mutation
await prisma.user.update({ where: { id }, data })
await invalidatePrefix('db', 'user', id)
```
