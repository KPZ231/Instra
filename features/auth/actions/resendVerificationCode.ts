'use server'

import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/email/mailer'
import { buildVerifyEmail, buildVerifyEmailText } from '@/lib/email/templates/verifyEmail'
import type { AuthActionState } from '../types'

/**
 * Generates a cryptographically random 6-digit verification code (100000–999999).
 * @returns 6-digit numeric code as a string
 */
function generateVerificationCode(): string {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  const code = 100000 + (array[0] % 900000)
  return String(code)
}

/**
 * Server Action: resends the email verification code for a pending registration.
 * Enforces a 60-second cooldown between sends using the `lastSentAt` field.
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
  const email = (formData.get('email') as string | null)?.trim() ?? ''

  if (!email) {
    return { errors: { _form: ['Email is required.'] } }
  }

  const pending = await prisma.pendingRegistration.findUnique({ where: { email } })

  if (!pending) {
    return { errors: { _form: ['No pending registration found for this email. Please sign up again.'] } }
  }

  const secondsSinceLastSent = (Date.now() - pending.lastSentAt.getTime()) / 1000

  if (secondsSinceLastSent < 60) {
    const secondsRemaining = Math.ceil(60 - secondsSinceLastSent)
    return { errors: { _form: [`Please wait ${secondsRemaining} seconds before requesting a new code.`] } }
  }

  const code = generateVerificationCode()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000)

  await prisma.pendingRegistration.update({
    where: { email },
    data: { code, expiresAt, lastSentAt: now },
  })

  await sendMail({
    to: email,
    subject: 'Your new Instra verification code',
    html: buildVerifyEmail({ code }),
    text: buildVerifyEmailText(code),
  })

  return { success: true }
}
