'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth/dal'
import { invalidatePrefix } from '@/lib/cache'
import { uploadPostMedia, deletePostMedia } from '@/lib/storage/supabase'
import { UpdatePostSchema, MAX_POST_MEDIA } from '../validation'
import { UserRole } from '@/types/auth'
import type { PostActionState } from '../types'

/**
 * Server Action: updates an existing post (author or ADMIN only).
 * Handles media diff: uploads new files, deletes removed ones from storage.
 *
 * @param state    - Previous action state (from useActionState)
 * @param formData - Fields: postId, content (optional), media[] (new Files),
 *                   keepMediaIds[] (IDs of existing media to keep)
 * @returns PostActionState with field errors, or success flag
 */
export async function updatePost(
  state: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const { user } = await verifySession()

  const newMediaFiles = formData.getAll('media').filter((f): f is File => f instanceof File && f.size > 0)
  const keepMediaIds = formData.getAll('keepMediaIds').map(String)

  const parsed = UpdatePostSchema.safeParse({
    postId: formData.get('postId'),
    content: formData.get('content') ?? undefined,
    mediaCount: keepMediaIds.length + newMediaFiles.length,
  })
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as PostActionState['errors'] }
  }

  if (keepMediaIds.length + newMediaFiles.length > MAX_POST_MEDIA) {
    return { errors: { media: [`Maximum ${MAX_POST_MEDIA} images allowed`] } }
  }

  // Fetch post + authorize
  const post = await prisma.post.findUnique({
    where: { id: parsed.data.postId },
    include: { media: true },
  })

  if (!post) return { errors: { _form: ['Post not found'] } }
  if (post.authorId !== user.id && user.role !== UserRole.ADMIN) {
    return { errors: { _form: ['Not authorized'] } }
  }

  // Determine which existing media to delete
  const toDelete = post.media.filter((m) => !keepMediaIds.includes(m.id))

  // Upload new media
  let uploadedMedia: { url: string; storagePath: string; mimeType: string; order: number }[] = []
  try {
    uploadedMedia = await Promise.all(
      newMediaFiles.map(async (file, index) => {
        const result = await uploadPostMedia(file, user.id)
        return { ...result, order: keepMediaIds.length + index }
      }),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Media upload failed'
    return { errors: { media: [message] } }
  }

  // Delete removed files from storage
  await deletePostMedia(toDelete.map((m) => m.storagePath))

  await prisma.$transaction([
    // Delete removed media rows
    prisma.media.deleteMany({ where: { id: { in: toDelete.map((m) => m.id) } } }),
    // Create new media rows
    ...uploadedMedia.map((m) =>
      prisma.media.create({
        data: { postId: post.id, url: m.url, storagePath: m.storagePath, mimeType: m.mimeType, order: m.order },
      }),
    ),
    // Update post content
    prisma.post.update({
      where: { id: post.id },
      data: { content: parsed.data.content ?? null },
    }),
  ])

  await invalidatePrefix('db', 'feed')
  await invalidatePrefix('db', 'profile', post.authorId)
  revalidatePath('/dashboard')
  revalidatePath('/feed')

  return { success: true }
}
