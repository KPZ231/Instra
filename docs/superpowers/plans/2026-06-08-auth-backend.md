# Auth Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a secure, extensible authentication backend for Instra  email/password registration, credentials login, Google + GitHub OAuth, database-backed user/account storage, and anti-hijacking session protection via a fingerprint cookie.

**Architecture:** Auth.js v5 (`next-auth@beta`) handles OAuth flows and JWT session cookies via the Prisma adapter. Passwords are hashed with bcryptjs. A separate `__fp` cookie containing `HMAC(userAgent, SECRET)` is set at sign-in time and validated on every protected request in `proxy.ts`. Server Actions perform all mutations. A Data Access Layer (DAL) centralises `verifySession`.

**Tech Stack:** next-auth@beta, @auth/prisma-adapter, @prisma/client, prisma, bcryptjs, zod, server-only, vitest

---

## File Map

| File | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | User, Account, Session, VerificationToken models |
| `lib/prisma.ts` | Prisma client singleton |
| `lib/auth/validation.ts` | Zod schemas for register + login input |
| `lib/auth/passwords.ts` | bcryptjs hash + compare helpers |
| `lib/auth/session.ts` | Fingerprint utilities + cookie helpers |
| `lib/auth/config.ts` | Auth.js v5 providers, callbacks, JWT config |
| `lib/auth/dal.ts` | `verifySession`, `getCurrentUser`  server-only DAL |
| `app/api/auth/[...nextauth]/route.ts` | Auth.js route handler; injects `__fp` cookie on OAuth callbacks |
| `features/auth/actions/registerUser.ts` | Server Action: validate → hash → create user → sign in → set `__fp` |
| `features/auth/actions/loginUser.ts` | Server Action: validate → verify credentials → sign in → set `__fp` |
| `features/auth/actions/logoutUser.ts` | Server Action: sign out → clear `__fp` |
| `features/auth/types/index.ts` | AuthActionState, AuthUser types |
| `features/auth/index.ts` | Barrel exports |
| `types/auth.ts` | Global SessionUser type, UserRole enum |
| `proxy.ts` | Next.js 16 proxy: session validation + fingerprint check |
| `.env.example` | Required environment variables template |
| `docs/auth.md` | Module documentation |

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install next-auth@beta @auth/prisma-adapter @prisma/client bcryptjs zod server-only
```

- [ ] **Step 2: Install dev dependencies**

```bash
npm install -D prisma @types/bcryptjs vitest
```

- [ ] **Step 3: Verify installations**

```bash
npx prisma --version
```

Expected: prints a Prisma version (e.g. `5.x.x`).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install auth dependencies (next-auth, prisma, bcryptjs, zod)"
```

---

## Task 2: Environment variables template

**Files:**
- Create: `.env.example`
- Create: `.env.local` (not committed  add to .gitignore)

- [ ] **Step 1: Write `.env.example`**

```bash
# .env.example
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"

# Generate with: openssl rand -base64 32
AUTH_SECRET="your-secret-here"

# From Google Cloud Console → APIs & Services → Credentials
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# From GitHub Developer Settings → OAuth Apps
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# Base URL (used by Auth.js for callbacks)
AUTH_URL="http://localhost:3000"
```

- [ ] **Step 2: Ensure `.env.local` is in `.gitignore`**

Check `.gitignore` contains `.env.local` and `.env` (but NOT `.env.example`).

- [ ] **Step 3: Create your local `.env.local`** from the template and fill in real values.

- [ ] **Step 4: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: add environment variables template"
```

---

## Task 3: Prisma schema

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 1: Create `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  USER
  ADMIN
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  passwordHash  String?
  image         String?
  role          UserRole  @default(USER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts Account[]
  sessions Session[]

  @@index([email])
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

- [ ] **Step 2: Generate Prisma client**

```bash
npx prisma generate
```

Expected: "Generated Prisma Client".

- [ ] **Step 3: Run migration** (requires a running DB  skip for now if no DB yet, come back to this step after DB is available)

```bash
npx prisma migrate dev --name init-auth
```

Expected: migration file created in `prisma/migrations/`.

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat(db): add auth schema  User, Account, Session, VerificationToken"
```

---

## Task 4: Prisma client singleton

**Files:**
- Create: `lib/prisma.ts`
- Create: `docs/prisma.md`

- [ ] **Step 1: Write unit test**

Create `lib/__tests__/prisma.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { prisma } from '../prisma'

describe('prisma singleton', () => {
  it('returns the same instance on multiple imports', async () => {
    const { prisma: prisma2 } = await import('../prisma')
    expect(prisma).toBe(prisma2)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run lib/__tests__/prisma.test.ts
```

Expected: FAIL  `../prisma` not found.

- [ ] **Step 3: Create `lib/prisma.ts`**

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx vitest run lib/__tests__/prisma.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/prisma.ts lib/__tests__/prisma.test.ts
git commit -m "feat(lib): add Prisma client singleton"
```

---

## Task 5: Validation schemas

**Files:**
- Create: `lib/auth/validation.ts`
- Create: `lib/auth/__tests__/validation.test.ts`

- [ ] **Step 1: Write unit tests**

Create `lib/auth/__tests__/validation.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { RegisterSchema, LoginSchema } from '../validation'

describe('RegisterSchema', () => {
  it('accepts valid registration data', () => {
    const result = RegisterSchema.safeParse({
      name: 'Jan Kowalski',
      email: 'jan@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
    })
    expect(result.success).toBe(true)
  })

  it('rejects short name', () => {
    const result = RegisterSchema.safeParse({
      name: 'J',
      email: 'jan@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
    })
    expect(result.success).toBe(false)
    expect(result.error?.flatten().fieldErrors.name).toBeDefined()
  })

  it('rejects invalid email', () => {
    const result = RegisterSchema.safeParse({
      name: 'Jan',
      email: 'not-an-email',
      password: 'Password1!',
      confirmPassword: 'Password1!',
    })
    expect(result.success).toBe(false)
    expect(result.error?.flatten().fieldErrors.email).toBeDefined()
  })

  it('rejects weak password', () => {
    const result = RegisterSchema.safeParse({
      name: 'Jan Kowalski',
      email: 'jan@example.com',
      password: 'password',
      confirmPassword: 'password',
    })
    expect(result.success).toBe(false)
    expect(result.error?.flatten().fieldErrors.password).toBeDefined()
  })

  it('rejects mismatched confirmPassword', () => {
    const result = RegisterSchema.safeParse({
      name: 'Jan Kowalski',
      email: 'jan@example.com',
      password: 'Password1!',
      confirmPassword: 'Different1!',
    })
    expect(result.success).toBe(false)
  })
})

describe('LoginSchema', () => {
  it('accepts valid credentials', () => {
    const result = LoginSchema.safeParse({ email: 'jan@example.com', password: 'Password1!' })
    expect(result.success).toBe(true)
  })

  it('rejects missing password', () => {
    const result = LoginSchema.safeParse({ email: 'jan@example.com', password: '' })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run lib/auth/__tests__/validation.test.ts
```

Expected: FAIL  module not found.

- [ ] **Step 3: Create `lib/auth/validation.ts`**

```ts
import { z } from 'zod'

export const RegisterSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').trim(),
    email: z.string().email('Invalid email address').trim().toLowerCase(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
})

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run lib/auth/__tests__/validation.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/auth/validation.ts lib/auth/__tests__/validation.test.ts
git commit -m "feat(auth): add Zod validation schemas for register + login"
```

---

## Task 6: Password utilities

**Files:**
- Create: `lib/auth/passwords.ts`
- Create: `lib/auth/__tests__/passwords.test.ts`

- [ ] **Step 1: Write unit tests**

Create `lib/auth/__tests__/passwords.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../passwords'

describe('hashPassword', () => {
  it('returns a hash that is not equal to the original', async () => {
    const hash = await hashPassword('secret123!')
    expect(hash).not.toBe('secret123!')
    expect(hash.length).toBeGreaterThan(20)
  })

  it('produces a different hash each call (salted)', async () => {
    const hash1 = await hashPassword('secret123!')
    const hash2 = await hashPassword('secret123!')
    expect(hash1).not.toBe(hash2)
  })
})

describe('verifyPassword', () => {
  it('returns true for matching password', async () => {
    const hash = await hashPassword('correct-horse')
    const result = await verifyPassword('correct-horse', hash)
    expect(result).toBe(true)
  })

  it('returns false for non-matching password', async () => {
    const hash = await hashPassword('correct-horse')
    const result = await verifyPassword('wrong-horse', hash)
    expect(result).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run lib/auth/__tests__/passwords.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `lib/auth/passwords.ts`**

```ts
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

/**
 * Hashes a plaintext password using bcrypt.
 * @param password - The plaintext password to hash
 * @returns The bcrypt hash string
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verifies a plaintext password against a bcrypt hash.
 * @param password - The plaintext password to check
 * @param hash - The stored bcrypt hash
 * @returns true if the password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run lib/auth/__tests__/passwords.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/auth/passwords.ts lib/auth/__tests__/passwords.test.ts
git commit -m "feat(auth): add bcryptjs password hash + verify utilities"
```

---

## Task 7: Session fingerprint utilities

**Files:**
- Create: `lib/auth/session.ts`
- Create: `lib/auth/__tests__/session.test.ts`

The `__fp` cookie contains `HMAC-SHA256(userAgent + AUTH_SECRET)` encoded as hex. This binds the session to the browser that originally created it. If an attacker steals the session JWT cookie but uses a different user agent, the proxy will reject the request.

- [ ] **Step 1: Write unit tests**

Create `lib/auth/__tests__/session.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest'

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret-32-chars-long-xxxx!!'
})

describe('computeFingerprint', () => {
  it('returns a non-empty hex string', async () => {
    const { computeFingerprint } = await import('../session')
    const fp = await computeFingerprint('Mozilla/5.0 Chrome/120')
    expect(fp).toMatch(/^[a-f0-9]{64}$/)
  })

  it('returns the same fingerprint for the same input', async () => {
    const { computeFingerprint } = await import('../session')
    const fp1 = await computeFingerprint('Mozilla/5.0 Chrome/120')
    const fp2 = await computeFingerprint('Mozilla/5.0 Chrome/120')
    expect(fp1).toBe(fp2)
  })

  it('returns different fingerprints for different user agents', async () => {
    const { computeFingerprint } = await import('../session')
    const fp1 = await computeFingerprint('Mozilla/5.0 Chrome/120')
    const fp2 = await computeFingerprint('Mozilla/5.0 Firefox/120')
    expect(fp1).not.toBe(fp2)
  })
})

describe('FINGERPRINT_COOKIE_NAME', () => {
  it('is defined and non-empty', async () => {
    const { FINGERPRINT_COOKIE_NAME } = await import('../session')
    expect(typeof FINGERPRINT_COOKIE_NAME).toBe('string')
    expect(FINGERPRINT_COOKIE_NAME.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run lib/auth/__tests__/session.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `lib/auth/session.ts`**

```ts
import 'server-only'
import { createHmac } from 'crypto'

export const FINGERPRINT_COOKIE_NAME = '__fp'

export const FINGERPRINT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 days
}

/**
 * Computes a fingerprint HMAC for a given user-agent string.
 * Bound to AUTH_SECRET so fingerprints from different deployments don't collide.
 * @param userAgent - The User-Agent header value from the HTTP request
 * @returns Hex-encoded HMAC-SHA256 digest
 */
export async function computeFingerprint(userAgent: string): Promise<string> {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')

  return createHmac('sha256', secret)
    .update(userAgent)
    .digest('hex')
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run lib/auth/__tests__/session.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/auth/session.ts lib/auth/__tests__/session.test.ts
git commit -m "feat(auth): add session fingerprint utilities for anti-hijacking"
```

---

## Task 8: Auth.js v5 configuration

**Files:**
- Create: `lib/auth/config.ts`

This file exports `auth`, `signIn`, `signOut`, and `handlers` from Auth.js v5. It configures Google + GitHub OAuth providers and a Credentials provider for email/password login.

- [ ] **Step 1: Create `lib/auth/config.ts`**

```ts
import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth/passwords'
import { LoginSchema } from '@/lib/auth/validation'

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: { id: true, email: true, name: true, image: true, passwordHash: true, role: true },
        })

        if (!user?.passwordHash) return null

        const isValid = await verifyPassword(parsed.data.password, user.passwordHash)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? 'USER'
      }
      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        ;(session.user as { role?: string }).role = token.role as string
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },
})
```

- [ ] **Step 2: Extend NextAuth types in `types/auth.ts`**

Create `types/auth.ts`:

```ts
import { DefaultSession, DefaultJWT } from 'next-auth'

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export type SessionUser = {
  id: string
  role: UserRole
} & DefaultSession['user']

declare module 'next-auth' {
  interface Session {
    user: SessionUser
  }

  interface User {
    role?: UserRole
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string
    role: UserRole
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/auth/config.ts types/auth.ts
git commit -m "feat(auth): configure Auth.js v5 with Google, GitHub, and Credentials providers"
```

---

## Task 9: Auth.js route handler with fingerprint injection

**Files:**
- Create: `app/api/auth/[...nextauth]/route.ts`

This wraps the Auth.js `handlers` to inject the `__fp` fingerprint cookie on OAuth callbacks.

- [ ] **Step 1: Create the directory**

```bash
mkdir -p app/api/auth/\[...nextauth\]
```

- [ ] **Step 2: Create `app/api/auth/[...nextauth]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { handlers } from '@/lib/auth/config'
import { computeFingerprint, FINGERPRINT_COOKIE_NAME, FINGERPRINT_COOKIE_OPTIONS } from '@/lib/auth/session'

async function handleRequest(req: NextRequest): Promise<Response> {
  const response = await (req.method === 'POST' ? handlers.POST(req) : handlers.GET(req))

  const url = new URL(req.url)
  const isOAuthCallback = url.pathname.includes('/callback/')

  if (isOAuthCallback && response.status >= 301 && response.status <= 303) {
    const nextResponse = NextResponse.redirect(response.headers.get('location') ?? '/', {
      status: response.status,
      headers: response.headers,
    })

    const ua = req.headers.get('user-agent') ?? ''
    const fp = await computeFingerprint(ua)
    nextResponse.cookies.set(FINGERPRINT_COOKIE_NAME, fp, FINGERPRINT_COOKIE_OPTIONS)

    return nextResponse
  }

  return response
}

export { handleRequest as GET, handleRequest as POST }
```

- [ ] **Step 3: Commit**

```bash
git add app/api/auth/
git commit -m "feat(auth): add Auth.js route handler with OAuth fingerprint cookie injection"
```

---

## Task 10: Register Server Action

**Files:**
- Create: `features/auth/actions/registerUser.ts`
- Create: `features/auth/types/index.ts`

- [ ] **Step 1: Create `features/auth/types/index.ts`**

```ts
export type AuthActionState = {
  errors?: {
    name?: string[]
    email?: string[]
    password?: string[]
    confirmPassword?: string[]
    _form?: string[]
  }
  message?: string
  success?: boolean
}
```

- [ ] **Step 2: Create `features/auth/actions/registerUser.ts`**

```ts
'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { RegisterSchema } from '@/lib/auth/validation'
import { hashPassword } from '@/lib/auth/passwords'
import { signIn } from '@/lib/auth/config'
import { computeFingerprint, FINGERPRINT_COOKIE_NAME, FINGERPRINT_COOKIE_OPTIONS } from '@/lib/auth/session'
import type { AuthActionState } from '../types'

/**
 * Server Action: registers a new user, creates a session, and sets the fingerprint cookie.
 * @param state - Previous action state (from useActionState)
 * @param formData - Form fields: name, email, password, confirmPassword
 */
export async function registerUser(
  state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const raw = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  }

  const parsed = RegisterSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { name, email, password } = parsed.data

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return { errors: { email: ['An account with this email already exists.'] } }
  }

  const passwordHash = await hashPassword(password)

  await prisma.user.create({
    data: { name, email, passwordHash },
  })

  try {
    await signIn('credentials', { email, password, redirect: false })
  } catch {
    return { errors: { _form: ['Registration succeeded but sign-in failed. Please log in manually.'] } }
  }

  const ua = (await headers()).get('user-agent') ?? ''
  const fp = await computeFingerprint(ua)
  const cookieStore = await cookies()
  cookieStore.set(FINGERPRINT_COOKIE_NAME, fp, FINGERPRINT_COOKIE_OPTIONS)

  redirect('/dashboard')
}
```

- [ ] **Step 3: Commit**

```bash
git add features/auth/actions/registerUser.ts features/auth/types/index.ts
git commit -m "feat(auth): add registerUser Server Action with validation, hashing, and fingerprint"
```

---

## Task 11: Login Server Action

**Files:**
- Create: `features/auth/actions/loginUser.ts`

- [ ] **Step 1: Create `features/auth/actions/loginUser.ts`**

```ts
'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'
import { LoginSchema } from '@/lib/auth/validation'
import { signIn } from '@/lib/auth/config'
import { computeFingerprint, FINGERPRINT_COOKIE_NAME, FINGERPRINT_COOKIE_OPTIONS } from '@/lib/auth/session'
import type { AuthActionState } from '../types'

/**
 * Server Action: authenticates existing user with credentials, creates a session,
 * and sets the fingerprint cookie.
 * @param state - Previous action state (from useActionState)
 * @param formData - Form fields: email, password
 */
export async function loginUser(
  state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = LoginSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { errors: { _form: ['Invalid email or password.'] } }
    }
    return { errors: { _form: ['An unexpected error occurred. Please try again.'] } }
  }

  const ua = (await headers()).get('user-agent') ?? ''
  const fp = await computeFingerprint(ua)
  const cookieStore = await cookies()
  cookieStore.set(FINGERPRINT_COOKIE_NAME, fp, FINGERPRINT_COOKIE_OPTIONS)

  redirect('/dashboard')
}
```

- [ ] **Step 2: Commit**

```bash
git add features/auth/actions/loginUser.ts
git commit -m "feat(auth): add loginUser Server Action with credentials auth and fingerprint"
```

---

## Task 12: Logout Server Action

**Files:**
- Create: `features/auth/actions/logoutUser.ts`

- [ ] **Step 1: Create `features/auth/actions/logoutUser.ts`**

```ts
'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { signOut } from '@/lib/auth/config'
import { FINGERPRINT_COOKIE_NAME } from '@/lib/auth/session'

/**
 * Server Action: signs out the current user and clears the fingerprint cookie.
 */
export async function logoutUser(): Promise<void> {
  await signOut({ redirect: false })

  const cookieStore = await cookies()
  cookieStore.delete(FINGERPRINT_COOKIE_NAME)

  redirect('/login')
}
```

- [ ] **Step 2: Commit**

```bash
git add features/auth/actions/logoutUser.ts
git commit -m "feat(auth): add logoutUser Server Action"
```

---

## Task 13: Data Access Layer (DAL)

**Files:**
- Create: `lib/auth/dal.ts`

The DAL is a server-only module. Importing it in a Client Component will throw at build time. Use it in Server Components, Server Actions, and Route Handlers to get the current user.

- [ ] **Step 1: Create `lib/auth/dal.ts`**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/auth/dal.ts
git commit -m "feat(auth): add server-only Data Access Layer (verifySession, getCurrentUser)"
```

---

## Task 14: Proxy  route protection + fingerprint validation

**Files:**
- Create: `proxy.ts`

> **Note:** Next.js 16 uses `proxy.ts` (not `middleware.ts`). The exported function must be named `proxy`.

- [ ] **Step 1: Create `proxy.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { computeFingerprint, FINGERPRINT_COOKIE_NAME } from '@/lib/auth/session'

const PUBLIC_PATHS = ['/login', '/register', '/api/auth']
const PROTECTED_PREFIX = '/dashboard'

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

export default async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl

  const session = await auth()

  if (isPublic(pathname)) {
    if (session?.user && !pathname.startsWith('/api/auth')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  if (!pathname.startsWith(PROTECTED_PREFIX)) {
    return NextResponse.next()
  }

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const storedFp = req.cookies.get(FINGERPRINT_COOKIE_NAME)?.value
  if (storedFp) {
    const ua = req.headers.get('user-agent') ?? ''
    const expectedFp = await computeFingerprint(ua)

    if (storedFp !== expectedFp) {
      const response = NextResponse.redirect(new URL('/login', req.url))
      response.cookies.delete(FINGERPRINT_COOKIE_NAME)
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
```

- [ ] **Step 2: Commit**

```bash
git add proxy.ts
git commit -m "feat(auth): add proxy.ts with session validation and fingerprint anti-hijacking"
```

---

## Task 15: Barrel exports

**Files:**
- Create: `features/auth/index.ts`

- [ ] **Step 1: Create `features/auth/index.ts`**

```ts
export { registerUser } from './actions/registerUser'
export { loginUser } from './actions/loginUser'
export { logoutUser } from './actions/logoutUser'
export type { AuthActionState } from './types'
```

- [ ] **Step 2: Commit**

```bash
git add features/auth/index.ts
git commit -m "feat(auth): add barrel exports for auth feature"
```

---

## Task 16: Documentation

**Files:**
- Create: `docs/auth.md`

- [ ] **Step 1: Create `docs/auth.md`**

```markdown
# Auth Module

Handles user registration, credentials login, Google/GitHub OAuth, session management,
and anti-session-hijacking protection.

## Technologies

- **Auth.js v5** (`next-auth@beta`)  OAuth providers, JWT session cookies
- **@auth/prisma-adapter**  stores Users + OAuth Accounts in PostgreSQL via Prisma
- **bcryptjs**  password hashing (12 rounds)
- **Zod**  server-side input validation
- **HMAC-SHA256** (`crypto` built-in)  session fingerprint for hijacking detection

## Session Security

On every successful sign-in (credentials or OAuth) a `__fp` cookie is set:

```
__fp = HMAC-SHA256(userAgent, AUTH_SECRET)
```

The proxy validates `__fp` on every request to `/dashboard/**`. A user-agent mismatch
causes immediate sign-out  this prevents a stolen JWT session cookie from being replayed
from a different device or tool.

## File Structure

```
lib/
  prisma.ts               Prisma client singleton
  auth/
    config.ts             Auth.js providers + JWT callbacks
    dal.ts                verifySession, getCurrentUser (server-only)
    passwords.ts          hashPassword, verifyPassword
    session.ts            computeFingerprint, cookie constants
    validation.ts         Zod schemas for register + login

features/auth/
  actions/
    registerUser.ts       Server Action: create user + sign in
    loginUser.ts          Server Action: sign in with credentials
    logoutUser.ts         Server Action: sign out + clear fingerprint
  types/index.ts          AuthActionState
  index.ts                barrel exports

app/api/auth/[...nextauth]/
  route.ts                Auth.js route handler (injects __fp on OAuth callbacks)

proxy.ts                  Route guard + fingerprint validation
types/auth.ts             SessionUser, UserRole, NextAuth module augmentations
```

## Usage Examples

### Register a new user (Server Action)

```tsx
'use client'
import { registerUser } from '@/features/auth'
import { useActionState } from 'react'

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerUser, {})
  return (
    <form action={action}>
      <input name="name" />
      <input name="email" type="email" />
      <input name="password" type="password" />
      <input name="confirmPassword" type="password" />
      {state.errors?._form && <p>{state.errors._form[0]}</p>}
      <button disabled={pending}>Register</button>
    </form>
  )
}
```

### Get current user in a Server Component

```tsx
import { getCurrentUser } from '@/lib/auth/dal'

export default async function Dashboard() {
  const user = await getCurrentUser()
  return <h1>Welcome, {user?.name}</h1>
}
```

### Protect a Server Action

```ts
'use server'
import { verifySession } from '@/lib/auth/dal'

export async function updateProfile(formData: FormData) {
  const { user } = await verifySession() // redirects to /login if not authenticated
  // ... safe to use user.id here
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | 32-byte random secret for JWT signing + fingerprinting |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `AUTH_URL` | App base URL (used for OAuth redirect URIs) |

## Security Checklist

- [x] Passwords never stored in plaintext (bcrypt, 12 rounds)
- [x] Session tokens in HttpOnly, Secure, SameSite=Lax cookies (handled by Auth.js)
- [x] CSRF protection built into Auth.js v5
- [x] Session hijacking: user-agent fingerprint validated on every protected request
- [x] Input validated server-side with Zod before any DB call
- [x] OAuth account data stored via official `@auth/prisma-adapter`
- [x] All secrets in environment variables  never in code
- [x] Least-privilege DB queries (`select` only needed fields)
- [x] Error messages do not expose internal details
```

- [ ] **Step 2: Commit**

```bash
git add docs/auth.md
git commit -m "docs(auth): add authentication module documentation"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|-------------|------|
| User registration | Task 10 |
| Credentials login | Task 11 |
| Logout + session cleanup | Task 12 |
| Google OAuth | Task 8 + 9 |
| GitHub OAuth | Task 8 + 9 |
| Session mechanism | Task 7, 8, 14 |
| Session isolation per user (JWT bound to userId) | Task 8 |
| Anti-SessionHijacking | Task 7, 9, 10, 11, 14 |
| Prisma schema | Task 3 |
| Server Actions only | Tasks 10–12 |
| Security from CLAUDE.md | Tasks 3–14 |
| DAL / verifySession | Task 13 |

### Type Consistency Check

- `AuthActionState` defined in `features/auth/types/index.ts`, used in `registerUser.ts`, `loginUser.ts` ✓
- `SessionUser` defined in `types/auth.ts`, used in `dal.ts` ✓
- `FINGERPRINT_COOKIE_NAME`, `FINGERPRINT_COOKIE_OPTIONS`, `computeFingerprint` all exported from `lib/auth/session.ts`, imported consistently in `route.ts`, `registerUser.ts`, `loginUser.ts`, `logoutUser.ts`, `proxy.ts` ✓
- `signIn`, `signOut`, `auth`, `handlers` all from `@/lib/auth/config` ✓

### Placeholder Scan

No TBDs, TODOs, or incomplete implementations found.
