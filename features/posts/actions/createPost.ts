'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth/dal'
import { rateLimit, RateLimitError } from '@/lib/rate-limit'
import { invalidatePrefix } from '@/lib/cache'
import { uploadPostMedia, deletePostMedia } from '@/lib/storage/supabase'
import { CreatePostSchema, MAX_POST_MEDIA } from '../validation'
import type { PostActionState } from '../types'

/**
 * Server Action: creates a new post with optional media carousel.
 * Validates session, rate limit, content, and media files before writing to DB.
 *
 * @param state    - Previous action state (from useActionState)
 * @param formData - Fields: content (optional), media[] (File array, optional)
 * @returns PostActionState with field errors, or success flag
 *
 * @example
 * const [state, action] = useActionState(createPost, {})
 */
export async function createPost(
  state: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const { user } = await verifySession()

  try {
    await rateLimit('createPost', (ip) => `${ip}:${user.id}`)
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { errors: { _form: [error.message] } }
    }
    throw error
  }

  const mediaFiles = formData.getAll('media').filter((f): f is File => f instanceof File && f.size > 0)

  const parsed = CreatePostSchema.safeParse({
    content: formData.get('content') ?? undefined,
    mediaCount: mediaFiles.length,
  })
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as PostActionState['errors'] }
  }

  if (mediaFiles.length > MAX_POST_MEDIA) {
    return { errors: { media: [`Maximum ${MAX_POST_MEDIA} images allowed`] } }
  }

  // Upload media files — track storagePaths for rollback on DB failure
  let uploadedMedia: { url: string; storagePath: string; mimeType: string; order: number }[] = []
  const uploadedPaths: string[] = []
  try {
    uploadedMedia = await Promise.all(
      mediaFiles.map(async (file, index) => {
        const result = await uploadPostMedia(file, user.id)
        uploadedPaths.push(result.storagePath)
        return { ...result, order: index }
      }),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Media upload failed'
    return { errors: { media: [message] } }
  }

  try {
    const platforms = formData.getAll('platforms').filter((p): p is string => typeof p === 'string')

  await prisma.post.create({
      data: {
        content: parsed.data.content ?? null,
        platforms,
        authorId: user.id,
        media: {
          create: uploadedMedia.map(({ url, storagePath, mimeType, order }) => ({
            url,
            storagePath,
            mimeType,
            order,
          })),
        },
      },
    })
  } catch {
    // Best-effort: delete already-uploaded files to avoid storage orphans
    if (uploadedPaths.length > 0) {
      await deletePostMedia(uploadedPaths).catch(() => {})
    }
    return { errors: { _form: ['Failed to create post. Please try again.'] } }
  }

  await invalidatePrefix('db', 'feed')
  await invalidatePrefix('db', 'profile', user.id)
  revalidatePath('/dashboard')
  revalidatePath('/feed')

  return { success: true }
}
