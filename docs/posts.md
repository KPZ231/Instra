# Posts Module

Core social feed feature for Instra. Users can create, edit, and delete posts with optional image carousels, like/unlike posts, and browse feeds with cursor-based pagination.

## Architecture

The posts system is distributed across multiple layers:

- **Mutations:** `features/posts/actions/`  Server Actions (createPost, updatePost, deletePost, toggleLike, loadMorePosts)
- **Read layer:** `lib/api/posts.ts`  cached Prisma queries with Redis integration
- **Validation:** `features/posts/validation.ts`  Zod schemas for input validation
- **Storage:** `lib/storage/supabase.ts`  Supabase Storage for image upload/delete
- **UI components:** `components/ui/posts/`  PostCard, PostComposer, PostFeed, MediaCarousel, MediaUploadPreview
- **Database:** `prisma/schema.prisma`  Post, Media, Like models with relations to User

## Constraints & Limits

| Constraint      | Value                            |
|-----------------|----------------------------------|
| Max text length | 2,200 characters                 |
| Max media/post  | 10 images                        |
| Max file size   | 5 MB per image                   |
| Allowed MIME    | `image/jpeg`, `image/png`, `image/webp` |
| Post content    | Must have text OR at least 1 image |

## Rate Limits

Rate limiting is configured in `lib/rate-limit/config.ts`:

| Action     | Limit       | Window |
|------------|-------------|--------|
| createPost | 10          | 1 hour |
| toggleLike | 60          | 1 minute |

## Cache Strategy

Reads use Redis caching via `lib/cache` with namespace `instra:cache:db:*`. Invalidation happens after all mutations.

### Cache Keys

- **Feed:** `instra:cache:db:feed:{cursor}:{userId}`
  - Cached for 300 seconds (db preset)
  - Used by `getFeed()` for paginated global feed
  - Invalidated by: createPost, updatePost, deletePost, toggleLike

- **Profile:** `instra:cache:db:profile:{authorId}:{cursor}:{userId}`
  - Cached for 300 seconds
  - Used by `getPostsByUsername()` for user-specific feed
  - Invalidated by: createPost, updatePost, deletePost, toggleLike

## Server Actions

All server actions follow the pattern: **session verification → rate limit check → Zod validation → Prisma operation → cache invalidation → path revalidation**.

### createPost

```ts
async function createPost(state: PostActionState, formData: FormData): Promise<PostActionState>
```

- **Auth:** Required
- **Rate limit:** `createPost` preset (10/hour)
- **Inputs:** `content` (optional), `media[]` (File array, optional)
- **Behavior:** Uploads files to Supabase Storage, creates Post + Media records, invalidates feed/profile caches, revalidates `/dashboard` and `/feed`
- **Errors:** Returns field-level errors (content, media, _form) in PostActionState

### updatePost

```ts
async function updatePost(state: PostActionState, formData: FormData): Promise<PostActionState>
```

- **Auth:** Required (author or ADMIN only)
- **Inputs:** `postId`, `content` (optional), `media[]` (new files), `keepMediaIds[]` (existing media to retain)
- **Behavior:** Uploads new files, deletes removed media from storage, updates Post.content, invalidates caches
- **Errors:** 404 if post missing, 403 if unauthorized, validation errors in PostActionState

### deletePost

```ts
async function deletePost(postId: string): Promise<void>
```

- **Auth:** Required (author or ADMIN only)
- **Behavior:** Deletes post and all associated media from storage and DB, invalidates caches, revalidates paths
- **Errors:** Throws if post not found or user unauthorized

### toggleLike

```ts
async function toggleLike(postId: string): Promise<void>
```

- **Auth:** Required
- **Rate limit:** `toggleLike` preset (60/minute, silent failure)
- **Behavior:** Creates Like record if absent, deletes if present, invalidates feed/profile caches
- **Errors:** Silent on rate limit; throws on DB errors

### loadMorePosts

```ts
async function loadMorePosts(cursor: string): Promise<{ posts: FeedPost[]; nextCursor: string | null }>
```

- **Behavior:** Server Action wrapper around `getFeed()` for client-side pagination
- **Usage:** Called from PostFeed "Load more" button to fetch next page using cursor

## Read Layer (`lib/api/posts.ts`)

All read functions use `getOrSet()` from `lib/cache` for Redis integration.

### getFeed

```ts
async function getFeed(cursor?: string): Promise<{ posts: FeedPost[]; nextCursor: string | null }>
```

- **Returns:** Paginated global feed (12 posts per page), ordered newest first
- **Cursor:** Pagination cursor from previous page, or undefined for first page
- **Cache:** 300s, keyed on cursor + userId
- **Visibility:** All posts visible to all users (including guests)

### getPostsByUsername

```ts
async function getPostsByUsername(username: string, cursor?: string): Promise<{ posts: FeedPost[]; nextCursor: string | null }>
```

- **Returns:** User-specific feed (12 posts per page)
- **Cache:** 300s, keyed on userId + cursor + viewer's userId
- **Visibility:** All posts by user visible to all users
- **Auth:** Not required; guest users can view all profiles

### getPostById

```ts
async function getPostById(id: string): Promise<FeedPost | null>
```

- **Returns:** Single post by ID, or null if not found
- **Cache:** None (uncached; used for edit pages where fresh data is critical)
- **Auth:** Not required; guest users can view posts

### FeedPost Type

```ts
type FeedPost = {
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
```

## UI Components

Located in `components/ui/posts/` and `components/ui/`.

### PostComposer

**Props:**
- `mode: 'inline' | 'full'`  collapsible (on feed) or always-visible (dedicated page)
- `existingPost?: FeedPost`  when provided, switches to edit mode with prefilled content

**Behavior:**
- Inline mode: collapses to a clickable placeholder until focused
- Full mode: always expanded
- Multi-file upload with live previews and remove buttons
- Character counter (red at 90%+)
- Form submission via useActionState (createPost or updatePost)

### PostCard

**Props:**
- `post: FeedPost`
- `currentUserId: string | null`
- `currentUserRole: UserRole | null`

**Features:**
- Displays author info, avatar, timestamp
- Media carousel (if present)
- Post content with text wrapping
- Like button (♡/♥) with count; disabled for guests
- Edit link (author only)
- Delete button (author or ADMIN)

### PostFeed

**Props:**
- `initialPosts: FeedPost[]`
- `initialNextCursor: string | null`
- `currentUserId: string | null`
- `currentUserRole: UserRole | null`

**Behavior:**
- Renders grid of PostCards
- "Load more" button if nextCursor is not null
- Client-side pagination via loadMorePosts server action
- Appends new posts to existing list

### MediaCarousel

**Props:**
- `items: { id, url, mimeType, order }[]`

**Features:**
- Next/previous buttons (disabled at bounds)
- Dot indicators at bottom
- Click dots to jump to specific image
- Swipeable via buttons

### MediaUploadPreview

**Props:**
- `files: File[]`
- `onRemove: (index: number) => void`

**Behavior:**
- Grid of thumbnails (3 columns)
- X button on each thumbnail
- Auto-revokes object URLs on image load

## Validation

**File validation** (performed server-side in `uploadPostMedia`):
- MIME type must be `image/jpeg`, `image/png`, or `image/webp`
- File extension must match MIME (case-insensitive)
- File size must be ≤ 5 MB

**Post validation** (Zod schemas in `features/posts/validation.ts`):
- `CreatePostSchema`: content optional, but content + media combined must not be empty
- `UpdatePostSchema`: same as create, plus postId is required
- `MAX_POST_LENGTH = 2200`
- `MAX_POST_MEDIA = 10`

## Pages

### `/feed` (Public)

- **Route:** `app/(pages)/feed/page.tsx`
- **Auth:** Not required (guests can view)
- **Rendering:** SSG with ISR (revalidate 60s)
- **Content:** Global feed with PostFeed component
- **SEO:** Lighthouse SEO ≥ 90

### `/dashboard` (Authenticated)

- **Route:** `app/(dashboard)/dashboard/page.tsx`
- **Auth:** Required
- **Rendering:** ISR (revalidate 60s)
- **Content:** Inline PostComposer + real feed (same as /feed but from auth user perspective)

### `/dashboard/posts/new` (Authenticated)

- **Route:** `app/(dashboard)/dashboard/posts/new/page.tsx`
- **Auth:** Required
- **Rendering:** ISR (revalidate 60s)
- **Content:** Full PostComposer in create mode

### `/dashboard/posts/[id]/edit` (Authenticated)

- **Route:** `app/(dashboard)/dashboard/posts/[id]/edit/page.tsx`
- **Auth:** Required (author or ADMIN)
- **Rendering:** SSR (no cache)
- **Behavior:** Server-side auth check before rendering; 404 if unauthorized or post missing
- **Content:** Full PostComposer in edit mode with existing post data

### `/profile/[username]` (Public)

- **Route:** `app/(pages)/profile/[username]/page.tsx`
- **Auth:** Not required
- **Rendering:** SSG with ISR (revalidate 60s)
- **Content:** User avatar, name, username, followed by their posts in PostFeed
- **Dynamic:** Supports any username; shows 404 if user not found

## i18n

All UI strings use `t()` from react-i18next. Keys are namespaced under `posts.*` in locales:

```json
{
  "posts": {
    "like": "...",
    "unlike": "...",
    "edit": "...",
    "delete": "...",
    "delete_confirm": "...",
    "composer": { "placeholder": "...", "add_photo": "...", ... },
    "feed": { "empty": "...", "load_more": "...", "loading": "..." }
  }
}
```

Locales: `/locales/en/common.json`, `/locales/pl/common.json`

## Examples

### Create a post (form submission)

```tsx
import { PostComposer } from '@/components/ui/posts/PostComposer'

export default function NewPostPage() {
  return <PostComposer mode="full" />
}
```

### Display a feed

```tsx
import { getFeed } from '@/lib/api/posts'
import { PostFeed } from '@/components/ui/posts/PostFeed'

export default async function FeedPage() {
  const { posts, nextCursor } = await getFeed()
  return <PostFeed initialPosts={posts} initialNextCursor={nextCursor} currentUserId={...} currentUserRole={...} />
}
```

### Like a post (client-side)

```tsx
import { toggleLike } from '@/features/posts'

function LikeButton({ postId, isLiked }) {
  const [, startTransition] = useTransition()
  
  return (
    <button onClick={() => startTransition(() => toggleLike(postId))}>
      {isLiked ? '♥' : '♡'}
    </button>
  )
}
```

## Related Documentation

- `docs/storage.md`  Supabase Storage integration
- `docs/cache.md`  Redis caching layer
- `docs/database.md`  Post, Media, Like models
