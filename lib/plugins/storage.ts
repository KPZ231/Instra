import { createClient } from '@supabase/supabase-js'

const BUCKET = 'plugin-bundles'

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

/**
 * Builds the deterministic storage key for a plugin bundle.
 * @param slug - Plugin slug
 * @param version - Semver version string
 * @example buildBundleKey("my-plugin", "1.0.0") // "plugins/my-plugin/1.0.0/bundle.js"
 */
export function buildBundleKey(slug: string, version: string): string {
  return `plugins/${slug}/${version}/bundle.js`
}

/**
 * Uploads a built plugin bundle to Supabase Storage. Refuses to overwrite an
 * existing version (versions are immutable once uploaded).
 * @param slug - Plugin slug
 * @param version - Semver version string
 * @param code - Bundled JS source
 * @example await uploadBundle("my-plugin", "1.0.0", bundleCode)
 */
export async function uploadBundle(slug: string, version: string, code: string): Promise<string> {
  const key = buildBundleKey(slug, version)
  const { error } = await getSupabaseClient().storage.from(BUCKET).upload(key, code, {
    contentType: 'application/javascript',
    upsert: false,
  })
  if (error) throw error
  return key
}

/**
 * Downloads a plugin bundle's source code as text.
 * @param key - Storage key returned by `uploadBundle`
 * @example const code = await downloadBundle(version.bundleStorageKey)
 */
export async function downloadBundle(key: string): Promise<string> {
  const { data, error } = await getSupabaseClient().storage.from(BUCKET).download(key)
  if (error) throw error
  return await data.text()
}
