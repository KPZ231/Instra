import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth/dal'
import { listNotifications, getUnreadCount } from '@/lib/api/notifications'

/**
 * GET /api/notifications
 * Returns the user's recent notifications and unread count.
 *
 * @returns JSON { notifications: Notification[], unreadCount: number }
 */
export async function GET(): Promise<NextResponse> {
  const { user } = await verifySession()

  const [notifications, unreadCount] = await Promise.all([
    listNotifications(user.id),
    getUnreadCount(user.id),
  ])

  return NextResponse.json({ notifications, unreadCount })
}
