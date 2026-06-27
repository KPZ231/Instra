'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { RegisterSchema } from '@/lib/auth/validation'
import { hashPassword } from '@/lib/auth/passwords'
import { signIn } from '@/lib/auth/config'
import { computeFingerprint, FINGERPRINT_COOKIE_NAME, FINGERPRINT_COOKIE_OPTIONS } from '@/lib/auth/session'
import { sendMail } from '@/lib/email/mailer'
import { buildVerifyEmail, buildVerifyEmailText } from '@/lib/email/templates/verifyEmail'
import { generateVerificationCode } from '@/lib/auth/generateVerificationCode'
import { rateLimit, RateLimitError } from '@/lib/rate-limit'
import type { AuthActionState } from '../types'

/**
 * Server Action: registers a new user.
 * - Email mode: creates a PendingRegistration, sends a 6-digit verification code,
 *   and redirects to /verify-email for confirmation.
 * - Username mode: creates the User record directly (no email verification required)
 *   and signs the user in immediately.
 * @param state - Previous action state (from useActionState)
 * @param formData - Form fields: mode, name?, email?, username?, password, confirmPassword, terms
 * @returns AuthActionState with field errors, or redirects on success
 */
export async function registerUser(
  state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    await rateLimit('register')
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { errors: { _form: [error.message] } }
    }
    throw error
  }

  const mode = formData.get('mode')

  const raw =
    mode === 'username'
      ? {
          mode: 'username' as const,
          username: formData.get('username'),
          email: formData.get('email') || undefined,
          password: formData.get('password'),
          confirmPassword: formData.get('confirmPassword'),
          terms: formData.get('terms'),
        }
      : {
          mode: 'email' as const,
          name: formData.get('name') || undefined,
          email: formData.get('email'),
          password: formData.get('password'),
          confirmPassword: formData.get('confirmPassword'),
          terms: formData.get('terms'),
        }

  const parsed = RegisterSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as AuthActionState['errors'] }
  }

  const { password } = parsed.data

  if (parsed.data.mode === 'email') {
    const { email, name } = parsed.data

    // Reject if the email is already used by a confirmed User account
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return { errors: { email: ['An account with this email already exists.'] } }
    }

    const existing = await prisma.pendingRegistration.findUnique({ where: { email } })

    if (existing) {
      const secondsSince = (Date.now() - existing.lastSentAt.getTime()) / 1000
      if (secondsSince < 60) {
        // Cooldown active  do not reveal that a record exists; just tell them to check their inbox
        return { errors: { email: ['A verification code was already sent. Check your email.'] } }
      }
      // Outside cooldown: refresh code AND credentials so the verified record reflects this request
      const passwordHash = await hashPassword(password)
      const code = generateVerificationCode()
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000)

      try {
        await sendMail({
          to: email,
          subject: 'Verify your Instra email address',
          html: buildVerifyEmail({ code }),
          text: buildVerifyEmailText(code),
        })
      } catch {
        return { errors: { _form: ['Failed to send verification email. Please try again.'] } }
      }

      await prisma.pendingRegistration.update({
        where: { email },
        data: { code, expiresAt, lastSentAt: now, passwordHash, name: name ?? null, attempts: 0 },
      })
    } else {
      // New registration: hash password, create pending record, send code
      const passwordHash = await hashPassword(password)
      const code = generateVerificationCode()
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000)

      try {
        await sendMail({
          to: email,
          subject: 'Verify your Instra email address',
          html: buildVerifyEmail({ code }),
          text: buildVerifyEmailText(code),
        })
      } catch {
        return { errors: { _form: ['Failed to send verification email. Please try again.'] } }
      }

      await prisma.pendingRegistration.create({
        data: { email, passwordHash, name: name ?? null, code, expiresAt, lastSentAt: now, attempts: 0 },
      })
    }

    redirect(`/verify-email?email=${encodeURIComponent(email)}`)
  } else {
    // Username mode  create user directly, no email verification
    const passwordHash = await hashPassword(password)
    const { username, email } = parsed.data
    const resolvedEmail = email && email.trim() !== '' ? email : null

    if (resolvedEmail) {
      const existingEmail = await prisma.user.findUnique({ where: { email: resolvedEmail } })
      if (existingEmail) {
        return { errors: { email: ['An account with this email already exists.'] } }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingUsername = await (prisma.user as any).findFirst({ where: { username } })
    if (existingUsername) {
      return { errors: { username: ['This username is already taken.'] } }
    }

    // username field added via migration  types update after `prisma migrate dev`
    await prisma.user.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { username, name: username, email: resolvedEmail, passwordHash } as any,
    })

    if (resolvedEmail) {
      try {
        await signIn('credentials', { email: resolvedEmail, password, redirect: false })
      } catch {
        return { errors: { _form: ['Registration succeeded but sign-in failed. Please log in manually.'] } }
      }
    }

    const ua = (await headers()).get('user-agent') ?? ''
    const fp = await computeFingerprint(ua)
    const cookieStore = await cookies()
    cookieStore.set(FINGERPRINT_COOKIE_NAME, fp, FINGERPRINT_COOKIE_OPTIONS)

    redirect('/dashboard')
  }
}
