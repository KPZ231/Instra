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
