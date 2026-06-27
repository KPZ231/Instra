import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

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
 * Errors are logged but not thrown to avoid cascading failures.
 *
 * @param storagePaths - Array of storage paths (e.g. ["userId/uuid.jpg"])
 * @returns Promise that resolves when deletion is attempted
 *
 * @example
 * await deletePostMedia(['abc123/550e8400-e29b-41d4-a716-446655440000.jpg'])
 */
export async function deletePostMedia(storagePaths: string[]): Promise<void> {
  if (storagePaths.length === 0) return
  const supabase = getSupabase()
  const { error } = await supabase.storage.from(BUCKET).remove(storagePaths)
  if (error) {
    console.error('[storage] deletePostMedia failed:', error.message)
  }
}
