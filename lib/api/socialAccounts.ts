import 'server-only'

import { prisma } from '@/lib/prisma'
import type { SocialPlatform, ConnectedAccount } from '@/lib/social/types'

/** Full DB row returned from Prisma (contains encrypted tokens). */
export type SocialAccountRow = {
  id: string
  userId: string
  platform: SocialPlatform
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  platformUserId: string
  platformUsername: string
  pageId: string | null
  pageAccessToken: string | null
}

export type UpsertSocialAccountInput = {
  userId: string
  platform: SocialPlatform
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  platformUserId: string
  platformUsername: string
  pageId?: string
  pageAccessToken?: string
}

export type SocialPostStatusRow = {
  platform: SocialPlatform
  status: 'PENDING' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED'
  platformPostId: string | null
  error: string | null
  publishedAt: Date | null
}

/**
 * Returns all connected social accounts for a user (no tokens).
 *
 * @param userId - The user's ID
 * @returns Array of ConnectedAccount objects with platform, username, and expiry
 *
 * @example
 * const accounts = await getConnectedAccounts(user.id)
 */
export async function getConnectedAccounts(userId: string): Promise<ConnectedAccount[]> {
  const rows = await prisma.socialAccount.findMany({
    where: { userId },
    select: { platform: true, platformUsername: true, expiresAt: true },
  })
  return rows as ConnectedAccount[]
}

/**
 * Returns a single SocialAccount including encrypted tokens (server-side only).
 *
 * @param userId   - The user's ID
 * @param platform - The social platform
 * @returns Full SocialAccountRow or null if not found
 *
 * @example
 * const account = await getSocialAccount(user.id, 'FACEBOOK')
 */
export async function getSocialAccount(
  userId: string,
  platform: SocialPlatform,
): Promise<SocialAccountRow | null> {
  return prisma.socialAccount.findUnique({
    where: { userId_platform: { userId, platform } },
  }) as Promise<SocialAccountRow | null>
}

/**
 * Creates or updates a SocialAccount record. Tokens must already be encrypted.
 *
 * @param data - Account data with pre-encrypted tokens
 * @returns void
 *
 * @example
 * await upsertSocialAccount({ userId, platform: 'FACEBOOK', accessToken: encrypted, ... })
 */
export async function upsertSocialAccount(data: UpsertSocialAccountInput): Promise<void> {
  await prisma.socialAccount.upsert({
    where: { userId_platform: { userId: data.userId, platform: data.platform } },
    create: {
      userId: data.userId,
      platform: data.platform,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? null,
      expiresAt: data.expiresAt ?? null,
      platformUserId: data.platformUserId,
      platformUsername: data.platformUsername,
      pageId: data.pageId ?? null,
      pageAccessToken: data.pageAccessToken ?? null,
    },
    update: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? null,
      expiresAt: data.expiresAt ?? null,
      platformUserId: data.platformUserId,
      platformUsername: data.platformUsername,
      pageId: data.pageId ?? null,
      pageAccessToken: data.pageAccessToken ?? null,
    },
  })
}

/**
 * Removes a connected social account for a user.
 *
 * @param userId   - The user's ID
 * @param platform - The platform to disconnect
 * @returns void
 *
 * @example
 * await deleteSocialAccount(user.id, 'LINKEDIN')
 */
export async function deleteSocialAccount(
  userId: string,
  platform: SocialPlatform,
): Promise<void> {
  await prisma.socialAccount.delete({
    where: { userId_platform: { userId, platform } },
  })
}

/**
 * Returns publish statuses for a post across all platforms.
 *
 * @param postId - The post ID
 * @returns Array of SocialPostStatusRow objects
 *
 * @example
 * const statuses = await getSocialPostStatuses(post.id)
 */
export async function getSocialPostStatuses(postId: string): Promise<SocialPostStatusRow[]> {
  const rows = await prisma.socialPostStatus.findMany({
    where: { postId },
    select: { platform: true, status: true, platformPostId: true, error: true, publishedAt: true },
  })
  return rows as SocialPostStatusRow[]
}
