# Database Schema

Instra's PostgreSQL database is managed by Prisma ORM. All schema changes go through `prisma/schema.prisma` + migrations (never direct SQL).

## Models Overview

### User
User accounts with auth info, profile, and relationships to posts and likes.

**Fields:**
- `id` (String, PK): Unique user identifier
- `email` (String, unique): Email address
- `name` (String, nullable): Display name
- `username` (String, unique, nullable): URL-friendly username
- `image` (String, nullable): Avatar URL
- `emailVerified` (DateTime, nullable): Verification timestamp
- `password` (String, nullable): Hashed password (bcrypt/Argon2)
- `role` (UserRole enum): ADMIN or USER
- `createdAt` (DateTime): Account creation time
- `updatedAt` (DateTime): Last modification time

**Relations:**
- `posts` → Post[] (one-to-many)
- `likes` → Like[] (one-to-many)
- `reviewedVersions` → PluginVersion[] (plugin review history)

**Indexes:**
- `email` (unique)
- `username` (unique)

---

### Post
Social media posts with optional text content and media attachments.

**Fields:**
- `id` (String, PK): Unique post identifier (CUID)
- `content` (String, nullable): Post text (≤ 2,200 characters)
- `authorId` (String, FK): Post author's user ID
- `createdAt` (DateTime): Post creation timestamp
- `updatedAt` (DateTime): Last edit timestamp

**Relations:**
- `author` → User (many-to-one, required; cascade delete)
- `media` → Media[] (one-to-many; cascade delete)
- `likes` → Like[] (one-to-many; cascade delete)

**Constraints:**
- `content` OR `media.length > 0` is required (enforced in server validation, not DB)
- `authorId` has index for efficient feed queries by user

**Indexes:**
- `authorId` — for filtering posts by author
- `createdAt` — for sorting newest-first

---

### Media
Image files attached to posts, stored in Supabase Storage.

**Fields:**
- `id` (String, PK): Unique media identifier (CUID)
- `postId` (String, FK): Parent post ID
- `url` (String): Public Supabase Storage URL
- `storagePath` (String): Path in Supabase bucket (for deletion)
- `mimeType` (String): MIME type (e.g., "image/jpeg")
- `order` (Int): Carousel order (0-based)
- `createdAt` (DateTime): Upload timestamp

**Relations:**
- `post` → Post (many-to-one, required; cascade delete)

**Constraints:**
- `order` defaults to 0; incremented per media item in post
- Max 10 items per post (enforced in validation)

**Indexes:**
- `postId` — for fetching media by post

---

### Like
User likes on posts (one user per post, deduplicated).

**Fields:**
- `id` (String, PK): Unique like identifier (CUID)
- `postId` (String, FK): Liked post ID
- `userId` (String, FK): User who liked
- `createdAt` (DateTime): Like timestamp

**Relations:**
- `post` → Post (many-to-one, required; cascade delete)
- `user` → User (many-to-one, required; cascade delete)

**Constraints:**
- `(postId, userId)` unique constraint — prevents duplicate likes

**Indexes:**
- `postId` — for fetching like count per post
- `userId` — for fetching user's liked posts

---

### PluginAuditLog
Tracks plugin operations for security and debugging (existing model, unchanged).

---

### PluginVersion
Plugin versioning and review (existing model, unchanged).

---

## Migrations

All schema changes are tracked in `prisma/migrations/`. To apply changes:

```bash
# Create a new migration after modifying schema.prisma
npx prisma migrate dev --name <description>

# In production, review and apply
npx prisma migrate deploy

# View pending migrations
npx prisma migrate status
```

## Accessing Data

All database access is through Prisma ORM:

```ts
import { prisma } from '@/lib/prisma'

// Create a post
const post = await prisma.post.create({
  data: {
    content: "Hello world",
    authorId: userId,
    media: {
      create: [{ url, storagePath, mimeType, order: 0 }]
    }
  },
  include: { author: true, media: true }
})

// Fetch with relations
const posts = await prisma.post.findMany({
  where: { authorId: userId },
  include: { author: true, media: true, _count: { select: { likes: true } } },
  orderBy: { createdAt: 'desc' }
})

// Delete (cascade deletes media + likes)
await prisma.post.delete({ where: { id: postId } })
```

## Caching

- Posts are cached by `lib/api/posts.ts` using Redis (getOrSet pattern, 300s TTL)
- Cache is invalidated after mutations (createPost, updatePost, deletePost, toggleLike)
- See `docs/cache.md` for details

---

### Notification
In-app notifications for users. Created by `createNotification()` in `lib/api/notifications.ts`.

**Fields:**
- `id` (String, PK): Unique notification identifier (CUID)
- `userId` (String, FK): Owner user ID
- `type` (NotificationType enum): Event type (see enum below)
- `title` (String): Short notification heading
- `message` (String, Text): Full notification body
- `link` (String, nullable): Optional deep-link URL for CTA
- `read` (Boolean): Whether the user has read the notification (default: false)
- `readAt` (DateTime, nullable): Timestamp when marked read
- `createdAt` (DateTime): Creation timestamp

**NotificationType enum values:**
- `CAMPAIGN_COMPLETED` — all scheduled runs of a campaign finished
- `CAMPAIGN_FAILED` — a campaign publish-post run failed
- `WEBHOOK_FAILED` — a campaign webhook run failed
- `POST_PUBLISHED` — a social post was successfully published
- `POST_FAILED` — a social post failed to publish
- `SOCIAL_CONNECTED` — a social account was connected via OAuth
- `SOCIAL_DISCONNECTED` — a social account was disconnected

**Relations:**
- `user` → User (many-to-one, required; cascade delete)

**Indexes:**
- `(userId, read)` — for fetching unread count
- `(userId, createdAt)` — for listing newest-first per user

---

### User — new notification fields

Two fields were added to the `User` model:

- `notificationsMuted` (Boolean, default: false) — when `true`, no in-app notifications are written for this user
- `emailNotificationsEnabled` (Boolean, default: true) — when `true`, eligible notification types (campaigns + social) also send an email

---

## Relations Diagram

```
User
  ├─ posts: Post[]
  └─ likes: Like[]

Post
  ├─ author: User (required, cascade delete)
  ├─ media: Media[] (cascade delete)
  └─ likes: Like[] (cascade delete)

Media
  └─ post: Post (required, cascade delete)

Like
  ├─ post: Post (required, cascade delete)
  └─ user: User (required, cascade delete)
```

## Environment Variables

Defined in `.env`:
- `DATABASE_URL` — PostgreSQL connection string (Supabase)

Run `npx prisma db execute` (or `psql` directly) for raw queries (avoid in app code).
