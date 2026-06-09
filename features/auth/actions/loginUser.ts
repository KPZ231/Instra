'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'
import { LoginSchema } from '@/lib/auth/validation'
import { signIn } from '@/lib/auth/config'
import { computeFingerprint, FINGERPRINT_COOKIE_NAME, FINGERPRINT_COOKIE_OPTIONS } from '@/lib/auth/session'
import type { AuthActionState } from '../types'

/**
 * Server Action: authenticates existing user with credentials, creates a session,
 * and sets the fingerprint cookie.
 * @param state - Previous action state (from useActionState)
 * @param formData - Form fields: email, password
 */
export async function loginUser(
  state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = LoginSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { errors: { _form: ['Invalid email or password.'] } }
    }
    return { errors: { _form: ['An unexpected error occurred. Please try again.'] } }
  }

  const ua = (await headers()).get('user-agent') ?? ''
  const fp = await computeFingerprint(ua)
  const cookieStore = await cookies()
  cookieStore.set(FINGERPRINT_COOKIE_NAME, fp, FINGERPRINT_COOKIE_OPTIONS)

  redirect('/dashboard')
}
