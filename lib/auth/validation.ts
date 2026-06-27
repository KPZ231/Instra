import { z } from 'zod'

/** Reusable email rule  trimmed, lowercased, RFC-compliant. */
const emailField = z
  .string()
  .min(1, 'Email is required')
  .email('Enter a valid email address (e.g. you@example.com)')
  .trim()
  .toLowerCase()

/** Optional email  can be empty string or valid email. */
const optionalEmailField = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
    message: 'Enter a valid email address (e.g. you@example.com)',
  })
  .optional()

/** Reusable strong-password rule with granular messages. */
const strongPasswordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character (e.g. !@#$)')

/** Username rule: alphanumeric + underscore, 3–32 chars. */
const usernameField = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(32, 'Username must not exceed 32 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
  .trim()

const termsField = z
  .string()
  .refine((v) => v === 'on', { message: 'You must accept the Terms of Service' })

export const RegisterByEmailSchema = z
  .object({
    mode: z.literal('email'),
    name: z
      .string()
      .max(64, 'Name must not exceed 64 characters')
      .trim()
      .optional(),
    email: emailField,
    password: strongPasswordField,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    terms: termsField,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const RegisterByUsernameSchema = z
  .object({
    mode: z.literal('username'),
    username: usernameField,
    email: optionalEmailField,
    password: strongPasswordField,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    terms: termsField,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

/** Union schema for the register form  discriminated by the hidden `mode` field. */
export const RegisterSchema = z.discriminatedUnion('mode', [
  RegisterByEmailSchema,
  RegisterByUsernameSchema,
])

export const LoginSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password must not exceed 128 characters'),
})

export type RegisterByEmailInput = z.infer<typeof RegisterByEmailSchema>
export type RegisterByUsernameInput = z.infer<typeof RegisterByUsernameSchema>
export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
