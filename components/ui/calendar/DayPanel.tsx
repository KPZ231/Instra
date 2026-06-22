'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PostSelector } from '@/components/ui/campaigns/PostSelector'
import { schedulePost, reschedulePost, deleteCampaign } from '@/features/campaigns'
import type { UserPostOption } from '@/lib/api/posts'
import type { CalendarItem } from '@/lib/api/calendar'

interface DayPanelProps {
  /** ISO date string for the selected day, e.g. "2026-07-04" */
  date: string
  items: CalendarItem[]
  posts: UserPostOption[]
  onClose: () => void
}

const INPUT_CLASS =
  'w-full rounded-sm border px-3 py-2 text-sm bg-transparent outline-none focus:ring-1 disabled:opacity-40 min-h-[44px]'
const INPUT_STYLE = {
  borderColor: 'rgba(255,255,255,0.15)',
  color: 'var(--color-on-surface)',
  caretColor: 'var(--color-primary)',
}
const LABEL_CLASS = 'block font-mono text-xs uppercase tracking-[0.08em] mb-1.5'
const BTN_BASE =
  'font-mono text-[10px] uppercase tracking-[0.08em] px-3 py-2 rounded-sm border transition-opacity disabled:opacity-40 min-h-[44px]'

/**
 * Slide-in panel for a calendar day.
 * Shows scheduled + published items and a form to schedule new posts.
 *
 * @param date    - ISO date string for the selected day
 * @param items   - CalendarItems for this day (pre-filtered by PostCalendar)
 * @param posts   - User's posts for the picker
 * @param onClose - Close the panel
 *
 * @example
 * <DayPanel date="2026-07-04" items={dayItems} posts={userPosts} onClose={() => setOpen(false)} />
 */
export function DayPanel({ date, items, posts, onClose }: DayPanelProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Schedule form state
  const [selectedPosts, setSelectedPosts] = useState<string[]>([])
  const [scheduleTime, setScheduleTime] = useState(() => `${date}T09:00`)

  // Per-item reschedule state: campaignId → new datetime-local value
  const [rescheduleValues, setRescheduleValues] = useState<Record<string, string>>({})
  const [reschedulePending, setReschedulePending] = useState<Record<string, boolean>>({})

  // Cancel confirm state
  const [cancelCampaignId, setCancelCampaignId] = useState<string | null>(null)

  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Escape to close + lock focus inside panel
  useEffect(() => {
    closeRef.current?.focus()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  /** Format a display label for the day, e.g. "Saturday, 4 July 2026" */
  const dayLabel = new Date(`${date}T00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  function handleSchedule() {
    if (selectedPosts.length === 0) return
    startTransition(async () => {
      const at = new Date(scheduleTime)
      let anyError = false
      for (const postId of selectedPosts) {
        const res = await schedulePost({}, { postId, scheduledAt: at })
        if (!res.success) {
          anyError = true
          toast.error(res.errors?._form?.[0] ?? res.errors?.scheduledAt?.[0] ?? 'Error')
        }
      }
      if (!anyError) {
        toast.success(t('schedule.toast.scheduled'))
        setSelectedPosts([])
        router.refresh()
      }
    })
  }

  function handleReschedule(campaignId: string) {
    const val = rescheduleValues[campaignId]
    if (!val) return
    setReschedulePending((p) => ({ ...p, [campaignId]: true }))
    startTransition(async () => {
      const res = await reschedulePost({}, { campaignId, scheduledAt: new Date(val) })
      setReschedulePending((p) => ({ ...p, [campaignId]: false }))
      if (res.success) {
        toast.success(t('schedule.toast.rescheduled'))
        router.refresh()
      } else {
        toast.error(res.errors?._form?.[0] ?? res.errors?.scheduledAt?.[0] ?? 'Error')
      }
    })
  }

  function handleCancel(campaignId: string) {
    startTransition(async () => {
      const res = await deleteCampaign({}, campaignId)
      if (res.success) {
        toast.success(t('schedule.toast.cancelled'))
        setCancelCampaignId(null)
        router.refresh()
      } else {
        toast.error(res.errors?._form?.[0] ?? 'Error')
      }
    })
  }

  const scheduledItems = items.filter((i) => i.type === 'scheduled')
  const publishedItems = items.filter((i) => i.type === 'published')

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.55)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={dayLabel}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
      >
        <div
          className="w-full sm:max-w-lg max-h-[90dvh] flex flex-col rounded-t-sm sm:rounded-sm overflow-hidden"
          style={{
            background: '#121212',
            border: '1px solid rgba(232,227,217,0.2)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div>
              <p
                className="font-mono text-[10px] tracking-[0.12em] uppercase mb-0.5"
                style={{ color: 'var(--color-on-surface-variant)' }}
              >
                {'// DAY'}
              </p>
              <h2
                className="font-sans text-sm font-semibold"
                style={{ color: 'var(--color-on-surface)' }}
              >
                {dayLabel}
              </h2>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="rounded-sm flex items-center justify-center min-h-[44px] min-w-[44px] transition-opacity hover:opacity-70 focus:ring-1 focus:outline-none"
              style={{ color: 'var(--color-outline)' }}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">
            {/* Scheduled items */}
            {scheduledItems.length > 0 && (
              <section aria-label="Scheduled posts">
                <p className={LABEL_CLASS} style={{ color: 'var(--color-on-surface-variant)' }}>
                  Scheduled
                </p>
                <ul className="space-y-3">
                  {scheduledItems.map((item) => {
                    if (item.type !== 'scheduled') return null
                    const canEdit = item.campaignStatus === 'ACTIVE' || item.campaignStatus === 'PAUSED'
                    const timeStr = new Date(item.date).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                    const rescheduleVal =
                      rescheduleValues[item.campaignId] ??
                      new Date(item.date).toISOString().slice(0, 16)
                    return (
                      <li
                        key={item.campaignId}
                        className="rounded-sm p-3 space-y-2.5"
                        style={{
                          background: 'rgba(232,227,217,0.04)',
                          borderLeft: '2px solid var(--color-accent-bone)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderLeftWidth: 2,
                          borderLeftColor: 'var(--color-accent-bone)',
                        }}
                      >
                        <div className="flex items-start gap-2 justify-between">
                          <p
                            className="text-sm leading-snug line-clamp-2 flex-1"
                            style={{ color: 'var(--color-on-surface)' }}
                          >
                            {item.postContent ?? '—'}
                          </p>
                          <span
                            className="font-mono text-[9px] tabular-nums shrink-0 mt-0.5"
                            style={{ color: 'var(--color-outline)' }}
                          >
                            {timeStr}
                          </span>
                        </div>

                        {canEdit && (
                          <div className="flex gap-2 items-end flex-wrap">
                            <div className="flex-1 min-w-[160px]">
                              <label
                                htmlFor={`reschedule-${item.campaignId}`}
                                className={LABEL_CLASS}
                                style={{ color: 'var(--color-on-surface-variant)' }}
                              >
                                {t('schedule.reschedule')}
                              </label>
                              <input
                                id={`reschedule-${item.campaignId}`}
                                type="datetime-local"
                                value={rescheduleVal}
                                onChange={(e) =>
                                  setRescheduleValues((v) => ({
                                    ...v,
                                    [item.campaignId]: e.target.value,
                                  }))
                                }
                                disabled={isPending}
                                className={INPUT_CLASS}
                                style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleReschedule(item.campaignId)}
                              disabled={isPending || reschedulePending[item.campaignId]}
                              className={BTN_BASE}
                              style={{
                                borderColor: 'rgba(232,227,217,0.3)',
                                color: 'var(--color-accent-bone)',
                              }}
                            >
                              {reschedulePending[item.campaignId]
                                ? t('schedule.rescheduling')
                                : t('schedule.reschedule')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setCancelCampaignId(item.campaignId)}
                              disabled={isPending}
                              className={BTN_BASE}
                              style={{ borderColor: '#ffb4ab', color: '#ffb4ab' }}
                            >
                              {t('schedule.cancel_post')}
                            </button>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {/* Published items */}
            {publishedItems.length > 0 && (
              <section aria-label="Published posts">
                <p className={LABEL_CLASS} style={{ color: 'var(--color-on-surface-variant)' }}>
                  Published
                </p>
                <ul className="space-y-3">
                  {publishedItems.map((item) => {
                    if (item.type !== 'published') return null
                    return (
                      <li
                        key={item.postId}
                        className="rounded-sm p-3 space-y-2"
                        style={{
                          background: 'rgba(0,255,65,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderLeftWidth: 2,
                          borderLeftColor: 'var(--color-success-green)',
                        }}
                      >
                        <p
                          className="text-sm leading-snug line-clamp-2"
                          style={{ color: 'var(--color-on-surface)' }}
                        >
                          {item.content ?? '—'}
                        </p>
                        {item.socialStatuses.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap">
                            {item.socialStatuses.map((s, i) => (
                              <span
                                key={i}
                                className="font-mono text-[9px] uppercase tracking-[0.07em] px-1.5 py-0.5 rounded-[2px]"
                                style={{
                                  background: 'rgba(0,255,65,0.08)',
                                  color: 'var(--color-success-green)',
                                  border: '1px solid rgba(0,255,65,0.2)',
                                }}
                              >
                                {s.platform} · {s.status.toLowerCase()}
                              </span>
                            ))}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {items.length === 0 && (
              <p
                className="text-sm py-2"
                style={{ color: 'var(--color-on-surface-variant)' }}
              >
                {t('schedule.empty_day')}
              </p>
            )}

            {/* Schedule form */}
            <section aria-label="Schedule a post">
              <p
                className={LABEL_CLASS}
                style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}
              >
                {t('schedule.schedule_post')}
              </p>

              <div className="space-y-3">
                <div>
                  <label
                    className={LABEL_CLASS}
                    style={{ color: 'var(--color-on-surface-variant)' }}
                  >
                    {t('schedule.pick_post')}
                  </label>
                  {/* ponytail: single-select reuse of multi-select PostSelector; only first selection sent */}
                  <PostSelector
                    posts={posts}
                    selected={selectedPosts}
                    onChange={setSelectedPosts}
                    disabled={isPending}
                  />
                </div>

                <div>
                  <label
                    htmlFor="panel-schedule-time"
                    className={LABEL_CLASS}
                    style={{ color: 'var(--color-on-surface-variant)' }}
                  >
                    {t('schedule.pick_time')}
                  </label>
                  <input
                    id="panel-schedule-time"
                    type="datetime-local"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    disabled={isPending}
                    min={new Date().toISOString().slice(0, 16)}
                    className={INPUT_CLASS}
                    style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSchedule}
                  disabled={isPending || selectedPosts.length === 0}
                  className={`${BTN_BASE} w-full`}
                  style={{
                    borderColor: 'rgba(255,255,255,0.25)',
                    color: 'var(--color-on-surface)',
                    background: selectedPosts.length > 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
                  }}
                >
                  {isPending ? t('schedule.scheduling') : t('schedule.submit_schedule')}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Cancel confirm */}
      {cancelCampaignId && (
        <ConfirmDialog
          open
          title={t('schedule.cancel_title')}
          description={t('schedule.cancel_description')}
          confirmLabel={t('schedule.cancel_confirm')}
          onConfirm={() => handleCancel(cancelCampaignId)}
          onClose={() => setCancelCampaignId(null)}
          isPending={isPending}
        />
      )}
    </>
  )
}
