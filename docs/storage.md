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
