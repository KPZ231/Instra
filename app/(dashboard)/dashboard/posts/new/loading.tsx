/** Skeleton shown while the new post page fetches data. */
import { SkeletonHeader, SkeletonForm } from '@/components/ui/Skeleton'

export default function NewPostLoading() {
  return (
    <div className="space-y-8">
      <SkeletonHeader />
      <SkeletonForm fields={4} />
    </div>
  )
}
