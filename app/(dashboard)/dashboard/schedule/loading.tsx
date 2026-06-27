/** Skeleton shown while the schedule page fetches data. */
import { SkeletonHeader, SkeletonList } from '@/components/ui/Skeleton'

export default function ScheduleLoading() {
  return (
    <div className="space-y-8">
      <SkeletonHeader />
      <SkeletonList count={5} />
    </div>
  )
}
