'use client'

import { useTranslation } from 'react-i18next'

/**
 * Client component rendering the translated settings page title.
 */
export function SettingsPageTitle() {
  const { t } = useTranslation('common')
  return (
    <h1
      className="font-mono text-lg font-bold uppercase tracking-[0.1em]"
      style={{ color: 'var(--color-on-surface)' }}
    >
      {t('account.settings.title')}
    </h1>
  )
}
