'use client'

import { useTranslation } from 'react-i18next'

interface SocialStatusBadgeProps {
  platform: string
  status: string
  error: string | null
}

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'var(--color-primary)',
  PUBLISHING: 'var(--color-outline)',
  FAILED: '#ffb4ab',
  PENDING: 'var(--color-outline)',
}

/**
 * Tiny badge showing publish status for a social platform.
 *
 * @param platform - Platform name (e.g. "FACEBOOK")
 * @param status   - PublishStatus value
 * @param error    - Error message if status is FAILED
 *
 * @example
 * <SocialStatusBadge platform="LINKEDIN" status="PUBLISHED" error={null} />
 */
export function SocialStatusBadge({ platform, status, error }: SocialStatusBadgeProps) {
  const { t } = useTranslation()
  const color = STATUS_COLORS[status] ?? 'var(--color-outline)'
  const label = platform.charAt(0) + platform.slice(1).toLowerCase()

  return (
    <span
      className="font-mono text-[9px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded"
      style={{
        color,
        background: 'var(--color-surface-container)',
        border: `1px solid ${color}`,
        cursor: error ? 'help' : 'default',
      }}
      title={error ?? undefined}
    >
      {status === 'PUBLISHING' ? '…' : status === 'PUBLISHED' ? '✓' : status === 'FAILED' ? '✗' : '·'}{' '}
      {label}
    </span>
  )
}
