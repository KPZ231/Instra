'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth/dal'
import { rateLimit, RateLimitError } from '@/lib/rate-limit'
import { invalidatePrefix } from '@/lib/cache'

/**
 * Server Action: toggles a like on a post for the current user.
 * Creates the Like record if it doesn't exist; deletes it if it does.
 *
 * @param postId - The ID of the post to like/unlike
 *
 * @example
 * await toggleLike(post.id)
 */
export async function toggleLike(postId: string): Promise<void> {
  const { user } = await verifySession()

  try {
    await rateLimit('toggleLike', (ip) => `${ip}:${user.id}`)
  } catch (error) {
    if (error instanceof RateLimitError) return // silent for likes
    throw error
  }

  try {
    const existing = await prisma.like.findUnique({
      where: { postId_userId: { postId, userId: user.id } },
    })

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } })
    } else {
      await prisma.like.create({ data: { postId, userId: user.id } })
    }
  } catch {
    // Graceful failure  e.g. foreign key violation on non-existent postId
    return
  }

  await invalidatePrefix('db', 'feed')
  await invalidatePrefix('db', 'analytics')
  revalidatePath('/dashboard')
  revalidatePath('/feed')
  revalidatePath('/dashboard/analytics')
}
