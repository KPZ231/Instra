'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DayPanel } from './DayPanel'
import type { CalendarItem } from '@/lib/api/calendar'
import type { UserPostOption } from '@/lib/api/posts'

interface PostCalendarProps {
  /** "YYYY-MM" string for the displayed month */
  month: string
  items: CalendarItem[]
  posts: UserPostOption[]
}

/**
 * Month-grid post calendar. Signature element: 7-col grid (Mon–Sun),
 * bone-bordered scheduled chips vs green published chips, today ringed.
 *
 * @param month - "YYYY-MM" for the displayed month
 * @param items - Calendar items for the month (from getCalendarItems)
 * @param posts - User posts for the schedule picker inside DayPanel
 *
 * @example
 * <PostCalendar month="2026-07" items={items} posts={posts} />
 */
export function PostCalendar({ month, items, posts }: PostCalendarProps) {
  const { t } = useTranslation('common')
  const [openDay, setOpenDay] = useState<string | null>(null)

  const [year, monthIdx] = month.split('-').map(Number)
  // monthIdx is 1-based from the string, Date() wants 0-based
  const firstDay = new Date(year, monthIdx - 1, 1)
  const lastDay = new Date(year, monthIdx, 0)
  const daysInMonth = lastDay.getDate()

  // Monday=0 offset for first day (JS getDay: 0=Sun,1=Mon…)
  const startOffset = (firstDay.getDay() + 6) % 7

  // Today ISO string "YYYY-MM-DD" (server-rendered default; client may differ by timezoneacceptable)
  const todayISO = new Date().toISOString().slice(0, 10)

  // Group items by "YYYY-MM-DD"
  const byDay = new Map<string, CalendarItem[]>()
  for (const item of items) {
    const key = new Date(item.date).toISOString().slice(0, 10)
    const bucket = byDay.get(key) ?? []
    bucket.push(item)
    byDay.set(key, bucket)
  }

  // Month nav links
  const prevMonth = new Date(year, monthIdx - 2, 1)
  const nextMonth = new Date(year, monthIdx, 1)
  const toMonthParam = (d: Date) =>
    `?month=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

  const monthLabel = firstDay.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const weekdays = t('schedule.weekdays', { returnObjects: true }) as string[]

  const handleClosePanel = useCallback(() => setOpenDay(null), [])

  return (
    <>
      <div className="space-y-4">
        {/* Month nav */}
        <div className="flex items-center justify-between gap-2">
          <Link
            href={toMonthParam(prevMonth)}
            className="flex items-center justify-center rounded-sm min-h-[44px] min-w-[44px] transition-opacity hover:opacity-70 focus:ring-1 focus:outline-none"
            style={{ color: 'var(--color-on-surface-variant)', border: '1px solid rgba(255,255,255,0.10)' }}
            aria-label={t('schedule.prev_month')}
          >
            <ChevronLeft size={16} />
          </Link>

          <div className="text-center">
            <span
              className="font-sans text-base font-semibold capitalize"
              style={{ color: 'var(--color-on-surface)' }}
            >
              {monthLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="?month="
              className="font-mono text-[10px] uppercase tracking-[0.08em] px-3 py-2 rounded-sm border min-h-[44px] flex items-center transition-opacity hover:opacity-70 hidden sm:flex"
              style={{
                borderColor: 'rgba(232,227,217,0.2)',
                color: 'var(--color-on-surface-variant)',
              }}
              aria-label={t('schedule.today')}
            >
              {t('schedule.today')}
            </Link>
            <Link
              href={toMonthParam(nextMonth)}
              className="flex items-center justify-center rounded-sm min-h-[44px] min-w-[44px] transition-opacity hover:opacity-70 focus:ring-1 focus:outline-none"
              style={{ color: 'var(--color-on-surface-variant)', border: '1px solid rgba(255,255,255,0.10)' }}
              aria-label={t('schedule.next_month')}
            >
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-[1px]"
              style={{ background: 'var(--color-accent-bone)' }}
              aria-hidden
            />
            <span className="font-mono text-[9px] uppercase tracking-[0.08em]"
              style={{ color: 'var(--color-on-surface-variant)' }}>
              Scheduled
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-[1px]"
              style={{ background: 'var(--color-success-green)' }}
              aria-hidden
            />
            <span className="font-mono text-[9px] uppercase tracking-[0.08em]"
              style={{ color: 'var(--color-on-surface-variant)' }}>
              Published
            </span>
          </span>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-px" role="row">
          {weekdays.map((d) => (
            <div
              key={d}
              role="columnheader"
              className="text-center font-mono text-[9px] uppercase tracking-[0.08em] py-2"
              style={{ color: 'var(--color-on-surface-variant)' }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div
          className="grid grid-cols-7 gap-px"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          role="grid"
          aria-label={monthLabel}
        >
          {/* Leading blank cells */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div
              key={`blank-${i}`}
              role="gridcell"
              aria-hidden="true"
              style={{ background: 'var(--color-surface-container-lowest)', minHeight: 80 }}
            />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1
            const iso = `${year}-${String(monthIdx).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
            const dayItems = byDay.get(iso) ?? []
            const isToday = iso === todayISO
            const hasItems = dayItems.length > 0
            const MAX_CHIPS = 3
            const overflow = dayItems.length - MAX_CHIPS

            const scheduledCount = dayItems.filter((x) => x.type === 'scheduled').length
            const publishedCount = dayItems.filter((x) => x.type === 'published').length

            return (
              <button
                key={iso}
                type="button"
                onClick={() => setOpenDay(iso)}
                aria-label={`${dayNum}  ${dayItems.length} posts`}
                aria-pressed={openDay === iso}
                className="text-left p-1.5 sm:p-2 transition-colors focus:outline-none focus:ring-1 focus:ring-inset group"
                style={{
                  background: 'var(--color-surface-container-lowest)',
                  minHeight: 80,
                  // ponytail: ring on focus only, no hover ring to avoid clutter
                }}
              >
                {/* Day number */}
                <span
                  className="inline-flex items-center justify-center font-mono text-[11px] tabular-nums rounded-full transition-colors"
                  style={{
                    width: 22,
                    height: 22,
                    color: isToday ? 'var(--color-surface-container-lowest)' : 'var(--color-on-surface-variant)',
                    background: isToday ? 'var(--color-accent-bone)' : 'transparent',
                    border: isToday ? 'none' : 'none',
                  }}
                >
                  {dayNum}
                </span>

                {/* Item chips (desktop: text; mobile: dots) */}
                {hasItems && (
                  <div className="mt-1 space-y-0.5">
                    {/* Mobile: compact dots */}
                    <div className="flex sm:hidden gap-1 mt-1 flex-wrap">
                      {scheduledCount > 0 && (
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: 'var(--color-accent-bone)' }}
                          aria-hidden
                        />
                      )}
                      {publishedCount > 0 && (
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: 'var(--color-success-green)' }}
                          aria-hidden
                        />
                      )}
                      {dayItems.length > 1 && (
                        <span
                          className="font-mono text-[8px] tabular-nums"
                          style={{ color: 'var(--color-outline)' }}
                        >
                          {dayItems.length}
                        </span>
                      )}
                    </div>

                    {/* Desktop: text chips */}
                    <div className="hidden sm:block space-y-0.5">
                      {dayItems.slice(0, MAX_CHIPS).map((item, idx) => {
                        const isScheduled = item.type === 'scheduled'
                        const label = isScheduled
                          ? (item.postContent?.slice(0, 22) ?? 'Scheduled post')
                          : (item.content?.slice(0, 22) ?? 'Published post')
                        return (
                          <div
                            key={idx}
                            className="text-[10px] leading-tight px-1 py-0.5 rounded-[2px] truncate"
                            style={{
                              borderLeft: `2px solid ${isScheduled ? 'var(--color-accent-bone)' : 'var(--color-success-green)'}`,
                              color: 'var(--color-on-surface-variant)',
                              background: isScheduled
                                ? 'rgba(232,227,217,0.06)'
                                : 'rgba(0,255,65,0.06)',
                              paddingLeft: 4,
                            }}
                          >
                            {label}…
                          </div>
                        )
                      })}
                      {overflow > 0 && (
                        <div
                          className="font-mono text-[9px] px-1"
                          style={{ color: 'var(--color-outline)' }}
                        >
                          {t('schedule.more', { count: overflow })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </button>
            )
          })}

          {/* Trailing blank cells to complete last row */}
          {(() => {
            const totalCells = startOffset + daysInMonth
            const remainder = totalCells % 7
            const trailing = remainder === 0 ? 0 : 7 - remainder
            return Array.from({ length: trailing }).map((_, i) => (
              <div
                key={`trail-${i}`}
                role="gridcell"
                aria-hidden="true"
                style={{ background: 'var(--color-surface-container-lowest)', minHeight: 80 }}
              />
            ))
          })()}
        </div>
      </div>

      {/* Day panel */}
      {openDay && (
        <DayPanel
          date={openDay}
          items={byDay.get(openDay) ?? []}
          posts={posts}
          onClose={handleClosePanel}
        />
      )}
    </>
  )
}
