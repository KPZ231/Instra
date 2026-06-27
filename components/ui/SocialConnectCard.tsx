'use client'

import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { useTransition, useState } from 'react'
import { RiFacebookFill, RiInstagramLine, RiLinkedinFill } from 'react-icons/ri'
import type { ConnectedAccount, SocialPlatform } from '@/lib/social/types'

interface SocialConnectCardProps {
  platform: SocialPlatform
  account: ConnectedAccount | null
}

const PLATFORM_META: Record<SocialPlatform, { label: string; icon: React.ReactNode; color: string }> = {
  FACEBOOK: { label: 'Facebook', icon: <RiFacebookFill size={18} />, color: '#1877F2' },
  INSTAGRAM: { label: 'Instagram', icon: <RiInstagramLine size={18} />, color: '#E1306C' },
  LINKEDIN: { label: 'LinkedIn', icon: <RiLinkedinFill size={18} />, color: '#0A66C2' },
}

/**
 * Displays the connection status of a social platform and provides connect/disconnect buttons.
 *
 * @param platform - The social platform identifier
 * @param account  - Connected account data, or null if not connected
 *
 * @example
 * <SocialConnectCard platform="FACEBOOK" account={connectedAccount} />
 */
export function SocialConnectCard({ platform, account }: SocialConnectCardProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [disconnectError, setDisconnectError] = useState<string | null>(null)
  const { label, icon, color } = PLATFORM_META[platform]

  async function handleDisconnect() {
    setDisconnectError(null)
    try {
      const res = await fetch(`/api/social/disconnect/${platform.toLowerCase()}`, { method: 'DELETE' })
      if (!res.ok) {
        setDisconnectError(t('social.disconnect_error'))
        return
      }
      startTransition(() => router.refresh())
    } catch {
      setDisconnectError(t('social.disconnect_error'))
    }
  }

  return (
    <div
      className="flex items-center justify-between gap-4 rounded-lg p-4"
      style={{
        background: 'var(--color-surface-container-low)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="flex items-center gap-3">
        <span style={{ color }} className="shrink-0">
          {icon}
        </span>
        <div>
          <p className="font-mono text-sm font-bold" style={{ color: 'var(--color-on-surface)' }}>
            {label}
          </p>
          {account ? (
            <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-on-surface-variant)' }}>
              {t('social.connected_as', { username: account.platformUsername })}
              {account.expiresAt && (
                <span className="ml-2">
                  · {t('social.expires')} {new Date(account.expiresAt).toLocaleDateString()}
                </span>
              )}
            </p>
          ) : (
            <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-on-surface-variant)' }}>
              {t('social.not_connected')}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        {account ? (
          <>
            <button
              onClick={handleDisconnect}
              disabled={isPending}
              className="font-mono text-xs uppercase tracking-[0.08em] hover:opacity-80 transition-opacity disabled:opacity-40"
              style={{ color: '#ffb4ab' }}
            >
              {t('social.disconnect')}
            </button>
            {disconnectError && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>
                {disconnectError}
              </p>
            )}
          </>
        ) : (
          <a
            href={`/api/social/connect/${platform.toLowerCase()}`}
            className="font-mono text-xs uppercase tracking-[0.08em] hover:opacity-80 transition-opacity"
            style={{ color: 'var(--color-primary)' }}
          >
            {t('social.connect')}
          </a>
        )}
      </div>
    </div>
  )
}
