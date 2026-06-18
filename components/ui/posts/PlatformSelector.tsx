'use client'

import { useTranslation } from 'react-i18next'

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
}

/**
 * Multi-select chip group for choosing target social platforms.
 * Each chip can be toggled independently; at least zero may be selected.
 *
 * @param selected - Array of currently selected platform IDs
 * @param onChange - Callback fired with the updated selection on every toggle
 *
 * @example
 * const [platforms, setPlatforms] = useState<PlatformId[]>([])
 * <PlatformSelector selected={platforms} onChange={setPlatforms} />
 */
export function PlatformSelector({ selected, onChange }: PlatformSelectorProps) {
  const { t } = useTranslation()

  function toggle(id: PlatformId) {
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
        return (
          <button
            key={id}
            type="button"
            onClick={() => toggle(id)}
            aria-pressed={active}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] tracking-[0.06em] uppercase border transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
            style={
              active
                ? {
                    background: `${color}18`,
                    borderColor: color,
                    color: color,
                    outlineColor: color,
                  }
                : {
                    background: 'transparent',
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: 'var(--color-outline)',
                    outlineColor: 'var(--color-outline)',
                  }
            }
          >
            {/* Brand colour dot */}
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-opacity duration-150"
              style={{ background: color, opacity: active ? 1 : 0.35 }}
              aria-hidden="true"
            />
            {label}
          </button>
        )
      })}
    </div>
  )
}
