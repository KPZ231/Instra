'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { signOut } from '@/lib/auth/config'
import { FINGERPRINT_COOKIE_NAME } from '@/lib/auth/session'

/**
 * Server Action: signs out the current user and clears the fingerprint cookie.
 */
export async function logoutUser(): Promise<void> {
  await signOut({ redirect: false })

  const cookieStore = await cookies()
  cookieStore.delete(FINGERPRINT_COOKIE_NAME)

  redirect('/login')
}
