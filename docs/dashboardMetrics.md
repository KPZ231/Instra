# dashboardMetrics

**File:** `lib/api/dashboardMetrics.ts`  
**Type:** Server-only service (imports `server-only`)  
**Dependencies:** Prisma ORM, `lib/cache` (Redis), `lib/api/socialAccounts`

---

## Overview

Provides the `getDashboardMetrics(userId)` function, which aggregates all data
required by the `DashboardOverview` component in a single cached call.

Runs all Prisma queries in parallel via `Promise.all` then assembles four
output shapes: KPI stats, chart series (normalised 0–100), recent activity events,
and  where no data source exists (e.g. reach)  null placeholders.

---

## Exported types

### `DashboardStat`
```ts
{
  id: string            // e.g. "posts", "likes", "accounts", "reach"
  labelKey: string      // i18n key (dashboard.stats.*)
  value: string | null  // formatted compact string, or null = no data
  delta: number | null  // % change vs previous 7 days, or null
  deltaLabelKey: string // i18n key for the delta label
}
```

### `DashboardActivityItem`
```ts
{
  id: string      // socialPostStatus.id
  platform: string // "FACEBOOK" | "INSTAGRAM" | "LINKEDIN"
  status: string  // "PUBLISHED" | "FAILED" | "PENDING" | "PUBLISHING"
  at: string      // ISO string  publishedAt ?? createdAt
}
```

### `DashboardMetrics`
```ts
{
  stats: DashboardStat[]
  chartSeries: Record<"7D" | "30D" | "90D", number[]> // 0–100 normalised
  activity: DashboardActivityItem[]                    // up to 7 events
}
```

---

## `getDashboardMetrics(userId)`

### Parameters

| Param    | Type   | Description              |
|----------|--------|--------------------------|
| `userId` | string | Authenticated user's ID  |

### Returns

`Promise<DashboardMetrics>`

### Caching

- Namespace: `db`
- TTL: 300 s (default db preset)
- Key: `instra:cache:db:dashboardMetrics:<userId>`

**Invalidate after post/like mutations:**
```ts
import { invalidatePrefix } from '@/lib/cache'
await invalidatePrefix('db', 'dashboardMetrics', userId)
```

### Data sources

| Stat       | Source                                    | Notes                              |
|------------|-------------------------------------------|------------------------------------|
| posts      | `prisma.post.count`                       | Total + 7-day delta                |
| likes      | `prisma.like.count`                       | Total + 7-day delta                |
| accounts   | `getConnectedAccounts()` (socialAccounts) | No delta (point-in-time)           |
| reach      | `null`                                    | No backend source; shows ""       |
| chartSeries| `prisma.post.findMany` (90d window)       | Per-day counts, normalised 0–100   |
| activity   | `prisma.socialPostStatus.findMany`        | Latest 7 publish-status events     |

---

## Example

```ts
import { getDashboardMetrics } from '@/lib/api/dashboardMetrics'

const metrics = await getDashboardMetrics(user.id)
// → { stats: [...], chartSeries: { "7D": [...], ... }, activity: [...] }
```
