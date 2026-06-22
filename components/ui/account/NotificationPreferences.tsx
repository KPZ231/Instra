'use client'

import { useActionState } from 'react'
import { useTranslation } from 'react-i18next'
import { updatePreferences } from '@/features/notifications'
import type { UpdatePreferencesState } from '@/features/notifications'

interface NotificationPreferencesProps {
  /** Current value of the notificationsMuted user field */
  initialMuted: boolean
  /** Current value of the emailNotificationsEnabled user field */
  initialEmailEnabled: boolean
}

/**
 * Settings section for notification preferences.
 * Allows the user to mute in-app notifications and disable email notifications.
 * Uses useActionState with the updatePreferences server action.
 *
 * @param initialMuted        - Current notificationsMuted value
 * @param initialEmailEnabled - Current emailNotificationsEnabled value
 *
 * @example
 * <NotificationPreferences initialMuted={user.notificationsMuted} initialEmailEnabled={user.emailNotificationsEnabled} />
 */
export function NotificationPreferences({
  initialMuted,
  initialEmailEnabled,
}: NotificationPreferencesProps) {
  const { t } = useTranslation('common')
  const [state, action, isPending] = useActionState<UpdatePreferencesState, FormData>(
    updatePreferences,
    {}
  )

  return (
    <section className="space-y-4">
      <h2
        className="font-mono text-xs font-bold uppercase tracking-[0.1em]"
        style={{ color: 'var(--color-on-surface)' }}
      >
        {t('account.notifications.title')}
      </h2>

      <form action={action} className="space-y-4">
        {/* Hidden inputs come BEFORE checkboxes so formData.get() returns checkbox value when checked */}
        <input type="hidden" name="notificationsMuted" value="false" />
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="notificationsMuted"
            value="true"
            defaultChecked={initialMuted}
            className="mt-0.5 accent-[#00FF41]"
          />
          <span>
            <span className="block text-sm" style={{ color: 'var(--color-on-surface)' }}>
              {t('account.notifications.muteLabel')}
            </span>
            <span
              className="block text-xs mt-0.5"
              style={{ color: 'var(--color-on-surface-variant)' }}
            >
              {t('account.notifications.muteHelper')}
            </span>
          </span>
        </label>

        <input type="hidden" name="emailNotificationsEnabled" value="false" />
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="emailNotificationsEnabled"
            value="true"
            defaultChecked={initialEmailEnabled}
            className="mt-0.5 accent-[#00FF41]"
          />
          <span>
            <span className="block text-sm" style={{ color: 'var(--color-on-surface)' }}>
              {t('account.notifications.emailLabel')}
            </span>
            <span
              className="block text-xs mt-0.5"
              style={{ color: 'var(--color-on-surface-variant)' }}
            >
              {t('account.notifications.emailHelper')}
            </span>
          </span>
        </label>

        {state.errors?._form && (
          <p className="text-xs" style={{ color: 'var(--color-error)' }}>
            {state.errors._form[0]}
          </p>
        )}

        <button type="submit" disabled={isPending} className="btn btn-secondary disabled:opacity-40">
          {state.success ? t('account.notifications.saved') : t('account.notifications.save')}
        </button>
      </form>
    </section>
  )
}
