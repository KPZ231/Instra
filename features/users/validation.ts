import { z } from 'zod'

export const MAX_USERNAME_CHANGES_PER_YEAR = 3

/** Reusable username rule  alphanumeric + underscore, 3–32 chars. */
const usernameField = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(32, 'Username must not exceed 32 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
  .trim()

export const ChangeUsernameSchema = z.object({ username: usernameField })

export const DeleteAccountSchema = z.object({
  confirm: z.string().min(1, 'Please type your username to confirm'),
})

export type ChangeUsernameInput = z.infer<typeof ChangeUsernameSchema>
export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>
