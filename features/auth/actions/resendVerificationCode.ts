'use server'

import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/email/mailer'
import { buildVerifyEmail, buildVerifyEmailText } from '@/lib/email/templates/verifyEmail'
import { generateVerificationCode } from '@/lib/auth/generateVerificationCode'
import { rateLimit, RateLimitError } from '@/lib/rate-limit'
import type { AuthActionState } from '../types'

/**
 * Server Action: resends the email verification code for a pending registration.
 * - Enforces a 60-second cooldown between sends using the `lastSentAt` field.
 * - Returns a generic response whether or not a pending record exists (prevents email enumeration).
 * - Sends the email BEFORE updating the DB to avoid stale codes on SMTP failure.
 * @param state - Previous action state (from useActionState)
 * @param formData - Form field: email
 * @returns AuthActionState with errors or success
 * @example
 * const [state, action] = useActionState(resendVerificationCode, {})
 */
export async function resendVerificationCode(
  state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    await rateLimit('resendCode')
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { errors: { _form: [error.message] } }
    }
    throw error
  }

  const email = (formData.get('email') as string | null)?.trim() ?? ''

  if (!email) {
    return { errors: { _form: ['Email is required.'] } }
  }

  const pending = await prisma.pendingRegistration.findUnique({ where: { email } })

  // Return the same generic message regardless of whether a record exists to prevent email enumeration
  if (!pending) {
    return {
      success: true,
      message: 'If a pending registration exists for this address, a new code has been sent.',
    }
  }

  const secondsSinceLastSent = (Date.now() - pending.lastSentAt.getTime()) / 1000

  if (secondsSinceLastSent < 60) {
    // Return the same generic response to prevent enumeration  attacker can't distinguish
    // "no record" from "record exists but in cooldown" via the response.
    return {
      success: true,
      message: 'If a pending registration exists for this address, a new code has been sent.',
    }
  }

  const newCode = generateVerificationCode()
  const newExpiresAt = new Date(Date.now() + 10 * 60 * 1000)

  // Send the email FIRST  only persist the new code if delivery succeeds.
  // This prevents a scenario where the DB holds a new code that was never delivered.
  try {
    await sendMail({
      to: email,
      subject: 'Your new Instra verification code',
      html: buildVerifyEmail({ code: newCode }),
      text: buildVerifyEmailText(newCode),
    })
  } catch {
    return { errors: { _form: ['Failed to send email. Please try again.'] } }
  }

  await prisma.pendingRegistration.update({
    where: { email },
    data: { code: newCode, expiresAt: newExpiresAt, lastSentAt: new Date() },
  })

  return { success: true }
}
