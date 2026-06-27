/**
 * Reusable skeleton loading primitives.
 * Server-safe (no "use client", no i18n). Text-free by design.
 *
 * @module Skeleton
 */

// ponytail: bone tint matches --color-accent-bone (#E8E3D9) from globals.css;
// swap animate-pulse for a shimmer @keyframes in globals.css if pulse looks flat.
const BONE = {
  dim: 'rgba(232,227,217,0.06)',
  mid: 'rgba(232,227,217,0.08)',
  base: 'rgba(232,227,217,0.1)',
  border: 'rgba(232,227,217,0.1)',
} as const

// ---------------------------------------------------------------------------
// Primitive
// ---------------------------------------------------------------------------

interface SkeletonProps {
  /** Tailwind sizing/spacing utilities, e.g. "h-4 w-32" */
  className?: string
  style?: React.CSSProperties
}

/**
 * Single bone block with `animate-pulse`. Compose with Tailwind sizing classes.
 *
 * @param className - Tailwind utilities for size / margin
 * @param style     - Override or extend inline styles (e.g. custom width)
 * @returns A pulsing div styled with the project bone tint
 *
 * @example
 * <Skeleton className="h-7 w-48" />
 */
export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-sm ${className}`}
      style={{ background: BONE.base, ...style }}
    />
  )
}

// ---------------------------------------------------------------------------
// Composite: header block (breadcrumb + title + optional action button)
// ---------------------------------------------------------------------------

/**
 * Page-header skeleton: small breadcrumb line, large title, optional action button.
 *
 * @example
 * <SkeletonHeader withAction />
 */
export function SkeletonHeader({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" style={{ background: BONE.mid }} />
        <Skeleton className="h-7 w-40" />
      </div>
      {withAction && <Skeleton className="h-9 w-28" style={{ background: BONE.mid }} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Composite: card row (title + subtitle + optional actions)
// ---------------------------------------------------------------------------

interface SkeletonCardProps {
  /** Show action button placeholders on the right */
  withActions?: boolean
}

/**
 * Single list-item card skeleton: title line, subtitle line, optional action buttons.
 *
 * @example
 * <SkeletonCard withActions />
 */
export function SkeletonCard({ withActions = false }: SkeletonCardProps) {
  return (
    <div
      className="rounded-sm border p-4 flex flex-col sm:flex-row gap-4 animate-pulse"
      style={{ borderColor: BONE.border }}
    >
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" style={{ background: BONE.dim }} />
      </div>
      {withActions && (
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-9 w-20" style={{ background: BONE.dim }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Composite: list of cards
// ---------------------------------------------------------------------------

interface SkeletonListProps {
  /** Number of card rows to render */
  count?: number
  withActions?: boolean
}

/**
 * A vertical list of `SkeletonCard` rows.
 *
 * @param count      - How many rows to show (default 4)
 * @param withActions - Pass through to each SkeletonCard
 *
 * @example
 * <SkeletonList count={3} withActions />
 */
export function SkeletonList({ count = 4, withActions = false }: SkeletonListProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} withActions={withActions} />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Composite: stats grid (StatCard row for dashboard/analytics)
// ---------------------------------------------------------------------------

interface SkeletonStatsProps {
  /** Number of stat boxes (default 4) */
  count?: number
}

/**
 * Row of stat-card placeholders. Mirrors the `StatCard` grid on the dashboard.
 *
 * @param count - Number of boxes (default 4)
 *
 * @example
 * <SkeletonStats count={4} />
 */
export function SkeletonStats({ count = 4 }: SkeletonStatsProps) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-${count} gap-4 animate-pulse`}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-sm border p-4 space-y-2"
          style={{ borderColor: BONE.border }}
        >
          <Skeleton className="h-2 w-16" style={{ background: BONE.dim }} />
          <Skeleton className="h-6 w-12" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Composite: form skeleton (label + input pairs)
// ---------------------------------------------------------------------------

interface SkeletonFormProps {
  /** Number of field pairs (default 4) */
  fields?: number
}

/**
 * Generic form skeleton: stacked label + input rows, plus a submit button.
 *
 * @param fields - Number of label+input rows (default 4)
 *
 * @example
 * <SkeletonForm fields={3} />
 */
export function SkeletonForm({ fields = 4 }: SkeletonFormProps) {
  return (
    <div className="space-y-6 animate-pulse max-w-lg">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" style={{ background: BONE.mid }} />
          <Skeleton className="h-10 w-full" style={{ background: BONE.dim }} />
        </div>
      ))}
      <Skeleton className="h-10 w-32" style={{ background: BONE.mid }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Composite: chart area placeholder
// ---------------------------------------------------------------------------

/**
 * Tall placeholder for a chart area (axes + body).
 *
 * @example
 * <SkeletonChart />
 */
export function SkeletonChart() {
  return (
    <div className="space-y-2 animate-pulse">
      <Skeleton className="h-48 w-full" style={{ background: BONE.dim }} />
      <div className="flex justify-between">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-2 w-8" style={{ background: BONE.dim }} />
        ))}
      </div>
    </div>
  )
}
