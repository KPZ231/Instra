'use server'

import { verifySession } from '@/lib/auth/dal'
import { rateLimit, RateLimitError } from '@/lib/rate-limit'
import { createApiToken } from '@/lib/api/apiTokens'

export type CreateTokenState = {
  token?: string
  errors?: { name?: string[]; _form?: string[] }
}

/**
 * Server Action: mints a new Personal Access Token for the current user.
 * The raw token is returned in state and must be shown once  it is never stored.
 *
 * @param state    - Previous action state
 * @param formData - Fields: name (string), expiresInDays (optional number)
 * @returns CreateTokenState with raw token on success, or field errors
 *
 * @example
 * const [state, action] = useActionState(createToken, {})
 */
export async function createToken(
  state: CreateTokenState,
  formData: FormData,
): Promise<CreateTokenState> {
  const { user } = await verifySession()

  try {
    await rateLimit('createToken', (ip) => `${ip}:${user.id}`)
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { errors: { _form: [error.message] } }
    }
    throw error
  }

  const name = (formData.get('name') as string | null)?.trim()
  if (!name || name.length < 1 || name.length > 64) {
    return { errors: { name: ['Name must be between 1 and 64 characters'] } }
  }

  const daysRaw = formData.get('expiresInDays')
  const days = daysRaw ? parseInt(daysRaw as string, 10) : 90
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  const { token } = await createApiToken(user.id, name, expiresAt)
  return { token }
}
