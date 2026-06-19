import { getTranslations } from 'next-intl/server'
import { getConnectedAccounts } from '@/lib/api/socialAccounts'
import { verifySession } from '@/lib/auth/dal'
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
 * Social accounts settings page — connect/disconnect Facebook, Instagram, LinkedIn.
 */
export default async function SocialSettingsPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string }
}) {
  const t = await getTranslations('social')
  const { user } = await verifySession()
  const accounts = await getConnectedAccounts(user.id)

  const accountMap = Object.fromEntries(
    accounts.map((a) => [a.platform, a]),
  ) as Record<SocialPlatform, ConnectedAccount | undefined>

  return (
    <main className="max-w-xl mx-auto py-10 px-4 space-y-6">
      <h1
        className="font-mono text-lg font-bold uppercase tracking-[0.1em]"
        style={{ color: 'var(--color-on-surface)' }}
      >
        {t('settings.title')}
      </h1>

      {searchParams.success && (
        <p
          className="font-mono text-xs p-3 rounded"
          style={{ background: 'var(--color-surface-container)', color: 'var(--color-primary)' }}
        >
          Account connected successfully.
        </p>
      )}
      {searchParams.error && (
        <p
          className="font-mono text-xs p-3 rounded"
          style={{ background: 'var(--color-surface-container)', color: '#ffb4ab' }}
        >
          {safeDecodeURIComponent(searchParams.error)}
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
