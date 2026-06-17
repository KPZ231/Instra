import i18n from '@/lib/i18n/config'

/**
 * Registers a plugin's manifest-supplied translations into i18next under a
 * dedicated `plugin:<pluginId>` namespace, isolated from host translation keys.
 * @param pluginId - Plugin ID, used to build the namespace
 * @param locales - Manifest `locales` map, e.g. `{ en: {...}, pl: {...} }`
 * @example registerPluginLocales("my-plugin", manifest.locales)
 */
export function registerPluginLocales(
  pluginId: string,
  locales: Record<string, Record<string, string>> | undefined,
): void {
  if (!locales) return
  const namespace = `plugin:${pluginId}`
  for (const [lang, resources] of Object.entries(locales)) {
    i18n.addResourceBundle(lang, namespace, resources, true, true)
  }
}
