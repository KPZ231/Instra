# Post Analytics Module

## Overview

The analytics module provides a complete heuristic-based post performance system at `/dashboard/analytics`.
It operates on real data from the authenticated user's own posts  no mocks.

## Architecture

```
features/analytics/          # Pure logic  no DB/UI dependencies
  types.ts                   # All shared types (EngagementMetrics, PostAnalytics, …)
  lib/rules.ts               # Heuristic scoring rules registry (Open/Closed)
  lib/engagement.ts          # computeEngagementRate, aggregateSnapshots, buildSeries, formatMetricValue
  lib/contentScore.ts        # scoreContent() → 0-100 score + issues[]
  lib/predict.ts             # predictEngagement()  EWMA + linear regression
  lib/dailyTip.ts            # buildDailyTip()  selects highest-priority i18n tip
  actions/recordMetrics.ts   # Server Action: write PostMetricSnapshot to DB
  index.ts                   # Public barrel

lib/api/analytics.ts         # server-only data layer (Prisma + cache + engine)
  getPostsAnalyticsOverview() → AnalyticsOverviewData
  getPostAnalytics(postId)   → PostAnalytics | null

components/ui/analytics/
  AnalyticsOverview.tsx      # Bento-grid wrapper
  EngagementChart.tsx        # SVG chart  history + dashed prediction line
  DailyTipCard.tsx           # Daily tip card (i18n key resolved at render)
  PostAnalyticsList.tsx      # Scrollable post list
  PostAnalyticsRow.tsx       # Single post row (score badge, engagement %, links)

app/(dashboard)/dashboard/analytics/
  page.tsx                   # Server Component  fetches overview, renders AnalyticsOverview
  [postId]/page.tsx          # Server Component  single post detail
```

## Data Flow

1. **Write**: `recordMetrics` Server Action → `prisma.postMetricSnapshot.create` → `invalidatePrefix('db','analytics')`
2. **Read**: `getPostsAnalyticsOverview()` → Prisma (Post + PostMetricSnapshot[]) → analytics engine → `getOrSet('db', …, 'analytics', 'overview', userId)`
3. **Invalidation**: Any mutation in `createPost`, `updatePost`, `deletePost`, `toggleLike` calls `invalidatePrefix('db', 'analytics')` + `revalidatePath('/dashboard/analytics')`

## Prediction Engine

- `predictEngagement(series, fallbackBase)` in `features/analytics/lib/predict.ts`
- **With history (≥ 3 points)**: EWMA baseline (α=0.3) + dampened linear slope → 7 future data points
- **Without history**: gentle growth curve from `fallbackBase`
- Confidence: `low` (<3 points) / `medium` (3-13) / `high` (≥14)

## Content Scoring

- `scoreContent(post)` in `features/analytics/lib/contentScore.ts`
- Starts at **100**, deducts penalty per triggered rule
- Rules defined in `features/analytics/lib/rules.ts`  add new rules there only (Open/Closed)
- Each rule has `key` (i18n), `penalty` (1-20), `priority` (1-10), `check(post)`, optional `params(post)`

| Rule key | Penalty | Priority | Condition |
|---|---|---|---|
| `no_content` | 20 | 10 | No text |
| `no_platforms` | 20 | 10 | No platforms |
| `content_too_short` | 15 | 9 | Text < 30 chars |
| `no_media` | 15 | 8 | 0 media files |
| `no_hashtags` | 10 | 7 | No `#` in text |
| `poor_timing` | 8 | 6 | Published outside 7–22h |
| `no_cta` | 10 | 6 | No CTA phrases |
| `content_too_long` | 10 | 5 | Text > 2200 chars |
| `too_many_hashtags` | 8 | 4 | > 30 hashtags |
| `single_platform` | 5 | 3 | Only 1 platform |

## Daily Tip

- `buildDailyTip(posts, daySeed)` in `features/analytics/lib/dailyTip.ts`
- Selects the highest-priority issue across all posts
- Returns a `DailyTip` with `key` (maps to `analytics.tips.<key>` in locale), optional `params`, `postId`, and `priority`
- `daySeed` = `Math.floor(Date.now() / 86_400_000)`  deterministic per day, passed from the server

## i18n

All user-visible strings are in `locales/{en,pl}/common.json` under the `analytics` block:
- `analytics.stats.*`  metric labels
- `analytics.chart.*`  chart labels and confidence levels
- `analytics.tip.*`  daily tip labels
- `analytics.tips.*`  one key per rule (mapped from `DailyTip.key`)
- `analytics.issues.*`  per-issue descriptions (used in detail page)
- `analytics.posts.*`  post list labels

## Cache

- Namespace: `db`, key segments: `analytics / overview / {userId}` or `analytics / post / {postId} / {userId}`
- TTL: 300s (db namespace default)
- Invalidated by all post/like mutations

## Adding a New Rule

1. Add an entry to `SCORING_RULES` in `features/analytics/lib/rules.ts`
2. Add i18n keys `analytics.issues.<key>` and `analytics.tips.<key>` to both locale files
3. No other code changes needed  the engine picks it up automatically
