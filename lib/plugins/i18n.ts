import i18n from '@/lib/i18n/config'

/**
 * Registers a plugin's manifest-supplied translations into i18next under a
 * dedicated `plugin:<slug>` namespace, isolated from host translation keys.
 * @param slug - Plugin slug, used to build the namespace
 * @param locales - Manifest `locales` map, e.g. `{ en: {...}, pl: {...} }`
 * @example registerPluginLocales("my-plugin", manifest.locales)
 */
export function registerPluginLocales(
  slug: string,
  locales: Record<string, Record<string, string>> | undefined,
): void {
  if (!locales) return
  const namespace = `plugin:${slug}`
  for (const [lang, resources] of Object.entries(locales)) {
    i18n.addResourceBundle(lang, namespace, resources, true, true)
  }
}
