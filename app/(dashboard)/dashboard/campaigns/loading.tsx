/** Skeleton shown while the campaigns list page fetches data. */
import { SkeletonHeader, SkeletonList } from '@/components/ui/Skeleton'

export default function CampaignsLoading() {
  return (
    <div className="space-y-8">
      <SkeletonHeader withAction />
      <SkeletonList count={4} withActions />
    </div>
  )
}
