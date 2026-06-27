# Redis Cache Module  Design Spec

**Date:** 2026-06-15  
**Status:** Approved  
**Stack:** Next.js, TypeScript, Upstash Redis (`@upstash/redis`)

---

## Goal

Build a reusable, extensible server-side caching layer on top of the existing Upstash Redis connection. Reduces load on Prisma/DB and external APIs by storing query results in RAM with sub-millisecond access.

---

## Scope

- **Caches:** DB query results (Prisma) + external API responses
- **Not in scope:** UI panel, batch operations, circuit breaker (future)

---

## Architecture

```
lib/cache/
  client.ts        → singleton Redis instance (reuses Upstash credentials)
  keys.ts          → buildKey() → "instra:cache:<namespace>:<...segments>"
  config.ts        → TTL_PRESETS: { db: 300, api: 900 }
  cache.ts         → get, set, del, invalidatePrefix, getOrSet
  index.ts         → barrel export
```

Namespace `instra:cache:*` is isolated from the existing `instra:rl:*` rate-limit keys.

---

## Key Structure

```
buildKey("db", "user", "123")   → "instra:cache:db:user:123"
buildKey("api", "google", "abc") → "instra:cache:api:google:abc"
```

---

## TTL Presets

| Namespace | Default TTL | Reason |
|-----------|-------------|--------|
| `db`      | 300s (5 min) | DB data changes relatively slowly; keeps reads fresh |
| `api`     | 900s (15 min) | External APIs have rate limits; data doesn't change per-second |

Per-call TTL override is always available.

---

## Invalidation Strategy

**TTL + manual invalidation:**
- Every key auto-expires via TTL (safety net)
- On mutation (e.g. `prisma.user.update`), caller explicitly calls `invalidatePrefix("db", "user", id)`
- This removes all keys matching `instra:cache:db:user:123:*`

---

## Serialization

- `set()` → `JSON.stringify(value)` before storing
- `get<T>()` → `JSON.parse(raw)` + TypeScript generic type assertion
- No runtime Zod validation (data originates from our own code)

---

## Public API

```ts
// Read with generic type  returns null on miss or Redis error
get<T>(namespace: "db" | "api", ...segments: string[]): Promise<T | null>

// Write with optional TTL override (defaults to TTL_PRESETS[namespace])
set<T>(value: T, ttl: number, namespace: "db" | "api", ...segments: string[]): Promise<void>

// Delete single key
del(namespace: "db" | "api", ...segments: string[]): Promise<void>

// Invalidate all keys sharing a prefix
invalidatePrefix(namespace: "db" | "api", ...segments: string[]): Promise<void>

// Fetch-or-cache in one call (primary usage pattern)
getOrSet<T>(
  namespace: "db" | "api",
  fetcher: () => Promise<T>,
  ttl?: number,
  ...segments: string[]
): Promise<T>
```

---

## Data Flow

```
caller (service / API route)
  ↓
getOrSet<User>("db", () => prisma.user.findUnique(...), undefined, "user", id)
  ↓
buildKey("db", "user", id) → "instra:cache:db:user:123"
  ↓ HIT  → JSON.parse → return User
  ↓ MISS → fetcher() → JSON.stringify → Redis SET → return User
  ↓ ERR  → silent fallback → fetcher() directly → return User (logged via console.error)
```

---

## Error Handling

Redis failures are **non-fatal**:
- `get()` returns `null` (treated as cache miss)
- `set()` / `del()` / `invalidatePrefix()` log error and return silently
- `getOrSet()` falls back to calling `fetcher()` directly
- App continues working slower (hitting DB/API), but never crashes due to Redis

---

## Usage Examples

```ts
// DB query
const user = await getOrSet("db", () => prisma.user.findUnique({ where: { id } }), undefined, "user", id)

// External API
const report = await getOrSet("api", () => fetchGoogleAnalytics(accountId), undefined, "google", accountId)

// Manual invalidation after mutation
await prisma.user.update({ where: { id }, data })
await invalidatePrefix("db", "user", id)
```

---

## File Dependencies

- `@upstash/redis`  already installed (used by `lib/rate-limit/client.ts`)
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`  already in `.env`
- No new packages required
