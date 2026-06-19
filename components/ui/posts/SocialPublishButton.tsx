'use client'

import { useTransition, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { publishPost } from '@/features/social'
import { SocialStatusBadge } from './SocialStatusBadge'

interface StatusItem {
  platform: string
  status: string
  error: string | null
}

interface SocialPublishButtonProps {
  postId: string
  platforms: string[]
  initialStatuses: StatusItem[]
}

/**
 * Button that publishes an Instra post to connected social platforms.
 * Shows per-platform status badges after publishing.
 *
 * @param postId          - The post ID to publish
 * @param platforms       - Platforms selected on the post (e.g. ["FACEBOOK", "LINKEDIN"])
 * @param initialStatuses - Existing SocialPostStatus records for this post
 *
 * @example
 * <SocialPublishButton postId={post.id} platforms={post.platforms} initialStatuses={post.socialStatuses} />
 */
export function SocialPublishButton({ postId, platforms, initialStatuses }: SocialPublishButtonProps) {
  const { t } = useTranslation()
  const [isPending, startTransition] = useTransition()
  const [statuses, setStatuses] = useState<StatusItem[]>(initialStatuses)

  if (platforms.length === 0) return null

  async function handlePublish() {
    startTransition(async () => {
      const result = await publishPost(postId)
      if (result.results) {
        setStatuses(
          result.results.map((r) => ({
            platform: r.platform,
            status: r.success ? 'PUBLISHED' : 'FAILED',
            error: r.error ?? null,
          })),
        )
      }
    })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={handlePublish}
        disabled={isPending}
        className="font-mono text-[10px] uppercase tracking-[0.08em] hover:opacity-80 transition-opacity disabled:opacity-40"
        style={{ color: 'var(--color-primary)' }}
      >
        {isPending ? t('social.publishing') : t('social.publish')}
      </button>
      {statuses.map((s) => (
        <SocialStatusBadge key={s.platform} platform={s.platform} status={s.status} error={s.error} />
      ))}
    </div>
  )
}
