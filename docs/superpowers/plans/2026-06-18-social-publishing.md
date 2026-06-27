# Social Media Publishing  Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Umożliwić użytkownikom Instry połączenie kont Instagram, Facebook, LinkedIn i publikowanie postów (tekst + media) na tych platformach z poziomu aplikacji.

**Architecture:** Każdy użytkownik łączy swoje konta przez OAuth (Meta + LinkedIn). Tokeny przechowywane zaszyfrowane AES-256-GCM w bazie. Osobny przycisk "Opublikuj" na PostCard wywołuje server action, która przez publisher.ts wysyła post na wybrane platformy równolegle i zapisuje statuses.

**Tech Stack:** Next.js 14 App Router, Prisma ORM, Node.js crypto (AES-256-GCM), Meta Graph API v19.0, LinkedIn API v2, Upstash Redis (rate limit), Vitest, React 18

## Global Constraints

- TypeScript wszędzie  brak `any`
- `'server-only'` na górze każdego pliku w `/lib/`
- `'use server'` na górze server actions
- JSDoc na każdej publicznej funkcji/komponencie
- Każdy tekst UI przez `t("klucz")`  nigdy hardcoded
- `async/await` zawsze  nigdy `.then()`
- Logika biznesowa w hookach/serwisach, nie w komponentach
- Nigdy `fetch`/Prisma bezpośrednio w komponencie  tylko przez serwisy w `/lib/api/`
- Po mutacji w Prisma wywołaj `invalidatePrefix()`
- Brak stack trace'ów w odpowiedziach API

---

## File Map

```
Tworzone:
  prisma/schema.prisma                              ← dodanie SocialAccount, SocialPostStatus, enumów
  lib/social/crypto.ts                              ← szyfrowanie AES-256-GCM
  lib/social/types.ts                               ← SocialPlatform, PublishResult, SocialPostPayload
  lib/social/meta.ts                                ← Meta Graph API client (FB + IG)
  lib/social/linkedin.ts                            ← LinkedIn API client
  lib/social/publisher.ts                           ← orkiestrator publikacji
  lib/api/socialAccounts.ts                         ← CRUD SocialAccount + SocialPostStatus
  features/social/actions/publishPost.ts            ← server action
  features/social/index.ts                          ← barrel
  app/api/social/connect/[platform]/route.ts        ← inicjuje OAuth redirect
  app/api/social/callback/[platform]/route.ts       ← odbiera code, zapisuje token
  app/api/social/disconnect/[platform]/route.ts     ← usuwa SocialAccount
  app/(dashboard)/dashboard/settings/social/page.tsx ← strona ustawień
  components/ui/SocialConnectCard.tsx               ← karta połącz/rozłącz
  components/ui/posts/SocialPublishButton.tsx       ← przycisk publikacji (client)
  components/ui/posts/SocialStatusBadge.tsx         ← znaczek statusu (client)

Modyfikowane:
  lib/rate-limit/config.ts                          ← dodanie presetów publishPost, socialConnect
  lib/api/posts.ts                                  ← dodanie socialStatuses do FeedPost i zapytań
  components/ui/posts/PostCard.tsx                  ← dodanie SocialPublishButton
  locales/en/common.json                            ← klucze i18n
  locales/pl/common.json                            ← klucze i18n
  .env.example (jeśli istnieje) lub dokumentacja    ← nowe zmienne env
```

---

### Task 1: Prisma schema  nowe modele i enums

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `SocialAccount`, `SocialPostStatus`, enum `Platform`, enum `PublishStatus` dostępne przez Prisma Client

- [ ] **Step 1: Dodaj enumy i modele do schema.prisma**

Po modelu `Like` dopisz:

```prisma
enum Platform {
  FACEBOOK
  INSTAGRAM
  LINKEDIN
}

enum PublishStatus {
  PENDING
  PUBLISHING
  PUBLISHED
  FAILED
}

model SocialAccount {
  id               String    @id @default(cuid())
  userId           String
  platform         Platform
  accessToken      String    @db.Text
  refreshToken     String?   @db.Text
  expiresAt        DateTime?
  platformUserId   String
  platformUsername String
  pageId           String?
  pageAccessToken  String?   @db.Text

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, platform])
  @@index([userId])
}

model SocialPostStatus {
  id             String        @id @default(cuid())
  postId         String
  platform       Platform
  status         PublishStatus @default(PENDING)
  platformPostId String?
  error          String?       @db.Text
  publishedAt    DateTime?

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([postId, platform])
  @@index([postId])
}
```

- [ ] **Step 2: Zaktualizuj model User  dodaj relację socialAccounts**

W modelu `User`, po `likes Like[]` dopisz:

```prisma
  socialAccounts SocialAccount[]
```

- [ ] **Step 3: Zaktualizuj model Post  dodaj relację socialStatuses**

W modelu `Post`, po `likes Like[]` dopisz:

```prisma
  socialStatuses SocialPostStatus[]
```

- [ ] **Step 4: Uruchom migrację**

```bash
npx prisma migrate dev --name add-social-publishing
```

Oczekiwane: "Your database is now in sync with your schema."

- [ ] **Step 5: Zweryfikuj wygenerowany klient**

```bash
npx prisma generate
```

Oczekiwane: brak błędów, "Generated Prisma Client".

- [ ] **Step 6: Commit**

```bash
git add prisma/
git commit -m "feat(social): add SocialAccount and SocialPostStatus models"
```

---

### Task 2: Crypto utility  szyfrowanie tokenów

**Files:**
- Create: `lib/social/crypto.ts`
- Test: `lib/social/__tests__/crypto.test.ts`

**Interfaces:**
- Produces:
  - `encrypt(plaintext: string): string`
  - `decrypt(ciphertext: string): string`

- [ ] **Step 1: Napisz test**

Utwórz `lib/social/__tests__/crypto.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'

// Mock 'server-only' so vitest doesn't error on import
vi.mock('server-only', () => ({}))

// Must set env before import
process.env.SOCIAL_ENCRYPTION_KEY = 'a'.repeat(64) // 32 bytes hex

const { encrypt, decrypt } = await import('../crypto')

describe('crypto', () => {
  it('round-trips plaintext', () => {
    const plaintext = 'my-secret-token-abc123'
    expect(decrypt(encrypt(plaintext))).toBe(plaintext)
  })

  it('produces different ciphertext each call (random IV)', () => {
    const a = encrypt('same')
    const b = encrypt('same')
    expect(a).not.toBe(b)
  })

  it('throws on tampered ciphertext', () => {
    const ct = encrypt('token')
    const parts = ct.split(':')
    parts[2] = 'deadbeef'
    expect(() => decrypt(parts.join(':'))).toThrow()
  })
})
```

- [ ] **Step 2: Uruchom test  sprawdź że failuje**

```bash
npx vitest run lib/social/__tests__/crypto.test.ts
```

Oczekiwane: FAIL  "Cannot find module '../crypto'"

- [ ] **Step 3: Implementuj crypto.ts**

Utwórz `lib/social/crypto.ts`:

```typescript
import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

/** Returns the 32-byte key from SOCIAL_ENCRYPTION_KEY env (64 hex chars). */
function getKey(): Buffer {
  const hex = process.env.SOCIAL_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('SOCIAL_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)')
  }
  return Buffer.from(hex, 'hex')
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns "iv:authTag:ciphertext" as hex-encoded string.
 *
 * @param plaintext - The string to encrypt (e.g. an OAuth access token)
 * @returns Hex-encoded "iv:tag:ciphertext"
 *
 * @example
 * const stored = encrypt(accessToken)
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':')
}

/**
 * Decrypts a ciphertext produced by encrypt().
 *
 * @param ciphertext - Hex-encoded "iv:tag:ciphertext"
 * @returns Original plaintext
 *
 * @example
 * const token = decrypt(stored)
 */
export function decrypt(ciphertext: string): string {
  const key = getKey()
  const [ivHex, tagHex, encryptedHex] = ciphertext.split(':')
  if (!ivHex || !tagHex || !encryptedHex) throw new Error('Invalid ciphertext format')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
```

- [ ] **Step 4: Uruchom test  sprawdź że przechodzi**

```bash
npx vitest run lib/social/__tests__/crypto.test.ts
```

Oczekiwane: PASS (3 testy).

- [ ] **Step 5: Commit**

```bash
git add lib/social/
git commit -m "feat(social): add AES-256-GCM token encryption"
```

---

### Task 3: Social types

**Files:**
- Create: `lib/social/types.ts`

**Interfaces:**
- Produces:
  - `type SocialPlatform = 'FACEBOOK' | 'INSTAGRAM' | 'LINKEDIN'`
  - `type PublishResult`
  - `type SocialPostPayload`
  - `type ConnectedAccount`

- [ ] **Step 1: Utwórz types.ts**

```typescript
import 'server-only'

/** Platform identifier matching Prisma enum values. */
export type SocialPlatform = 'FACEBOOK' | 'INSTAGRAM' | 'LINKEDIN'

/** Result of a single platform publish attempt. */
export type PublishResult = {
  platform: SocialPlatform
  success: boolean
  platformPostId?: string
  error?: string
}

/** Media item forwarded to platform APIs. */
export type MediaItem = {
  url: string
  mimeType: string
  order: number
}

/** Post content sent to platform clients. */
export type SocialPostPayload = {
  content: string | null
  media: MediaItem[]
}

/** Connected social account data safe to surface to the UI (no tokens). */
export type ConnectedAccount = {
  platform: SocialPlatform
  platformUsername: string
  expiresAt: Date | null
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/social/types.ts
git commit -m "feat(social): add shared social types"
```

---

### Task 4: Social accounts DB service

**Files:**
- Create: `lib/api/socialAccounts.ts`
- Test: `lib/api/__tests__/socialAccounts.test.ts`

**Interfaces:**
- Consumes: `SocialPlatform` from `@/lib/social/types`, `prisma` from `@/lib/prisma`
- Produces:
  - `getConnectedAccounts(userId: string): Promise<ConnectedAccount[]>`
  - `getSocialAccount(userId: string, platform: SocialPlatform): Promise<SocialAccountRow | null>`
  - `upsertSocialAccount(data: UpsertSocialAccountInput): Promise<void>`
  - `deleteSocialAccount(userId: string, platform: SocialPlatform): Promise<void>`
  - `getSocialPostStatuses(postId: string): Promise<SocialPostStatusRow[]>`

- [ ] **Step 1: Napisz testy**

Utwórz `lib/api/__tests__/socialAccounts.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

const mockFindMany = vi.fn()
const mockFindUnique = vi.fn()
const mockUpsert = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    socialAccount: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      upsert: mockUpsert,
      delete: mockDelete,
    },
    socialPostStatus: {
      findMany: mockFindMany,
    },
  },
}))

const { getConnectedAccounts, deleteSocialAccount } = await import('../socialAccounts')

describe('getConnectedAccounts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns mapped ConnectedAccount array', async () => {
    mockFindMany.mockResolvedValue([
      { platform: 'FACEBOOK', platformUsername: 'mypage', expiresAt: null },
    ])
    const result = await getConnectedAccounts('user-1')
    expect(result).toEqual([{ platform: 'FACEBOOK', platformUsername: 'mypage', expiresAt: null }])
  })
})

describe('deleteSocialAccount', () => {
  it('calls prisma.delete with correct args', async () => {
    mockDelete.mockResolvedValue({})
    await deleteSocialAccount('user-1', 'LINKEDIN')
    expect(mockDelete).toHaveBeenCalledWith({
      where: { userId_platform: { userId: 'user-1', platform: 'LINKEDIN' } },
    })
  })
})
```

- [ ] **Step 2: Uruchom test  failuje**

```bash
npx vitest run lib/api/__tests__/socialAccounts.test.ts
```

Oczekiwane: FAIL  "Cannot find module '../socialAccounts'"

- [ ] **Step 3: Implementuj socialAccounts.ts**

Utwórz `lib/api/socialAccounts.ts`:

```typescript
import 'server-only'

import { prisma } from '@/lib/prisma'
import type { SocialPlatform, ConnectedAccount } from '@/lib/social/types'

/** Full DB row returned from Prisma (contains encrypted tokens). */
export type SocialAccountRow = {
  id: string
  userId: string
  platform: SocialPlatform
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  platformUserId: string
  platformUsername: string
  pageId: string | null
  pageAccessToken: string | null
}

export type UpsertSocialAccountInput = {
  userId: string
  platform: SocialPlatform
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  platformUserId: string
  platformUsername: string
  pageId?: string
  pageAccessToken?: string
}

export type SocialPostStatusRow = {
  platform: SocialPlatform
  status: 'PENDING' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED'
  platformPostId: string | null
  error: string | null
  publishedAt: Date | null
}

/**
 * Returns all connected social accounts for a user (no tokens).
 *
 * @param userId - The user's ID
 *
 * @example
 * const accounts = await getConnectedAccounts(user.id)
 */
export async function getConnectedAccounts(userId: string): Promise<ConnectedAccount[]> {
  const rows = await prisma.socialAccount.findMany({
    where: { userId },
    select: { platform: true, platformUsername: true, expiresAt: true },
  })
  return rows as ConnectedAccount[]
}

/**
 * Returns a single SocialAccount including encrypted tokens (server-side only).
 *
 * @param userId   - The user's ID
 * @param platform - The social platform
 *
 * @example
 * const account = await getSocialAccount(user.id, 'FACEBOOK')
 */
export async function getSocialAccount(
  userId: string,
  platform: SocialPlatform,
): Promise<SocialAccountRow | null> {
  return prisma.socialAccount.findUnique({
    where: { userId_platform: { userId, platform } },
  }) as Promise<SocialAccountRow | null>
}

/**
 * Creates or updates a SocialAccount record. Tokens must already be encrypted.
 *
 * @param data - Account data with pre-encrypted tokens
 *
 * @example
 * await upsertSocialAccount({ userId, platform: 'FACEBOOK', accessToken: encrypted, ... })
 */
export async function upsertSocialAccount(data: UpsertSocialAccountInput): Promise<void> {
  await prisma.socialAccount.upsert({
    where: { userId_platform: { userId: data.userId, platform: data.platform } },
    create: {
      userId: data.userId,
      platform: data.platform,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? null,
      expiresAt: data.expiresAt ?? null,
      platformUserId: data.platformUserId,
      platformUsername: data.platformUsername,
      pageId: data.pageId ?? null,
      pageAccessToken: data.pageAccessToken ?? null,
    },
    update: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? null,
      expiresAt: data.expiresAt ?? null,
      platformUserId: data.platformUserId,
      platformUsername: data.platformUsername,
      pageId: data.pageId ?? null,
      pageAccessToken: data.pageAccessToken ?? null,
    },
  })
}

/**
 * Removes a connected social account for a user.
 *
 * @param userId   - The user's ID
 * @param platform - The platform to disconnect
 *
 * @example
 * await deleteSocialAccount(user.id, 'LINKEDIN')
 */
export async function deleteSocialAccount(
  userId: string,
  platform: SocialPlatform,
): Promise<void> {
  await prisma.socialAccount.delete({
    where: { userId_platform: { userId, platform } },
  })
}

/**
 * Returns publish statuses for a post across all platforms.
 *
 * @param postId - The post ID
 *
 * @example
 * const statuses = await getSocialPostStatuses(post.id)
 */
export async function getSocialPostStatuses(postId: string): Promise<SocialPostStatusRow[]> {
  const rows = await prisma.socialPostStatus.findMany({
    where: { postId },
    select: { platform: true, status: true, platformPostId: true, error: true, publishedAt: true },
  })
  return rows as SocialPostStatusRow[]
}
```

- [ ] **Step 4: Uruchom test  przechodzi**

```bash
npx vitest run lib/api/__tests__/socialAccounts.test.ts
```

Oczekiwane: PASS (2 testy).

- [ ] **Step 5: Commit**

```bash
git add lib/api/socialAccounts.ts lib/api/__tests__/socialAccounts.test.ts
git commit -m "feat(social): add socialAccounts DB service"
```

---

### Task 5: Rate limit preset + feature barrel

**Files:**
- Modify: `lib/rate-limit/config.ts`
- Create: `features/social/index.ts`

**Interfaces:**
- Produces: `'publishPost'` key w `RATE_LIMIT_PRESETS`

- [ ] **Step 1: Dodaj preset publishPost do config.ts**

W pliku `lib/rate-limit/config.ts`, w obiekcie `RATE_LIMIT_PRESETS` dopisz po `toggleLike`:

```typescript
  publishPost:    { limit: 10, window: '1 h'  },
  socialConnect:  { limit: 5,  window: '15 m' },
```

- [ ] **Step 2: Utwórz barrel features/social/index.ts**

```typescript
export { publishPost } from './actions/publishPost'
```

(plik actions/publishPost.ts powstanie w Task 9  barrel musi istnieć wcześniej)

Utwórz tymczasowy plik `features/social/actions/publishPost.ts`:

```typescript
'use server'
// placeholder  implemented in Task 9
export async function publishPost(_postId: string): Promise<void> {}
```

- [ ] **Step 3: Commit**

```bash
git add lib/rate-limit/config.ts features/social/
git commit -m "feat(social): add publishPost rate limit preset and feature barrel"
```

---

### Task 6: Meta API client (Facebook + Instagram)

**Files:**
- Create: `lib/social/meta.ts`
- Test: `lib/social/__tests__/meta.test.ts`

**Interfaces:**
- Consumes: `SocialPostPayload`, `MediaItem` from `@/lib/social/types`
- Produces:
  - `publishToFacebook(pageId: string, pageAccessToken: string, payload: SocialPostPayload): Promise<string>`
  - `publishToInstagram(igUserId: string, accessToken: string, payload: SocialPostPayload): Promise<string>`

- [ ] **Step 1: Napisz testy**

Utwórz `lib/social/__tests__/meta.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

const mockFetch = vi.fn()
global.fetch = mockFetch

const { publishToFacebook, publishToInstagram } = await import('../meta')

describe('publishToFacebook', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns post ID on text-only success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'fb-post-123' }),
    })
    const id = await publishToFacebook('page-1', 'token', { content: 'Hello', media: [] })
    expect(id).toBe('fb-post-123')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/page-1/feed'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'Invalid token' } }),
    })
    await expect(publishToFacebook('page-1', 'bad', { content: 'Hi', media: [] })).rejects.toThrow(
      'Invalid token',
    )
  })
})

describe('publishToInstagram', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates media container and publishes', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'container-1' }) }) // create container
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'ig-post-1' }) })   // publish
    const id = await publishToInstagram('ig-1', 'token', {
      content: 'Test',
      media: [{ url: 'https://example.com/img.jpg', mimeType: 'image/jpeg', order: 0 }],
    })
    expect(id).toBe('ig-post-1')
  })
})
```

- [ ] **Step 2: Uruchom test  failuje**

```bash
npx vitest run lib/social/__tests__/meta.test.ts
```

Oczekiwane: FAIL.

- [ ] **Step 3: Implementuj meta.ts**

Utwórz `lib/social/meta.ts`:

```typescript
import 'server-only'
import type { SocialPostPayload } from './types'

const BASE = 'https://graph.facebook.com/v19.0'

/** Calls Meta Graph API and throws on error. */
async function metaFetch<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as T & { error?: { message: string } }
  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? `Meta API error ${res.status}`)
  }
  return data
}

/**
 * Publishes a post to a Facebook Page.
 * If media is present, attaches photos. Returns the new post's Facebook ID.
 *
 * @param pageId          - Facebook Page ID
 * @param pageAccessToken - Page-level access token
 * @param payload         - Post content and media
 * @returns Facebook post ID
 *
 * @example
 * const postId = await publishToFacebook(account.pageId, token, { content, media })
 */
export async function publishToFacebook(
  pageId: string,
  pageAccessToken: string,
  payload: SocialPostPayload,
): Promise<string> {
  const images = payload.media.filter((m) => m.mimeType.startsWith('image/'))

  if (images.length === 0) {
    // Text-only post
    const res = await metaFetch<{ id: string }>(`${BASE}/${pageId}/feed`, {
      message: payload.content ?? '',
      access_token: pageAccessToken,
    })
    return res.id
  }

  // Upload each photo as unpublished, collect IDs
  const photoIds = await Promise.all(
    images.map(async (img) => {
      const res = await metaFetch<{ id: string }>(`${BASE}/${pageId}/photos`, {
        url: img.url,
        published: false,
        access_token: pageAccessToken,
      })
      return res.id
    }),
  )

  // Create post with attached photos
  const res = await metaFetch<{ id: string }>(`${BASE}/${pageId}/feed`, {
    message: payload.content ?? '',
    attached_media: photoIds.map((id) => ({ media_fbid: id })),
    access_token: pageAccessToken,
  })
  return res.id
}

/**
 * Publishes a post to an Instagram Business Account.
 * Handles single image, carousel (≤10), or text-only (caption only).
 * Returns the Instagram media ID.
 *
 * @param igUserId    - Instagram Business Account ID
 * @param accessToken - User access token with instagram_content_publish scope
 * @param payload     - Post content and media
 * @returns Instagram media ID
 *
 * @example
 * const mediaId = await publishToInstagram(account.platformUserId, token, { content, media })
 */
export async function publishToInstagram(
  igUserId: string,
  accessToken: string,
  payload: SocialPostPayload,
): Promise<string> {
  const images = payload.media.filter((m) => m.mimeType.startsWith('image/')).slice(0, 10)
  const caption = payload.content ?? ''

  if (images.length === 0) {
    // Text as caption without media  Instagram requires at least one media item.
    // Use a single-item container with caption only (reel not supported; fallback: skip)
    throw new Error(
      'Instagram requires at least one image. Add media to publish on Instagram.',
    )
  }

  if (images.length === 1) {
    // Single image post
    const container = await metaFetch<{ id: string }>(`${BASE}/${igUserId}/media`, {
      image_url: images[0].url,
      caption,
      access_token: accessToken,
    })
    const publish = await metaFetch<{ id: string }>(`${BASE}/${igUserId}/media_publish`, {
      creation_id: container.id,
      access_token: accessToken,
    })
    return publish.id
  }

  // Carousel: create child containers first
  const childIds = await Promise.all(
    images.map(async (img) => {
      const res = await metaFetch<{ id: string }>(`${BASE}/${igUserId}/media`, {
        image_url: img.url,
        is_carousel_item: true,
        access_token: accessToken,
      })
      return res.id
    }),
  )

  // Create carousel container
  const carousel = await metaFetch<{ id: string }>(`${BASE}/${igUserId}/media`, {
    media_type: 'CAROUSEL',
    children: childIds,
    caption,
    access_token: accessToken,
  })

  // Publish
  const publish = await metaFetch<{ id: string }>(`${BASE}/${igUserId}/media_publish`, {
    creation_id: carousel.id,
    access_token: accessToken,
  })
  return publish.id
}
```

- [ ] **Step 4: Uruchom test  przechodzi**

```bash
npx vitest run lib/social/__tests__/meta.test.ts
```

Oczekiwane: PASS (3 testy).

- [ ] **Step 5: Commit**

```bash
git add lib/social/meta.ts lib/social/__tests__/meta.test.ts
git commit -m "feat(social): add Meta Graph API client (Facebook + Instagram)"
```

---

### Task 7: LinkedIn API client

**Files:**
- Create: `lib/social/linkedin.ts`
- Test: `lib/social/__tests__/linkedin.test.ts`

**Interfaces:**
- Consumes: `SocialPostPayload` from `@/lib/social/types`
- Produces:
  - `publishToLinkedIn(personUrn: string, accessToken: string, payload: SocialPostPayload): Promise<string>`

- [ ] **Step 1: Napisz testy**

Utwórz `lib/social/__tests__/linkedin.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

const mockFetch = vi.fn()
global.fetch = mockFetch

const { publishToLinkedIn } = await import('../linkedin')

describe('publishToLinkedIn', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns post URN on text-only success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'urn:li:ugcPost:123' },
      json: async () => ({}),
    })
    const id = await publishToLinkedIn('urn:li:person:abc', 'token', {
      content: 'Hello LinkedIn',
      media: [],
    })
    expect(id).toBe('urn:li:ugcPost:123')
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      headers: { get: () => null },
      json: async () => ({ message: 'Unauthorized' }),
    })
    await expect(
      publishToLinkedIn('urn:li:person:abc', 'bad', { content: 'Hi', media: [] }),
    ).rejects.toThrow('Unauthorized')
  })
})
```

- [ ] **Step 2: Uruchom test  failuje**

```bash
npx vitest run lib/social/__tests__/linkedin.test.ts
```

Oczekiwane: FAIL.

- [ ] **Step 3: Implementuj linkedin.ts**

Utwórz `lib/social/linkedin.ts`:

```typescript
import 'server-only'
import type { SocialPostPayload } from './types'

const BASE = 'https://api.linkedin.com/v2'

/**
 * Publishes a text (+ optional image) post to LinkedIn on behalf of a member.
 * Image upload uses LinkedIn's registerUpload flow (fetches bytes from Supabase URL).
 * Returns the ugcPost URN from the X-RestLi-Id response header.
 *
 * @param personUrn   - Member URN e.g. "urn:li:person:abc123"
 * @param accessToken - LinkedIn access token with w_member_social scope
 * @param payload     - Post content and media
 * @returns LinkedIn ugcPost URN
 *
 * @example
 * const urn = await publishToLinkedIn(account.platformUserId, token, { content, media })
 */
export async function publishToLinkedIn(
  personUrn: string,
  accessToken: string,
  payload: SocialPostPayload,
): Promise<string> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
  }

  const images = payload.media.filter((m) => m.mimeType.startsWith('image/')).slice(0, 20)

  // Register and upload images
  const assetUrns: string[] = await Promise.all(
    images.map(async (img) => {
      // Step 1: Register upload
      const regRes = await fetch(`${BASE}/assets?action=registerUpload`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          registerUploadRequest: {
            owner: personUrn,
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            serviceRelationships: [
              { identifier: 'urn:li:userGeneratedContent', relationshipType: 'OWNER' },
            ],
          },
        }),
      })
      if (!regRes.ok) {
        const err = (await regRes.json()) as { message?: string }
        throw new Error(err.message ?? `LinkedIn registerUpload failed ${regRes.status}`)
      }
      const regData = (await regRes.json()) as {
        value: { asset: string; uploadMechanism: { 'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': { uploadUrl: string } } }
      }
      const assetUrn = regData.value.asset
      const uploadUrl =
        regData.value.uploadMechanism[
          'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
        ].uploadUrl

      // Step 2: Fetch image bytes from Supabase URL and upload to LinkedIn
      const imgRes = await fetch(img.url)
      if (!imgRes.ok) throw new Error(`Failed to fetch media from storage: ${img.url}`)
      const imgBlob = await imgRes.blob()

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': img.mimeType,
        },
        body: imgBlob,
      })
      if (!uploadRes.ok) throw new Error(`LinkedIn image upload failed ${uploadRes.status}`)

      return assetUrn
    }),
  )

  // Build ugcPost body
  const shareMediaCategory = assetUrns.length > 0 ? 'IMAGE' : 'NONE'
  const body = {
    author: personUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: payload.content ?? '' },
        shareMediaCategory,
        ...(assetUrns.length > 0
          ? {
              media: assetUrns.map((assetUrn) => ({
                status: 'READY',
                media: assetUrn,
              })),
            }
          : {}),
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  }

  const res = await fetch(`${BASE}/ugcPosts`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = (await res.json()) as { message?: string }
    throw new Error(err.message ?? `LinkedIn ugcPosts failed ${res.status}`)
  }

  const postUrn = res.headers.get('X-RestLi-Id')
  if (!postUrn) throw new Error('LinkedIn did not return post URN')
  return postUrn
}
```

- [ ] **Step 4: Uruchom test  przechodzi**

```bash
npx vitest run lib/social/__tests__/linkedin.test.ts
```

Oczekiwane: PASS (2 testy).

- [ ] **Step 5: Commit**

```bash
git add lib/social/linkedin.ts lib/social/__tests__/linkedin.test.ts
git commit -m "feat(social): add LinkedIn API client"
```

---

### Task 8: Publisher orchestrator

**Files:**
- Create: `lib/social/publisher.ts`
- Test: `lib/social/__tests__/publisher.test.ts`

**Interfaces:**
- Consumes: `publishToFacebook`, `publishToInstagram` from `./meta`; `publishToLinkedIn` from `./linkedin`; `decrypt` from `./crypto`; `prisma`
- Produces:
  - `publishPost(postId: string, userId: string): Promise<PublishResult[]>`

- [ ] **Step 1: Napisz testy**

Utwórz `lib/social/__tests__/publisher.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../crypto', () => ({ decrypt: (v: string) => `decrypted:${v}` }))
vi.mock('../meta', () => ({
  publishToFacebook: vi.fn().mockResolvedValue('fb-123'),
  publishToInstagram: vi.fn().mockResolvedValue('ig-456'),
}))
vi.mock('../linkedin', () => ({
  publishToLinkedIn: vi.fn().mockResolvedValue('urn:li:ugcPost:789'),
}))

const mockPostFindUnique = vi.fn()
const mockStatusUpsert = vi.fn()
const mockAccountFindUnique = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    post: { findUnique: mockPostFindUnique },
    socialPostStatus: { upsert: mockStatusUpsert },
    socialAccount: { findUnique: mockAccountFindUnique },
  },
}))

const { publishPost } = await import('../publisher')
const { publishToFacebook } = await import('../meta')
const { publishToLinkedIn } = await import('../linkedin')

describe('publishPost', () => {
  beforeEach(() => vi.clearAllMocks())

  it('publishes to selected platforms and returns results', async () => {
    mockPostFindUnique.mockResolvedValue({
      id: 'post-1',
      content: 'Hello',
      platforms: ['FACEBOOK', 'LINKEDIN'],
      media: [],
    })
    mockAccountFindUnique
      .mockResolvedValueOnce({
        platform: 'FACEBOOK',
        accessToken: 'enc-fb',
        pageAccessToken: 'enc-page',
        pageId: 'page-1',
        platformUserId: 'u1',
        expiresAt: null,
      })
      .mockResolvedValueOnce({
        platform: 'LINKEDIN',
        accessToken: 'enc-li',
        platformUserId: 'urn:li:person:abc',
        expiresAt: null,
        pageId: null,
        pageAccessToken: null,
      })
    mockStatusUpsert.mockResolvedValue({})

    const results = await publishPost('post-1', 'user-1')

    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({ platform: 'FACEBOOK', success: true, platformPostId: 'fb-123' })
    expect(results[1]).toMatchObject({ platform: 'LINKEDIN', success: true, platformPostId: 'urn:li:ugcPost:789' })
    expect(publishToFacebook).toHaveBeenCalledWith('page-1', 'decrypted:enc-page', expect.objectContaining({ content: 'Hello' }))
    expect(publishToLinkedIn).toHaveBeenCalledWith('urn:li:person:abc', 'decrypted:enc-li', expect.any(Object))
  })

  it('returns failed result when account not connected', async () => {
    mockPostFindUnique.mockResolvedValue({
      id: 'post-2', content: 'Hi', platforms: ['INSTAGRAM'], media: [],
    })
    mockAccountFindUnique.mockResolvedValue(null)
    mockStatusUpsert.mockResolvedValue({})

    const results = await publishPost('post-2', 'user-1')
    expect(results[0]).toMatchObject({ platform: 'INSTAGRAM', success: false, error: 'Account not connected' })
  })

  it('throws when post not found', async () => {
    mockPostFindUnique.mockResolvedValue(null)
    await expect(publishPost('missing', 'user-1')).rejects.toThrow('Post not found')
  })
})
```

- [ ] **Step 2: Uruchom test  failuje**

```bash
npx vitest run lib/social/__tests__/publisher.test.ts
```

Oczekiwane: FAIL.

- [ ] **Step 3: Implementuj publisher.ts**

Utwórz `lib/social/publisher.ts`:

```typescript
import 'server-only'

import { prisma } from '@/lib/prisma'
import { decrypt } from './crypto'
import { publishToFacebook, publishToInstagram } from './meta'
import { publishToLinkedIn } from './linkedin'
import type { SocialPlatform, PublishResult, SocialPostPayload } from './types'

/**
 * Publishes an existing post to all platforms listed in post.platforms[].
 * Runs all platform calls in parallel; each result is recorded independently.
 *
 * @param postId - The Instra post ID
 * @param userId - The post author's user ID (used for ownership check and account lookup)
 * @returns Array of PublishResult, one per platform
 *
 * @example
 * const results = await publishPost(post.id, user.id)
 */
export async function publishPost(postId: string, userId: string): Promise<PublishResult[]> {
  const post = await prisma.post.findUnique({
    where: { id: postId, authorId: userId },
    include: { media: { orderBy: { order: 'asc' } } },
  })
  if (!post) throw new Error('Post not found')

  const platforms = post.platforms as SocialPlatform[]
  const payload: SocialPostPayload = {
    content: post.content,
    media: post.media.map((m) => ({ url: m.url, mimeType: m.mimeType, order: m.order })),
  }

  const results = await Promise.all(
    platforms.map(async (platform): Promise<PublishResult> => {
      // Mark as PUBLISHING
      await prisma.socialPostStatus.upsert({
        where: { postId_platform: { postId, platform } },
        create: { postId, platform, status: 'PUBLISHING' },
        update: { status: 'PUBLISHING', error: null, platformPostId: null, publishedAt: null },
      })

      try {
        const account = await prisma.socialAccount.findUnique({
          where: { userId_platform: { userId, platform } },
        })
        if (!account) throw new Error('Account not connected')
        if (account.expiresAt && account.expiresAt < new Date()) {
          throw new Error('Token expired  reconnect your account')
        }

        const token = decrypt(account.accessToken)
        let platformPostId: string | undefined

        if (platform === 'FACEBOOK') {
          const pageToken = account.pageAccessToken ? decrypt(account.pageAccessToken) : token
          platformPostId = await publishToFacebook(account.pageId!, pageToken, payload)
        } else if (platform === 'INSTAGRAM') {
          platformPostId = await publishToInstagram(account.platformUserId, token, payload)
        } else if (platform === 'LINKEDIN') {
          platformPostId = await publishToLinkedIn(account.platformUserId, token, payload)
        }

        await prisma.socialPostStatus.upsert({
          where: { postId_platform: { postId, platform } },
          create: { postId, platform, status: 'PUBLISHED', platformPostId, publishedAt: new Date() },
          update: { status: 'PUBLISHED', platformPostId, publishedAt: new Date(), error: null },
        })

        return { platform, success: true, platformPostId }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        await prisma.socialPostStatus.upsert({
          where: { postId_platform: { postId, platform } },
          create: { postId, platform, status: 'FAILED', error: message },
          update: { status: 'FAILED', error: message, platformPostId: null, publishedAt: null },
        })
        return { platform, success: false, error: message }
      }
    }),
  )

  return results
}
```

- [ ] **Step 4: Uruchom test  przechodzi**

```bash
npx vitest run lib/social/__tests__/publisher.test.ts
```

Oczekiwane: PASS (3 testy).

- [ ] **Step 5: Commit**

```bash
git add lib/social/publisher.ts lib/social/__tests__/publisher.test.ts
git commit -m "feat(social): add publisher orchestrator"
```

---

### Task 9: publishPost server action

**Files:**
- Modify: `features/social/actions/publishPost.ts`
- Test: `features/social/__tests__/publishPost.test.ts`

**Interfaces:**
- Consumes: `publishPost` from `@/lib/social/publisher`; `rateLimit`; `verifySession`
- Produces:
  - `publishPost(postId: string): Promise<{ results?: PublishResult[]; error?: string }>`

- [ ] **Step 1: Napisz test**

Utwórz `features/social/__tests__/publishPost.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/dal', () => ({
  verifySession: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}))
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(),
  RateLimitError: class extends Error {},
}))
vi.mock('@/lib/social/publisher', () => ({
  publishPost: vi.fn().mockResolvedValue([{ platform: 'FACEBOOK', success: true, platformPostId: 'fb-1' }]),
}))

const { publishPost } = await import('../actions/publishPost')

describe('publishPost action', () => {
  it('returns results on success', async () => {
    const result = await publishPost('post-1')
    expect(result.results).toHaveLength(1)
    expect(result.results![0].success).toBe(true)
  })
})
```

- [ ] **Step 2: Uruchom test  failuje**

```bash
npx vitest run features/social/__tests__/publishPost.test.ts
```

Oczekiwane: FAIL.

- [ ] **Step 3: Implementuj action**

Zastąp placeholder w `features/social/actions/publishPost.ts`:

```typescript
'use server'

import { verifySession } from '@/lib/auth/dal'
import { rateLimit, RateLimitError } from '@/lib/rate-limit'
import { publishPost as publishPostToSocial } from '@/lib/social/publisher'
import type { PublishResult } from '@/lib/social/types'

/**
 * Server Action: publishes an existing Instra post to connected social platforms.
 * Enforces rate limit (10/h per user).
 *
 * @param postId - The Instra post ID to publish
 * @returns Object with results array or error string
 *
 * @example
 * const { results, error } = await publishPost(post.id)
 */
export async function publishPost(
  postId: string,
): Promise<{ results?: PublishResult[]; error?: string }> {
  const { user } = await verifySession()

  try {
    await rateLimit('publishPost', (ip) => `${ip}:${user.id}`)
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { error: error.message }
    }
    throw error
  }

  try {
    const results = await publishPostToSocial(postId, user.id)
    return { results }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to publish post'
    return { error: message }
  }
}
```

Zaktualizuj `features/social/index.ts`:

```typescript
export { publishPost } from './actions/publishPost'
```

- [ ] **Step 4: Uruchom test  przechodzi**

```bash
npx vitest run features/social/__tests__/publishPost.test.ts
```

Oczekiwane: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add features/social/
git commit -m "feat(social): add publishPost server action"
```

---

### Task 10: OAuth API routes

**Files:**
- Create: `app/api/social/connect/[platform]/route.ts`
- Create: `app/api/social/callback/[platform]/route.ts`
- Create: `app/api/social/disconnect/[platform]/route.ts`

**Interfaces:**
- Consumes: `upsertSocialAccount`, `deleteSocialAccount` from `@/lib/api/socialAccounts`; `encrypt` from `@/lib/social/crypto`; `auth` from `@/lib/auth/config`
- Produces: OAuth redirect flows for FACEBOOK, INSTAGRAM (via Meta), LINKEDIN

- [ ] **Step 1: Utwórz connect route**

Utwórz `app/api/social/connect/[platform]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { rateLimit, RateLimitError } from '@/lib/rate-limit'
import { getIp } from '@/lib/rate-limit/getIp'
import { randomUUID } from 'crypto'

const OAUTH_URLS: Record<string, string> = {
  facebook: 'https://www.facebook.com/v19.0/dialog/oauth',
  instagram: 'https://www.facebook.com/v19.0/dialog/oauth', // same as FB  Meta handles both
  linkedin: 'https://www.linkedin.com/oauth/v2/authorization',
}

const SCOPES: Record<string, string> = {
  facebook: 'pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish',
  instagram: 'pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish',
  linkedin: 'w_member_social,r_liteprofile',
}

/**
 * GET /api/social/connect/[platform]
 * Initiates the OAuth flow for the given platform.
 * Stores a CSRF state token in a cookie.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { platform: string } },
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const platform = params.platform.toLowerCase()
  const oauthUrl = OAUTH_URLS[platform]
  if (!oauthUrl) {
    return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
  }

  try {
    const ip = await getIp()
    await rateLimit('socialConnect', () => `${ip}:${session.user!.id}`)
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }
    throw error
  }

  const state = randomUUID()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const callbackUrl = `${appUrl}/api/social/callback/${platform}`

  const url = new URL(oauthUrl)
  url.searchParams.set('client_id', platform === 'linkedin'
    ? process.env.LINKEDIN_CLIENT_ID!
    : process.env.META_APP_ID!
  )
  url.searchParams.set('redirect_uri', callbackUrl)
  url.searchParams.set('scope', SCOPES[platform])
  url.searchParams.set('state', state)
  if (platform !== 'linkedin') url.searchParams.set('response_type', 'code')

  const response = NextResponse.redirect(url.toString())
  response.cookies.set('social_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })
  return response
}
```

- [ ] **Step 2: Utwórz callback route**

Utwórz `app/api/social/callback/[platform]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { encrypt } from '@/lib/social/crypto'
import { upsertSocialAccount } from '@/lib/api/socialAccounts'
import type { SocialPlatform } from '@/lib/social/types'

const PLATFORM_MAP: Record<string, SocialPlatform> = {
  facebook: 'FACEBOOK',
  instagram: 'INSTAGRAM',
  linkedin: 'LINKEDIN',
}

/**
 * GET /api/social/callback/[platform]
 * Handles OAuth callback: exchanges code for token, fetches profile, stores encrypted account.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { platform: string } },
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.redirect(new URL('/signin', req.url))

  const platform = params.platform.toLowerCase()
  const socialPlatform = PLATFORM_MAP[platform]
  if (!socialPlatform) return NextResponse.redirect(new URL('/dashboard/settings/social?error=unsupported', req.url))

  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const storedState = req.cookies.get('social_oauth_state')?.value

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(new URL('/dashboard/settings/social?error=invalid_state', req.url))
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const redirectUri = `${appUrl}/api/social/callback/${platform}`

  try {
    if (platform === 'linkedin') {
      await handleLinkedIn(session.user.id, code, redirectUri)
    } else {
      await handleMeta(session.user.id, platform as 'facebook' | 'instagram', code, redirectUri)
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'oauth_error'
    const response = NextResponse.redirect(
      new URL(`/dashboard/settings/social?error=${encodeURIComponent(msg)}`, req.url),
    )
    response.cookies.delete('social_oauth_state')
    return response
  }

  const response = NextResponse.redirect(
    new URL('/dashboard/settings/social?success=true', req.url),
  )
  response.cookies.delete('social_oauth_state')
  return response
}

async function handleLinkedIn(userId: string, code: string, redirectUri: string): Promise<void> {
  // Exchange code for token
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  })
  if (!tokenRes.ok) throw new Error('LinkedIn token exchange failed')
  const tokenData = (await tokenRes.json()) as { access_token: string; expires_in: number }

  // Fetch profile
  const profileRes = await fetch('https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  if (!profileRes.ok) throw new Error('LinkedIn profile fetch failed')
  const profile = (await profileRes.json()) as { id: string; localizedFirstName: string; localizedLastName: string }

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

  await upsertSocialAccount({
    userId,
    platform: 'LINKEDIN',
    accessToken: encrypt(tokenData.access_token),
    expiresAt,
    platformUserId: `urn:li:person:${profile.id}`,
    platformUsername: `${profile.localizedFirstName} ${profile.localizedLastName}`,
  })
}

async function handleMeta(
  userId: string,
  platform: 'facebook' | 'instagram',
  code: string,
  redirectUri: string,
): Promise<void> {
  const appId = process.env.META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!

  // Short-lived token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`,
  )
  if (!tokenRes.ok) throw new Error('Meta token exchange failed')
  const tokenData = (await tokenRes.json()) as { access_token: string }

  // Exchange for long-lived token (60 days)
  const longRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`,
  )
  if (!longRes.ok) throw new Error('Meta long-lived token exchange failed')
  const longData = (await longRes.json()) as { access_token: string; expires_in: number }
  const longToken = longData.access_token
  const expiresAt = new Date(Date.now() + (longData.expires_in ?? 5184000) * 1000)

  // Get user profile
  const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${longToken}`)
  if (!meRes.ok) throw new Error('Meta profile fetch failed')
  const me = (await meRes.json()) as { id: string; name: string }

  // Get Pages the user manages
  const pagesRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?access_token=${longToken}`,
  )
  if (!pagesRes.ok) throw new Error('Meta pages fetch failed')
  const pagesData = (await pagesRes.json()) as { data: { id: string; name: string; access_token: string }[] }
  const page = pagesData.data[0]
  if (!page) throw new Error('No Facebook Pages found. Create a Facebook Page first.')

  // Save Facebook account
  await upsertSocialAccount({
    userId,
    platform: 'FACEBOOK',
    accessToken: encrypt(longToken),
    expiresAt,
    platformUserId: me.id,
    platformUsername: page.name,
    pageId: page.id,
    pageAccessToken: encrypt(page.access_token),
  })

  if (platform === 'instagram') {
    // Get Instagram Business Account linked to the Page
    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
    )
    if (!igRes.ok) throw new Error('Instagram account fetch failed')
    const igData = (await igRes.json()) as { instagram_business_account?: { id: string } }
    if (!igData.instagram_business_account) {
      throw new Error('No Instagram Business Account linked to this Facebook Page.')
    }
    const igId = igData.instagram_business_account.id

    // Get IG username
    const igProfileRes = await fetch(
      `https://graph.facebook.com/v19.0/${igId}?fields=username&access_token=${page.access_token}`,
    )
    const igProfile = (await igProfileRes.json()) as { username: string }

    await upsertSocialAccount({
      userId,
      platform: 'INSTAGRAM',
      accessToken: encrypt(page.access_token),
      expiresAt,
      platformUserId: igId,
      platformUsername: igProfile.username ?? igId,
    })
  }
}
```

- [ ] **Step 3: Utwórz disconnect route**

Utwórz `app/api/social/disconnect/[platform]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { deleteSocialAccount } from '@/lib/api/socialAccounts'
import type { SocialPlatform } from '@/lib/social/types'

const PLATFORM_MAP: Record<string, SocialPlatform> = {
  facebook: 'FACEBOOK',
  instagram: 'INSTAGRAM',
  linkedin: 'LINKEDIN',
}

/**
 * DELETE /api/social/disconnect/[platform]
 * Removes the user's connected social account for the given platform.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { platform: string } },
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const platform = PLATFORM_MAP[params.platform.toLowerCase()]
  if (!platform) return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })

  try {
    await deleteSocialAccount(session.user.id, platform)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/social/
git commit -m "feat(social): add OAuth connect/callback/disconnect routes"
```

---

### Task 11: Settings page + SocialConnectCard component

**Files:**
- Create: `app/(dashboard)/dashboard/settings/social/page.tsx`
- Create: `components/ui/SocialConnectCard.tsx`

**Interfaces:**
- Consumes: `getConnectedAccounts` from `@/lib/api/socialAccounts`; `verifySession` from `@/lib/auth/dal`
- Produces: `/dashboard/settings/social` page

- [ ] **Step 1: Utwórz SocialConnectCard**

Utwórz `components/ui/SocialConnectCard.tsx`:

```typescript
'use client'

import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Card } from '@/components/ui/Card'
import type { ConnectedAccount, SocialPlatform } from '@/lib/social/types'

interface SocialConnectCardProps {
  platform: SocialPlatform
  account: ConnectedAccount | null
}

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  LINKEDIN: 'LinkedIn',
}

/**
 * Displays the connection status of a social platform and provides
 * connect/disconnect buttons.
 *
 * @param platform - The social platform identifier
 * @param account  - Connected account data, or null if not connected
 *
 * @example
 * <SocialConnectCard platform="FACEBOOK" account={connectedAccount} />
 */
export function SocialConnectCard({ platform, account }: SocialConnectCardProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const label = PLATFORM_LABELS[platform]

  async function handleDisconnect() {
    await fetch(`/api/social/disconnect/${platform.toLowerCase()}`, { method: 'DELETE' })
    startTransition(() => router.refresh())
  }

  return (
    <Card className="p-4 flex items-center justify-between gap-4">
      <div>
        <p className="font-mono text-sm font-bold" style={{ color: 'var(--color-on-surface)' }}>
          {label}
        </p>
        {account ? (
          <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-outline)' }}>
            {t('social.connected_as', { username: account.platformUsername })}
            {account.expiresAt && (
              <span className="ml-2">
                · {t('social.expires')} {new Date(account.expiresAt).toLocaleDateString()}
              </span>
            )}
          </p>
        ) : (
          <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-outline)' }}>
            {t('social.not_connected')}
          </p>
        )}
      </div>

      {account ? (
        <button
          onClick={handleDisconnect}
          disabled={isPending}
          className="font-mono text-xs uppercase tracking-[0.08em] hover:opacity-80 transition-opacity disabled:opacity-40"
          style={{ color: '#ffb4ab' }}
        >
          {t('social.disconnect')}
        </button>
      ) : (
        <a
          href={`/api/social/connect/${platform.toLowerCase()}`}
          className="font-mono text-xs uppercase tracking-[0.08em] hover:opacity-80 transition-opacity"
          style={{ color: 'var(--color-primary)' }}
        >
          {t('social.connect')}
        </a>
      )}
    </Card>
  )
}
```

- [ ] **Step 2: Utwórz stronę settings/social**

Utwórz `app/(dashboard)/dashboard/settings/social/page.tsx`:

```typescript
import { getConnectedAccounts } from '@/lib/api/socialAccounts'
import { verifySession } from '@/lib/auth/dal'
import { SocialConnectCard } from '@/components/ui/SocialConnectCard'
import { getTranslations } from 'next-intl/server'
import type { SocialPlatform, ConnectedAccount } from '@/lib/social/types'

const PLATFORMS: SocialPlatform[] = ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN']

/**
 * Social accounts settings page  connect/disconnect Facebook, Instagram, LinkedIn.
 */
export default async function SocialSettingsPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string }
}) {
  const { user } = await verifySession()
  const accounts = await getConnectedAccounts(user.id)

  const accountMap = Object.fromEntries(
    accounts.map((a) => [a.platform, a]),
  ) as Record<SocialPlatform, ConnectedAccount | undefined>

  return (
    <main className="max-w-xl mx-auto py-10 px-4 space-y-6">
      <h1
        className="font-mono text-lg font-bold uppercase tracking-[0.1em]"
        style={{ color: 'var(--color-on-surface)' }}
      >
        Social Media
      </h1>

      {searchParams.success && (
        <p
          className="font-mono text-xs p-3 rounded"
          style={{ background: 'var(--color-surface-container)', color: 'var(--color-primary)' }}
        >
          Account connected successfully.
        </p>
      )}
      {searchParams.error && (
        <p
          className="font-mono text-xs p-3 rounded"
          style={{ background: 'var(--color-surface-container)', color: '#ffb4ab' }}
        >
          {decodeURIComponent(searchParams.error)}
        </p>
      )}

      <div className="space-y-3">
        {PLATFORMS.map((platform) => (
          <SocialConnectCard
            key={platform}
            platform={platform}
            account={accountMap[platform] ?? null}
          />
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/dashboard/settings/social/ components/ui/SocialConnectCard.tsx
git commit -m "feat(social): add settings page and SocialConnectCard component"
```

---

### Task 12: SocialPublishButton + SocialStatusBadge + PostCard update

**Files:**
- Create: `components/ui/posts/SocialPublishButton.tsx`
- Create: `components/ui/posts/SocialStatusBadge.tsx`
- Modify: `components/ui/posts/PostCard.tsx`
- Modify: `lib/api/posts.ts`  extend `FeedPost` type with `socialStatuses`

**Interfaces:**
- Consumes: `publishPost` from `@/features/social`; `SocialPostStatusRow` from `@/lib/api/socialAccounts`
- Produces: publish button and status badges integrated in PostCard

- [ ] **Step 1: Rozszerz FeedPost o socialStatuses**

W `lib/api/posts.ts` zaktualizuj typ `FeedPost`  dopisz pole po `likedByMe`:

```typescript
  socialStatuses: {
    platform: string
    status: string
    error: string | null
  }[]
```

W funkcji `getFeed` zaktualizuj blok `include`:

```typescript
        include: {
          author: { select: { id: true, name: true, username: true, image: true } },
          media: { orderBy: { order: 'asc' }, select: { id: true, url: true, mimeType: true, order: true } },
          _count: { select: { likes: true } },
          likes: currentUserId
            ? { where: { userId: currentUserId }, select: { id: true } }
            : false,
          socialStatuses: currentUserId
            ? { select: { platform: true, status: true, error: true } }
            : false,
        },
```

W mapowaniu wyników `getFeed` dopisz:

```typescript
          socialStatuses: currentUserId ? (p.socialStatuses as { platform: string; status: string; error: string | null }[]) : [],
```

Zrób to samo w `getPostsByUsername` i `getPostById`.

- [ ] **Step 2: Utwórz SocialStatusBadge**

Utwórz `components/ui/posts/SocialStatusBadge.tsx`:

```typescript
'use client'

import { useTranslation } from 'react-i18next'

interface SocialStatusBadgeProps {
  platform: string
  status: string
  error: string | null
}

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'var(--color-primary)',
  PUBLISHING: 'var(--color-outline)',
  FAILED: '#ffb4ab',
  PENDING: 'var(--color-outline)',
}

/**
 * Tiny badge showing publish status for a social platform.
 *
 * @param platform - Platform name (e.g. "FACEBOOK")
 * @param status   - PublishStatus value
 * @param error    - Error message if status is FAILED
 *
 * @example
 * <SocialStatusBadge platform="LINKEDIN" status="PUBLISHED" error={null} />
 */
export function SocialStatusBadge({ platform, status, error }: SocialStatusBadgeProps) {
  const { t } = useTranslation()
  const color = STATUS_COLORS[status] ?? 'var(--color-outline)'
  const label = platform.charAt(0) + platform.slice(1).toLowerCase()

  return (
    <span
      className="font-mono text-[9px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded"
      style={{
        color,
        background: 'var(--color-surface-container)',
        border: `1px solid ${color}`,
        cursor: error ? 'help' : 'default',
      }}
      title={error ?? undefined}
    >
      {status === 'PUBLISHING' ? '…' : status === 'PUBLISHED' ? '✓' : status === 'FAILED' ? '✗' : '·'}{' '}
      {label}
    </span>
  )
}
```

- [ ] **Step 3: Utwórz SocialPublishButton**

Utwórz `components/ui/posts/SocialPublishButton.tsx`:

```typescript
'use client'

import { useTransition, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { publishPost } from '@/features/social'
import { SocialStatusBadge } from './SocialStatusBadge'

interface StatusItem {
  platform: string
  status: string
  error: string | null
}

interface SocialPublishButtonProps {
  postId: string
  platforms: string[]
  initialStatuses: StatusItem[]
}

/**
 * Button that publishes an Instra post to connected social platforms.
 * Shows per-platform status badges after publishing.
 *
 * @param postId          - The post ID to publish
 * @param platforms       - Platforms selected on the post (e.g. ["FACEBOOK", "LINKEDIN"])
 * @param initialStatuses - Existing SocialPostStatus records for this post
 *
 * @example
 * <SocialPublishButton postId={post.id} platforms={post.platforms} initialStatuses={post.socialStatuses} />
 */
export function SocialPublishButton({ postId, platforms, initialStatuses }: SocialPublishButtonProps) {
  const { t } = useTranslation()
  const [isPending, startTransition] = useTransition()
  const [statuses, setStatuses] = useState<StatusItem[]>(initialStatuses)

  if (platforms.length === 0) return null

  async function handlePublish() {
    startTransition(async () => {
      const result = await publishPost(postId)
      if (result.results) {
        setStatuses(
          result.results.map((r) => ({
            platform: r.platform,
            status: r.success ? 'PUBLISHED' : 'FAILED',
            error: r.error ?? null,
          })),
        )
      }
    })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={handlePublish}
        disabled={isPending}
        className="font-mono text-[10px] uppercase tracking-[0.08em] hover:opacity-80 transition-opacity disabled:opacity-40"
        style={{ color: 'var(--color-primary)' }}
      >
        {isPending ? t('social.publishing') : t('social.publish')}
      </button>
      {statuses.map((s) => (
        <SocialStatusBadge key={s.platform} platform={s.platform} status={s.status} error={s.error} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Zaktualizuj PostCard**

W `components/ui/posts/PostCard.tsx` dopisz import:

```typescript
import { SocialPublishButton } from './SocialPublishButton'
```

Zaktualizuj interfejs `PostCardProps`  dodaj `post: FeedPost` (już jest), upewnij się, że `FeedPost` ma `socialStatuses`.

W JSX, po bloku z `Like button`, dopisz (tylko dla autora, jeśli post ma platformy):

```tsx
      {/* Social publish */}
      {canEdit && post.platforms.length > 0 && (
        <div className="px-4 pb-3">
          <SocialPublishButton
            postId={post.id}
            platforms={post.platforms}
            initialStatuses={post.socialStatuses ?? []}
          />
        </div>
      )}
```

- [ ] **Step 5: Commit**

```bash
git add lib/api/posts.ts components/ui/posts/SocialPublishButton.tsx components/ui/posts/SocialStatusBadge.tsx components/ui/posts/PostCard.tsx
git commit -m "feat(social): add SocialPublishButton, SocialStatusBadge, extend FeedPost with socialStatuses"
```

---

### Task 13: i18n keys + zmienne środowiskowe

**Files:**
- Modify: `locales/en/common.json`
- Modify: `locales/pl/common.json`

- [ ] **Step 1: Dodaj klucze do en/common.json**

W `locales/en/common.json` dopisz obiekt `social` na poziomie głównym:

```json
"social": {
  "connect": "Connect",
  "disconnect": "Disconnect",
  "connected_as": "Connected as @{{username}}",
  "not_connected": "Not connected",
  "expires": "Expires",
  "publish": "Publish to social",
  "publishing": "Publishing…",
  "settings_title": "Social Media Accounts"
}
```

- [ ] **Step 2: Dodaj klucze do pl/common.json**

```json
"social": {
  "connect": "Połącz",
  "disconnect": "Rozłącz",
  "connected_as": "Połączono jako @{{username}}",
  "not_connected": "Nie połączono",
  "expires": "Wygasa",
  "publish": "Opublikuj na social media",
  "publishing": "Publikowanie…",
  "settings_title": "Konta Social Media"
}
```

- [ ] **Step 3: Dodaj zmienne env do .env**

Dopisz do `.env` (nie commituj do git):

```
# Social Media Publishing
META_APP_ID=
META_APP_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
SOCIAL_ENCRYPTION_KEY=   # openssl rand -hex 32
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Skonfiguruj aplikacje OAuth:**

**Meta:**
1. developers.facebook.com → My Apps → Create App → Business
2. Dodaj produkty: Facebook Login, Instagram Basic Display
3. Settings → Basic → App ID i App Secret → wpisz w `.env`
4. Facebook Login → Settings → Valid OAuth Redirect URIs: `http://localhost:3000/api/social/callback/facebook`
5. Permissions: `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`

**LinkedIn:**
1. developer.linkedin.com → Create App
2. Auth tab → Client ID i Client Secret → wpisz w `.env`
3. OAuth 2.0 settings → Redirect URLs: `http://localhost:3000/api/social/callback/linkedin`
4. Products → Share on LinkedIn, Sign In with LinkedIn

- [ ] **Step 4: Commit**

```bash
git add locales/
git commit -m "feat(social): add i18n keys for social media publishing"
```
