# `lib/prisma.ts`  Prisma Client Singleton

## Description

Exports a singleton `PrismaClient` instance shared across the entire application.
The singleton pattern prevents connection pool exhaustion in Next.js development
mode, where hot module replacement (HMR) re-evaluates module graphs on every file
save, which would otherwise open a new database connection each time.

## Technologies

- **Prisma ORM 7** (`@prisma/client`)  type-safe database access layer
- **`@prisma/adapter-pg`** (`PrismaPg`)  driver adapter required by Prisma 7; the
  client no longer self-connects and must receive an explicit adapter

## Prisma 7 Driver Adapter Requirement

Prisma 7 introduced a breaking change: `PrismaClient` no longer bundles a
connection driver. An adapter must be passed at construction time:

```ts
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' })
const client = new PrismaClient({ adapter })
```

Omitting the adapter causes a runtime error. This is different from Prisma 5/6
where the client could self-connect using only the `DATABASE_URL` environment
variable.

## Singleton Pattern

```ts
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

- On the **first import**, `createPrismaClient()` runs and the instance is stored
  on `globalThis`.
- On **subsequent imports** (including hot-reloaded modules), `globalForPrisma.prisma`
  already holds the instance, so no new connection is opened.
- In **production**, the module is loaded once per process lifetime, so the
  `globalThis` guard is skipped to avoid leaking state.

## Exports

| Export   | Type           | Description                              |
|----------|----------------|------------------------------------------|
| `prisma` | `PrismaClient` | Singleton database client for all queries |

## Usage Example

```ts
import { prisma } from '@/lib/prisma'

// Fetch all users
const users = await prisma.user.findMany()

// Create a new user
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    name: 'Example User',
  },
})
```

## Environment Variables

| Variable       | Required | Description                              |
|----------------|----------|------------------------------------------|
| `DATABASE_URL` | Yes      | PostgreSQL connection string for Prisma  |

## Logging

- **Development** (`NODE_ENV=development`): logs `query`, `error`, and `warn`
  events to stdout for debugging.
- **Production**: logs `error` events only to minimise noise.
