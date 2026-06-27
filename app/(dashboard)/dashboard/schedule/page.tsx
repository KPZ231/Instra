import type { Metadata } from 'next'
import { verifySession } from '@/lib/auth/dal'
import { getCalendarItems } from '@/lib/api/calendar'
import { getUserPosts } from '@/lib/api/posts'
import { PostCalendar } from '@/components/ui/calendar/PostCalendar'

export const metadata: Metadata = {
  title: 'Schedule  Instra',
  robots: { index: false, follow: false },
}

interface SchedulePageProps {
  searchParams: Promise<{ month?: string }>
}

/**
 * Post calendar page. Resolves the requested month, fetches calendar items
 * and user posts server-side, then renders the interactive PostCalendar.
 *
 * Month defaults to the current month (server clock). Items are sorted
 * by date and cached 300 s via getCalendarItems.
 */
export default async function SchedulePage({ searchParams }: SchedulePageProps) {
  const { user } = await verifySession()
  const { month } = await searchParams

  // Parse "YYYY-MM" or fall back to current month
  const now = new Date()
  let year = now.getFullYear()
  let monthIdx = now.getMonth() + 1 // 1-based

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number)
    if (y >= 2020 && y <= 2100 && m >= 1 && m <= 12) {
      year = y
      monthIdx = m
    }
  }

  const monthParam = `${year}-${String(monthIdx).padStart(2, '0')}`

  // Date range: first moment of the month → last moment of the month
  const from = new Date(year, monthIdx - 1, 1, 0, 0, 0, 0)
  const to = new Date(year, monthIdx, 0, 23, 59, 59, 999)

  const [items, posts] = await Promise.all([
    getCalendarItems(user.id, from, to),
    getUserPosts(user.id),
  ])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p
          className="font-mono text-xs tracking-[0.12em] uppercase mb-1"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          {'// SCHEDULE'}
        </p>
        <h1
          className="font-sans text-2xl font-semibold"
          style={{ color: 'var(--color-primary)' }}
        >
          Post Calendar
        </h1>
      </div>

      {/* Calendar  Next.js 15 RSC serializes Date natively across the boundary */}
      <PostCalendar month={monthParam} items={items} posts={posts} />
    </div>
  )
}
