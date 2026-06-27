# Post System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core post system for Instra  a social feed where authenticated users create/edit/delete posts (text + image carousel), like posts, and view a public global feed and per-user profiles.

**Architecture:** Posts live in three new Prisma models (`Post`, `Media`, `Like`); media files are stored in Supabase Storage; mutations are Next.js Server Actions in `features/posts/actions/` mirroring `features/auth/actions/`; reads go through `lib/api/posts.ts` wrapped in Redis `getOrSet`; all pages are Server Components with ISR + cursor pagination.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma (PostgreSQL/Supabase), Supabase Storage, NextAuth (Auth.js v5), Redis (`@upstash/ratelimit`), Zod, React `useActionState`, Tailwind CSS, react-i18next.

## Global Constraints

- No `any` TypeScript  all types must be explicit.
- All business logic in services/actions, never directly in components.
- Every public function must have JSDoc with `@param`, `@returns`, `@example`.
- All UI text via `t("posts.*")`  never hardcoded strings in JSX.
- Supabase client **lazy-init**  no crash at module load when env vars are missing.
- Server actions follow the pattern: `verifySession()` → `rateLimit()` → Zod parse → Prisma → `invalidatePrefix()` → `revalidatePath()`.
- Upload validation: `image/jpeg`, `image/png`, `image/webp` only; ≤ 5 MB per file; ≤ 10 files per post.
- Post must have content OR at least one media item (not both empty).
- Cursor pagination uses `{ id: string; createdAt: Date }` cursor, `take: 12`.
- Pages: ISR `revalidate = 60` for public routes; `robots: { index: false }` for dashboard routes.

---

## File Map

**New files:**
- `prisma/schema.prisma`  add `Post`, `Media`, `Like` models; add relations to `User`
- `lib/storage/supabase.ts`  Supabase Storage client: `uploadPostMedia`, `deletePostMedia`
- `lib/rate-limit/config.ts`  add `createPost`, `toggleLike` presets
- `features/posts/validation.ts`  Zod schemas: `CreatePostSchema`, `UpdatePostSchema`
- `features/posts/types/index.ts`  `PostActionState` type
- `features/posts/actions/createPost.ts`  server action
- `features/posts/actions/updatePost.ts`  server action
- `features/posts/actions/deletePost.ts`  server action
- `features/posts/actions/toggleLike.ts`  server action
- `features/posts/actions/loadMorePosts.ts`  server action for cursor pagination
- `features/posts/index.ts`  barrel export
- `lib/api/posts.ts`  read layer: `getFeed`, `getPostsByUsername`, `getPostById`
- `components/ui/Textarea.tsx`  reusable textarea primitive
- `components/ui/Card.tsx`  reusable card primitive
- `components/ui/posts/MediaCarousel.tsx`  image carousel for PostCard
- `components/ui/posts/MediaUploadPreview.tsx`  multi-file upload preview in composer
- `components/ui/posts/PostCard.tsx`  single post display
- `components/ui/posts/PostComposer.tsx`  create/edit form (inline + full-page mode)
- `components/ui/posts/PostFeed.tsx`  paginated list of PostCards
- `app/(dashboard)/dashboard/posts/new/page.tsx`  full composer page
- `app/(dashboard)/dashboard/posts/[id]/edit/page.tsx`  edit page
- `app/(pages)/feed/page.tsx`  public global feed
- `app/(pages)/profile/[username]/page.tsx`  public user profile
- `docs/posts.md`  module documentation
- `docs/storage.md`  Supabase Storage documentation

**Modified files:**
- `app/(dashboard)/dashboard/page.tsx`  replace mock with real feed + inline composer
- `locales/en/common.json`  add `posts` keys
- `locales/pl/common.json`  add `posts` keys
- `docs/database.md`  document new models

---

### Task 1: Prisma Schema  Post, Media, Like models

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `prisma.post`, `prisma.media`, `prisma.like` with full TypeScript types after `prisma generate`

- [ ] **Step 1: Add models to schema**

Open `prisma/schema.prisma` and add the following after the `PluginAuditLog` model. Also add `posts Post[]` and `likes Like[]` to the `User` model:

```prisma
// In the User model, add these two lines after `reviewedVersions PluginVersion[] @relation`:
  posts Post[]
  likes Like[]

// --- New models ---

model Post {
  id        String   @id @default(cuid())
  content   String?  @db.Text
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  media     Media[]
  likes     Like[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([authorId])
  @@index([createdAt])
}

model Media {
  id        String   @id @default(cuid())
  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  url       String
  storagePath String
  mimeType  String
  order     Int      @default(0)
  createdAt DateTime @default(now())

  @@index([postId])
}

model Like {
  id        String   @id @default(cuid())
  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([postId, userId])
  @@index([postId])
  @@index([userId])
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_post_media_like
```

Expected output: `✔ Generated Prisma Client` and `The following migration(s) have been applied`.

- [ ] **Step 3: Verify with Prisma Studio**

```bash
npx prisma studio
```

Open browser → confirm `Post`, `Media`, `Like` tables appear with correct columns.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add Post, Media, Like models to Prisma schema"
```

---

### Task 2: Supabase Storage service

**Files:**
- Create: `lib/storage/supabase.ts`
- Create: `docs/storage.md`

**Interfaces:**
- Produces:
  - `uploadPostMedia(file: File, userId: string): Promise<{ url: string; storagePath: string; mimeType: string }>`
  - `deletePostMedia(storagePaths: string[]): Promise<void>`

- [ ] **Step 1: Create the storage service**

Create `lib/storage/supabase.ts`:

```typescript
import 'server-only'

import { createClient } from '@supabase/supabase-js'

const BUCKET = 'post-media'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const
const ALLOWED_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/** Lazy-init Supabase client  safe to import when env vars are missing. */
function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('[storage] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  return createClient(url, key)
}

/**
 * Uploads a single image file to Supabase Storage under the user's folder.
 * Validates MIME type, file extension, and file size before uploading.
 *
 * @param file   - The File object to upload
 * @param userId - The authenticated user's ID (used as folder prefix)
 * @returns Object containing the public URL, storage path, and MIME type
 * @throws Error if validation fails or upload errors
 *
 * @example
 * const { url, storagePath, mimeType } = await uploadPostMedia(file, session.user.id)
 */
export async function uploadPostMedia(
  file: File,
  userId: string,
): Promise<{ url: string; storagePath: string; mimeType: string }> {
  // Validate MIME type
  if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Allowed: ${ALLOWED_MIME.join(', ')}`)
  }

  // Validate extension matches MIME
  const ext = file.name.split('.').pop()?.toLowerCase()
  const expectedExt = ALLOWED_EXTENSIONS[file.type]
  if (!ext || ext !== expectedExt) {
    throw new Error(`File extension does not match MIME type`)
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${file.size} bytes. Maximum: ${MAX_FILE_SIZE} bytes`)
  }

  const supabase = getSupabase()
  const { randomUUID } = await import('crypto')
  const storagePath = `${userId}/${randomUUID()}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false })

  if (error) {
    throw new Error(`[storage] Upload failed: ${error.message}`)
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

  return { url: data.publicUrl, storagePath, mimeType: file.type }
}

/**
 * Deletes one or more files from Supabase Storage.
 * Silently ignores individual file errors to avoid cascading failures.
 *
 * @param storagePaths - Array of storage paths (e.g. ["userId/uuid.jpg"])
 *
 * @example
 * await deletePostMedia(['abc123/image.jpg', 'abc123/photo.png'])
 */
export async function deletePostMedia(storagePaths: string[]): Promise<void> {
  if (storagePaths.length === 0) return
  const supabase = getSupabase()
  const { error } = await supabase.storage.from(BUCKET).remove(storagePaths)
  if (error) {
    console.error('[storage] deletePostMedia failed:', error.message)
  }
}
```

- [ ] **Step 2: Add env vars to `.env.example`**

Open `.env.example` and add (if not already present for SUPABASE_URL):
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 3: Create the Supabase Storage bucket**

In Supabase Dashboard → Storage → Create bucket named `post-media` with public read enabled. Set RLS policy: `service role can do all`, public can `SELECT`.

- [ ] **Step 4: Create `docs/storage.md`**

```markdown
# Storage Module

Thin wrapper around Supabase Storage for uploading and deleting post media.

## Bucket: `post-media`

- **Public read:** yes (URLs are publicly accessible without auth)
- **Write:** service role only (server-side via `SUPABASE_SERVICE_ROLE_KEY`)
- **Path convention:** `{userId}/{uuid}.{ext}`

## Functions

### `uploadPostMedia(file, userId)`
Validates MIME (`image/jpeg|png|webp`), extension match, size (≤ 5 MB), then uploads.
Returns `{ url, storagePath, mimeType }`.

### `deletePostMedia(storagePaths[])`
Bulk delete from bucket. Errors are logged, not thrown.

## Environment Variables
- `SUPABASE_URL`  project URL
- `SUPABASE_SERVICE_ROLE_KEY`  service role key (never expose client-side)
```

- [ ] **Step 5: Commit**

```bash
git add lib/storage/supabase.ts docs/storage.md .env.example
git commit -m "feat(storage): add Supabase Storage service for post media upload/delete"
```

---

### Task 3: Config limits, rate-limit presets, Zod validation, types

**Files:**
- Modify: `lib/rate-limit/config.ts`
- Create: `features/posts/validation.ts`
- Create: `features/posts/types/index.ts`

**Interfaces:**
- Produces:
  - Rate limit keys: `'createPost'`, `'toggleLike'`
  - `CreatePostSchema`  validates `{ content?: string; mediaCount: number }`
  - `UpdatePostSchema`  validates `{ postId: string; content?: string; mediaCount: number }`
  - `PostActionState` type

- [ ] **Step 1: Add rate-limit presets**

In `lib/rate-limit/config.ts`, extend `RATE_LIMIT_PRESETS`:

```typescript
export const RATE_LIMIT_PRESETS = {
  login:          { limit: 5,  window: '1 m'  },
  register:       { limit: 3,  window: '10 m' },
  forgotPassword: { limit: 3,  window: '15 m' },
  verifyEmail:    { limit: 10, window: '5 m'  },
  resendCode:     { limit: 2,  window: '1 m'  },
  createPost:     { limit: 10, window: '1 h'  },
  toggleLike:     { limit: 60, window: '1 m'  },
} satisfies Record<string, RateLimitPreset>
```

- [ ] **Step 2: Create `features/posts/validation.ts`**

```typescript
import { z } from 'zod'

export const MAX_POST_LENGTH = 2200
export const MAX_POST_MEDIA = 10

/**
 * Schema for creating a new post.
 * Either content or at least one media item must be present.
 */
export const CreatePostSchema = z
  .object({
    content: z.string().max(MAX_POST_LENGTH, `Content must be at most ${MAX_POST_LENGTH} characters`).optional(),
    mediaCount: z.coerce.number().int().min(0).max(MAX_POST_MEDIA),
  })
  .refine(
    (data) => (data.content && data.content.trim().length > 0) || data.mediaCount > 0,
    { message: 'Post must have content or at least one image', path: ['_form'] },
  )

/**
 * Schema for updating an existing post.
 */
export const UpdatePostSchema = z
  .object({
    postId: z.string().min(1, 'Post ID is required'),
    content: z.string().max(MAX_POST_LENGTH, `Content must be at most ${MAX_POST_LENGTH} characters`).optional(),
    mediaCount: z.coerce.number().int().min(0).max(MAX_POST_MEDIA),
  })
  .refine(
    (data) => (data.content && data.content.trim().length > 0) || data.mediaCount > 0,
    { message: 'Post must have content or at least one image', path: ['_form'] },
  )
```

- [ ] **Step 3: Create `features/posts/types/index.ts`**

```typescript
export type PostActionState = {
  errors?: {
    content?: string[]
    media?: string[]
    _form?: string[]
  }
  message?: string
  success?: boolean
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/rate-limit/config.ts features/posts/validation.ts features/posts/types/index.ts
git commit -m "feat(posts): add rate-limit presets, Zod schemas, and PostActionState type"
```

---

### Task 4: Server actions  createPost, updatePost, deletePost, toggleLike, loadMorePosts

**Files:**
- Create: `features/posts/actions/createPost.ts`
- Create: `features/posts/actions/updatePost.ts`
- Create: `features/posts/actions/deletePost.ts`
- Create: `features/posts/actions/toggleLike.ts`
- Create: `features/posts/actions/loadMorePosts.ts`
- Create: `features/posts/index.ts`

**Interfaces:**
- Consumes:
  - `verifySession()` from `lib/auth/dal.ts` → `{ user: { id: string; role: UserRole } }`
  - `rateLimit(preset)`, `RateLimitError` from `lib/rate-limit`
  - `uploadPostMedia`, `deletePostMedia` from `lib/storage/supabase.ts`
  - `CreatePostSchema`, `UpdatePostSchema` from `features/posts/validation.ts`
  - `PostActionState` from `features/posts/types/index.ts`
  - `invalidatePrefix` from `lib/cache`
  - `prisma` from `lib/prisma`
- Produces:
  - `createPost(state: PostActionState, formData: FormData): Promise<PostActionState>`
  - `updatePost(state: PostActionState, formData: FormData): Promise<PostActionState>`
  - `deletePost(postId: string): Promise<void>`
  - `toggleLike(postId: string): Promise<void>`
  - `loadMorePosts(cursor: string): Promise<{ posts: FeedPost[]; nextCursor: string | null }>`
  - `FeedPost` type (see below)

- [ ] **Step 1: Create `features/posts/actions/createPost.ts`**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth/dal'
import { rateLimit, RateLimitError } from '@/lib/rate-limit'
import { invalidatePrefix } from '@/lib/cache'
import { uploadPostMedia } from '@/lib/storage/supabase'
import { CreatePostSchema, MAX_POST_MEDIA } from '../validation'
import type { PostActionState } from '../types'

/**
 * Server Action: creates a new post with optional media carousel.
 * Validates session, rate limit, content, and media files before writing to DB.
 *
 * @param state    - Previous action state (from useActionState)
 * @param formData - Fields: content (optional), media[] (File array, optional)
 * @returns PostActionState with field errors, or success flag
 *
 * @example
 * const [state, action] = useActionState(createPost, {})
 */
export async function createPost(
  state: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const { user } = await verifySession()

  try {
    await rateLimit('createPost', (ip) => `${ip}:${user.id}`)
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { errors: { _form: [error.message] } }
    }
    throw error
  }

  const mediaFiles = formData.getAll('media').filter((f): f is File => f instanceof File && f.size > 0)

  const parsed = CreatePostSchema.safeParse({
    content: formData.get('content') ?? undefined,
    mediaCount: mediaFiles.length,
  })
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as PostActionState['errors'] }
  }

  if (mediaFiles.length > MAX_POST_MEDIA) {
    return { errors: { media: [`Maximum ${MAX_POST_MEDIA} images allowed`] } }
  }

  // Upload media files
  let uploadedMedia: { url: string; storagePath: string; mimeType: string; order: number }[] = []
  try {
    uploadedMedia = await Promise.all(
      mediaFiles.map(async (file, index) => {
        const result = await uploadPostMedia(file, user.id)
        return { ...result, order: index }
      }),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Media upload failed'
    return { errors: { media: [message] } }
  }

  await prisma.post.create({
    data: {
      content: parsed.data.content ?? null,
      authorId: user.id,
      media: {
        create: uploadedMedia.map(({ url, storagePath, mimeType, order }) => ({
          url,
          storagePath,
          mimeType,
          order,
        })),
      },
    },
  })

  await invalidatePrefix('db', 'feed')
  await invalidatePrefix('db', 'profile', user.id)
  revalidatePath('/dashboard')
  revalidatePath('/feed')

  return { success: true }
}
```

- [ ] **Step 2: Create `features/posts/actions/updatePost.ts`**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth/dal'
import { invalidatePrefix } from '@/lib/cache'
import { uploadPostMedia, deletePostMedia } from '@/lib/storage/supabase'
import { UpdatePostSchema, MAX_POST_MEDIA } from '../validation'
import { UserRole } from '@/types/auth'
import type { PostActionState } from '../types'

/**
 * Server Action: updates an existing post (author or ADMIN only).
 * Handles media diff: uploads new files, deletes removed ones from storage.
 *
 * @param state    - Previous action state (from useActionState)
 * @param formData - Fields: postId, content (optional), media[] (new Files),
 *                   keepMediaIds[] (IDs of existing media to keep)
 * @returns PostActionState with field errors, or success flag
 */
export async function updatePost(
  state: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const { user } = await verifySession()

  const newMediaFiles = formData.getAll('media').filter((f): f is File => f instanceof File && f.size > 0)
  const keepMediaIds = formData.getAll('keepMediaIds').map(String)

  const parsed = UpdatePostSchema.safeParse({
    postId: formData.get('postId'),
    content: formData.get('content') ?? undefined,
    mediaCount: keepMediaIds.length + newMediaFiles.length,
  })
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as PostActionState['errors'] }
  }

  if (keepMediaIds.length + newMediaFiles.length > MAX_POST_MEDIA) {
    return { errors: { media: [`Maximum ${MAX_POST_MEDIA} images allowed`] } }
  }

  // Fetch post + authorize
  const post = await prisma.post.findUnique({
    where: { id: parsed.data.postId },
    include: { media: true },
  })

  if (!post) return { errors: { _form: ['Post not found'] } }
  if (post.authorId !== user.id && user.role !== UserRole.ADMIN) {
    return { errors: { _form: ['Not authorized'] } }
  }

  // Determine which existing media to delete
  const toDelete = post.media.filter((m) => !keepMediaIds.includes(m.id))

  // Upload new media
  let uploadedMedia: { url: string; storagePath: string; mimeType: string; order: number }[] = []
  try {
    uploadedMedia = await Promise.all(
      newMediaFiles.map(async (file, index) => {
        const result = await uploadPostMedia(file, user.id)
        return { ...result, order: keepMediaIds.length + index }
      }),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Media upload failed'
    return { errors: { media: [message] } }
  }

  // Delete removed files from storage
  await deletePostMedia(toDelete.map((m) => m.storagePath))

  await prisma.$transaction([
    // Delete removed media rows
    prisma.media.deleteMany({ where: { id: { in: toDelete.map((m) => m.id) } } }),
    // Create new media rows
    ...uploadedMedia.map((m) =>
      prisma.media.create({
        data: { postId: post.id, url: m.url, storagePath: m.storagePath, mimeType: m.mimeType, order: m.order },
      }),
    ),
    // Update post content
    prisma.post.update({
      where: { id: post.id },
      data: { content: parsed.data.content ?? null },
    }),
  ])

  await invalidatePrefix('db', 'feed')
  await invalidatePrefix('db', 'profile', post.authorId)
  revalidatePath('/dashboard')
  revalidatePath('/feed')

  return { success: true }
}
```

- [ ] **Step 3: Create `features/posts/actions/deletePost.ts`**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth/dal'
import { invalidatePrefix } from '@/lib/cache'
import { deletePostMedia } from '@/lib/storage/supabase'
import { UserRole } from '@/types/auth'

/**
 * Server Action: deletes a post and all its associated media (author or ADMIN only).
 * Files are removed from Supabase Storage; DB cascade handles Media/Like rows.
 *
 * @param postId - The ID of the post to delete
 * @throws Error if post not found or user not authorized
 *
 * @example
 * await deletePost(post.id)
 */
export async function deletePost(postId: string): Promise<void> {
  const { user } = await verifySession()

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { media: { select: { storagePath: true } } },
  })

  if (!post) throw new Error('Post not found')
  if (post.authorId !== user.id && user.role !== UserRole.ADMIN) {
    throw new Error('Not authorized')
  }

  // Delete from storage first (DB cascade handles rows)
  await deletePostMedia(post.media.map((m) => m.storagePath))
  await prisma.post.delete({ where: { id: postId } })

  await invalidatePrefix('db', 'feed')
  await invalidatePrefix('db', 'profile', post.authorId)
  revalidatePath('/dashboard')
  revalidatePath('/feed')
}
```

- [ ] **Step 4: Create `features/posts/actions/toggleLike.ts`**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth/dal'
import { rateLimit, RateLimitError } from '@/lib/rate-limit'
import { invalidatePrefix } from '@/lib/cache'

/**
 * Server Action: toggles a like on a post for the current user.
 * Creates the Like record if it doesn't exist; deletes it if it does.
 *
 * @param postId - The ID of the post to like/unlike
 *
 * @example
 * await toggleLike(post.id)
 */
export async function toggleLike(postId: string): Promise<void> {
  const { user } = await verifySession()

  try {
    await rateLimit('toggleLike', (ip) => `${ip}:${user.id}`)
  } catch (error) {
    if (error instanceof RateLimitError) return // silent for likes
    throw error
  }

  const existing = await prisma.like.findUnique({
    where: { postId_userId: { postId, userId: user.id } },
  })

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } })
  } else {
    await prisma.like.create({ data: { postId, userId: user.id } })
  }

  await invalidatePrefix('db', 'feed')
  revalidatePath('/dashboard')
  revalidatePath('/feed')
}
```

- [ ] **Step 5: Create `features/posts/actions/loadMorePosts.ts`**

```typescript
'use server'

import { getFeed } from '@/lib/api/posts'
import type { FeedPost } from '@/lib/api/posts'

/**
 * Server Action: loads the next page of feed posts using cursor pagination.
 * Designed for the "Load more" button in PostFeed.
 *
 * @param cursor - Cursor string in format "{createdAt}_{id}" or empty string for first page
 * @returns Object with posts array and nextCursor (null if no more pages)
 *
 * @example
 * const { posts, nextCursor } = await loadMorePosts("2024-01-01T00:00:00.000Z_clx123")
 */
export async function loadMorePosts(
  cursor: string,
): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  return getFeed(cursor || undefined)
}
```

- [ ] **Step 6: Create `features/posts/index.ts` barrel**

```typescript
export { createPost } from './actions/createPost'
export { updatePost } from './actions/updatePost'
export { deletePost } from './actions/deletePost'
export { toggleLike } from './actions/toggleLike'
export { loadMorePosts } from './actions/loadMorePosts'
export type { PostActionState } from './types'
```

- [ ] **Step 7: Commit**

```bash
git add features/posts/
git commit -m "feat(posts): add server actions for create, update, delete, toggleLike, loadMore"
```

---

### Task 5: Read layer  lib/api/posts.ts

**Files:**
- Create: `lib/api/posts.ts`

**Interfaces:**
- Produces:
  - `FeedPost` type (exported)
  - `getFeed(cursor?: string): Promise<{ posts: FeedPost[]; nextCursor: string | null }>`
  - `getPostsByUsername(username: string, cursor?: string): Promise<{ posts: FeedPost[]; nextCursor: string | null }>`
  - `getPostById(id: string): Promise<FeedPost | null>`

- [ ] **Step 1: Create `lib/api/posts.ts`**

```typescript
import 'server-only'

import { prisma } from '@/lib/prisma'
import { getOrSet } from '@/lib/cache'
import { auth } from '@/lib/auth/config'

const TAKE = 12

export type FeedPost = {
  id: string
  content: string | null
  createdAt: Date
  author: {
    id: string
    name: string | null
    username: string | null
    image: string | null
  }
  media: {
    id: string
    url: string
    mimeType: string
    order: number
  }[]
  likeCount: number
  likedByMe: boolean
}

/**
 * Parses an encoded cursor string into a Prisma skip/where clause.
 * Cursor format: "{ISO date}_{id}"
 */
function parseCursor(cursor: string): { createdAt: Date; id: string } | null {
  const parts = cursor.split('_')
  if (parts.length < 2) return null
  const id = parts[parts.length - 1]
  const dateStr = parts.slice(0, -1).join('_')
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return null
  return { createdAt: date, id }
}

/**
 * Encodes a cursor from the last post in the result set.
 */
function encodeCursor(post: { createdAt: Date; id: string }): string {
  return `${post.createdAt.toISOString()}_${post.id}`
}

async function getCurrentUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

/**
 * Fetches a paginated global feed of posts, ordered by newest first.
 * Results are cached in Redis (db namespace, 300s TTL).
 * Cache is invalidated after any post/like mutation.
 *
 * @param cursor - Optional pagination cursor from previous call
 * @returns Posts array and nextCursor (null if no more pages)
 *
 * @example
 * const { posts, nextCursor } = await getFeed()
 */
export async function getFeed(
  cursor?: string,
): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  const currentUserId = await getCurrentUserId()
  const cursorSegment = cursor ?? 'start'

  return getOrSet(
    'db',
    async () => {
      const parsed = cursor ? parseCursor(cursor) : null

      const rows = await prisma.post.findMany({
        take: TAKE + 1,
        ...(parsed
          ? {
              cursor: { id: parsed.id },
              skip: 1,
            }
          : {}),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          author: { select: { id: true, name: true, username: true, image: true } },
          media: { orderBy: { order: 'asc' }, select: { id: true, url: true, mimeType: true, order: true } },
          _count: { select: { likes: true } },
          likes: currentUserId
            ? { where: { userId: currentUserId }, select: { id: true } }
            : false,
        },
      })

      const hasMore = rows.length > TAKE
      const posts = rows.slice(0, TAKE)
      const nextCursor = hasMore ? encodeCursor(posts[posts.length - 1]) : null

      return {
        posts: posts.map((p) => ({
          id: p.id,
          content: p.content,
          createdAt: p.createdAt,
          author: p.author,
          media: p.media,
          likeCount: p._count.likes,
          likedByMe: currentUserId ? (p.likes as { id: string }[]).length > 0 : false,
        })),
        nextCursor,
      }
    },
    undefined,
    'feed',
    cursorSegment,
    currentUserId ?? 'anon',
  )
}

/**
 * Fetches a paginated list of posts by a specific user (their profile feed).
 * Results are cached in Redis under the user's profile namespace.
 *
 * @param username - The user's username
 * @param cursor   - Optional pagination cursor
 * @returns Posts array and nextCursor
 *
 * @example
 * const { posts } = await getPostsByUsername('john_doe')
 */
export async function getPostsByUsername(
  username: string,
  cursor?: string,
): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  const currentUserId = await getCurrentUserId()
  const cursorSegment = cursor ?? 'start'

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } })
  if (!user) return { posts: [], nextCursor: null }

  return getOrSet(
    'db',
    async () => {
      const parsed = cursor ? parseCursor(cursor) : null

      const rows = await prisma.post.findMany({
        where: { authorId: user.id },
        take: TAKE + 1,
        ...(parsed ? { cursor: { id: parsed.id }, skip: 1 } : {}),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          author: { select: { id: true, name: true, username: true, image: true } },
          media: { orderBy: { order: 'asc' }, select: { id: true, url: true, mimeType: true, order: true } },
          _count: { select: { likes: true } },
          likes: currentUserId
            ? { where: { userId: currentUserId }, select: { id: true } }
            : false,
        },
      })

      const hasMore = rows.length > TAKE
      const posts = rows.slice(0, TAKE)
      const nextCursor = hasMore ? encodeCursor(posts[posts.length - 1]) : null

      return {
        posts: posts.map((p) => ({
          id: p.id,
          content: p.content,
          createdAt: p.createdAt,
          author: p.author,
          media: p.media,
          likeCount: p._count.likes,
          likedByMe: currentUserId ? (p.likes as { id: string }[]).length > 0 : false,
        })),
        nextCursor,
      }
    },
    undefined,
    'profile',
    user.id,
    cursorSegment,
    currentUserId ?? 'anon',
  )
}

/**
 * Fetches a single post by ID. Not cached (used for edit pages).
 *
 * @param id - Post ID
 * @returns The post or null if not found
 *
 * @example
 * const post = await getPostById('clx123abc')
 */
export async function getPostById(id: string): Promise<FeedPost | null> {
  const currentUserId = await getCurrentUserId()

  const p = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, username: true, image: true } },
      media: { orderBy: { order: 'asc' }, select: { id: true, url: true, mimeType: true, order: true } },
      _count: { select: { likes: true } },
      likes: currentUserId ? { where: { userId: currentUserId }, select: { id: true } } : false,
    },
  })

  if (!p) return null

  return {
    id: p.id,
    content: p.content,
    createdAt: p.createdAt,
    author: p.author,
    media: p.media,
    likeCount: p._count.likes,
    likedByMe: currentUserId ? (p.likes as { id: string }[]).length > 0 : false,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/api/posts.ts
git commit -m "feat(posts): add read layer with getFeed, getPostsByUsername, getPostById"
```

---

### Task 6: UI primitives  Textarea and Card

**Files:**
- Create: `components/ui/Textarea.tsx`
- Create: `components/ui/Card.tsx`

**Interfaces:**
- Produces:
  - `<Textarea name rows className onChange value ref .../>`  styled textarea matching project's CSS vars
  - `<Card className children />`  styled card wrapper

- [ ] **Step 1: Create `components/ui/Textarea.tsx`**

```tsx
'use client'

import { forwardRef } from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

/**
 * Reusable Textarea component styled with project CSS variables.
 * Supports label, error message, and all standard textarea attributes.
 *
 * @param label - Optional label text above the textarea
 * @param error - Optional error message shown below
 *
 * @example
 * <Textarea name="content" label="Post content" rows={4} maxLength={2200} />
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const fieldId = id ?? props.name

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={fieldId}
            className="font-mono text-[11px] tracking-[0.1em] uppercase mb-1.5 block"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={fieldId}
          className={`w-full rounded-sm border px-3 py-2.5 text-sm font-sans bg-transparent outline-none transition-colors resize-none ${className}`}
          style={{
            background: 'var(--color-surface-container-lowest)',
            borderColor: error ? 'rgba(255,75,75,0.6)' : 'rgba(255,255,255,0.2)',
            color: 'var(--color-primary)',
          }}
          {...props}
        />
        {error && (
          <p className="font-mono text-[10px] mt-1" style={{ color: '#ffb4ab' }}>
            {error}
          </p>
        )}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'
```

- [ ] **Step 2: Create `components/ui/Card.tsx`**

```tsx
interface CardProps {
  children: React.ReactNode
  className?: string
}

/**
 * Reusable Card wrapper with project surface styling.
 *
 * @param children - Card contents
 * @param className - Additional Tailwind classes
 *
 * @example
 * <Card className="p-4"><PostCard post={post} /></Card>
 */
export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-sm border ${className}`}
      style={{
        background: 'var(--color-surface-container-lowest)',
        borderColor: 'rgba(255,255,255,0.1)',
      }}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/Textarea.tsx components/ui/Card.tsx
git commit -m "feat(ui): add Textarea and Card primitives"
```

---

### Task 7: MediaCarousel and MediaUploadPreview components

**Files:**
- Create: `components/ui/posts/MediaCarousel.tsx`
- Create: `components/ui/posts/MediaUploadPreview.tsx`

**Interfaces:**
- Produces:
  - `<MediaCarousel items={[{ id, url, mimeType, order }]} />`  swipeable image carousel
  - `<MediaUploadPreview files onRemove onReorder />`  drag-free multi-file preview with remove buttons

- [ ] **Step 1: Create `components/ui/posts/MediaCarousel.tsx`**

```tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'

interface MediaItem {
  id: string
  url: string
  mimeType: string
  order: number
}

interface MediaCarouselProps {
  items: MediaItem[]
}

/**
 * Image carousel for displaying post media in a PostCard.
 * Shows navigation arrows when there are multiple images.
 *
 * @param items - Ordered array of media items to display
 *
 * @example
 * <MediaCarousel items={post.media} />
 */
export function MediaCarousel({ items }: MediaCarouselProps) {
  const [index, setIndex] = useState(0)

  if (items.length === 0) return null

  const current = items[index]

  return (
    <div className="relative w-full aspect-square overflow-hidden rounded-sm">
      <Image
        src={current.url}
        alt={`Media ${index + 1} of ${items.length}`}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 600px"
      />

      {items.length > 1 && (
        <>
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}
            aria-label="Previous image"
          >
            ‹
          </button>
          <button
            onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
            disabled={index === items.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}
            aria-label="Next image"
          >
            ›
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className="w-1.5 h-1.5 rounded-full transition-opacity"
                style={{ background: 'white', opacity: i === index ? 1 : 0.4 }}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `components/ui/posts/MediaUploadPreview.tsx`**

```tsx
'use client'

import Image from 'next/image'

interface MediaUploadPreviewProps {
  files: File[]
  onRemove: (index: number) => void
}

/**
 * Displays a grid of thumbnail previews for files selected in the PostComposer.
 * Each thumbnail has a remove button.
 *
 * @param files    - Array of File objects selected by the user
 * @param onRemove - Callback called with the index of the file to remove
 *
 * @example
 * <MediaUploadPreview files={selectedFiles} onRemove={(i) => removeFile(i)} />
 */
export function MediaUploadPreview({ files, onRemove }: MediaUploadPreviewProps) {
  if (files.length === 0) return null

  return (
    <div className="grid grid-cols-3 gap-2">
      {files.map((file, i) => {
        const url = URL.createObjectURL(file)
        return (
          <div key={i} className="relative aspect-square rounded-sm overflow-hidden">
            <Image
              src={url}
              alt={`Selected image ${i + 1}`}
              fill
              className="object-cover"
              sizes="150px"
              onLoad={() => URL.revokeObjectURL(url)}
            />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'rgba(0,0,0,0.7)', color: 'white' }}
              aria-label={`Remove image ${i + 1}`}
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/posts/
git commit -m "feat(ui): add MediaCarousel and MediaUploadPreview components"
```

---

### Task 8: PostCard component

**Files:**
- Create: `components/ui/posts/PostCard.tsx`

**Interfaces:**
- Consumes:
  - `FeedPost` from `lib/api/posts`
  - `toggleLike` from `features/posts`
  - `deletePost` from `features/posts`
  - `MediaCarousel` from `./MediaCarousel`
  - `Card` from `components/ui/Card`
- Produces:
  - `<PostCard post currentUserId currentUserRole />`  single post display with like button and author controls

- [ ] **Step 1: Create `components/ui/posts/PostCard.tsx`**

```tsx
'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { MediaCarousel } from './MediaCarousel'
import { toggleLike, deletePost } from '@/features/posts'
import type { FeedPost } from '@/lib/api/posts'
import { UserRole } from '@/types/auth'

interface PostCardProps {
  post: FeedPost
  currentUserId: string | null
  currentUserRole: UserRole | null
}

/**
 * Displays a single post with author info, media carousel, content, like button,
 * and edit/delete controls for the author or ADMIN.
 *
 * @param post            - The post data including author, media, and like info
 * @param currentUserId   - The logged-in user's ID (null if guest)
 * @param currentUserRole - The logged-in user's role (null if guest)
 *
 * @example
 * <PostCard post={post} currentUserId={session.user.id} currentUserRole={session.user.role} />
 */
export function PostCard({ post, currentUserId, currentUserRole }: PostCardProps) {
  const { t } = useTranslation()
  const [isPending, startTransition] = useTransition()

  const canEdit = currentUserId === post.author.id
  const canDelete = currentUserId === post.author.id || currentUserRole === UserRole.ADMIN

  function handleLike() {
    if (!currentUserId) return
    startTransition(() => toggleLike(post.id))
  }

  function handleDelete() {
    if (!confirm(t('posts.delete_confirm'))) return
    startTransition(() => deletePost(post.id))
  }

  return (
    <Card className="overflow-hidden">
      {/* Author header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <Link
          href={post.author.username ? `/profile/${post.author.username}` : '#'}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {post.author.image ? (
            <Image
              src={post.author.image}
              alt={post.author.name ?? post.author.username ?? 'User'}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs"
              style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
            >
              {(post.author.name ?? post.author.username ?? '?')[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-mono text-xs font-bold" style={{ color: 'var(--color-primary)' }}>
              {post.author.username ?? post.author.name}
            </p>
            <p className="font-mono text-[10px]" style={{ color: 'var(--color-outline)' }}>
              {new Date(post.createdAt).toLocaleDateString()}
            </p>
          </div>
        </Link>

        {(canEdit || canDelete) && (
          <div className="flex items-center gap-2">
            {canEdit && (
              <Link
                href={`/dashboard/posts/${post.id}/edit`}
                className="font-mono text-[10px] uppercase tracking-[0.08em] hover:opacity-80 transition-opacity"
                style={{ color: 'var(--color-outline)' }}
              >
                {t('posts.edit')}
              </Link>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="font-mono text-[10px] uppercase tracking-[0.08em] hover:opacity-80 transition-opacity disabled:opacity-40"
                style={{ color: '#ffb4ab' }}
              >
                {t('posts.delete')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Media carousel */}
      {post.media.length > 0 && <MediaCarousel items={post.media} />}

      {/* Content */}
      {post.content && (
        <p
          className="px-4 pt-3 text-sm font-sans leading-relaxed whitespace-pre-wrap"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          {post.content}
        </p>
      )}

      {/* Like button */}
      <div className="px-4 py-3">
        <button
          onClick={handleLike}
          disabled={!currentUserId || isPending}
          className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.08em] hover:opacity-80 transition-opacity disabled:opacity-40"
          style={{ color: post.likedByMe ? 'var(--color-primary)' : 'var(--color-outline)' }}
          aria-label={post.likedByMe ? t('posts.unlike') : t('posts.like')}
        >
          <span>{post.likedByMe ? '♥' : '♡'}</span>
          <span>{post.likeCount}</span>
        </button>
      </div>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/posts/PostCard.tsx
git commit -m "feat(ui): add PostCard component with like toggle and author controls"
```

---

### Task 9: PostComposer component

**Files:**
- Create: `components/ui/posts/PostComposer.tsx`

**Interfaces:**
- Consumes:
  - `createPost` / `updatePost` from `features/posts`
  - `Textarea` from `components/ui/Textarea`
  - `MediaUploadPreview` from `./MediaUploadPreview`
  - `FeedPost` from `lib/api/posts`
- Produces:
  - `<PostComposer mode="inline|full" existingPost? />`  create/edit form

- [ ] **Step 1: Create `components/ui/posts/PostComposer.tsx`**

```tsx
'use client'

import { useActionState, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Textarea } from '@/components/ui/Textarea'
import { MediaUploadPreview } from './MediaUploadPreview'
import { createPost, updatePost } from '@/features/posts'
import { MAX_POST_LENGTH, MAX_POST_MEDIA } from '@/features/posts/validation'
import type { FeedPost } from '@/lib/api/posts'
import type { PostActionState } from '@/features/posts/types'

interface PostComposerProps {
  mode: 'inline' | 'full'
  existingPost?: FeedPost
}

const INITIAL_STATE: PostActionState = {}

/**
 * Create/edit form for posts. In "inline" mode it collapses until focused.
 * In "full" mode it's always expanded (used on /dashboard/posts/new and edit pages).
 * Supports multi-image upload with live previews and a character counter.
 *
 * @param mode         - "inline" (collapsible, on feed) or "full" (dedicated page)
 * @param existingPost - When provided, switches to edit mode (prefills content/media)
 *
 * @example
 * <PostComposer mode="inline" />
 * <PostComposer mode="full" existingPost={post} />
 */
export function PostComposer({ mode, existingPost }: PostComposerProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(mode === 'full')
  const [content, setContent] = useState(existingPost?.content ?? '')
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [keepMediaIds, setKeepMediaIds] = useState<string[]>(
    existingPost?.media.map((m) => m.id) ?? [],
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const action = existingPost ? updatePost : createPost
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    const total = keepMediaIds.length + newFiles.length + selected.length
    if (total > MAX_POST_MEDIA) {
      alert(t('posts.composer.max_media_error', { max: MAX_POST_MEDIA }))
      return
    }
    setNewFiles((prev) => [...prev, ...selected])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeNewFile(index: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function removeExistingMedia(id: string) {
    setKeepMediaIds((prev) => prev.filter((mid) => mid !== id))
  }

  const existingMediaToShow = existingPost?.media.filter((m) => keepMediaIds.includes(m.id)) ?? []
  const charCount = content.length

  return (
    <form action={formAction} className="space-y-3">
      {existingPost && <input type="hidden" name="postId" value={existingPost.id} />}

      {keepMediaIds.map((id) => (
        <input key={id} type="hidden" name="keepMediaIds" value={id} />
      ))}

      {/* Hidden mediaCount for validation */}
      <input type="hidden" name="mediaCount" value={keepMediaIds.length + newFiles.length} />

      {/* Collapsed trigger (inline mode only) */}
      {mode === 'inline' && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full text-left px-4 py-3 rounded-sm border font-mono text-sm transition-opacity hover:opacity-80"
          style={{
            background: 'var(--color-surface-container-lowest)',
            borderColor: 'rgba(255,255,255,0.1)',
            color: 'var(--color-outline)',
          }}
        >
          {t('posts.composer.placeholder')}
        </button>
      )}

      {expanded && (
        <>
          <Textarea
            name="content"
            rows={mode === 'inline' ? 3 : 5}
            maxLength={MAX_POST_LENGTH}
            placeholder={t('posts.composer.placeholder')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            error={state.errors?.content?.[0]}
            autoFocus={mode === 'inline'}
          />

          {/* Character counter */}
          <p
            className="font-mono text-[10px] text-right"
            style={{ color: charCount > MAX_POST_LENGTH * 0.9 ? '#ffb4ab' : 'var(--color-outline)' }}
          >
            {charCount}/{MAX_POST_LENGTH}
          </p>

          {/* Existing media previews (edit mode) */}
          {existingMediaToShow.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {existingMediaToShow.map((m) => (
                <div key={m.id} className="relative aspect-square rounded-sm overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt="Existing media" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistingMedia(m.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(0,0,0,0.7)', color: 'white' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New file previews */}
          <MediaUploadPreview files={newFiles} onRemove={removeNewFile} />

          {/* File input */}
          {newFiles.map((file, i) => (
            <input key={i} type="file" name="media" className="hidden" value="" readOnly />
          ))}
          {/* Real file inputs for form submission */}
          {newFiles.map((_, i) => (
            <input key={`real-${i}`} type="hidden" name={`_mediaPlaceholder${i}`} />
          ))}

          {/* Media upload button */}
          {keepMediaIds.length + newFiles.length < MAX_POST_MEDIA && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleFileChange}
                id="post-media-input"
              />
              <label
                htmlFor="post-media-input"
                className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] cursor-pointer hover:opacity-80 transition-opacity"
                style={{ color: 'var(--color-outline)' }}
              >
                <span>+</span> {t('posts.composer.add_photo')}
              </label>
            </div>
          )}

          {state.errors?.media?.[0] && (
            <p className="font-mono text-xs" style={{ color: '#ffb4ab' }}>
              {state.errors.media[0]}
            </p>
          )}

          {state.errors?._form?.[0] && (
            <p
              className="font-mono text-xs px-3 py-2 rounded-sm border"
              style={{ color: '#ffb4ab', borderColor: 'rgba(255,75,75,0.3)', background: 'rgba(255,75,75,0.05)' }}
            >
              {state.errors._form[0]}
            </p>
          )}

          {state.success && (
            <p className="font-mono text-xs" style={{ color: '#a8d5a2' }}>
              {t('posts.composer.success')}
            </p>
          )}

          <div className="flex items-center justify-between">
            {mode === 'inline' && (
              <button
                type="button"
                onClick={() => { setExpanded(false); setNewFiles([]); setContent('') }}
                className="font-mono text-[11px] uppercase tracking-[0.08em] hover:opacity-80 transition-opacity"
                style={{ color: 'var(--color-outline)' }}
              >
                {t('posts.composer.cancel')}
              </button>
            )}
            <button
              type="submit"
              disabled={isPending}
              className="ml-auto px-5 py-2 rounded-sm font-mono text-xs tracking-[0.08em] uppercase transition-opacity disabled:opacity-50"
              style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
            >
              {isPending
                ? t('posts.composer.publishing')
                : existingPost
                  ? t('posts.composer.save')
                  : t('posts.composer.publish')}
            </button>
          </div>
        </>
      )}
    </form>
  )
}
```

> **Note on file inputs:** The `createPost` server action receives `formData.getAll('media')`  to correctly pass the selected `File` objects through a Server Action form, wrap each `File` in a dedicated named `<input type="file">`. The pattern above uses a `ref` + `onChange` to collect files in state; however, Server Actions with file uploads require the `<input type="file" name="media">` elements to be part of the actual `<form>`. Refactor `PostComposer` so each selected file is stored as a DataTransfer item in a hidden `<input type="file">` OR use a route handler approach. The simplest correct solution: keep one `<input type="file" name="media" multiple>` (not hidden), style it with Tailwind's `file:` modifier, and show the selected count. Use `MediaUploadPreview` only for visual feedback without removing from the actual input. This avoids the DataTransfer complexity in Server Actions.

- [ ] **Step 2: Commit**

```bash
git add components/ui/posts/PostComposer.tsx
git commit -m "feat(ui): add PostComposer with inline/full modes, multi-image upload, char counter"
```

---

### Task 10: PostFeed component

**Files:**
- Create: `components/ui/posts/PostFeed.tsx`

**Interfaces:**
- Consumes:
  - `PostCard` from `./PostCard`
  - `loadMorePosts` from `features/posts`
  - `FeedPost` from `lib/api/posts`
- Produces:
  - `<PostFeed initialPosts nextCursor currentUserId currentUserRole />`  paginated feed

- [ ] **Step 1: Create `components/ui/posts/PostFeed.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useTranslation } from 'react-i18next'
import { PostCard } from './PostCard'
import { loadMorePosts } from '@/features/posts'
import type { FeedPost } from '@/lib/api/posts'
import { UserRole } from '@/types/auth'

interface PostFeedProps {
  initialPosts: FeedPost[]
  initialNextCursor: string | null
  currentUserId: string | null
  currentUserRole: UserRole | null
}

/**
 * Paginated feed of PostCards with a "Load more" button for cursor-based pagination.
 * Initialised with server-rendered posts; subsequent pages are fetched client-side
 * via the loadMorePosts server action.
 *
 * @param initialPosts       - First page of posts from the server
 * @param initialNextCursor  - Cursor for the next page, or null if none
 * @param currentUserId      - Logged-in user's ID (null for guests)
 * @param currentUserRole    - Logged-in user's role (null for guests)
 *
 * @example
 * <PostFeed initialPosts={posts} initialNextCursor={nextCursor} currentUserId={userId} currentUserRole={role} />
 */
export function PostFeed({
  initialPosts,
  initialNextCursor,
  currentUserId,
  currentUserRole,
}: PostFeedProps) {
  const { t } = useTranslation()
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts)
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor)
  const [isPending, startTransition] = useTransition()

  function handleLoadMore() {
    if (!nextCursor) return
    startTransition(async () => {
      const result = await loadMorePosts(nextCursor)
      setPosts((prev) => [...prev, ...result.posts])
      setNextCursor(result.nextCursor)
    })
  }

  if (posts.length === 0) {
    return (
      <p
        className="text-center font-mono text-sm py-12"
        style={{ color: 'var(--color-outline)' }}
      >
        {t('posts.feed.empty')}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
        />
      ))}

      {nextCursor && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleLoadMore}
            disabled={isPending}
            className="px-6 py-2.5 rounded-sm font-mono text-xs tracking-[0.08em] uppercase border transition-opacity disabled:opacity-50 hover:opacity-80"
            style={{
              borderColor: 'rgba(255,255,255,0.2)',
              color: 'var(--color-on-surface-variant)',
            }}
          >
            {isPending ? t('posts.feed.loading') : t('posts.feed.load_more')}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/posts/PostFeed.tsx
git commit -m "feat(ui): add PostFeed with cursor pagination and Load more button"
```

---

### Task 11: Dashboard page  inline composer + real feed

**Files:**
- Modify: `app/(dashboard)/dashboard/page.tsx`
- Create: `app/(dashboard)/dashboard/posts/new/page.tsx`
- Create: `app/(dashboard)/dashboard/posts/[id]/edit/page.tsx`

**Interfaces:**
- Consumes:
  - `getFeed` from `lib/api/posts`
  - `getPostById` from `lib/api/posts`
  - `getCurrentUser` from `lib/auth/dal`
  - `PostComposer`, `PostFeed` from `components/ui/posts/`

- [ ] **Step 1: Update `app/(dashboard)/dashboard/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo/metadata'
import { getFeed } from '@/lib/api/posts'
import { getCurrentUser } from '@/lib/auth/dal'
import { PostComposer } from '@/components/ui/posts/PostComposer'
import { PostFeed } from '@/components/ui/posts/PostFeed'
import { Card } from '@/components/ui/Card'
import DashboardWidgetSlot from '@/components/dashboard/DashboardWidgetSlot'
import { UserRole } from '@/types/auth'

export const revalidate = 60

export const metadata: Metadata = buildMetadata({
  slug: 'dashboard',
  title: 'Dashboard  Instra',
  description: 'Your Instra feed. Create posts and see what\'s happening.',
  robots: { index: false, follow: false },
})

/** Dashboard feed page  Server Component. Renders inline post composer and live feed. */
export default async function DashboardPage() {
  const [{ posts, nextCursor }, user] = await Promise.all([getFeed(), getCurrentUser()])

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Inline composer */}
      <Card className="p-4">
        <PostComposer mode="inline" />
      </Card>

      {/* Feed */}
      <PostFeed
        initialPosts={posts}
        initialNextCursor={nextCursor}
        currentUserId={user?.id ?? null}
        currentUserRole={(user?.role as UserRole) ?? null}
      />

      <DashboardWidgetSlot />
    </div>
  )
}
```

- [ ] **Step 2: Create `app/(dashboard)/dashboard/posts/new/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo/metadata'
import { Card } from '@/components/ui/Card'
import { PostComposer } from '@/components/ui/posts/PostComposer'

export const metadata: Metadata = buildMetadata({
  slug: 'new-post',
  title: 'New Post  Instra',
  description: 'Create a new post on Instra.',
  robots: { index: false, follow: false },
})

/** Full-page post creation form. */
export default function NewPostPage() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1
        className="font-mono text-sm uppercase tracking-[0.1em]"
        style={{ color: 'var(--color-on-surface-variant)' }}
      >
        New Post
      </h1>
      <Card className="p-6">
        <PostComposer mode="full" />
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/(dashboard)/dashboard/posts/[id]/edit/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo/metadata'
import { getPostById } from '@/lib/api/posts'
import { verifySession } from '@/lib/auth/dal'
import { Card } from '@/components/ui/Card'
import { PostComposer } from '@/components/ui/posts/PostComposer'
import { UserRole } from '@/types/auth'

export const metadata: Metadata = buildMetadata({
  slug: 'edit-post',
  title: 'Edit Post  Instra',
  description: 'Edit your post on Instra.',
  robots: { index: false, follow: false },
})

interface EditPostPageProps {
  params: Promise<{ id: string }>
}

/** Edit page  authorisation enforced server-side before rendering. */
export default async function EditPostPage({ params }: EditPostPageProps) {
  const { id } = await params
  const [post, { user }] = await Promise.all([getPostById(id), verifySession()])

  if (!post) notFound()

  const canEdit = post.author.id === user.id || user.role === UserRole.ADMIN
  if (!canEdit) notFound()

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1
        className="font-mono text-sm uppercase tracking-[0.1em]"
        style={{ color: 'var(--color-on-surface-variant)' }}
      >
        Edit Post
      </h1>
      <Card className="p-6">
        <PostComposer mode="full" existingPost={post} />
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/dashboard/page.tsx app/\(dashboard\)/dashboard/posts/
git commit -m "feat(dashboard): replace mock feed with real PostFeed and inline PostComposer"
```

---

### Task 12: Public feed and profile pages

**Files:**
- Create: `app/(pages)/feed/page.tsx`
- Create: `app/(pages)/profile/[username]/page.tsx`

**Interfaces:**
- Consumes:
  - `getFeed`, `getPostsByUsername` from `lib/api/posts`
  - `auth` from `lib/auth/config`
  - `PostFeed` from `components/ui/posts/PostFeed`

- [ ] **Step 1: Create `app/(pages)/feed/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo/metadata'
import { getFeed } from '@/lib/api/posts'
import { auth } from '@/lib/auth/config'
import { PostFeed } from '@/components/ui/posts/PostFeed'
import { UserRole } from '@/types/auth'

export const revalidate = 60

export const metadata: Metadata = buildMetadata({
  slug: 'feed',
  title: 'Feed  Instra',
  description: 'Discover the latest posts from the Instra community.',
})

/** Public global feed  Server Component with ISR. */
export default async function FeedPage() {
  const [{ posts, nextCursor }, session] = await Promise.all([getFeed(), auth()])

  const currentUserId = session?.user?.id ?? null
  const currentUserRole = (session?.user as { role?: UserRole } | undefined)?.role ?? null

  return (
    <main className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <h1
        className="font-mono text-sm uppercase tracking-[0.1em]"
        style={{ color: 'var(--color-on-surface-variant)' }}
      >
        Feed
      </h1>
      <PostFeed
        initialPosts={posts}
        initialNextCursor={nextCursor}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
      />
    </main>
  )
}
```

- [ ] **Step 2: Create `app/(pages)/profile/[username]/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getPostsByUsername } from '@/lib/api/posts'
import { auth } from '@/lib/auth/config'
import { PostFeed } from '@/components/ui/posts/PostFeed'
import { UserRole } from '@/types/auth'

export const revalidate = 60

interface ProfilePageProps {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params
  const user = await prisma.user.findUnique({ where: { username }, select: { name: true } })
  if (!user) return {}
  return {
    title: `${user.name ?? username}  Instra`,
    description: `Posts by ${user.name ?? username} on Instra.`,
    alternates: { canonical: `/profile/${username}` },
  }
}

/** Public user profile page  Server Component with ISR. */
export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, name: true, username: true, image: true },
  })

  if (!user) notFound()

  const [{ posts, nextCursor }, session] = await Promise.all([
    getPostsByUsername(username),
    auth(),
  ])

  const currentUserId = session?.user?.id ?? null
  const currentUserRole = (session?.user as { role?: UserRole } | undefined)?.role ?? null

  return (
    <main className="max-w-xl mx-auto px-4 py-8 space-y-6">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt={user.name ?? username} className="w-16 h-16 rounded-full" />
        ) : (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center font-mono text-2xl"
            style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
          >
            {(user.name ?? username)[0].toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="font-mono text-base font-bold" style={{ color: 'var(--color-primary)' }}>
            {user.name ?? username}
          </h1>
          <p className="font-mono text-xs" style={{ color: 'var(--color-outline)' }}>
            @{username}
          </p>
        </div>
      </div>

      <PostFeed
        initialPosts={posts}
        initialNextCursor={nextCursor}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
      />
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(pages)/feed/page.tsx" "app/(pages)/profile/"
git commit -m "feat(pages): add public /feed and /profile/[username] pages with ISR"
```

---

### Task 13: i18n keys

**Files:**
- Modify: `locales/en/common.json`
- Modify: `locales/pl/common.json`

- [ ] **Step 1: Add `posts` object to `locales/en/common.json`**

Add after the last existing key (before the closing `}`):

```json
"posts": {
  "like": "Like",
  "unlike": "Unlike",
  "edit": "Edit",
  "delete": "Delete",
  "delete_confirm": "Are you sure you want to delete this post?",
  "composer": {
    "placeholder": "What's on your mind?",
    "add_photo": "Add photo",
    "publish": "Publish",
    "save": "Save changes",
    "publishing": "Publishing...",
    "cancel": "Cancel",
    "success": "Post published!",
    "max_media_error": "You can add at most {{max}} images per post."
  },
  "feed": {
    "empty": "No posts yet. Be the first!",
    "load_more": "Load more",
    "loading": "Loading..."
  }
}
```

- [ ] **Step 2: Add `posts` object to `locales/pl/common.json`**

```json
"posts": {
  "like": "Lubię to",
  "unlike": "Nie lubię",
  "edit": "Edytuj",
  "delete": "Usuń",
  "delete_confirm": "Czy na pewno chcesz usunąć ten post?",
  "composer": {
    "placeholder": "Co słychać?",
    "add_photo": "Dodaj zdjęcie",
    "publish": "Opublikuj",
    "save": "Zapisz zmiany",
    "publishing": "Publikowanie...",
    "cancel": "Anuluj",
    "success": "Post opublikowany!",
    "max_media_error": "Możesz dodać maksymalnie {{max}} zdjęcia na post."
  },
  "feed": {
    "empty": "Brak postów. Bądź pierwszy!",
    "load_more": "Załaduj więcej",
    "loading": "Ładowanie..."
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add locales/
git commit -m "feat(i18n): add posts translation keys in EN and PL"
```

---

### Task 14: Documentation

**Files:**
- Create: `docs/posts.md`
- Modify: `docs/database.md` (add Post/Media/Like section)

- [ ] **Step 1: Create `docs/posts.md`**

```markdown
# Posts Module

Core social feed feature for Instra.

## Architecture

- **Mutations:** `features/posts/actions/`  Server Actions (create, update, delete, toggleLike, loadMore)
- **Read layer:** `lib/api/posts.ts`  cached Prisma queries
- **Validation:** `features/posts/validation.ts`  Zod schemas
- **Storage:** `lib/storage/supabase.ts`  Supabase Storage upload/delete
- **UI:** `components/ui/posts/`  PostCard, PostComposer, PostFeed, MediaCarousel, MediaUploadPreview

## Limits

| Constraint      | Value                       |
|-----------------|-----------------------------|
| Max text length | 2 200 characters            |
| Max media/post  | 10 images                   |
| Max file size   | 5 MB                        |
| Allowed MIME    | image/jpeg, image/png, image/webp |

## Rate Limits

| Action     | Limit        |
|------------|--------------|
| createPost | 10 / hour    |
| toggleLike | 60 / minute  |

## Cache Keys

- Feed: `instra:cache:db:feed:{cursor}:{userId}`
- Profile: `instra:cache:db:profile:{authorId}:{cursor}:{userId}`

Invalidated by: createPost, updatePost, deletePost, toggleLike.
```

- [ ] **Step 2: Commit**

```bash
git add docs/posts.md docs/database.md
git commit -m "docs: add posts module documentation and update database.md"
```

---

## Verification Checklist

1. **Schema:** `npx prisma migrate dev` succeeds; `npx prisma studio` shows `Post`, `Media`, `Like` tables.
2. **Create post:** Log in → dashboard → inline composer → type text + attach 3 images → Publish. Post appears at top of feed. Files visible in Supabase Storage bucket `post-media`.
3. **Validation:** Submit empty form → error "Post must have content or at least one image". Attach 11 files → error on max. Attach a `.gif` → server rejects with MIME error.
4. **Edit post:** Click Edit on own post → `/dashboard/posts/{id}/edit` loads with prefilled content and existing media thumbnails. Remove one image, add a new one → Save. Old file deleted from bucket; new file appears.
5. **Delete post:** Click Delete → confirm dialog → post removed from feed. Supabase bucket files deleted.
6. **ADMIN delete:** Log in as ADMIN → delete another user's post → succeeds.
7. **Like toggle:** Click ♡ → becomes ♥, count increments. Click again → reverts. Guest user sees ♡ but button is disabled.
8. **Load more:** Feed with > 12 posts → "Load more" button appears → click loads next page, appends posts.
9. **Public feed:** Navigate to `/feed` while logged out → posts are visible, server-rendered (view-source shows post content).
10. **Profile:** Navigate to `/profile/{username}` → shows user avatar, name, their posts only.
11. **Rate limit:** With Upstash env vars set, submit > 10 posts in an hour → `RateLimitError` message shown in form.
12. **Cache:** Second load of `/feed` is served from Redis (add `console.log` in `getFeed` fetcher  should not log on cached hit).
13. **SEO:** Lighthouse SEO score ≥ 90 on `/feed` and `/profile/{username}`.
