/** Skeleton shown while the new campaign page fetches data. */
import { SkeletonHeader, SkeletonForm } from '@/components/ui/Skeleton'

export default function NewCampaignLoading() {
  return (
    <div className="space-y-8">
      <SkeletonHeader />
      <SkeletonForm fields={5} />
    </div>
  )
}
