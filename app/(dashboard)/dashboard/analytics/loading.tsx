/** Skeleton shown while the analytics page fetches data. */
import { SkeletonHeader, SkeletonStats, SkeletonChart } from '@/components/ui/Skeleton'

export default function AnalyticsLoading() {
  return (
    <div className="space-y-8">
      <SkeletonHeader />
      <SkeletonStats count={4} />
      <SkeletonChart />
    </div>
  )
}
