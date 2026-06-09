import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/prisma'
import type { SessionUser } from '@/types/auth'

/**
 * Returns the current session and redirects to /login if unauthenticated.
 * Memoised per render pass via React cache.
 */
export const verifySession = cache(async (): Promise<{ user: SessionUser }> => {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  return { user: session.user as SessionUser }
})

/**
 * Returns the full current user from the database, or null if unauthenticated.
 * Never returns passwordHash.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth()
  if (!session?.user?.id) return null

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      createdAt: true,
    },
  })
})
