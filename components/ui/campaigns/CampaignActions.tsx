'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { pauseCampaign, resumeCampaign, deleteCampaign } from '@/features/campaigns'
import type { CampaignStatus } from '@prisma/client'

interface CampaignActionsProps {
  campaignId: string
  campaignName: string
  status: CampaignStatus
  onHistoryToggle: () => void
  isHistoryOpen: boolean
}

/**
 * Pause / Resume / Delete action buttons for a campaign row.
 * Uses useTransition for non-blocking UX; toasts on result; router.refresh() to sync list.
 *
 * @param campaignId     - Campaign ID
 * @param campaignName   - Campaign name (used for delete confirm text)
 * @param status         - Current campaign status
 * @param onHistoryToggle - Toggle history panel callback
 * @param isHistoryOpen  - Whether history panel is currently open
 * @example
 * <CampaignActions campaignId={id} campaignName={name} status="ACTIVE" onHistoryToggle={fn} isHistoryOpen={false} />
 */
export function CampaignActions({
  campaignId,
  campaignName,
  status,
  onHistoryToggle,
  isHistoryOpen,
}: CampaignActionsProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  function handlePause() {
    startTransition(async () => {
      const res = await pauseCampaign({}, campaignId)
      if (res.success) {
        toast.success(t('campaigns.toast.paused'))
        router.refresh()
      } else {
        toast.error(res.errors?._form?.[0] ?? 'Error')
      }
    })
  }

  function handleResume() {
    startTransition(async () => {
      const res = await resumeCampaign({}, campaignId)
      if (res.success) {
        toast.success(t('campaigns.toast.resumed'))
        router.refresh()
      } else {
        toast.error(res.errors?._form?.[0] ?? 'Error')
      }
    })
  }

  function handleDeleteConfirm() {
    startTransition(async () => {
      const res = await deleteCampaign({}, campaignId)
      if (res.success) {
        toast.success(t('campaigns.toast.deleted'))
        setShowDeleteDialog(false)
        router.refresh()
      } else {
        toast.error(res.errors?._form?.[0] ?? 'Error')
      }
    })
  }

  const btnBase =
    'font-mono text-[10px] uppercase tracking-[0.08em] px-3 py-2 rounded-sm border transition-opacity disabled:opacity-40 min-h-[44px] min-w-[44px]'

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {/* History toggle */}
        <button
          type="button"
          onClick={onHistoryToggle}
          className={btnBase}
          style={{
            borderColor: 'rgba(255,255,255,0.15)',
            color: 'var(--color-on-surface-variant)',
          }}
        >
          {isHistoryOpen ? t('campaigns.actions.hide_history') : t('campaigns.actions.history')}
        </button>

        {/* Pause / Resume  conditional */}
        {status === 'ACTIVE' && (
          <button
            type="button"
            onClick={handlePause}
            disabled={isPending}
            className={btnBase}
            style={{
              borderColor: 'rgba(255,255,255,0.15)',
              color: 'var(--color-accent-bone)',
            }}
          >
            {isPending ? t('campaigns.actions.pausing') : t('campaigns.actions.pause')}
          </button>
        )}

        {status === 'PAUSED' && (
          <button
            type="button"
            onClick={handleResume}
            disabled={isPending}
            className={btnBase}
            style={{
              borderColor: 'var(--color-success-green)',
              color: 'var(--color-success-green)',
            }}
          >
            {isPending ? t('campaigns.actions.resuming') : t('campaigns.actions.resume')}
          </button>
        )}

        {/* Delete  always visible, separated, destructive color */}
        <button
          type="button"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isPending}
          className={btnBase}
          style={{ borderColor: '#ffb4ab', color: '#ffb4ab' }}
        >
          {t('campaigns.actions.delete')}
        </button>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        title={t('campaigns.confirm_delete.title')}
        description={t('campaigns.confirm_delete.description')}
        confirmLabel={t('campaigns.confirm_delete.confirm')}
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          setShowDeleteDialog(false)
          setDeleteConfirmText('')
        }}
        isPending={isPending}
        requireText={campaignName}
        requireTextValue={deleteConfirmText}
        onRequireTextChange={setDeleteConfirmText}
        requireTextLabel={t('campaigns.confirm_delete.label')}
        requireTextPlaceholder={campaignName}
      />
    </>
  )
}
