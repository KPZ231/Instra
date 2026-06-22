'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth/dal'
import { rateLimit, RateLimitError } from '@/lib/rate-limit'

const PreferencesSchema = z.object({
  notificationsMuted: z.boolean(),
  emailNotificationsEnabled: z.boolean(),
})

export type UpdatePreferencesState = {
  success?: boolean
  errors?: { _form?: string[] }
}

/**
 * Server Action: updates the authenticated user's notification preferences.
 *
 * @param state    - Previous action state (from useActionState)
 * @param formData - Fields: notificationsMuted, emailNotificationsEnabled (as 'true'/'false' strings)
 * @returns UpdatePreferencesState
 *
 * @example
 * const [state, action] = useActionState(updatePreferences, {})
 */
export async function updatePreferences(
  state: UpdatePreferencesState,
  formData: FormData,
): Promise<UpdatePreferencesState> {
  const { user } = await verifySession()

  try {
    await rateLimit('updatePreferences', (ip) => `${ip}:${user.id}`)
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { errors: { _form: [error.message] } }
    }
    throw error
  }

  const parsed = PreferencesSchema.safeParse({
    notificationsMuted: formData.get('notificationsMuted') === 'true',
    emailNotificationsEnabled: formData.get('emailNotificationsEnabled') === 'true',
  })

  if (!parsed.success) {
    return { errors: { _form: ['Invalid input'] } }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: parsed.data,
  })

  revalidatePath('/dashboard/settings')

  return { success: true }
}
