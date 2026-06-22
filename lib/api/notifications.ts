import 'server-only'

import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/email/mailer'
import { buildNotificationEmail, buildNotificationText } from '@/lib/email/templates/notification'
import type { Notification, NotificationType } from '@prisma/client'

export type { Notification, NotificationType }

export type CreateNotificationInput = {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
}

// ponytail: post events are in-app only, email for campaigns + social only
const EMAIL_TYPES = new Set<NotificationType>([
  'CAMPAIGN_COMPLETED',
  'CAMPAIGN_FAILED',
  'WEBHOOK_FAILED',
  'SOCIAL_CONNECTED',
  'SOCIAL_DISCONNECTED',
])

/**
 * Creates an in-app notification and optionally sends an email.
 * Best-effort: never throws into the caller.
 *
 * @param input - userId, type, title, message, optional link
 * @returns void
 *
 * @example
 * await createNotification({ userId, type: 'CAMPAIGN_COMPLETED', title: 'Done', message: 'All runs complete.' })
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  // ponytail: never throw into caller — all errors logged, never surfaced
  try {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, notificationsMuted: true, emailNotificationsEnabled: true },
    })
    if (!user) return

    if (!user.notificationsMuted) {
      await prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          link: input.link ?? null,
        },
      })
    }

    if (user.emailNotificationsEnabled && user.email && EMAIL_TYPES.has(input.type)) {
      await sendMail({
        to: user.email,
        subject: input.title,
        html: buildNotificationEmail({ title: input.title, message: input.message, link: input.link }),
        text: buildNotificationText({ title: input.title, message: input.message, link: input.link }),
      })
    }
  } catch (err) {
    console.error('[notifications] createNotification failed:', err)
  }
}

/**
 * Returns the latest notifications for a user, newest first.
 *
 * @param userId - The user's ID
 * @param limit  - Max rows (default 20)
 * @returns Array of Notification rows
 *
 * @example
 * const notifications = await listNotifications(user.id)
 */
export async function listNotifications(userId: string, limit = 20): Promise<Notification[]> {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Returns the count of unread notifications for a user.
 *
 * @param userId - The user's ID
 * @returns Number of unread notifications
 *
 * @example
 * const count = await getUnreadCount(user.id)
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } })
}

/**
 * Marks a single notification as read.
 *
 * @param userId - Owner check — only marks if the notification belongs to this user
 * @param id     - Notification ID
 * @returns void
 *
 * @example
 * await markRead(user.id, notificationId)
 */
export async function markRead(userId: string, id: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true, readAt: new Date() },
  })
}

/**
 * Marks all notifications for a user as read.
 *
 * @param userId - The user's ID
 * @returns void
 *
 * @example
 * await markAllRead(user.id)
 */
export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true, readAt: new Date() },
  })
}
