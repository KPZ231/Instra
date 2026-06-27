'use client'

import { useActionState, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RiDeleteBinLine } from 'react-icons/ri'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { deleteAccount } from '@/features/users/actions/deleteAccount'
import { SettingsSectionHeader } from './SettingsSectionHeader'

interface DeleteAccountState {
  errors?: { confirm?: string[]; _form?: string[] }
  success?: boolean
}

interface DeleteAccountSectionProps {
  /** The user's current username used as the confirmation string */
  username: string | null
}

/**
 * Destructive section for permanently deleting the authenticated user's account.
 * @param username - The user's current username (null if unset)
 * @example
 * <DeleteAccountSection username="jane" />
 */
export function DeleteAccountSection({ username }: DeleteAccountSectionProps) {
  const { t } = useTranslation('common')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [confirmValue, setConfirmValue] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, isPending] = useActionState<DeleteAccountState, FormData>(
    deleteAccount,
    {}
  )

  function handleConfirm() {
    formRef.current?.requestSubmit()
  }

  function handleOpenDialog() {
    setConfirmValue('')
    setIsDialogOpen(true)
  }

  function handleCloseDialog() {
    setIsDialogOpen(false)
    setConfirmValue('')
  }

  return (
    <section
      className="rounded-lg p-5 space-y-3"
      style={{
        background: 'rgba(255,75,75,0.05)',
        border: '1px solid rgba(255,180,171,0.15)',
      }}
    >
      <SettingsSectionHeader labelKey="account.delete.title" icon={<RiDeleteBinLine />} iconColor="#ffb4ab" />

      <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
        {t('account.delete.warning')}
      </p>

      {state.errors?._form?.map((err) => (
        <p key={err} className="text-xs" style={{ color: 'var(--color-error)' }}>
          {err}
        </p>
      ))}

      <button
        type="button"
        onClick={handleOpenDialog}
        disabled={isPending}
        className="font-mono text-xs uppercase tracking-[0.08em] px-4 py-2 rounded-sm border transition-opacity disabled:opacity-40 hover:bg-[rgba(255,180,171,0.08)]"
        style={{ color: '#ffb4ab', borderColor: '#ffb4ab', background: 'transparent' }}
      >
        {t('account.delete.button')}
      </button>

      <form ref={formRef} action={formAction} className="hidden">
        <input type="hidden" name="confirm" value={username ?? ''} />
      </form>

      <ConfirmDialog
        open={isDialogOpen}
        title={t('account.delete.title')}
        description={t('account.delete.warning')}
        confirmLabel={t('account.delete.confirm_action')}
        onConfirm={handleConfirm}
        onClose={handleCloseDialog}
        isPending={isPending}
        requireText={username ?? ''}
        requireTextValue={confirmValue}
        onRequireTextChange={setConfirmValue}
        requireTextLabel={t('account.delete.confirm_label')}
        requireTextPlaceholder={t('account.delete.confirm_placeholder')}
      />
    </section>
  )
}
