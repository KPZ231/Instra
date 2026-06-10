# Email Verification Flow

## Overview

When a user registers via the **email mode** of the sign-up form, Instra requires them to verify their email address before a `User` record is created. A 6-digit time-limited code is sent to the provided address; the user enters it on the `/verify-email` page to complete registration.

Username-mode registrations skip email verification and create the `User` record immediately (email remains optional and `emailVerified` stays `null`).

---

## Prisma Model: `PendingRegistration`

Stores in-progress email registrations until verification is complete.

| Field          | Type     | Description                                         |
|----------------|----------|-----------------------------------------------------|
| `id`           | String   | CUID primary key                                    |
| `email`        | String   | Unique — the email being registered                 |
| `passwordHash` | String   | bcrypt hash of the chosen password                  |
| `name`         | String?  | Optional display name                               |
| `code`         | String   | 6-digit plain code (100000–999999)                  |
| `expiresAt`    | DateTime | 10 minutes from creation/resend                     |
| `lastSentAt`   | DateTime | Timestamp of last send — used for 60s resend cooldown |
| `createdAt`    | DateTime | Record creation timestamp                           |

---

## Flow

```
User fills sign-up form (email mode)
        │
        ▼
registerUser() server action
  1. Validate with RegisterSchema (Zod)
  2. Check User table — reject if email already exists
  3. Hash password with bcryptjs
  4. Generate cryptographically random 6-digit code
  5. Upsert PendingRegistration (allows re-registration before verification)
  6. Send verification email via Nodemailer / Google SMTP
  7. redirect('/verify-email?email=<encoded>')
        │
        ▼
/verify-email page
  - Shows email address from searchParams
  - 6 individual digit input boxes (auto-advance, paste support)
  - "Verify email" submit button (disabled until all 6 digits entered)
  - "Resend code" button with 60s countdown timer
        │
        ▼
verifyEmail() server action
  1. Find PendingRegistration by email
  2. Check code matches and not expired
  3. prisma.user.create({ emailVerified: new Date() })
  4. prisma.pendingRegistration.delete(...)
  5. redirect('/signin?verified=1&email=<encoded>')
        │
        ▼
User logs in on /signin with their credentials
```

---

## Server Actions

### `registerUser` (`/features/auth/actions/registerUser.ts`)

Modified to support the new email verification step. Email-mode registrations no longer create a `User` directly — they create a `PendingRegistration` and redirect to `/verify-email`.

### `verifyEmail` (`/features/auth/actions/verifyEmail.ts`)

Accepts `email` and `code` from the form. Validates the code, creates the `User`, deletes the pending record, and redirects to `/signin?verified=1`.

### `resendVerificationCode` (`/features/auth/actions/resendVerificationCode.ts`)

Accepts `email`. Enforces a 60-second cooldown by comparing `lastSentAt`. Generates a new code, updates the record, and sends a new email.

---

## Email Template

**File:** `/lib/email/templates/verifyEmail.ts`

Matches the Executive Precision dark design used in `resetPassword.ts`. Displays the 6-digit code in a large monospace block with a security notice explaining the 10-minute expiry.

---

## i18n Keys

All UI strings live under the `verify_email` namespace in:
- `/locales/en/common.json`
- `/locales/pl/common.json`

Key prefix: `verify_email.*`

---

## Technologies

- **Next.js 15** App Router — page at `app/(auth)/verify-email/page.tsx`
- **React** `useActionState` — for form submissions
- **Prisma ORM** — `PendingRegistration` model
- **Nodemailer / Google SMTP** — via `/lib/email/mailer.ts`
- **Web Crypto API** — `crypto.getRandomValues()` for secure code generation
- **react-i18next** — `useTranslation('common')` for all UI strings
