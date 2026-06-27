'use client'

import { useActionState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { createToken } from '@/features/api-tokens'
import type { CreateTokenState } from '@/features/api-tokens'

/**
 * Form to mint a new Personal Access Token.
 * On success, displays the raw token once (copy before leaving the page).
 *
 * @example
 * <CreateTokenForm />
 */
export function CreateTokenForm() {
  const { t } = useTranslation('common')
  const [state, formAction, isPending] = useActionState<CreateTokenState, FormData>(createToken, {})
  const inputRef = useRef<HTMLInputElement>(null)

  /** Copies raw token to clipboard. */
  function handleCopy() {
    if (state.token) navigator.clipboard.writeText(state.token)
  }

  if (state.token) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium" style={{ color: 'var(--color-on-surface)' }}>
          {t('cli.token_created')}
        </p>
        <div className="flex gap-2 flex-wrap">
          <code
            className="flex-1 min-w-0 break-all rounded px-3 py-2 text-xs font-mono"
            style={{ background: 'var(--color-surface-variant)', color: 'var(--color-on-surface-variant)' }}
          >
            {state.token}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded px-3 py-2 text-xs font-mono font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
          >
            {t('cli.copy')}
          </button>
        </div>
        <p className="text-xs opacity-60" style={{ color: 'var(--color-on-surface)' }}>
          {t('cli.token_show_once')}
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex gap-2 flex-wrap items-end">
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-medium mb-1 uppercase tracking-widest opacity-60" style={{ color: 'var(--color-on-surface)' }}>
            {t('cli.token_name_label')}
          </label>
          <input
            ref={inputRef}
            name="name"
            type="text"
            maxLength={64}
            placeholder={t('cli.token_name_placeholder')}
            required
            className="w-full rounded px-3 py-2 text-sm font-mono outline-none"
            style={{
              background: 'var(--color-surface-variant)',
              color: 'var(--color-on-surface-variant)',
              border: '1px solid var(--color-outline)',
            }}
          />
          {state.errors?.name && (
            <p className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>
              {state.errors.name[0]}
            </p>
          )}
        </div>
        <div className="shrink-0">
          <label className="block text-xs font-medium mb-1 uppercase tracking-widest opacity-60" style={{ color: 'var(--color-on-surface)' }}>
            {t('cli.expires_label')}
          </label>
          <select
            name="expiresInDays"
            className="rounded px-3 py-2 text-sm font-mono outline-none"
            style={{
              background: 'var(--color-surface-variant)',
              color: 'var(--color-on-surface-variant)',
              border: '1px solid var(--color-outline)',
            }}
          >
            <option value="30">30 {t('cli.days')}</option>
            <option value="90" selected>90 {t('cli.days')}</option>
            <option value="180">180 {t('cli.days')}</option>
            <option value="365">365 {t('cli.days')}</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded px-4 py-2 text-sm font-mono font-semibold transition-opacity disabled:opacity-50"
          style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
        >
          {isPending ? t('cli.generating') : t('cli.generate')}
        </button>
      </div>
      {state.errors?._form && (
        <p className="text-xs" style={{ color: 'var(--color-error)' }}>
          {state.errors._form[0]}
        </p>
      )}
    </form>
  )
}
