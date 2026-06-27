import ivm from 'isolated-vm'
import { SANDBOX_COMPILE_TIMEOUT_MS } from './config'
import type { UIBlock } from './blocks'
import { uiBlockSchema } from './blocks'
import { z } from 'zod'

/**
 * Callbacks exposed from the host to the plugin isolate.
 * All functions execute in the host V8 context and are invoked from inside
 * the sandboxed isolate via `ivm.Callback`. Functions that cannot cross the
 * boundary (e.g. guest function References) are handled differently  see
 * implementation notes in `runPluginInIsolate`.
 */
export interface PluginContextCallbacks {
  /** Register a menu item; label and path are primitive strings. */
  registerMenuItem: (label: string, path: string) => void
  /** Emit an event with a JSON-serialized payload string. */
  emit: (event: string, payloadJson: string) => void
  /** Get a KV value; returns a JSON-serialized string or undefined. */
  storageGet: (key: string) => Promise<string | undefined>
  /** Set a KV value from a JSON-serialized string. */
  storageSet: (key: string, valueJson: string) => Promise<void>
  /** Log an info message from the plugin. */
  logInfo: (msg: string) => void
  /** Log an error message from the plugin. */
  logError: (msg: string) => void
}

/**
 * Context shim injected into the isolate so the plugin sees a `context` global
 * that mirrors the PluginContext interface. Handlers (widgets, routes, event
 * listeners) are stored into isolate-side maps and retrieved by the host after
 * `init()` via `ivm.Reference` lookups  they never cross the boundary as
 * callback arguments, which isolated-vm does not support.
 */
const CONTEXT_SHIM = `
var __widgetHandlers = {};
var __routeHandlers = {};
var __eventListeners = {};

var context = {
  registerWidget: function(slot, handler) {
    __widgetHandlers[slot] = handler;
  },
  registerRoute: function(path, handler) {
    __routeHandlers[path] = handler;
  },
  registerMenuItem: function(item) {
    __registerMenuItem(String(item.label), String(item.path));
  },
  emit: function(event, payload) {
    __emit(String(event), JSON.stringify(payload));
  },
  on: function(event, listener) {
    if (!__eventListeners[event]) __eventListeners[event] = [];
    __eventListeners[event].push(listener);
  },
  off: function(event, listener) {
    if (__eventListeners[event]) {
      __eventListeners[event] = __eventListeners[event].filter(function(l) { return l !== listener; });
    }
  },
  api: {
    storage: {
      get: async function(key) {
        var result = await __storageGet(String(key));
        return result === undefined ? undefined : JSON.parse(result);
      },
      set: async function(key, value) {
        await __storageSet(String(key), JSON.stringify(value));
      },
    }
  },
  logger: {
    info: function(msg) { __logInfo(String(msg)); },
    error: function(msg) { __logError(String(msg)); },
  },
};
`

/**
 * Runs a plugin bundle in a fresh V8 Isolate (via `isolated-vm`) with a 32 MB
 * memory cap and zero access to the host Node.js runtime  no `require`, no
 * `process`, no `fs`, not even via `Function` constructor prototype tricks.
 *
 * Widget and route handlers stay inside the isolate as `ivm.Reference` objects.
 * They are called later via `callWidgetHandler()`. The isolate must be disposed
 * by the caller once all References have been consumed.
 *
 * @param bundleCode - CommonJS plugin bundle source (`module.exports = { init }`)
 * @param callbacks - Host-side callbacks for side-effects (menu, events, storage, logging)
 * @param timeoutMs - Max ms for `init(context)` to complete
 * @returns `widgetRefs` map (slot → Reference), `routeRefs` map, and the `isolate` (caller must dispose)
 * @example
 *   const { widgetRefs, isolate } = await runPluginInIsolate(code, callbacks, 500)
 *   const blocks = await callWidgetHandler(widgetRefs.get('DASHBOARD_TOP')!, 500)
 *   isolate.dispose()
 */
export async function runPluginInIsolate(
  bundleCode: string,
  callbacks: PluginContextCallbacks,
  timeoutMs: number,
): Promise<{
  widgetRefs: Map<string, ivm.Reference>
  routeRefs: Map<string, ivm.Reference>
  isolate: ivm.Isolate
}> {
  const isolate = new ivm.Isolate({ memoryLimit: 32 })
  try {
  const ctx = await isolate.createContext()
  const jail = ctx.global

  // Expose host callbacks that handle primitive-only data (no function refs).
  await jail.set(
    '__registerMenuItem',
    new ivm.Callback((label: string, path: string) => {
      callbacks.registerMenuItem(label, path)
    }),
  )

  await jail.set(
    '__emit',
    new ivm.Callback((event: string, payloadJson: string) => {
      callbacks.emit(event, payloadJson)
    }),
  )

  await jail.set(
    '__storageGet',
    new ivm.Callback(
      async (key: string): Promise<string | undefined> => callbacks.storageGet(key),
      { async: true },
    ),
  )

  await jail.set(
    '__storageSet',
    new ivm.Callback(
      async (key: string, valueJson: string): Promise<void> =>
        callbacks.storageSet(key, valueJson),
      { async: true },
    ),
  )

  await jail.set(
    '__logInfo',
    new ivm.Callback((msg: string) => {
      callbacks.logInfo(msg)
    }),
  )

  await jail.set(
    '__logError',
    new ivm.Callback((msg: string) => {
      callbacks.logError(msg)
    }),
  )

  // Inject the context shim  defines `context`, `__widgetHandlers`, etc.
  await ctx.eval(CONTEXT_SHIM, { timeout: SANDBOX_COMPILE_TIMEOUT_MS })

  // Compile and run the plugin bundle. We wrap it in a minimal CommonJS shim
  // so `module.exports` works as expected.
  const wrappedBundle = `
var module = { exports: {} };
var exports = module.exports;
${bundleCode}
var __pluginInit = module.exports.init;
`
  const script = await isolate.compileScript(wrappedBundle)
  await script.run(ctx, { timeout: SANDBOX_COMPILE_TIMEOUT_MS })

  // Call init(context) inside the isolate. Handlers are stored in
  // `__widgetHandlers` / `__routeHandlers` by the context shim.
  await ctx.eval(`__pluginInit(context)`, { timeout: timeoutMs })

  // Retrieve registered handler keys by evaluating Object.keys inside the isolate.
  // We must NOT use .copy() on the handler maps because functions cannot be
  // structured-cloned across the isolate boundary. Instead we copy only the
  // primitive key arrays, then get a Reference per individual handler.
  const widgetRefs = new Map<string, ivm.Reference>()
  const routeRefs = new Map<string, ivm.Reference>()

  const widgetKeys = await ctx.eval('JSON.stringify(Object.keys(__widgetHandlers))', {
    copy: true,
  })
  if (typeof widgetKeys === 'string') {
    for (const slot of JSON.parse(widgetKeys) as string[]) {
      const ref = await ctx.eval(`__widgetHandlers[${JSON.stringify(slot)}]`, {
        reference: true,
      })
      if (ref instanceof ivm.Reference) {
        widgetRefs.set(slot, ref)
      }
    }
  }

  const routeKeys = await ctx.eval('JSON.stringify(Object.keys(__routeHandlers))', {
    copy: true,
  })
  if (typeof routeKeys === 'string') {
    for (const path of JSON.parse(routeKeys) as string[]) {
      const ref = await ctx.eval(`__routeHandlers[${JSON.stringify(path)}]`, {
        reference: true,
      })
      if (ref instanceof ivm.Reference) {
        routeRefs.set(path, ref)
      }
    }
  }

  return { widgetRefs, routeRefs, isolate }
  } catch (err) {
    // Dispose the isolate on any setup/init failure to avoid leaking native V8 memory.
    if (!isolate.isDisposed) isolate.dispose()
    throw err
  }
}

/**
 * Calls a widget handler Reference that lives inside a plugin isolate.
 * The handler must return a JSON-serializable array of UIBlocks.
 * Results are validated with the UIBlock Zod schema before being returned.
 *
 * @param handlerRef - ivm.Reference pointing to the widget handler function in the isolate
 * @param timeoutMs - Max ms to allow the handler to run
 * @returns Validated array of UIBlocks
 * @example
 *   const blocks = await callWidgetHandler(ref, 500)
 */
export async function callWidgetHandler(
  handlerRef: ivm.Reference,
  timeoutMs: number,
): Promise<UIBlock[]> {
  // `result: { copy: true }` tells isolated-vm to deep-copy the return value
  // across the boundary as a plain JS value. This works for any JSON-serializable
  // data, which UIBlock[] is by design.
  const raw = await handlerRef.apply(undefined, [], {
    result: { copy: true },
    timeout: timeoutMs,
  })

  const parsed = z.array(uiBlockSchema).safeParse(raw)
  if (!parsed.success) {
    throw new Error(`Plugin widget handler returned invalid UIBlocks: ${parsed.error.message}`)
  }
  return parsed.data
}
