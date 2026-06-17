import type { WidgetSlot } from '@prisma/client'
import type { UIBlock } from './blocks'
import { getUserInstallations } from './installations'
import { downloadBundle } from './storage'
import { runPluginInIsolate, callWidgetHandler } from './sandbox'
import type { PluginContextCallbacks } from './sandbox'
import { createPluginContext } from './context'
import { logPluginAction } from './audit'
import { SANDBOX_TIMEOUT_MS } from './config'

const ERROR_BLOCK: UIBlock = { type: 'text', value: 'This widget failed to load.' }

/**
 * Renders all blocks contributed by a user's installed, enabled plugins for
 * a single widget slot. Each plugin runs in its own isolated V8 Isolate
 * (via `isolated-vm`); a failure in one plugin yields an error block for
 * that plugin only and never affects the others.
 *
 * Flow per plugin:
 * 1. Download the plugin bundle from storage.
 * 2. Build a capability-checked PluginContext via `createPluginContext`.
 * 3. Convert context side-effect methods to `PluginContextCallbacks` (the bridge
 *    for primitives crossing the host→isolate boundary).
 * 4. Run the bundle in a fresh isolate; handlers stay inside the isolate as
 *    `ivm.Reference` objects, extracted after `init(context)` completes.
 * 5. Call the handler Reference for the requested slot and collect UIBlocks.
 * 6. Dispose the isolate immediately to free V8 memory.
 *
 * @param userId - User whose installations to render
 * @param slot - Widget slot being rendered (e.g. "DASHBOARD_TOP")
 * @returns Flat array of UIBlocks for the given slot
 * @example const blocks = await renderWidgetsForUser(userId, "DASHBOARD_TOP")
 */
export async function renderWidgetsForUser(userId: string, slot: WidgetSlot): Promise<UIBlock[]> {
  const installations = await getUserInstallations(userId)
  const blocks: UIBlock[] = []

  for (const installation of installations) {
    const manifest = installation.pluginVersion.manifest as { permissions: string[] }
    let isolate: import('isolated-vm').Isolate | undefined

    try {
      const code = await downloadBundle(installation.pluginVersion.bundleStorageKey)

      // Build capability-checked context. We use it here for capability checking
      // and side-effect methods (storage, logging, menu items, event emit).
      const { context } = createPluginContext({
        pluginId: installation.pluginId,
        userId,
        capabilities: manifest.permissions,
      })

      // Build the callbacks that bridge primitive-only data from the isolate
      // to the host. Widget/route/event-listener registration is handled
      // entirely inside the isolate; we retrieve handler References after init().
      const callbacks: PluginContextCallbacks = {
        registerMenuItem: (label, path) => {
          context.registerMenuItem({ label, path })
        },
        emit: (event, payloadJson: string) => {
          context.emit(event, JSON.parse(payloadJson) as unknown)
        },
        storageGet: async (key) => {
          const value = await context.api.storage.get(key)
          return value === undefined ? undefined : JSON.stringify(value)
        },
        storageSet: async (key, valueJson) => {
          await context.api.storage.set(key, JSON.parse(valueJson) as unknown)
        },
        logInfo: (msg) => context.logger.info(msg),
        logError: (msg) => context.logger.error(msg),
      }

      // Run the plugin in an isolated V8 Isolate.
      // Widget handler References live inside the isolate and are keyed by slot.
      const result = await runPluginInIsolate(code, callbacks, SANDBOX_TIMEOUT_MS)
      isolate = result.isolate

      const handlerRef = result.widgetRefs.get(slot)
      if (!handlerRef) continue

      const widgetBlocks = await callWidgetHandler(handlerRef, SANDBOX_TIMEOUT_MS)
      blocks.push(...widgetBlocks)
    } catch (error) {
      blocks.push(ERROR_BLOCK)
      await logPluginAction(installation.pluginId, userId, 'widget.error', {
        slot,
        message: error instanceof Error ? error.message : String(error),
      })
    } finally {
      // Always dispose the isolate to free V8 memory regardless of success/failure.
      if (isolate && !isolate.isDisposed) {
        isolate.dispose()
      }
    }
  }

  return blocks
}
