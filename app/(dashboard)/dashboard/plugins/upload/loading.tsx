/** Skeleton shown while the plugin upload page fetches data. */
import { SkeletonHeader, SkeletonForm } from '@/components/ui/Skeleton'

export default function PluginUploadLoading() {
  return (
    <div className="space-y-8">
      <SkeletonHeader />
      <SkeletonForm fields={3} />
    </div>
  )
}
