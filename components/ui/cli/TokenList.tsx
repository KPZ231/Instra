'use client'

import { useTransition } from 'react'
import { useTranslation } from 'react-i18next'
import { revokeToken } from '@/features/api-tokens'
import type { ApiToken } from '@/lib/api/apiTokens'

type TokenRow = Omit<ApiToken, 'tokenHash'>

interface TokenListProps {
  /** Tokens to display (tokenHash excluded server-side). */
  tokens: TokenRow[]
}

/**
 * Table of existing Personal Access Tokens with per-row revoke buttons.
 *
 * @param tokens - Array of token rows (no tokenHash)
 * @example
 * <TokenList tokens={tokens} />
 */
export function TokenList({ tokens }: TokenListProps) {
  const { t } = useTranslation('common')
  const [isPending, startTransition] = useTransition()

  if (tokens.length === 0) {
    return (
      <p className="text-sm opacity-60" style={{ color: 'var(--color-on-surface)' }}>
        {t('cli.no_tokens')}
      </p>
    )
  }

  function handleRevoke(id: string) {
    startTransition(() => {
      void revokeToken(id)
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-mono">
        <thead>
          <tr className="text-left text-xs uppercase tracking-widest opacity-50" style={{ color: 'var(--color-on-surface)' }}>
            <th className="pb-2 pr-4">{t('cli.col_name')}</th>
            <th className="pb-2 pr-4">{t('cli.col_prefix')}</th>
            <th className="pb-2 pr-4">{t('cli.col_last_used')}</th>
            <th className="pb-2 pr-4">{t('cli.col_expires')}</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((tok) => (
            <tr
              key={tok.id}
              className="border-t"
              style={{ borderColor: 'var(--color-outline-variant)' }}
            >
              <td className="py-2 pr-4" style={{ color: 'var(--color-on-surface)' }}>{tok.name}</td>
              <td className="py-2 pr-4 opacity-60" style={{ color: 'var(--color-on-surface)' }}>{tok.prefix}…</td>
              <td className="py-2 pr-4 opacity-60" style={{ color: 'var(--color-on-surface)' }}>
                {tok.lastUsed ? new Date(tok.lastUsed).toLocaleDateString() : ''}
              </td>
              <td className="py-2 pr-4 opacity-60" style={{ color: 'var(--color-on-surface)' }}>
                {tok.expiresAt ? new Date(tok.expiresAt).toLocaleDateString() : ''}
              </td>
              <td className="py-2 text-right">
                <button
                  onClick={() => handleRevoke(tok.id)}
                  disabled={isPending}
                  className="rounded px-2 py-1 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ background: 'var(--color-error)', color: 'var(--color-on-error)' }}
                >
                  {t('cli.revoke')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
