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
