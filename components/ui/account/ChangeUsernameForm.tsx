'use client'

import { useActionState } from 'react'
import { useTranslation } from 'react-i18next'
import { RiUserLine } from 'react-icons/ri'
import { changeUsername } from '@/features/users/actions/changeUsername'
import { SettingsSectionHeader } from './SettingsSectionHeader'

interface ChangeUsernameState {
  errors?: { username?: string[]; _form?: string[] }
  success?: boolean
  remaining?: number
}

interface ChangeUsernameFormProps {
  /** The user's current username, or null if not set */
  initialUsername: string | null
  /** How many username changes remain this calendar year */
  initialRemaining: number
}

/**
 * Form for changing the authenticated user's username.
 * Enforces a limit of 3 changes per year and shows remaining count.
 * @param initialUsername - Current username (null if unset)
 * @param initialRemaining - Remaining changes allowed this year
 * @example
 * <ChangeUsernameForm initialUsername="jane" initialRemaining={2} />
 */
export function ChangeUsernameForm({ initialUsername, initialRemaining }: ChangeUsernameFormProps) {
  const { t } = useTranslation('common')

  const [state, formAction, isPending] = useActionState<ChangeUsernameState, FormData>(
    changeUsername,
    { remaining: initialRemaining }
  )

  const remaining = state.remaining ?? initialRemaining
  const isLimitReached = remaining === 0

  return (
    <section
      className="rounded-lg p-5 space-y-4"
      style={{
        background: 'var(--color-surface-container-low)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <SettingsSectionHeader labelKey="account.username.section_title" icon={<RiUserLine />} />

      <form action={formAction} className="space-y-3">
        <div className="space-y-1.5">
          <label
            htmlFor="username"
            className="block font-mono text-xs uppercase tracking-[0.08em]"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            {t('account.username.label')}
          </label>

          <input
            id="username"
            name="username"
            type="text"
            defaultValue={initialUsername ?? ''}
            disabled={isLimitReached || isPending}
            className="w-full rounded-sm border px-3 py-2 text-sm bg-transparent outline-none focus:ring-1 disabled:opacity-40 transition-colors"
            style={{
              borderColor: 'rgba(255,255,255,0.15)',
              color: 'var(--color-on-surface)',
              caretColor: 'var(--color-primary)',
            }}
            autoComplete="username"
          />

          {state.errors?.username?.map((err) => (
            <p key={err} className="text-xs" style={{ color: 'var(--color-error)' }}>
              {err}
            </p>
          ))}

          {isLimitReached ? (
            <p className="text-xs" style={{ color: 'var(--color-error)' }}>
              {t('account.username.limit_reached')}
            </p>
          ) : (
            <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
              {t('account.username.helper', { remaining })}
            </p>
          )}
        </div>

        {state.errors?._form?.map((err) => (
          <p key={err} className="text-xs" style={{ color: 'var(--color-error)' }}>
            {err}
          </p>
        ))}

        {state.success && (
          <p className="text-xs" style={{ color: '#a8d5a2' }}>
            {t('account.username.success')}
          </p>
        )}

        <button type="submit" disabled={isLimitReached || isPending} className="btn btn-primary disabled:opacity-40">
          {isPending ? '...' : t('account.username.save')}
        </button>
      </form>
    </section>
  )
}
