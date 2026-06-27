'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/auth/dal'
import { revokeApiToken } from '@/lib/api/apiTokens'

/**
 * Server Action: revokes a Personal Access Token owned by the current user.
 * No-ops silently if the token ID does not match the user (ownership check inside revokeApiToken).
 *
 * @param tokenId - ApiToken primary key
 *
 * @example
 * await revokeToken('clx123')
 */
export async function revokeToken(tokenId: string): Promise<void> {
  const { user } = await verifySession()
  await revokeApiToken(user.id, tokenId)
  revalidatePath('/dashboard/settings/cli-access')
}
