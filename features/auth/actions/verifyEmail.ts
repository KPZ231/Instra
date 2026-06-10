'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { AuthActionState } from '../types'

/**
 * Server Action: verifies the 6-digit email code submitted during registration.
 * On success, creates the User record, deletes the PendingRegistration, and
 * redirects to the sign-in page with a verified flag so the user can log in.
 * @param state - Previous action state (from useActionState)
 * @param formData - Form fields: email, code
 * @returns AuthActionState with errors if verification fails
 * @example
 * const [state, action] = useActionState(verifyEmail, {})
 */
export async function verifyEmail(
  state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = (formData.get('email') as string | null)?.trim() ?? ''
  const code = (formData.get('code') as string | null)?.trim() ?? ''

  if (!email || !code) {
    return { errors: { _form: ['Email and code are required.'] } }
  }

  const pending = await prisma.pendingRegistration.findUnique({ where: { email } })

  if (!pending) {
    return { errors: { _form: ['No pending registration found for this email. Please sign up again.'] } }
  }

  if (new Date() > pending.expiresAt) {
    return { errors: { _form: ['This code has expired. Please request a new one.'] } }
  }

  if (pending.code !== code) {
    return { errors: { code: ['Invalid verification code.'] } }
  }

  // Create the confirmed User record with emailVerified timestamp
  await prisma.user.create({
    data: {
      email: pending.email,
      name: pending.name ?? null,
      passwordHash: pending.passwordHash,
      emailVerified: new Date(),
    },
  })

  // Remove the pending record now that registration is complete
  await prisma.pendingRegistration.delete({ where: { email } })

  // Redirect to sign-in; the user must enter their password to establish a session.
  // The verified=1 flag lets the sign-in page show a success notice.
  redirect(`/signin?verified=1&email=${encodeURIComponent(email)}`)
}
