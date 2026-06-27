/** Skeleton shown while the plugins page fetches data. */
import { SkeletonHeader, SkeletonList } from '@/components/ui/Skeleton'

export default function PluginsLoading() {
  return (
    <div className="space-y-8">
      <SkeletonHeader withAction />
      <SkeletonList count={4} />
    </div>
  )
}
