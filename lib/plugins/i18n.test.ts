import { describe, it, expect, vi } from 'vitest'

const { addResourceBundle } = vi.hoisted(() => ({ addResourceBundle: vi.fn() }))
vi.mock('@/lib/i18n/config', () => ({ default: { addResourceBundle } }))

import { registerPluginLocales } from './i18n'

describe('registerPluginLocales', () => {
  it('registers each locale under the plugin namespace', () => {
    addResourceBundle.mockClear()
    registerPluginLocales('my-plugin', { en: { greeting: 'Hello' }, pl: { greeting: 'Witaj' } })
    expect(addResourceBundle).toHaveBeenCalledWith('en', 'plugin:my-plugin', { greeting: 'Hello' }, true, true)
    expect(addResourceBundle).toHaveBeenCalledWith('pl', 'plugin:my-plugin', { greeting: 'Witaj' }, true, true)
  })

  it('does nothing when no locales are provided', () => {
    addResourceBundle.mockClear()
    registerPluginLocales('my-plugin', undefined)
    expect(addResourceBundle).not.toHaveBeenCalled()
  })
})
