import { describe, it, expect, vi } from 'vitest'
import { runPluginInIsolate, callWidgetHandler } from './sandbox'
import type { PluginContextCallbacks } from './sandbox'

/** Build a minimal callbacks object with all methods as no-ops / vi.fn(). */
function makeCallbacks(overrides: Partial<PluginContextCallbacks> = {}): PluginContextCallbacks {
  return {
    registerMenuItem: vi.fn(),
    emit: vi.fn(),
    storageGet: vi.fn().mockResolvedValue(undefined),
    storageSet: vi.fn().mockResolvedValue(undefined),
    logInfo: vi.fn(),
    logError: vi.fn(),
    ...overrides,
  }
}

describe('runPluginInIsolate', () => {
  it('executes a CommonJS-style bundle and calls init(context)', async () => {
    const logInfo = vi.fn()
    const code = `
      module.exports = {
        init: function(ctx) { ctx.logger.info('hello'); }
      }
    `
    const { isolate } = await runPluginInIsolate(code, makeCallbacks({ logInfo }), 500)
    isolate.dispose()
    expect(logInfo).toHaveBeenCalledWith('hello')
  })

  it('throws on syntax errors instead of crashing the host', async () => {
    const code = 'this is not valid js {{{'
    await expect(runPluginInIsolate(code, makeCallbacks(), 500)).rejects.toThrow()
  })

  it('has no access to require or process inside the isolate', async () => {
    const logInfo = vi.fn()
    const code = `
      module.exports = {
        init: function(ctx) {
          ctx.logger.info(String(typeof require) + ',' + String(typeof process));
        }
      }
    `
    const { isolate } = await runPluginInIsolate(code, makeCallbacks({ logInfo }), 500)
    isolate.dispose()
    expect(logInfo).toHaveBeenCalledWith('undefined,undefined')
  })

  it('registers widget handlers inside the isolate and returns slot References', async () => {
    const code = `
      module.exports = {
        init: function(ctx) {
          ctx.registerWidget('DASHBOARD_TOP', function() { return [{ type: 'text', value: 'hi' }]; });
        }
      }
    `
    const { widgetRefs, isolate } = await runPluginInIsolate(code, makeCallbacks(), 500)
    const hasSlot = widgetRefs.has('DASHBOARD_TOP')
    // Release the Reference before disposing so native handles are freed cleanly.
    for (const ref of widgetRefs.values()) ref.release()
    isolate.dispose()
    expect(hasSlot).toBe(true)
  })

  it('rejects when init() throws a synchronous error', async () => {
    // NOTE: CPU-spin timeout tests (while(true)) corrupt V8 native state in
    // vitest workers and cause subsequent tests to fail with structured-clone
    // errors. Timeout enforcement is instead tested in render.test.ts integration.
    const code = `
      module.exports = {
        init: function(ctx) { throw new Error('deliberate init failure'); }
      }
    `
    let threw = false
    let message = ''
    try {
      const { isolate } = await runPluginInIsolate(code, makeCallbacks(), 500)
      if (!isolate.isDisposed) isolate.dispose()
    } catch (e) {
      threw = true
      message = e instanceof Error ? e.message : String(e)
    }
    expect(threw).toBe(true)
    expect(message).toContain('deliberate init failure')
  })

  it('calls registerMenuItem callback with label and path', async () => {
    const registerMenuItem = vi.fn()
    const code = `
      module.exports = {
        init: function(ctx) { ctx.registerMenuItem({ label: 'Home', path: '/home' }); }
      }
    `
    const { isolate } = await runPluginInIsolate(code, makeCallbacks({ registerMenuItem }), 500)
    isolate.dispose()
    expect(registerMenuItem).toHaveBeenCalledWith('Home', '/home')
  })
})

describe('callWidgetHandler', () => {
  it('calls the handler Reference and returns validated UIBlocks', async () => {
    const code = `
      module.exports = {
        init: function(ctx) {
          ctx.registerWidget('DASHBOARD_TOP', function() {
            return [{ type: 'text', value: 'world' }];
          });
        }
      }
    `
    const { widgetRefs, isolate } = await runPluginInIsolate(code, makeCallbacks(), 500)
    const ref = widgetRefs.get('DASHBOARD_TOP')!
    const blocks = await callWidgetHandler(ref, 500)
    isolate.dispose()
    expect(blocks).toEqual([{ type: 'text', value: 'world' }])
  })

  it('rejects when the handler returns invalid UIBlocks', async () => {
    const code = `
      module.exports = {
        init: function(ctx) {
          ctx.registerWidget('DASHBOARD_TOP', function() {
            return [{ type: 'unknown_evil_type', value: 'x' }];
          });
        }
      }
    `
    const { widgetRefs, isolate } = await runPluginInIsolate(code, makeCallbacks(), 500)
    const ref = widgetRefs.get('DASHBOARD_TOP')!
    await expect(callWidgetHandler(ref, 500)).rejects.toThrow('invalid UIBlocks')
    isolate.dispose()
  })

  it('rejects when the handler throws a synchronous error', async () => {
    // NOTE: CPU-spin timeout tests corrupt V8 native state in vitest workers.
    // We test error propagation via a thrown error instead of a timeout spin.
    const code = `
      module.exports = {
        init: function(ctx) {
          ctx.registerWidget('DASHBOARD_TOP', function() {
            throw new Error('handler exploded');
          });
        }
      }
    `
    const { widgetRefs, isolate } = await runPluginInIsolate(code, makeCallbacks(), 500)
    const ref = widgetRefs.get('DASHBOARD_TOP')!
    let threw = false
    let message = ''
    try {
      await callWidgetHandler(ref, 500)
    } catch (e) {
      threw = true
      message = e instanceof Error ? e.message : String(e)
    }
    if (!isolate.isDisposed) isolate.dispose()
    expect(threw).toBe(true)
    expect(message).toContain('handler exploded')
  })
})
