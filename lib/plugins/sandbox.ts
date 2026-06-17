import vm from 'node:vm'
import { SANDBOX_COMPILE_TIMEOUT_MS } from './config'

export interface SandboxModule {
  exports: Record<string, unknown>
}

/**
 * Compiles and runs a plugin bundle in an isolated V8 context with no access
 * to Node built-ins (`require`, `process`, `global`). The bundle must assign
 * its public API to `module.exports`.
 * @param bundleCode - Prebuilt CommonJS-style JS source
 * @example const { exports } = loadPluginModule(code)
 */
export function loadPluginModule(bundleCode: string): SandboxModule {
  const moduleObj: SandboxModule = { exports: {} }
  const sandbox: Record<string, unknown> = {
    module: moduleObj,
    exports: moduleObj.exports,
    console: { log() {}, error() {}, warn() {} },
  }
  const context = vm.createContext(sandbox)
  const script = new vm.Script(bundleCode, { filename: 'plugin-bundle.js' })
  script.runInContext(context, { timeout: SANDBOX_COMPILE_TIMEOUT_MS })
  return moduleObj
}

/**
 * Invokes a named export from a sandboxed module, racing it against a
 * timeout so a hung or slow plugin can never block the request indefinitely.
 * @param moduleExports - `exports` object returned by `loadPluginModule`
 * @param exportName - Name of the exported function to call
 * @param args - Arguments to pass to the function
 * @param timeoutMs - Max time to wait before rejecting
 * @example await callPluginExport(exports, "init", [context], 500)
 */
export async function callPluginExport<T>(
  moduleExports: Record<string, unknown>,
  exportName: string,
  args: unknown[],
  timeoutMs: number,
): Promise<T> {
  const fn = moduleExports[exportName]
  if (typeof fn !== 'function') {
    throw new Error(`Plugin export "${exportName}" is not a function`)
  }
  return await Promise.race([
    Promise.resolve((fn as (...a: unknown[]) => T)(...args)),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Plugin export "${exportName}" timed out after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ])
}
