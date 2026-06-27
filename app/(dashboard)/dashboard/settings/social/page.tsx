'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'next/navigation'
import { SocialConnectCard } from '@/components/ui/SocialConnectCard'
import type { SocialPlatform, ConnectedAccount } from '@/lib/social/types'

const PLATFORMS: SocialPlatform[] = ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN']

/**
 * Safely decodes a URI component string, returning the original value if decoding fails.
 * @param value - The value to decode
 * @returns Decoded string, or original value if decoding fails
 */
function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * Social accounts settings page  connect/disconnect Facebook, Instagram, LinkedIn.
 */
export default function SocialSettingsPage() {
  const { t } = useTranslation('common')
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const error = searchParams.get('error')

  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])

  useEffect(() => {
    fetch('/api/social/accounts')
      .then((r) => r.json())
      .then((data) => setAccounts(data.accounts ?? []))
      .catch(() => {})
  }, [])

  const accountMap = Object.fromEntries(
    accounts.map((a) => [a.platform, a]),
  ) as Record<SocialPlatform, ConnectedAccount | undefined>

  return (
    <main className="max-w-xl mx-auto py-10 px-4 space-y-6">
      <h1
        className="font-mono text-lg font-bold uppercase tracking-[0.1em]"
        style={{ color: 'var(--color-on-surface)' }}
      >
        {t('social.settings.title')}
      </h1>

      {success && (
        <p
          className="font-mono text-xs p-3 rounded"
          style={{ background: 'var(--color-surface-container)', color: 'var(--color-primary)' }}
        >
          {t('social.connect_success')}
        </p>
      )}
      {error && (
        <p
          className="font-mono text-xs p-3 rounded"
          style={{ background: 'var(--color-surface-container)', color: '#ffb4ab' }}
        >
          {safeDecodeURIComponent(error)}
        </p>
      )}

      <div className="space-y-3">
        {PLATFORMS.map((platform) => (
          <SocialConnectCard
            key={platform}
            platform={platform}
            account={accountMap[platform] ?? null}
          />
        ))}
      </div>
    </main>
  )
}
