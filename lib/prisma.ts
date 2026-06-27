import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

/**
 * Creates a new PrismaClient instance using the PrismaPg driver adapter.
 * Prisma 7 requires an explicit driver adapter  the client no longer self-connects.
 *
 * @returns A configured PrismaClient instance
 */
function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

/**
 * Singleton PrismaClient instance.
 *
 * In development (Next.js hot reload), a new module graph is created on every
 * reload, which would open a new database connection each time. Storing the
 * instance on `globalThis` prevents connection exhaustion by reusing the same
 * client across reloads.
 *
 * @example
 * import { prisma } from '@/lib/prisma'
 * const users = await prisma.user.findMany()
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
