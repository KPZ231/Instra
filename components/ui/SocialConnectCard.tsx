'use client'

import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Card } from '@/components/ui/Card'
import type { ConnectedAccount, SocialPlatform } from '@/lib/social/types'

interface SocialConnectCardProps {
  platform: SocialPlatform
  account: ConnectedAccount | null
}

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  LINKEDIN: 'LinkedIn',
}

/**
 * Displays the connection status of a social platform and provides
 * connect/disconnect buttons.
 *
 * @param platform - The social platform identifier
 * @param account  - Connected account data, or null if not connected
 *
 * @example
 * <SocialConnectCard platform="FACEBOOK" account={connectedAccount} />
 */
export function SocialConnectCard({ platform, account }: SocialConnectCardProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const label = PLATFORM_LABELS[platform]

  async function handleDisconnect() {
    await fetch(`/api/social/disconnect/${platform.toLowerCase()}`, { method: 'DELETE' })
    startTransition(() => router.refresh())
  }

  return (
    <Card className="p-4 flex items-center justify-between gap-4">
      <div>
        <p className="font-mono text-sm font-bold" style={{ color: 'var(--color-on-surface)' }}>
          {label}
        </p>
        {account ? (
          <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-outline)' }}>
            {t('social.connected_as', { username: account.platformUsername })}
            {account.expiresAt && (
              <span className="ml-2">
                · {t('social.expires')} {new Date(account.expiresAt).toLocaleDateString()}
              </span>
            )}
          </p>
        ) : (
          <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-outline)' }}>
            {t('social.not_connected')}
          </p>
        )}
      </div>

      {account ? (
        <button
          onClick={handleDisconnect}
          disabled={isPending}
          className="font-mono text-xs uppercase tracking-[0.08em] hover:opacity-80 transition-opacity disabled:opacity-40"
          style={{ color: '#ffb4ab' }}
        >
          {t('social.disconnect')}
        </button>
      ) : (
        <a
          href={`/api/social/connect/${platform.toLowerCase()}`}
          className="font-mono text-xs uppercase tracking-[0.08em] hover:opacity-80 transition-opacity"
          style={{ color: 'var(--color-primary)' }}
        >
          {t('social.connect')}
        </a>
      )}
    </Card>
  )
}
