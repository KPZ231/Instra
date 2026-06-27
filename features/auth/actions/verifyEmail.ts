'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { rateLimit, RateLimitError } from '@/lib/rate-limit'
import type { AuthActionState } from '../types'

/** Maximum number of failed code attempts before the pending registration is invalidated. */
const MAX_ATTEMPTS = 5

/**
 * Server Action: verifies the 6-digit email code submitted during registration.
 * - Increments attempt counter before checking the code (brute-force protection).
 * - Deletes the pending record after MAX_ATTEMPTS failed attempts.
 * - Creates the User record and deletes PendingRegistration atomically on success.
 * - Redirects to the sign-in page with a verified flag on success.
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
  try {
    await rateLimit('verifyEmail')
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { errors: { _form: [error.message] } }
    }
    throw error
  }

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

  // Increment attempt counter before validating the code to prevent timing-based enumeration
  const updated = await prisma.pendingRegistration.update({
    where: { email },
    data: { attempts: { increment: 1 } },
  })

  if (updated.attempts >= MAX_ATTEMPTS) {
    // Too many failed attempts  delete the record to force a fresh registration
    await prisma.pendingRegistration.delete({ where: { email } })
    return {
      errors: {
        _form: ['Too many failed attempts. Please register again.'],
      },
    }
  }

  if (pending.code !== code) {
    const attemptsRemaining = MAX_ATTEMPTS - updated.attempts
    return {
      errors: {
        code: [
          `Invalid verification code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`,
        ],
      },
    }
  }

  // Code is correct  atomically create the User and delete the pending record
  await prisma.$transaction([
    prisma.user.create({
      data: {
        email: pending.email,
        name: pending.name ?? null,
        passwordHash: pending.passwordHash,
        emailVerified: new Date(),
      },
    }),
    prisma.pendingRegistration.delete({ where: { email } }),
  ])

  // Redirect to sign-in; the user must enter their password to establish a session.
  // The verified=1 flag lets the sign-in page show a success notice.
  redirect(`/signin?verified=1&email=${encodeURIComponent(email)}`)
}
