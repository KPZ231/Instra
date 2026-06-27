/** Skeleton shown while the reports list page fetches data. */
import { SkeletonHeader, SkeletonList } from '@/components/ui/Skeleton'

export default function ReportsLoading() {
  return (
    <div className="space-y-8">
      <SkeletonHeader withAction />
      <SkeletonList count={3} withActions />
    </div>
  )
}
