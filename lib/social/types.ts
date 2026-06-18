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
