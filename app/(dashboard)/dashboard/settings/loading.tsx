/** Skeleton shown while the settings page fetches data. */
import { SkeletonHeader, SkeletonForm } from '@/components/ui/Skeleton'

export default function SettingsLoading() {
  return (
    <div className="space-y-8">
      <SkeletonHeader />
      <SkeletonForm fields={4} />
    </div>
  )
}
