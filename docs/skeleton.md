# Skeleton Loading System

**File:** `components/ui/Skeleton.tsx`
**Technology:** React, Tailwind CSS (`animate-pulse`), CSS variables from `globals.css`

## Overview

Zero-dependency skeleton loading primitives for the dashboard. All exports are server-safe (no `"use client"`, no i18n) and share a single bone tint derived from `--color-accent-bone` (`#E8E3D9`).

## Exports

| Component | Props | Purpose |
|---|---|---|
| `Skeleton` | `className`, `style` | Single pulsing bone block  compose with Tailwind sizing |
| `SkeletonHeader` | `withAction?` | Page header (breadcrumb + title + optional button) |
| `SkeletonCard` | `withActions?` | Single list-item row with optional action buttons |
| `SkeletonList` | `count?`, `withActions?` | Stack of `SkeletonCard` rows |
| `SkeletonStats` | `count?` | Grid of stat-card boxes (dashboard / analytics) |
| `SkeletonForm` | `fields?` | Label+input pairs + submit button |
| `SkeletonChart` |  | Tall chart-area placeholder + axis tick row |

## Usage

### Route-level (recommended)

Drop a `loading.tsx` next to `page.tsx`  Next.js App Router shows it automatically during server-component rendering:

```tsx
// app/(dashboard)/dashboard/campaigns/loading.tsx
import { SkeletonHeader, SkeletonList } from '@/components/ui/Skeleton'

export default function CampaignsLoading() {
  return (
    <div className="space-y-8">
      <SkeletonHeader withAction />
      <SkeletonList count={4} withActions />
    </div>
  )
}
```

### Inline (client components)

```tsx
import { Skeleton } from '@/components/ui/Skeleton'

{isLoading ? <Skeleton className="h-6 w-32" /> : <span>{value}</span>}
```

## Covered routes

All pages under `app/(dashboard)/dashboard/` have a `loading.tsx`. The pattern:

- **List pages** → `SkeletonHeader` + `SkeletonList`
- **Detail/analytics pages** → `SkeletonHeader` + `SkeletonStats` + `SkeletonChart`
- **Form pages** (new/edit) → `SkeletonHeader` + `SkeletonForm`

## Upgrading

- **Shimmer instead of pulse:** Add a `@keyframes shimmer` to `globals.css` and swap `animate-pulse` in `Skeleton.tsx`.
- **Per-section loading:** Use `<Suspense fallback={<SkeletonList />}>` around individual async components instead of (or in addition to) `loading.tsx`.
