/** Skeleton shown while the dashboard overview page fetches data. */
import { SkeletonHeader, SkeletonStats, SkeletonList } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <SkeletonHeader />
      <SkeletonStats count={4} />
      <SkeletonList count={4} />
    </div>
  )
}
