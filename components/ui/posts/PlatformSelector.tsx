'use client'

import { useTranslation } from 'react-i18next'
import { PlatformIcon } from './PlatformFields'

/** Supported social platforms for post publishing */
export const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', color: '#E1306C' },
  { id: 'facebook', label: 'Facebook', color: '#1877F2' },
  { id: 'twitter', label: 'X / Twitter', color: '#ffffff' },
  { id: 'tiktok', label: 'TikTok', color: '#69C9D0' },
  { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2' },
  { id: 'youtube', label: 'YouTube', color: '#FF0000' },
] as const

export type PlatformId = (typeof PLATFORMS)[number]['id']

interface PlatformSelectorProps {
  selected: PlatformId[]
  onChange: (platforms: PlatformId[]) => void
  /** IDs of platforms the user has connected. Unconnected ones are shown grayed out. */
  connectedPlatforms?: PlatformId[]
}

/**
 * Multi-select chip group for choosing target social platforms.
 * Unconnected platforms are disabled and shown with reduced opacity.
 *
 * @param selected            - Array of currently selected platform IDs
 * @param onChange            - Callback fired with the updated selection on every toggle
 * @param connectedPlatforms  - Which platforms the user has OAuth'd. Omit to allow all.
 *
 * @example
 * <PlatformSelector selected={platforms} onChange={setPlatforms} connectedPlatforms={['instagram', 'facebook']} />
 */
export function PlatformSelector({ selected, onChange, connectedPlatforms }: PlatformSelectorProps) {
  const { t } = useTranslation()

  function toggle(id: PlatformId) {
    if (connectedPlatforms && !connectedPlatforms.includes(id)) return
    onChange(
      selected.includes(id) ? selected.filter((p) => p !== id) : [...selected, id],
    )
  }

  return (
    <div
      role="group"
      aria-label={t('posts.composer.platforms_label')}
      className="flex flex-wrap gap-1.5"
    >
      {PLATFORMS.map(({ id, label, color }) => {
        const active = selected.includes(id)
        const isConnected = !connectedPlatforms || connectedPlatforms.includes(id)
        const disabled = !isConnected

        return (
          <button
            key={id}
            type="button"
            onClick={() => toggle(id)}
            aria-pressed={active}
            aria-disabled={disabled}
            title={disabled ? t('posts.composer.platform_not_connected', { platform: label }) : undefined}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full font-mono text-[10px] tracking-[0.06em] uppercase border transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
            style={
              disabled
                ? {
                    background: 'transparent',
                    borderColor: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.2)',
                    cursor: 'not-allowed',
                    outlineColor: 'transparent',
                  }
                : active
                  ? {
                      background: `${color}18`,
                      borderColor: color,
                      color: color,
                      outlineColor: color,
                      boxShadow: `0 0 0 1px ${color}20`,
                    }
                  : {
                      background: 'transparent',
                      borderColor: 'rgba(255,255,255,0.1)',
                      color: 'var(--color-outline)',
                      outlineColor: 'var(--color-outline)',
                    }
            }
          >
            <span
              className="flex-shrink-0 transition-opacity duration-150"
              style={{ opacity: disabled ? 0.2 : active ? 1 : 0.45 }}
              aria-hidden="true"
            >
              <PlatformIcon id={id} size={11} />
            </span>
            {label}
            {disabled && (
              <span className="text-[8px] opacity-50 ml-0.5">
                {t('posts.composer.platform_disconnected_badge')}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
