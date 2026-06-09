# Auth Module

Handles user registration, credentials login, Google/GitHub OAuth, session management,
and anti-session-hijacking protection.

## Technologies

- **Auth.js v5** (`next-auth@beta`) — OAuth providers, JWT session cookies
- **@auth/prisma-adapter** — stores Users + OAuth Accounts in PostgreSQL via Prisma
- **bcryptjs** — password hashing (12 rounds)
- **Zod** — server-side input validation
- **HMAC-SHA256** (`crypto` built-in) — session fingerprint for hijacking detection

## Session Security

On every successful sign-in (credentials or OAuth) a `__fp` cookie is set:

```
__fp = HMAC-SHA256(userAgent, AUTH_SECRET)
```

The proxy validates `__fp` on every request to `/dashboard/**`. A user-agent mismatch
causes immediate sign-out — this prevents a stolen JWT session cookie from being replayed
from a different device or tool.

## File Structure

```
lib/
  prisma.ts              — Prisma client singleton
  auth/
    config.ts            — Auth.js providers + JWT callbacks
    dal.ts               — verifySession, getCurrentUser (server-only)
    passwords.ts         — hashPassword, verifyPassword
    session.ts           — computeFingerprint, cookie constants
    validation.ts        — Zod schemas for register + login

features/auth/
  actions/
    registerUser.ts      — Server Action: create user + sign in
    loginUser.ts         — Server Action: sign in with credentials
    logoutUser.ts        — Server Action: sign out + clear fingerprint
  types/index.ts         — AuthActionState
  index.ts               — barrel exports

app/api/auth/[...nextauth]/
  route.ts               — Auth.js route handler (injects __fp on OAuth callbacks)

proxy.ts                 — Route guard + fingerprint validation
types/auth.ts            — SessionUser, UserRole, NextAuth module augmentations
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
- [x] All secrets in environment variables — never in code
- [x] Least-privilege DB queries (`select` only needed fields)
- [x] Error messages do not expose internal details
