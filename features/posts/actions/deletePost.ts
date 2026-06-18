'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth/dal'
import { invalidatePrefix } from '@/lib/cache'
import { deletePostMedia } from '@/lib/storage/supabase'
import { UserRole } from '@/types/auth'

/**
 * Server Action: deletes a post and all its associated media (author or ADMIN only).
 * Files are removed from Supabase Storage; DB cascade handles Media/Like rows.
 *
 * @param postId - The ID of the post to delete
 * @throws Error if post not found or user not authorized
 *
 * @example
 * await deletePost(post.id)
 */
export async function deletePost(postId: string): Promise<void> {
  const { user } = await verifySession()

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { media: { select: { storagePath: true } } },
  })

  if (!post) throw new Error('Post not found')
  if (post.authorId !== user.id && user.role !== UserRole.ADMIN) {
    throw new Error('Not authorized')
  }

  // Delete from storage first (DB cascade handles rows)
  await deletePostMedia(post.media.map((m) => m.storagePath))
  await prisma.post.delete({ where: { id: postId } })

  await invalidatePrefix('db', 'feed')
  await invalidatePrefix('db', 'profile', post.authorId)
  revalidatePath('/dashboard')
  revalidatePath('/feed')
}
