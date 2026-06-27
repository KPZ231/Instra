/** Skeleton shown while the admin plugins page fetches data. */
import { SkeletonHeader, SkeletonList } from '@/components/ui/Skeleton'

export default function AdminPluginsLoading() {
  return (
    <div className="space-y-8">
      <SkeletonHeader />
      <SkeletonList count={6} withActions />
    </div>
  )
}
