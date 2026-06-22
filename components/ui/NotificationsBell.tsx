'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'
import { motion } from 'framer-motion'

/** Type matching the Prisma Notification model fields returned by GET /api/notifications */
interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}

/**
 * Formats an ISO date string as a relative time string using the Intl API.
 * ponytail: stdlib, no date lib
 *
 * @param iso - ISO 8601 date string
 * @returns Human-readable relative time string (e.g. "3 minutes ago")
 */
function relativeTime(iso: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const abs = Math.abs(diff)
  if (abs < 60) return rtf.format(Math.round(diff), 'second')
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  return rtf.format(Math.round(diff / 86400), 'day')
}

/**
 * Notifications bell button with dropdown panel and 30-second polling.
 * Shows an unread count badge; supports per-item mark-read and mark-all-read.
 * Self-contained — no props required.
 *
 * @example
 * <NotificationsBell />
 */
export default function NotificationsBell() {
  const { t } = useTranslation()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const bellRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = (await res.json()) as { notifications: NotificationItem[]; unreadCount: number }
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch {
      // ponytail: silent — bell failure must not break the dashboard
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchNotifications()
    const interval = setInterval(() => void fetchNotifications(), 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleMarkRead(n: NotificationItem) {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: n.id }),
    })
    await fetchNotifications()
    if (n.link) {
      setOpen(false)
      router.push(n.link)
    }
  }

  async function handleMarkAll() {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    await fetchNotifications()
  }

  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount)

  return (
    <div ref={bellRef} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        aria-label={
          unreadCount > 0
            ? t('dashboard.notifications.unreadAria', { count: unreadCount })
            : t('dashboard.header.notifications')
        }
        aria-expanded={open}
        className="relative flex items-center justify-center w-9 h-9 min-w-[44px] min-h-[44px] rounded-full border transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        style={{
          background: 'var(--color-surface-container-low)',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <Bell size={16} style={{ color: 'var(--color-on-surface-variant)' }} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full text-[9px] font-mono font-bold"
            style={{ background: '#00FF41', color: '#000' }}
            aria-hidden="true"
          >
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="absolute right-0 top-full mt-3 w-72 max-w-[calc(100vw-1rem)] rounded z-50 overflow-hidden"
          style={{
            background: 'rgba(26, 28, 24, 0.92)',
            backdropFilter: 'blur(24px) saturate(160%)',
            WebkitBackdropFilter: 'blur(24px) saturate(160%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55), 0 0 0 0.5px rgba(255,255,255,0.04)',
          }}
        >
          {/* Panel header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span
              className="text-xs font-mono font-bold uppercase tracking-widest"
              style={{ color: 'var(--color-on-surface)' }}
            >
              {t('dashboard.notifications.title')}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-primary)' }}
              >
                {t('dashboard.notifications.markAllRead')}
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p
                className="text-xs text-center py-8"
                style={{ color: 'var(--color-on-surface-variant)' }}
              >
                {t('dashboard.notifications.empty')}
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => void handleMarkRead(n)}
                  className="w-full text-left px-4 py-3 transition-colors"
                  style={{
                    background: n.read ? 'transparent' : 'rgba(255,255,255,0.04)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = n.read
                      ? 'transparent'
                      : 'rgba(255,255,255,0.04)')
                  }
                >
                  <p
                    className="text-xs font-medium truncate"
                    style={{ color: 'var(--color-on-surface)' }}
                  >
                    {n.title}
                  </p>
                  <p
                    className="text-xs mt-0.5 line-clamp-2"
                    style={{ color: 'var(--color-on-surface-variant)' }}
                  >
                    {n.message}
                  </p>
                  <p
                    className="text-[10px] mt-1 font-mono"
                    style={{ color: 'var(--color-on-surface-variant)', opacity: 0.6 }}
                  >
                    {relativeTime(n.createdAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}
