/** Skeleton shown while the post analytics detail page fetches data. */
import { SkeletonHeader, SkeletonStats, SkeletonChart } from '@/components/ui/Skeleton'

export default function PostAnalyticsLoading() {
  return (
    <div className="space-y-8">
      <SkeletonHeader />
      <SkeletonStats count={3} />
      <SkeletonChart />
    </div>
  )
}
