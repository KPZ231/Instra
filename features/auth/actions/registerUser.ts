'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { RegisterSchema } from '@/lib/auth/validation'
import { hashPassword } from '@/lib/auth/passwords'
import { signIn } from '@/lib/auth/config'
import { computeFingerprint, FINGERPRINT_COOKIE_NAME, FINGERPRINT_COOKIE_OPTIONS } from '@/lib/auth/session'
import type { AuthActionState } from '../types'

/**
 * Server Action: registers a new user, creates a session, and sets the fingerprint cookie.
 * @param state - Previous action state (from useActionState)
 * @param formData - Form fields: name, email, password, confirmPassword
 */
export async function registerUser(
  state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const raw = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  }

  const parsed = RegisterSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { name, email, password } = parsed.data

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return { errors: { email: ['An account with this email already exists.'] } }
  }

  const passwordHash = await hashPassword(password)

  await prisma.user.create({
    data: { name, email, passwordHash },
  })

  try {
    await signIn('credentials', { email, password, redirect: false })
  } catch {
    return { errors: { _form: ['Registration succeeded but sign-in failed. Please log in manually.'] } }
  }

  const ua = (await headers()).get('user-agent') ?? ''
  const fp = await computeFingerprint(ua)
  const cookieStore = await cookies()
  cookieStore.set(FINGERPRINT_COOKIE_NAME, fp, FINGERPRINT_COOKIE_OPTIONS)

  redirect('/dashboard')
}
