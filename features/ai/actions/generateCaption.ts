'use server'

import { verifySession } from '@/lib/auth/dal'
import { rateLimit, RateLimitError } from '@/lib/rate-limit'
import { generateCaption as callAI } from '@/lib/ai/client'
import { GenerateCaptionSchema } from '@/features/ai/validation'
import type { GenerateCaptionState } from '@/features/ai/types'

/**
 * Server Action: generates a social-media caption from a user prompt via OpenRouter.
 * Rate-limited to 20 calls/hour per user (free-model tier).
 *
 * @param _state - Previous action state (unused; included for useActionState compat)
 * @param input  - { prompt, language }
 * @returns GenerateCaptionState  { text } on success or { errors } on failure
 *
 * @example
 * const result = await generateCaption({}, { prompt: 'morning coffee', language: 'en' })
 */
export async function generateCaption(
  _state: GenerateCaptionState,
  input: unknown,
): Promise<GenerateCaptionState> {
  const { user } = await verifySession()

  try {
    await rateLimit('generateCaption', (ip) => `${ip}:${user.id}`)
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { errors: { _form: [error.message] } }
    }
    throw error
  }

  const parsed = GenerateCaptionSchema.safeParse(input)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as GenerateCaptionState['errors'] }
  }

  try {
    const text = await callAI(parsed.data)
    return { text }
  } catch {
    return { errors: { _form: ['ai.error'] } }
  }
}
