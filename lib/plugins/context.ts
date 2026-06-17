import type { WidgetSlot } from '@prisma/client'
import type { PluginContext, WidgetHandler, RouteHandler, MenuItemRegistration } from '@/types/plugin'
import { WIDGET_SLOT_CAPABILITY, type PluginCapability } from './config'
import { getPluginData, setPluginData } from './kv'

export interface PluginRegistrations {
  widgets: Map<WidgetSlot, WidgetHandler>
  routes: Map<string, RouteHandler>
  menuItems: MenuItemRegistration[]
  listeners: Map<string, Array<(payload: unknown) => void>>
}

/**
 * Builds a capability-checked PluginContext for one plugin execution and the
 * registrations object that `render.ts` reads back after `init()` runs.
 * @param opts.pluginId - Plugin being executed
 * @param opts.userId - User the execution is scoped to (for KV storage)
 * @param opts.capabilities - Capabilities granted to this plugin (from its manifest)
 * @example const { context, registrations } = createPluginContext({ pluginId, userId, capabilities })
 */
export function createPluginContext(opts: {
  pluginId: string
  userId: string
  capabilities: PluginCapability[] | string[]
}): { context: PluginContext; registrations: PluginRegistrations } {
  const granted = new Set(opts.capabilities)
  const registrations: PluginRegistrations = {
    widgets: new Map(),
    routes: new Map(),
    menuItems: [],
    listeners: new Map(),
  }

  function requireCapability(capability: string) {
    if (!granted.has(capability)) {
      throw new Error(`Plugin "${opts.pluginId}" is missing required capability "${capability}"`)
    }
  }

  const context: PluginContext = {
    registerWidget(slot, handler) {
      requireCapability(WIDGET_SLOT_CAPABILITY[slot])
      registrations.widgets.set(slot, handler)
    },
    registerRoute(path, handler) {
      requireCapability('routes:register')
      registrations.routes.set(path, handler)
    },
    registerMenuItem(item) {
      requireCapability('menu:register')
      registrations.menuItems.push(item)
    },
    on(event, listener) {
      requireCapability('events:listen')
      const list = registrations.listeners.get(event) ?? []
      list.push(listener)
      registrations.listeners.set(event, list)
    },
    off(event, listener) {
      const list = registrations.listeners.get(event)
      if (list) registrations.listeners.set(event, list.filter((l) => l !== listener))
    },
    emit(event, payload) {
      requireCapability('events:emit')
      for (const listener of registrations.listeners.get(event) ?? []) listener(payload)
    },
    api: {
      storage: {
        async get(key) {
          requireCapability('storage:kv')
          return getPluginData(opts.pluginId, opts.userId, key)
        },
        async set(key, value) {
          requireCapability('storage:kv')
          await setPluginData(opts.pluginId, opts.userId, key, value)
        },
      },
    },
    logger: {
      info(message) {
        console.log(`[plugin:${opts.pluginId}]`, message)
      },
      error(message) {
        console.error(`[plugin:${opts.pluginId}]`, message)
      },
    },
  }

  return { context, registrations }
}
