'use client'

import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'

interface SettingsSectionHeaderProps {
  /** i18n key for the section title */
  labelKey: string
  /** Icon to display next to the title */
  icon?: ReactNode
  /** Override icon color (defaults to --color-primary) */
  iconColor?: string
}

/**
 * Reusable section header for settings cards.
 * @param labelKey - i18n key
 * @param icon - Optional icon element
 */
export function SettingsSectionHeader({ labelKey, icon, iconColor }: SettingsSectionHeaderProps) {
  const { t } = useTranslation('common')
  return (
    <div className="flex items-center gap-2 mb-4">
      {icon && (
        <span style={{ color: iconColor ?? 'var(--color-primary)' }} className="text-base shrink-0">
          {icon}
        </span>
      )}
      <h2
        className="font-mono text-xs font-bold uppercase tracking-[0.1em]"
        style={{ color: 'var(--color-on-surface)' }}
      >
        {t(labelKey)}
      </h2>
    </div>
  )
}
