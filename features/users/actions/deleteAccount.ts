'use server'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth/dal'
import { signOut } from '@/lib/auth/config'
import { deletePostMedia } from '@/lib/storage/supabase'
import { DeleteAccountSchema } from '../validation'
import type { DeleteAccountState } from './types'

/**
 * Server Action: permanently deletes the authenticated user's account.
 * Validates username confirmation, cleans up Supabase Storage media,
 * deletes the user record (cascades handle related data), then signs out.
 *
 * @param state    - Previous action state (from useActionState)
 * @param formData - Fields: confirm (string  must match current username)
 * @returns DeleteAccountState with field errors, or signs out on success
 *
 * @example
 * const [state, action] = useActionState(deleteAccount, {})
 */
export async function deleteAccount(
  state: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const { user } = await verifySession()

  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { username: true },
  })

  const parsed = DeleteAccountSchema.safeParse({ confirm: formData.get('confirm') })
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as DeleteAccountState['errors'] }
  }

  if (parsed.data.confirm !== currentUser?.username) {
    return { errors: { confirm: ['Username does not match'] } }
  }

  const posts = await prisma.post.findMany({
    where: { authorId: user.id },
    select: { media: { select: { storagePath: true } } },
  })

  const storagePaths = posts.flatMap((post) => post.media.map((m) => m.storagePath))

  if (storagePaths.length > 0) {
    await deletePostMedia(storagePaths)
  }

  await prisma.user.delete({ where: { id: user.id } })

  await signOut({ redirectTo: '/' })

  return { success: true }
}
