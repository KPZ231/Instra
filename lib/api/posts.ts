import 'server-only'

import { prisma } from '@/lib/prisma'
import { getOrSet } from '@/lib/cache'
import { auth } from '@/lib/auth/config'

const TAKE = 12

/**
 * A post record shaped for feed display, including author, media, and like state.
 */
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

/**
 * Returns the current user's ID from the session, or null if not authenticated.
 */
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
