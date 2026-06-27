/** Skeleton shown while the social settings page fetches data. */
import { SkeletonHeader, SkeletonList } from '@/components/ui/Skeleton'

export default function SocialSettingsLoading() {
  return (
    <div className="space-y-8">
      <SkeletonHeader />
      <SkeletonList count={3} withActions />
    </div>
  )
}
