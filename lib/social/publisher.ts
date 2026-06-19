import 'server-only'

import { prisma } from '@/lib/prisma'
import { decrypt } from './crypto'
import { publishToFacebook, publishToInstagram } from './meta'
import { publishToLinkedIn } from './linkedin'
import type { SocialPlatform, PublishResult, SocialPostPayload } from './types'

/**
 * Publishes an existing post to all platforms listed in post.platforms[].
 * Runs all platform calls in parallel; each result is recorded independently.
 *
 * @param postId - The Instra post ID
 * @param userId - The post author's user ID (used for ownership check and account lookup)
 * @returns Array of PublishResult, one per platform
 *
 * @example
 * const results = await publishPost(post.id, user.id)
 */
export async function publishPost(postId: string, userId: string): Promise<PublishResult[]> {
  const post = await prisma.post.findUnique({
    where: { id: postId, authorId: userId },
    include: { media: { orderBy: { order: 'asc' } } },
  })
  if (!post) throw new Error('Post not found')

  const platforms = post.platforms as SocialPlatform[]
  const payload: SocialPostPayload = {
    content: post.content,
    media: post.media.map((m) => ({ url: m.url, mimeType: m.mimeType, order: m.order })),
  }

  const results = await Promise.allSettled(
    platforms.map(async (platform): Promise<PublishResult> => {
      // Mark as PUBLISHING
      await prisma.socialPostStatus.upsert({
        where: { postId_platform: { postId, platform } },
        create: { postId, platform, status: 'PUBLISHING' },
        update: { status: 'PUBLISHING', error: null, platformPostId: null, publishedAt: null },
      })

      try {
        const account = await prisma.socialAccount.findUnique({
          where: { userId_platform: { userId, platform } },
        })
        if (!account) throw new Error('Brak połączonego konta')
        if (account.expiresAt && account.expiresAt < new Date()) {
          throw new Error('Token wygasł — połącz konto ponownie')
        }

        const token = decrypt(account.accessToken)
        let platformPostId: string | undefined

        if (platform === 'FACEBOOK') {
          const pageToken = account.pageAccessToken ? decrypt(account.pageAccessToken) : token
          platformPostId = await publishToFacebook(account.pageId!, pageToken, payload)
        } else if (platform === 'INSTAGRAM') {
          platformPostId = await publishToInstagram(account.platformUserId, token, payload)
        } else if (platform === 'LINKEDIN') {
          platformPostId = await publishToLinkedIn(account.platformUserId, token, payload)
        }

        await prisma.socialPostStatus.upsert({
          where: { postId_platform: { postId, platform } },
          create: { postId, platform, status: 'PUBLISHED', platformPostId, publishedAt: new Date() },
          update: { status: 'PUBLISHED', platformPostId, publishedAt: new Date(), error: null },
        })

        return { platform, success: true, platformPostId }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        await prisma.socialPostStatus.upsert({
          where: { postId_platform: { postId, platform } },
          create: { postId, platform, status: 'FAILED', error: message },
          update: { status: 'FAILED', error: message, platformPostId: null, publishedAt: null },
        })
        return { platform, success: false, error: message }
      }
    }),
  )

  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { platform: platforms[i], success: false, error: 'Chyba publikacji' },
  )
}
