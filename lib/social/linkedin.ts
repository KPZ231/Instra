import 'server-only'
import type { SocialPostPayload } from './types'

const REST_BASE = 'https://api.linkedin.com/rest'
/** LinkedIn versioning header  required for all rest/* endpoints since 2024-01 */
const LINKEDIN_VERSION = '202401'

/**
 * Publishes a text (+ optional images) post to LinkedIn on behalf of a member.
 * Uses the current `rest/posts` + `rest/images` API (replaces deprecated ugcPosts/assets).
 * Returns the post URN from the `x-restli-id` response header.
 *
 * @param personUrn   - Member URN e.g. "urn:li:person:abc123"
 * @param accessToken - LinkedIn access token with w_member_social scope
 * @param payload     - Post content and media
 * @returns LinkedIn post URN
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
    'LinkedIn-Version': LINKEDIN_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
  }

  const images = payload.media.filter((m) => m.mimeType.startsWith('image/')).slice(0, 20)

  // Upload images via rest/images initializeUpload flow
  const imageUrns: string[] = await Promise.all(
    images.map(async (img) => {
      // Step 1: Initialize upload  get uploadUrl + image URN
      const initRes = await fetch(`${REST_BASE}/images?action=initializeUpload`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ initializeUploadRequest: { owner: personUrn } }),
      })
      if (!initRes.ok) {
        const err = (await initRes.json()) as { message?: string }
        throw new Error(err.message ?? `LinkedIn initializeUpload failed ${initRes.status}`)
      }
      const initData = (await initRes.json()) as { value: { uploadUrl: string; image: string } }
      const { uploadUrl, image: imageUrn } = initData.value

      // Step 2: Fetch bytes from Supabase and PUT to LinkedIn
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

      return imageUrn
    }),
  )

  // Build rest/posts body
  const postBody: Record<string, unknown> = {
    author: personUrn,
    commentary: payload.content ?? '',
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  }

  if (imageUrns.length === 1) {
    postBody.content = { media: { id: imageUrns[0] } }
  } else if (imageUrns.length > 1) {
    postBody.content = { multiImage: { images: imageUrns.map((id) => ({ id })) } }
  }

  const res = await fetch(`${REST_BASE}/posts`, {
    method: 'POST',
    headers,
    body: JSON.stringify(postBody),
  })

  if (!res.ok) {
    const err = (await res.json()) as { message?: string }
    throw new Error(err.message ?? `LinkedIn rest/posts failed ${res.status}`)
  }

  const postUrn = res.headers.get('x-restli-id')
  if (!postUrn) throw new Error('LinkedIn did not return post URN')
  return postUrn
}
