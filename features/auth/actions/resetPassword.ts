'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validatePasswordResetToken } from '@/lib/auth/resetToken'
import { hashPassword } from '@/lib/auth/passwords'
import type { AuthActionState } from '../types'

const ResetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is missing'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must not exceed 128 characters')
      .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character (e.g. !@#$)'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

/**
 * Server Action: validates the reset token, then updates the user's password.
 * The token is consumed (deleted) on first use regardless of outcome after validation.
 * @param state - Previous action state (from useActionState)
 * @param formData - Form fields: token, password, confirmPassword
 */
export async function resetPassword(
  state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const raw = {
    token: formData.get('token') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  }

  const parsed = ResetPasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as AuthActionState['errors'] }
  }

  const { token, password } = parsed.data

  const email = await validatePasswordResetToken(token)
  if (!email) {
    return {
      errors: {
        _form: ['This reset link has expired or is invalid. Please request a new one.'],
      },
    }
  }

  const passwordHash = await hashPassword(password)

  await prisma.user.update({
    where: { email },
    data: { passwordHash },
  })

  return { success: true }
}
