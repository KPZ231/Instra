import 'server-only'

import { prisma } from '@/lib/prisma'
import { getOrSet } from '@/lib/cache'

/**
 * A public-facing subset of user fields safe to expose on profile pages.
 */
export type PublicUser = {
  id: string
  name: string | null
  username: string | null
  image: string | null
  createdAt: Date
}

/**
 * Fetches a public user profile by username.
 * Results are cached in Redis (db namespace, 300 s TTL).
 * Returns null if no user with the given username exists.
 *
 * @param username - The user's unique username
 * @returns PublicUser object or null
 *
 * @example
 * const user = await getUserByUsername('john_doe')
 */
export async function getUserByUsername(username: string): Promise<PublicUser | null> {
  return getOrSet(
    'db',
    async () => {
      const user = await prisma.user.findUnique({
        where: { username },
        select: { id: true, name: true, username: true, image: true, createdAt: true },
      })
      return user ?? null
    },
    undefined,
    'user',
    username,
  )
}
