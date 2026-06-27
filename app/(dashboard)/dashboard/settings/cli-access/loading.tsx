/** Skeleton shown while the CLI access settings page fetches data. */
import { SkeletonHeader, SkeletonList } from '@/components/ui/Skeleton'

export default function CliAccessLoading() {
  return (
    <div className="space-y-8">
      <SkeletonHeader withAction />
      <SkeletonList count={3} withActions />
    </div>
  )
}
