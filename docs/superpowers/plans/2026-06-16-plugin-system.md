# Plugin System Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full backend for Instra's plugin system  a registry, sandboxed execution, and declarative-UI rendering that lets installed plugins extend dashboard widgets, custom routes, menu items, events, and per-user KV storage.

**Architecture:** Plugin code is a prebuilt JS bundle uploaded to Supabase Storage and registered in Postgres (`Plugin` → `PluginVersion`, semver, review workflow `DRAFT → PENDING_REVIEW → APPROVED/REJECTED`). Users install a specific `PluginVersion` (`PluginInstallation`, per-user, manual updates). At render time, the bundle is loaded and executed per-request in a `node:vm` sandbox with no network access; `init(context)` registers widget/route/menuItem/event handlers, gated by granular capability strings. Output is a declarative JSON block tree (`UIBlock`), rendered by trusted React components  plugins never ship JSX. Per-plugin i18n strings load into i18next under namespace `plugin:<id>`.

**Tech Stack:** Next.js 16 (App Router), Prisma 7 + Postgres, `node:vm`, Supabase Storage (`@supabase/supabase-js`), Zod, i18next, Vitest.

---

## File Structure

- `prisma/schema.prisma`  new models: `Plugin`, `PluginVersion`, `PluginInstallation`, `PluginData`, `PluginAuditLog`; new enums `PluginReviewStatus`, `WidgetSlot`.
- `types/plugin.ts`  `InstraPlugin`, `PluginContext`, `PluginManifest`, `PluginCapability`, `UIBlock` types.
- `lib/plugins/config.ts`  capability list, widget-slot→capability map, sandbox timeout constants.
- `lib/plugins/manifest.ts`  Zod schema + `parseManifest()`.
- `lib/plugins/blocks.ts`  Zod schema + type for declarative `UIBlock`.
- `lib/plugins/storage.ts`  Supabase Storage upload/download for plugin bundles.
- `lib/plugins/sandbox.ts`  `node:vm` module loader + timeout-bound export caller.
- `lib/plugins/context.ts`  builds a capability-checked `PluginContext` + captures registrations.
- `lib/plugins/registry.ts`  create plugin/version, submit, approve, reject, list approved.
- `lib/plugins/installations.ts`  install/uninstall/toggle/list-for-user/check-update.
- `lib/plugins/kv.ts`  scoped per-plugin-per-user KV storage on `PluginData`.
- `lib/plugins/audit.ts`  `logPluginAction()` / `listPluginAuditLog()`.
- `lib/plugins/i18n.ts`  registers plugin locale bundles into i18next.
- `lib/plugins/render.ts`  orchestrates sandbox load + capability context + handler call → `UIBlock[]`, with per-plugin error isolation.
- `components/ui/plugins/BlockRenderer.tsx` + `PluginErrorBoundary.tsx`  renders `UIBlock[]` trees safely.
- `app/api/admin/plugins/route.ts`  admin: list pending versions.
- `app/api/admin/plugins/[versionId]/review/route.ts`  admin: approve/reject a version.
- `app/api/plugins/route.ts`  list approved plugins (browse/install UI).
- `app/api/plugins/install/route.ts`  user: install/uninstall/toggle/update.
- `docs/plugins.md`  module documentation (per CLAUDE.md doc requirement).

---

### Task 1: Prisma schema  plugin models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enums and models**

Append to `prisma/schema.prisma`:

```prisma
enum PluginReviewStatus {
  DRAFT
  PENDING_REVIEW
  APPROVED
  REJECTED
}

enum WidgetSlot {
  DASHBOARD_TOP
  DASHBOARD_SIDEBAR
  DASHBOARD_BOTTOM
  SETTINGS_GENERAL
  SETTINGS_ADVANCED
  HEADER_ACTIONS
  PROFILE_MENU
}

model Plugin {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  description String
  authorId    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  author       User             @relation(fields: [authorId], references: [id], onDelete: Cascade)
  versions     PluginVersion[]
  installations PluginInstallation[]
  data         PluginData[]
  auditLogs    PluginAuditLog[]

  @@index([authorId])
}

model PluginVersion {
  id               String             @id @default(cuid())
  pluginId         String
  version          String
  status           PluginReviewStatus @default(DRAFT)
  manifest         Json
  bundleStorageKey String
  reviewedById     String?
  reviewedAt       DateTime?
  rejectionReason  String?
  createdAt        DateTime           @default(now())

  plugin        Plugin               @relation(fields: [pluginId], references: [id], onDelete: Cascade)
  reviewedBy    User?                @relation(fields: [reviewedById], references: [id])
  installations PluginInstallation[]

  @@unique([pluginId, version])
  @@index([status])
}

model PluginInstallation {
  id              String   @id @default(cuid())
  userId          String
  pluginId        String
  pluginVersionId String
  enabled         Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  plugin        Plugin        @relation(fields: [pluginId], references: [id], onDelete: Cascade)
  pluginVersion PluginVersion @relation(fields: [pluginVersionId], references: [id])

  @@unique([userId, pluginId])
  @@index([userId])
}

model PluginData {
  id        String   @id @default(cuid())
  pluginId  String
  userId    String
  key       String
  value     Json
  updatedAt DateTime @updatedAt

  plugin Plugin @relation(fields: [pluginId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([pluginId, userId, key])
}

model PluginAuditLog {
  id        String   @id @default(cuid())
  pluginId  String
  userId    String?
  action    String
  metadata  Json?
  createdAt DateTime @default(now())

  plugin Plugin @relation(fields: [pluginId], references: [id], onDelete: Cascade)

  @@index([pluginId, createdAt])
}
```

Add the reverse relations to `model User` in the same file:

```prisma
  plugins             Plugin[]
  pluginInstallations PluginInstallation[]
  pluginData          PluginData[]
  reviewedVersions    PluginVersion[]      @relation
```

- [ ] **Step 2: Run migration**

Run: `npx prisma migrate dev --name plugin_system`
Expected: migration created and applied without errors.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(plugins): add plugin registry, installation, kv, and audit log models"
```

---

### Task 2: Capability config and widget-slot mapping

**Files:**
- Create: `lib/plugins/config.ts`
- Test: `lib/plugins/config.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { PLUGIN_CAPABILITIES, WIDGET_SLOT_CAPABILITY, SANDBOX_TIMEOUT_MS } from './config'

describe('plugin config', () => {
  it('maps every WidgetSlot to a capability string', () => {
    expect(WIDGET_SLOT_CAPABILITY.DASHBOARD_TOP).toBe('widgets:dashboard:top')
    expect(WIDGET_SLOT_CAPABILITY.PROFILE_MENU).toBe('widgets:profile:menu')
  })

  it('includes core non-widget capabilities', () => {
    expect(PLUGIN_CAPABILITIES).toContain('routes:register')
    expect(PLUGIN_CAPABILITIES).toContain('storage:kv')
  })

  it('defines a positive sandbox timeout', () => {
    expect(SANDBOX_TIMEOUT_MS).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/plugins/config.test.ts`
Expected: FAIL  `./config` does not exist.

- [ ] **Step 3: Write implementation**

```ts
import type { WidgetSlot } from '@prisma/client'

export const WIDGET_SLOT_CAPABILITY: Record<WidgetSlot, string> = {
  DASHBOARD_TOP: 'widgets:dashboard:top',
  DASHBOARD_SIDEBAR: 'widgets:dashboard:sidebar',
  DASHBOARD_BOTTOM: 'widgets:dashboard:bottom',
  SETTINGS_GENERAL: 'widgets:settings:general',
  SETTINGS_ADVANCED: 'widgets:settings:advanced',
  HEADER_ACTIONS: 'widgets:header:actions',
  PROFILE_MENU: 'widgets:profile:menu',
}

export const PLUGIN_CAPABILITIES = [
  ...Object.values(WIDGET_SLOT_CAPABILITY),
  'routes:register',
  'menu:register',
  'events:emit',
  'events:listen',
  'storage:kv',
] as const

export type PluginCapability = (typeof PLUGIN_CAPABILITIES)[number]

/** Max time (ms) a single plugin export call may run before being aborted. */
export const SANDBOX_TIMEOUT_MS = 500

/** Max time (ms) the vm is allowed to spend on synchronous module evaluation. */
export const SANDBOX_COMPILE_TIMEOUT_MS = 100
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/plugins/config.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/plugins/config.ts lib/plugins/config.test.ts
git commit -m "feat(plugins): add capability list and sandbox timing config"
```

---

### Task 3: Declarative UIBlock schema

**Files:**
- Create: `lib/plugins/blocks.ts`
- Test: `lib/plugins/blocks.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { uiBlockSchema } from './blocks'

describe('uiBlockSchema', () => {
  it('accepts a valid card block with nested children', () => {
    const result = uiBlockSchema.safeParse({
      type: 'card',
      title: 'Hello',
      children: [{ type: 'text', value: 'World' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects an unknown block type', () => {
    const result = uiBlockSchema.safeParse({ type: 'iframe', src: 'evil.com' })
    expect(result.success).toBe(false)
  })

  it('rejects a button block without an action name', () => {
    const result = uiBlockSchema.safeParse({ type: 'button', label: 'Click' })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/plugins/blocks.test.ts`
Expected: FAIL  `./blocks` does not exist.

- [ ] **Step 3: Write implementation**

```ts
import { z } from 'zod'

const baseBlock = z.object({ type: z.string() })

export const uiBlockSchema: z.ZodType<UIBlock> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('text'), value: z.string() }),
    z.object({
      type: z.literal('card'),
      title: z.string(),
      children: z.array(uiBlockSchema).max(50),
    }),
    z.object({
      type: z.literal('list'),
      items: z.array(z.string()).max(200),
    }),
    z.object({
      type: z.literal('table'),
      columns: z.array(z.string()).max(20),
      rows: z.array(z.array(z.string())).max(500),
    }),
    z.object({
      type: z.literal('button'),
      label: z.string(),
      action: z.string().min(1),
    }),
  ]),
)

export type UIBlock =
  | { type: 'text'; value: string }
  | { type: 'card'; title: string; children: UIBlock[] }
  | { type: 'list'; items: string[] }
  | { type: 'table'; columns: string[]; rows: string[][] }
  | { type: 'button'; label: string; action: string }

void baseBlock
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/plugins/blocks.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/plugins/blocks.ts lib/plugins/blocks.test.ts
git commit -m "feat(plugins): add declarative UIBlock schema"
```

---

### Task 4: Plugin manifest schema

**Files:**
- Create: `lib/plugins/manifest.ts`
- Test: `lib/plugins/manifest.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { parseManifest } from './manifest'

const validManifest = {
  name: 'My Plugin',
  version: '1.0.0',
  description: 'Does something useful',
  author: 'Jane Doe',
  permissions: ['widgets:dashboard:top', 'storage:kv'],
  main: 'dist/index.js',
  locales: { en: { greeting: 'Hello' }, pl: { greeting: 'Witaj' } },
}

describe('parseManifest', () => {
  it('parses a valid manifest', () => {
    const result = parseManifest(validManifest)
    expect(result.success).toBe(true)
  })

  it('rejects an unknown permission string', () => {
    const result = parseManifest({ ...validManifest, permissions: ['filesystem:write'] })
    expect(result.success).toBe(false)
  })

  it('rejects a non-semver version', () => {
    const result = parseManifest({ ...validManifest, version: 'latest' })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/plugins/manifest.test.ts`
Expected: FAIL  `./manifest` does not exist.

- [ ] **Step 3: Write implementation**

```ts
import { z } from 'zod'
import { PLUGIN_CAPABILITIES } from './config'

const SEMVER_RE = /^\d+\.\d+\.\d+$/

export const manifestSchema = z.object({
  name: z.string().min(1).max(80),
  version: z.string().regex(SEMVER_RE, 'version must be semver (x.y.z)'),
  description: z.string().min(1).max(300),
  author: z.string().min(1).max(120),
  permissions: z.array(z.enum(PLUGIN_CAPABILITIES)).max(PLUGIN_CAPABILITIES.length),
  main: z.string().min(1),
  locales: z.record(z.string(), z.record(z.string(), z.string())).optional(),
})

export type PluginManifest = z.infer<typeof manifestSchema>

/**
 * Validates raw JSON against the plugin manifest schema.
 * @param raw - Parsed JSON content of a plugin's manifest.json
 * @returns Zod safeParse result with either `data` or `error`
 * @example parseManifest(JSON.parse(rawJson))
 */
export function parseManifest(raw: unknown) {
  return manifestSchema.safeParse(raw)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/plugins/manifest.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/plugins/manifest.ts lib/plugins/manifest.test.ts
git commit -m "feat(plugins): add manifest.json validation schema"
```

---

### Task 5: Shared plugin types

**Files:**
- Create: `types/plugin.ts`

- [ ] **Step 1: Write the types (no test  pure type declarations)**

```ts
import type { WidgetSlot } from '@prisma/client'
import type { UIBlock } from '@/lib/plugins/blocks'
import type { PluginManifest } from '@/lib/plugins/manifest'

export type WidgetHandler = () => UIBlock[] | Promise<UIBlock[]>
export type RouteHandler = () => UIBlock[] | Promise<UIBlock[]>

export interface MenuItemRegistration {
  label: string
  path: string
}

export interface PluginContext {
  registerWidget(slot: WidgetSlot, handler: WidgetHandler): void
  registerRoute(path: string, handler: RouteHandler): void
  registerMenuItem(item: MenuItemRegistration): void
  on(event: string, listener: (payload: unknown) => void): void
  off(event: string, listener: (payload: unknown) => void): void
  emit(event: string, payload: unknown): void
  api: {
    storage: {
      get(key: string): Promise<unknown>
      set(key: string, value: unknown): Promise<void>
    }
  }
  logger: {
    info(message: string): void
    error(message: string): void
  }
}

export interface InstraPlugin {
  init(context: PluginContext): void | Promise<void>
  destroy?(): void | Promise<void>
}

export type { PluginManifest }
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no new errors from `types/plugin.ts`.

- [ ] **Step 3: Commit**

```bash
git add types/plugin.ts
git commit -m "feat(plugins): add shared PluginContext and InstraPlugin types"
```

---

### Task 6: Supabase Storage bundle service

**Files:**
- Create: `lib/plugins/storage.ts`
- Test: `lib/plugins/storage.test.ts`
- Modify: `package.json` (add `@supabase/supabase-js`)

- [ ] **Step 1: Install dependency**

Run: `npm install @supabase/supabase-js`
Expected: added to `dependencies` in `package.json`.

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const uploadMock = vi.fn()
const downloadMock = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      from: () => ({ upload: uploadMock, download: downloadMock }),
    },
  }),
}))

import { uploadBundle, downloadBundle, buildBundleKey } from './storage'

beforeEach(() => {
  uploadMock.mockReset()
  downloadMock.mockReset()
})

describe('plugin bundle storage', () => {
  it('builds a deterministic storage key per plugin+version', () => {
    expect(buildBundleKey('my-plugin', '1.0.0')).toBe('plugins/my-plugin/1.0.0/bundle.js')
  })

  it('uploads bundle code under the expected key', async () => {
    uploadMock.mockResolvedValue({ error: null })
    await uploadBundle('my-plugin', '1.0.0', 'module.exports = {}')
    expect(uploadMock).toHaveBeenCalledWith(
      'plugins/my-plugin/1.0.0/bundle.js',
      'module.exports = {}',
      { contentType: 'application/javascript', upsert: false },
    )
  })

  it('throws when the upload fails', async () => {
    uploadMock.mockResolvedValue({ error: new Error('disk full') })
    await expect(uploadBundle('my-plugin', '1.0.0', 'code')).rejects.toThrow('disk full')
  })

  it('downloads and returns bundle text', async () => {
    downloadMock.mockResolvedValue({ data: new Blob(['code']), error: null })
    const text = await downloadBundle('plugins/my-plugin/1.0.0/bundle.js')
    expect(text).toBe('code')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run lib/plugins/storage.test.ts`
Expected: FAIL  `./storage` does not exist.

- [ ] **Step 4: Write implementation**

```ts
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'plugin-bundles'

function getClient() {
  return createClient(process.env.SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '')
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
  const { error } = await getClient().storage.from(BUCKET).upload(key, code, {
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
  const { data, error } = await getClient().storage.from(BUCKET).download(key)
  if (error) throw error
  return await data.text()
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/plugins/storage.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/plugins/storage.ts lib/plugins/storage.test.ts
git commit -m "feat(plugins): add Supabase Storage bundle upload/download service"
```

---

### Task 7: Sandbox module loader

**Files:**
- Create: `lib/plugins/sandbox.ts`
- Test: `lib/plugins/sandbox.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { loadPluginModule, callPluginExport } from './sandbox'

describe('loadPluginModule', () => {
  it('executes a CommonJS-style bundle and returns its exports', () => {
    const { exports } = loadPluginModule('module.exports = { hello: () => "hi" }')
    expect(typeof exports.hello).toBe('function')
  })

  it('throws on syntax errors instead of crashing the host', () => {
    expect(() => loadPluginModule('this is not valid js {{{')).toThrow()
  })

  it('has no access to require or process', () => {
    const { exports } = loadPluginModule(
      'module.exports = { check: () => typeof require + "," + typeof process }',
    )
    const result = (exports.check as () => string)()
    expect(result).toBe('undefined,undefined')
  })
})

describe('callPluginExport', () => {
  it('resolves with the export return value', async () => {
    const { exports } = loadPluginModule('module.exports = { run: () => 42 }')
    const result = await callPluginExport<number>(exports, 'run', [], 50)
    expect(result).toBe(42)
  })

  it('rejects when the named export is missing', async () => {
    const { exports } = loadPluginModule('module.exports = {}')
    await expect(callPluginExport(exports, 'missing', [], 50)).rejects.toThrow('not a function')
  })

  it('rejects when the export exceeds the timeout', async () => {
    const { exports } = loadPluginModule(
      'module.exports = { run: () => new Promise((r) => setTimeout(r, 200)) }',
    )
    await expect(callPluginExport(exports, 'run', [], 20)).rejects.toThrow('timed out')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/plugins/sandbox.test.ts`
Expected: FAIL  `./sandbox` does not exist.

- [ ] **Step 3: Write implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/plugins/sandbox.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/plugins/sandbox.ts lib/plugins/sandbox.test.ts
git commit -m "feat(plugins): add node:vm sandbox loader with timeout-bound export calls"
```

---

### Task 8: Per-plugin KV storage

**Files:**
- Create: `lib/plugins/kv.ts`
- Test: `lib/plugins/kv.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const findUnique = vi.fn()
const upsert = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: { pluginData: { findUnique, upsert } },
}))

import { getPluginData, setPluginData } from './kv'

beforeEach(() => {
  findUnique.mockReset()
  upsert.mockReset()
})

describe('plugin kv storage', () => {
  it('returns null when no value is stored', async () => {
    findUnique.mockResolvedValue(null)
    const value = await getPluginData('plugin-1', 'user-1', 'count')
    expect(value).toBeNull()
  })

  it('returns the stored value', async () => {
    findUnique.mockResolvedValue({ value: 42 })
    const value = await getPluginData('plugin-1', 'user-1', 'count')
    expect(value).toBe(42)
  })

  it('upserts scoped by pluginId+userId+key', async () => {
    upsert.mockResolvedValue({})
    await setPluginData('plugin-1', 'user-1', 'count', 42)
    expect(upsert).toHaveBeenCalledWith({
      where: { pluginId_userId_key: { pluginId: 'plugin-1', userId: 'user-1', key: 'count' } },
      create: { pluginId: 'plugin-1', userId: 'user-1', key: 'count', value: 42 },
      update: { value: 42 },
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/plugins/kv.test.ts`
Expected: FAIL  `./kv` does not exist.

- [ ] **Step 3: Write implementation**

```ts
import { prisma } from '@/lib/prisma'

/**
 * Reads a plugin's stored value for the given user, scoped to that plugin.
 * @param pluginId - Owning plugin id
 * @param userId - Owning user id
 * @param key - Storage key
 * @example await getPluginData(pluginId, userId, "lastSeenId")
 */
export async function getPluginData(pluginId: string, userId: string, key: string): Promise<unknown> {
  const row = await prisma.pluginData.findUnique({
    where: { pluginId_userId_key: { pluginId, userId, key } },
  })
  return row ? row.value : null
}

/**
 * Writes (or overwrites) a plugin's stored value for the given user.
 * @param pluginId - Owning plugin id
 * @param userId - Owning user id
 * @param key - Storage key
 * @param value - JSON-serializable value
 * @example await setPluginData(pluginId, userId, "lastSeenId", "abc123")
 */
export async function setPluginData(
  pluginId: string,
  userId: string,
  key: string,
  value: unknown,
): Promise<void> {
  await prisma.pluginData.upsert({
    where: { pluginId_userId_key: { pluginId, userId, key } },
    create: { pluginId, userId, key, value },
    update: { value },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/plugins/kv.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/plugins/kv.ts lib/plugins/kv.test.ts
git commit -m "feat(plugins): add per-plugin per-user KV storage"
```

---

### Task 9: Audit log

**Files:**
- Create: `lib/plugins/audit.ts`
- Test: `lib/plugins/audit.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const create = vi.fn()
const findMany = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: { pluginAuditLog: { create, findMany } },
}))

import { logPluginAction, listPluginAuditLog } from './audit'

beforeEach(() => {
  create.mockReset()
  findMany.mockReset()
})

describe('plugin audit log', () => {
  it('records an action with optional metadata', async () => {
    create.mockResolvedValue({})
    await logPluginAction('plugin-1', 'user-1', 'widget.render', { slot: 'DASHBOARD_TOP' })
    expect(create).toHaveBeenCalledWith({
      data: { pluginId: 'plugin-1', userId: 'user-1', action: 'widget.render', metadata: { slot: 'DASHBOARD_TOP' } },
    })
  })

  it('lists entries for a plugin ordered by newest first', async () => {
    findMany.mockResolvedValue([{ action: 'install' }])
    const entries = await listPluginAuditLog('plugin-1')
    expect(findMany).toHaveBeenCalledWith({
      where: { pluginId: 'plugin-1' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    expect(entries).toEqual([{ action: 'install' }])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/plugins/audit.test.ts`
Expected: FAIL  `./audit` does not exist.

- [ ] **Step 3: Write implementation**

```ts
import { prisma } from '@/lib/prisma'

/**
 * Records a single plugin-related action for audit purposes.
 * @param pluginId - Plugin the action relates to
 * @param userId - Acting user, or null for system actions
 * @param action - Short machine-readable action name (e.g. "install", "widget.render")
 * @param metadata - Optional structured context for the entry
 * @example await logPluginAction(pluginId, userId, "install")
 */
export async function logPluginAction(
  pluginId: string,
  userId: string | null,
  action: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await prisma.pluginAuditLog.create({
    data: { pluginId, userId, action, metadata: metadata ?? null },
  })
}

/**
 * Lists the most recent audit log entries for a plugin.
 * @param pluginId - Plugin to fetch entries for
 * @example const entries = await listPluginAuditLog(pluginId)
 */
export async function listPluginAuditLog(pluginId: string) {
  return prisma.pluginAuditLog.findMany({
    where: { pluginId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/plugins/audit.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/plugins/audit.ts lib/plugins/audit.test.ts
git commit -m "feat(plugins): add plugin audit log service"
```

---

### Task 10: Capability-checked PluginContext builder

**Files:**
- Create: `lib/plugins/context.ts`
- Test: `lib/plugins/context.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('./kv', () => ({
  getPluginData: vi.fn().mockResolvedValue(null),
  setPluginData: vi.fn().mockResolvedValue(undefined),
}))

import { createPluginContext } from './context'

describe('createPluginContext', () => {
  it('allows registerWidget when the matching capability is granted', () => {
    const { context, registrations } = createPluginContext({
      pluginId: 'p1',
      userId: 'u1',
      capabilities: ['widgets:dashboard:top'],
    })
    context.registerWidget('DASHBOARD_TOP', () => [])
    expect(registrations.widgets.has('DASHBOARD_TOP')).toBe(true)
  })

  it('throws when registerWidget is called without the capability', () => {
    const { context } = createPluginContext({ pluginId: 'p1', userId: 'u1', capabilities: [] })
    expect(() => context.registerWidget('DASHBOARD_TOP', () => [])).toThrow('missing required capability')
  })

  it('throws when emit is called without events:emit', () => {
    const { context } = createPluginContext({ pluginId: 'p1', userId: 'u1', capabilities: ['events:listen'] })
    expect(() => context.emit('tick', {})).toThrow('missing required capability')
  })

  it('delivers emitted events to registered listeners', () => {
    const { context } = createPluginContext({
      pluginId: 'p1',
      userId: 'u1',
      capabilities: ['events:emit', 'events:listen'],
    })
    const received: unknown[] = []
    context.on('tick', (payload) => received.push(payload))
    context.emit('tick', { count: 1 })
    expect(received).toEqual([{ count: 1 }])
  })

  it('throws when api.storage.get is called without storage:kv', async () => {
    const { context } = createPluginContext({ pluginId: 'p1', userId: 'u1', capabilities: [] })
    await expect(context.api.storage.get('x')).rejects.toThrow('missing required capability')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/plugins/context.test.ts`
Expected: FAIL  `./context` does not exist.

- [ ] **Step 3: Write implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/plugins/context.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/plugins/context.ts lib/plugins/context.test.ts
git commit -m "feat(plugins): add capability-checked PluginContext builder"
```

---

### Task 11: Registry service (create, submit, review)

**Files:**
- Create: `lib/plugins/registry.ts`
- Test: `lib/plugins/registry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const pluginCreate = vi.fn()
const versionCreate = vi.fn()
const versionUpdate = vi.fn()
const versionFindMany = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    plugin: { create: pluginCreate },
    pluginVersion: { create: versionCreate, update: versionUpdate, findMany: versionFindMany },
  },
}))

import { createPlugin, submitVersionForReview, approveVersion, rejectVersion, listApprovedPlugins } from './registry'

beforeEach(() => {
  pluginCreate.mockReset()
  versionCreate.mockReset()
  versionUpdate.mockReset()
  versionFindMany.mockReset()
})

describe('plugin registry', () => {
  it('creates a plugin with its first DRAFT version', async () => {
    pluginCreate.mockResolvedValue({ id: 'plugin-1', slug: 'my-plugin' })
    versionCreate.mockResolvedValue({ id: 'v1', status: 'DRAFT' })
    const result = await createPlugin({
      slug: 'my-plugin',
      name: 'My Plugin',
      description: 'desc',
      authorId: 'user-1',
      manifest: { version: '1.0.0' } as never,
      bundleStorageKey: 'plugins/my-plugin/1.0.0/bundle.js',
    })
    expect(pluginCreate).toHaveBeenCalled()
    expect(versionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'DRAFT', version: '1.0.0' }) }),
    )
    expect(result.version.status).toBe('DRAFT')
  })

  it('moves a version from DRAFT to PENDING_REVIEW', async () => {
    versionUpdate.mockResolvedValue({ status: 'PENDING_REVIEW' })
    await submitVersionForReview('v1')
    expect(versionUpdate).toHaveBeenCalledWith({
      where: { id: 'v1' },
      data: { status: 'PENDING_REVIEW' },
    })
  })

  it('approves a version with the reviewer id', async () => {
    versionUpdate.mockResolvedValue({ status: 'APPROVED' })
    await approveVersion('v1', 'admin-1')
    expect(versionUpdate).toHaveBeenCalledWith({
      where: { id: 'v1' },
      data: expect.objectContaining({ status: 'APPROVED', reviewedById: 'admin-1' }),
    })
  })

  it('rejects a version with a reason', async () => {
    versionUpdate.mockResolvedValue({ status: 'REJECTED' })
    await rejectVersion('v1', 'admin-1', 'unsafe code')
    expect(versionUpdate).toHaveBeenCalledWith({
      where: { id: 'v1' },
      data: expect.objectContaining({ status: 'REJECTED', rejectionReason: 'unsafe code' }),
    })
  })

  it('lists only APPROVED versions', async () => {
    versionFindMany.mockResolvedValue([])
    await listApprovedPlugins()
    expect(versionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'APPROVED' } }),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/plugins/registry.test.ts`
Expected: FAIL  `./registry` does not exist.

- [ ] **Step 3: Write implementation**

```ts
import { prisma } from '@/lib/prisma'
import type { PluginManifest } from './manifest'

/**
 * Registers a brand-new plugin together with its first version (DRAFT).
 * @example await createPlugin({ slug, name, description, authorId, manifest, bundleStorageKey })
 */
export async function createPlugin(input: {
  slug: string
  name: string
  description: string
  authorId: string
  manifest: PluginManifest
  bundleStorageKey: string
}) {
  const plugin = await prisma.plugin.create({
    data: {
      slug: input.slug,
      name: input.name,
      description: input.description,
      authorId: input.authorId,
    },
  })
  const version = await prisma.pluginVersion.create({
    data: {
      pluginId: plugin.id,
      version: input.manifest.version,
      status: 'DRAFT',
      manifest: input.manifest,
      bundleStorageKey: input.bundleStorageKey,
    },
  })
  return { plugin, version }
}

/** Moves a plugin version from DRAFT to PENDING_REVIEW. */
export async function submitVersionForReview(versionId: string) {
  return prisma.pluginVersion.update({ where: { id: versionId }, data: { status: 'PENDING_REVIEW' } })
}

/** Approves a pending plugin version, recording the reviewing admin. */
export async function approveVersion(versionId: string, reviewerId: string) {
  return prisma.pluginVersion.update({
    where: { id: versionId },
    data: { status: 'APPROVED', reviewedById: reviewerId, reviewedAt: new Date(), rejectionReason: null },
  })
}

/** Rejects a pending plugin version with a human-readable reason. */
export async function rejectVersion(versionId: string, reviewerId: string, reason: string) {
  return prisma.pluginVersion.update({
    where: { id: versionId },
    data: { status: 'REJECTED', reviewedById: reviewerId, reviewedAt: new Date(), rejectionReason: reason },
  })
}

/** Lists all approved plugin versions, newest first, for the install browser. */
export async function listApprovedPlugins() {
  return prisma.pluginVersion.findMany({
    where: { status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
    include: { plugin: true },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/plugins/registry.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/plugins/registry.ts lib/plugins/registry.test.ts
git commit -m "feat(plugins): add registry service with DRAFT->PENDING_REVIEW->APPROVED/REJECTED workflow"
```

---

### Task 12: User installation service

**Files:**
- Create: `lib/plugins/installations.ts`
- Test: `lib/plugins/installations.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const upsert = vi.fn()
const deleteMany = vi.fn()
const update = vi.fn()
const findMany = vi.fn()
const versionFindFirst = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pluginInstallation: { upsert, deleteMany, update, findMany },
    pluginVersion: { findFirst: versionFindFirst },
  },
}))

import { installPlugin, uninstallPlugin, togglePlugin, getUserInstallations, getAvailableUpdate } from './installations'

beforeEach(() => {
  upsert.mockReset()
  deleteMany.mockReset()
  update.mockReset()
  findMany.mockReset()
  versionFindFirst.mockReset()
})

describe('plugin installations', () => {
  it('installs a specific approved version for a user', async () => {
    upsert.mockResolvedValue({ id: 'inst-1' })
    await installPlugin('user-1', 'plugin-1', 'version-1')
    expect(upsert).toHaveBeenCalledWith({
      where: { userId_pluginId: { userId: 'user-1', pluginId: 'plugin-1' } },
      create: { userId: 'user-1', pluginId: 'plugin-1', pluginVersionId: 'version-1', enabled: true },
      update: { pluginVersionId: 'version-1', enabled: true },
    })
  })

  it('uninstalls by deleting the installation row', async () => {
    deleteMany.mockResolvedValue({ count: 1 })
    await uninstallPlugin('user-1', 'plugin-1')
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1', pluginId: 'plugin-1' } })
  })

  it('toggles enabled state', async () => {
    update.mockResolvedValue({})
    await togglePlugin('user-1', 'plugin-1', false)
    expect(update).toHaveBeenCalledWith({
      where: { userId_pluginId: { userId: 'user-1', pluginId: 'plugin-1' } },
      data: { enabled: false },
    })
  })

  it('lists enabled installations for rendering', async () => {
    findMany.mockResolvedValue([])
    await getUserInstallations('user-1')
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', enabled: true } }),
    )
  })

  it('reports an available update when a newer approved version exists', async () => {
    versionFindFirst.mockResolvedValue({ id: 'version-2', version: '1.1.0' })
    const result = await getAvailableUpdate('plugin-1', '1.0.0')
    expect(result?.version).toBe('1.1.0')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/plugins/installations.test.ts`
Expected: FAIL  `./installations` does not exist.

- [ ] **Step 3: Write implementation**

```ts
import { prisma } from '@/lib/prisma'

/** Installs (or re-installs) a specific approved plugin version for a user. */
export async function installPlugin(userId: string, pluginId: string, pluginVersionId: string) {
  return prisma.pluginInstallation.upsert({
    where: { userId_pluginId: { userId, pluginId } },
    create: { userId, pluginId, pluginVersionId, enabled: true },
    update: { pluginVersionId, enabled: true },
  })
}

/** Removes a user's installation of a plugin entirely. */
export async function uninstallPlugin(userId: string, pluginId: string) {
  return prisma.pluginInstallation.deleteMany({ where: { userId, pluginId } })
}

/** Enables or disables an installed plugin without uninstalling it. */
export async function togglePlugin(userId: string, pluginId: string, enabled: boolean) {
  return prisma.pluginInstallation.update({
    where: { userId_pluginId: { userId, pluginId } },
    data: { enabled },
  })
}

/** Lists a user's enabled installations, with version+manifest, for rendering. */
export async function getUserInstallations(userId: string) {
  return prisma.pluginInstallation.findMany({
    where: { userId, enabled: true },
    include: { pluginVersion: true, plugin: true },
  })
}

/**
 * Checks whether a newer APPROVED version exists for a plugin than the one
 * a user currently has installed. Used to surface a manual "Update" prompt.
 */
export async function getAvailableUpdate(pluginId: string, currentVersion: string) {
  return prisma.pluginVersion.findFirst({
    where: { pluginId, status: 'APPROVED', version: { not: currentVersion } },
    orderBy: { createdAt: 'desc' },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/plugins/installations.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/plugins/installations.ts lib/plugins/installations.test.ts
git commit -m "feat(plugins): add per-user install/uninstall/toggle/update-check service"
```

---

### Task 13: Render orchestration (sandbox + context + error isolation)

**Files:**
- Create: `lib/plugins/render.ts`
- Test: `lib/plugins/render.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./installations', () => ({ getUserInstallations: vi.fn() }))
vi.mock('./storage', () => ({ downloadBundle: vi.fn() }))
vi.mock('./audit', () => ({ logPluginAction: vi.fn() }))

import { getUserInstallations } from './installations'
import { downloadBundle } from './storage'
import { logPluginAction } from './audit'
import { renderWidgetsForUser } from './render'

beforeEach(() => {
  vi.mocked(getUserInstallations).mockReset()
  vi.mocked(downloadBundle).mockReset()
  vi.mocked(logPluginAction).mockReset()
})

describe('renderWidgetsForUser', () => {
  it('returns blocks from a plugin registered for the requested slot', async () => {
    vi.mocked(getUserInstallations).mockResolvedValue([
      {
        pluginId: 'plugin-1',
        plugin: { id: 'plugin-1' },
        pluginVersion: {
          manifest: { permissions: ['widgets:dashboard:top'] },
          bundleStorageKey: 'key-1',
        },
      },
    ] as never)
    vi.mocked(downloadBundle).mockResolvedValue(`
      module.exports = {
        init: (ctx) => ctx.registerWidget('DASHBOARD_TOP', () => [{ type: 'text', value: 'hi' }]),
      }
    `)

    const blocks = await renderWidgetsForUser('user-1', 'DASHBOARD_TOP')
    expect(blocks).toEqual([{ type: 'text', value: 'hi' }])
  })

  it('isolates a throwing plugin into an error block instead of failing the whole render', async () => {
    vi.mocked(getUserInstallations).mockResolvedValue([
      {
        pluginId: 'plugin-1',
        plugin: { id: 'plugin-1' },
        pluginVersion: {
          manifest: { permissions: ['widgets:dashboard:top'] },
          bundleStorageKey: 'key-1',
        },
      },
    ] as never)
    vi.mocked(downloadBundle).mockResolvedValue(`
      module.exports = { init: () => { throw new Error('boom') } }
    `)

    const blocks = await renderWidgetsForUser('user-1', 'DASHBOARD_TOP')
    expect(blocks).toEqual([{ type: 'text', value: 'This widget failed to load.' }])
    expect(logPluginAction).toHaveBeenCalledWith('plugin-1', 'user-1', 'widget.error', expect.anything())
  })

  it('returns no blocks when no installed plugin registers the slot', async () => {
    vi.mocked(getUserInstallations).mockResolvedValue([])
    const blocks = await renderWidgetsForUser('user-1', 'DASHBOARD_TOP')
    expect(blocks).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/plugins/render.test.ts`
Expected: FAIL  `./render` does not exist.

- [ ] **Step 3: Write implementation**

```ts
import type { WidgetSlot } from '@prisma/client'
import type { UIBlock } from './blocks'
import { getUserInstallations } from './installations'
import { downloadBundle } from './storage'
import { loadPluginModule, callPluginExport } from './sandbox'
import { createPluginContext } from './context'
import { logPluginAction } from './audit'
import { SANDBOX_TIMEOUT_MS } from './config'

const ERROR_BLOCK: UIBlock = { type: 'text', value: 'This widget failed to load.' }

/**
 * Renders all blocks contributed by a user's installed, enabled plugins for
 * a single widget slot. Each plugin runs in its own sandbox; a failure in
 * one plugin yields an error block for that plugin only and never affects
 * the others.
 * @param userId - User whose installations to render
 * @param slot - Widget slot being rendered (e.g. "DASHBOARD_TOP")
 * @example const blocks = await renderWidgetsForUser(userId, "DASHBOARD_TOP")
 */
export async function renderWidgetsForUser(userId: string, slot: WidgetSlot): Promise<UIBlock[]> {
  const installations = await getUserInstallations(userId)
  const blocks: UIBlock[] = []

  for (const installation of installations) {
    const manifest = installation.pluginVersion.manifest as { permissions: string[] }
    try {
      const code = await downloadBundle(installation.pluginVersion.bundleStorageKey)
      const { exports } = loadPluginModule(code)
      const { context, registrations } = createPluginContext({
        pluginId: installation.pluginId,
        userId,
        capabilities: manifest.permissions,
      })
      await callPluginExport(exports, 'init', [context], SANDBOX_TIMEOUT_MS)

      const handler = registrations.widgets.get(slot)
      if (!handler) continue

      const result = await Promise.race([
        Promise.resolve(handler()),
        new Promise<UIBlock[]>((_, reject) =>
          setTimeout(() => reject(new Error('widget handler timed out')), SANDBOX_TIMEOUT_MS),
        ),
      ])
      blocks.push(...result)
    } catch (error) {
      blocks.push(ERROR_BLOCK)
      await logPluginAction(installation.pluginId, userId, 'widget.error', {
        slot,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return blocks
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/plugins/render.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/plugins/render.ts lib/plugins/render.test.ts
git commit -m "feat(plugins): add per-plugin sandboxed render orchestration with error isolation"
```

---

### Task 14: Plugin i18n loader

**Files:**
- Create: `lib/plugins/i18n.ts`
- Test: `lib/plugins/i18n.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest'

const addResourceBundle = vi.fn()
vi.mock('@/lib/i18n/config', () => ({ default: { addResourceBundle } }))

import { registerPluginLocales } from './i18n'

describe('registerPluginLocales', () => {
  it('registers each locale under the plugin namespace', () => {
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/plugins/i18n.test.ts`
Expected: FAIL  `./i18n` does not exist.

- [ ] **Step 3: Write implementation**

```ts
import i18n from '@/lib/i18n/config'

/**
 * Registers a plugin's manifest-supplied translations into i18next under a
 * dedicated `plugin:<slug>` namespace, isolated from host translation keys.
 * @param slug - Plugin slug, used to build the namespace
 * @param locales - Manifest `locales` map, e.g. `{ en: {...}, pl: {...} }`
 * @example registerPluginLocales("my-plugin", manifest.locales)
 */
export function registerPluginLocales(slug: string, locales: Record<string, Record<string, string>> | undefined) {
  if (!locales) return
  const namespace = `plugin:${slug}`
  for (const [lang, resources] of Object.entries(locales)) {
    i18n.addResourceBundle(lang, namespace, resources, true, true)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/plugins/i18n.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/plugins/i18n.ts lib/plugins/i18n.test.ts
git commit -m "feat(plugins): register plugin-supplied translations into i18next namespace"
```

---

### Task 15: BlockRenderer + PluginErrorBoundary components

**Files:**
- Create: `components/ui/plugins/BlockRenderer.tsx`
- Create: `components/ui/plugins/PluginErrorBoundary.tsx`

- [ ] **Step 1: Write PluginErrorBoundary**

```tsx
'use client'

import { Component, type ReactNode } from 'react'

interface PluginErrorBoundaryProps {
  children: ReactNode
}

interface PluginErrorBoundaryState {
  hasError: boolean
}

/**
 * Catches render-time exceptions thrown while rendering a plugin's block
 * tree so one broken plugin widget cannot crash the surrounding page.
 */
export class PluginErrorBoundary extends Component<PluginErrorBoundaryProps, PluginErrorBoundaryState> {
  state: PluginErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <p className="text-sm text-bone/60">This widget failed to render.</p>
    }
    return this.props.children
  }
}
```

- [ ] **Step 2: Write BlockRenderer**

```tsx
import type { UIBlock } from '@/lib/plugins/blocks'
import { PluginErrorBoundary } from './PluginErrorBoundary'

interface BlockRendererProps {
  blocks: UIBlock[]
}

/**
 * Renders a declarative plugin UIBlock tree using only trusted host
 * components  plugins never ship their own JSX/CSS.
 * @param blocks - Block tree produced by a plugin's widget/route handler
 * @example <BlockRenderer blocks={blocks} />
 */
export function BlockRenderer({ blocks }: BlockRendererProps) {
  return (
    <PluginErrorBoundary>
      <>
        {blocks.map((block, index) => (
          <Block key={index} block={block} />
        ))}
      </>
    </PluginErrorBoundary>
  )
}

function Block({ block }: { block: UIBlock }) {
  switch (block.type) {
    case 'text':
      return <p className="text-sm text-bone">{block.value}</p>
    case 'card':
      return (
        <div className="rounded-lg border border-bone/10 p-4">
          <h3 className="mb-2 font-semibold text-bone">{block.title}</h3>
          <BlockRenderer blocks={block.children} />
        </div>
      )
    case 'list':
      return (
        <ul className="list-disc pl-5 text-sm text-bone">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )
    case 'table':
      return (
        <table className="w-full text-sm text-bone">
          <thead>
            <tr>
              {block.columns.map((col, i) => (
                <th key={i} className="text-left">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    case 'button':
      return (
        <button type="button" className="rounded bg-success px-3 py-1 text-sm text-black" data-action={block.action}>
          {block.label}
        </button>
      )
  }
}
```

- [ ] **Step 3: Verify it type-checks and builds**

Run: `npx tsc --noEmit`
Expected: no errors from the two new files.

- [ ] **Step 4: Commit**

```bash
git add components/ui/plugins/BlockRenderer.tsx components/ui/plugins/PluginErrorBoundary.tsx
git commit -m "feat(plugins): add BlockRenderer and PluginErrorBoundary UI components"
```

---

### Task 16: Admin review API routes

**Files:**
- Create: `app/api/admin/plugins/route.ts`
- Create: `app/api/admin/plugins/[versionId]/review/route.ts`

- [ ] **Step 1: Write the list-pending route**

```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth/config'

/**
 * GET /api/admin/plugins
 * Lists all plugin versions awaiting review. Admin-only.
 */
export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const versions = await prisma.pluginVersion.findMany({
    where: { status: 'PENDING_REVIEW' },
    include: { plugin: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ versions })
}
```

- [ ] **Step 2: Write the approve/reject route**

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/config'
import { approveVersion, rejectVersion } from '@/lib/plugins/registry'
import { logPluginAction } from '@/lib/plugins/audit'
import { prisma } from '@/lib/prisma'

const reviewSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('approve') }),
  z.object({ decision: z.literal('reject'), reason: z.string().min(1).max(500) }),
])

/**
 * POST /api/admin/plugins/[versionId]/review
 * Approves or rejects a PENDING_REVIEW plugin version. Admin-only.
 */
export async function POST(request: Request, { params }: { params: Promise<{ versionId: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { versionId } = await params
  const parsed = reviewSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const version = await prisma.pluginVersion.findUnique({ where: { id: versionId } })
  if (!version) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 })
  }

  if (parsed.data.decision === 'approve') {
    await approveVersion(versionId, session.user.id)
    await logPluginAction(version.pluginId, session.user.id, 'version.approved', { versionId })
  } else {
    await rejectVersion(versionId, session.user.id, parsed.data.reason)
    await logPluginAction(version.pluginId, session.user.id, 'version.rejected', {
      versionId,
      reason: parsed.data.reason,
    })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors from the two new route files.

- [ ] **Step 4: Commit**

```bash
git add "app/api/admin/plugins/route.ts" "app/api/admin/plugins/[versionId]/review/route.ts"
git commit -m "feat(plugins): add admin review API routes for pending plugin versions"
```

---

### Task 17: User-facing browse + install API routes

**Files:**
- Create: `app/api/plugins/route.ts`
- Create: `app/api/plugins/install/route.ts`

- [ ] **Step 1: Write the browse route**

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { listApprovedPlugins } from '@/lib/plugins/registry'

/**
 * GET /api/plugins
 * Lists all approved plugin versions available to install.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const versions = await listApprovedPlugins()
  return NextResponse.json({ versions })
}
```

- [ ] **Step 2: Write the install/uninstall/toggle/update route**

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/config'
import { installPlugin, uninstallPlugin, togglePlugin, getAvailableUpdate } from '@/lib/plugins/installations'
import { logPluginAction } from '@/lib/plugins/audit'
import { prisma } from '@/lib/prisma'

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('install'), pluginId: z.string(), pluginVersionId: z.string() }),
  z.object({ action: z.literal('uninstall'), pluginId: z.string() }),
  z.object({ action: z.literal('toggle'), pluginId: z.string(), enabled: z.boolean() }),
  z.object({ action: z.literal('checkUpdate'), pluginId: z.string(), currentVersion: z.string() }),
])

/**
 * POST /api/plugins/install
 * Installs, uninstalls, toggles, or checks for an available update on a
 * plugin for the authenticated user. Updates are never applied automatically.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const parsed = actionSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  switch (parsed.data.action) {
    case 'install': {
      const version = await prisma.pluginVersion.findUnique({ where: { id: parsed.data.pluginVersionId } })
      if (!version || version.status !== 'APPROVED' || version.pluginId !== parsed.data.pluginId) {
        return NextResponse.json({ error: 'Version is not installable' }, { status: 400 })
      }
      await installPlugin(userId, parsed.data.pluginId, parsed.data.pluginVersionId)
      await logPluginAction(parsed.data.pluginId, userId, 'install', { pluginVersionId: parsed.data.pluginVersionId })
      return NextResponse.json({ ok: true })
    }
    case 'uninstall': {
      await uninstallPlugin(userId, parsed.data.pluginId)
      await logPluginAction(parsed.data.pluginId, userId, 'uninstall')
      return NextResponse.json({ ok: true })
    }
    case 'toggle': {
      await togglePlugin(userId, parsed.data.pluginId, parsed.data.enabled)
      await logPluginAction(parsed.data.pluginId, userId, parsed.data.enabled ? 'enable' : 'disable')
      return NextResponse.json({ ok: true })
    }
    case 'checkUpdate': {
      const update = await getAvailableUpdate(parsed.data.pluginId, parsed.data.currentVersion)
      return NextResponse.json({ update })
    }
  }
}
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors from the two new route files.

- [ ] **Step 4: Commit**

```bash
git add "app/api/plugins/route.ts" "app/api/plugins/install/route.ts"
git commit -m "feat(plugins): add user-facing browse and install/uninstall/toggle API routes"
```

---

### Task 18: Module documentation

**Files:**
- Create: `docs/plugins.md`

- [ ] **Step 1: Write the documentation**

```markdown
# Plugin System

## Opis
Backend systemu pluginów: rejestr (`Plugin`/`PluginVersion`), instalacje per-użytkownik, sandboksowane wykonanie (`node:vm`), deklaratywne UI (`UIBlock`), granularne uprawnienia (capabilities), KV storage, event bus i audit log.

## Technologie
Next.js (App Router), Prisma 7 + Postgres, `node:vm`, Supabase Storage, Zod, i18next, Vitest.

## Przepływ publikacji
1. Autor buduje bundle (`dist/index.js`, CommonJS, `module.exports = { init }`) i `manifest.json`.
2. `createPlugin()` zapisuje `Plugin` + pierwszą `PluginVersion` ze statusem `DRAFT`.
3. `submitVersionForReview()` → `PENDING_REVIEW`.
4. Admin: `POST /api/admin/plugins/[versionId]/review` → `APPROVED` lub `REJECTED`.
5. Tylko `APPROVED` widoczne w `GET /api/plugins`.

## Instalacja (per-user)
`POST /api/plugins/install` z akcją `install`/`uninstall`/`toggle`/`checkUpdate`. Aktualizacje są manualne  instalacja jest przypięta (`pluginVersionId`) do konkretnej wersji aż użytkownik sam zainstaluje nową.

## Uprawnienia
Lista w `lib/plugins/config.ts` (`PLUGIN_CAPABILITIES`). Każda metoda `PluginContext` (np. `registerWidget`, `api.storage.get`) sprawdza wymaganą capability przed wykonaniem  brak zgody = `Error`.

## Renderowanie
`lib/plugins/render.ts::renderWidgetsForUser(userId, slot)`:
1. Pobiera enabled installations użytkownika.
2. Ściąga bundle z Supabase Storage, ładuje w `node:vm` (`lib/plugins/sandbox.ts`).
3. Buduje `PluginContext` (`lib/plugins/context.ts`), woła `init(context)`.
4. Woła zarejestrowany handler dla danego slotu, z timeoutem (`SANDBOX_TIMEOUT_MS`).
5. Błąd pojedynczego pluginu → blok błędu + wpis w `PluginAuditLog`, reszta renderuje się normalnie.

Wynik (`UIBlock[]`) renderowany przez `components/ui/plugins/BlockRenderer.tsx`  plugin nigdy nie dostarcza własnego JSX.

## Storage i18n
Manifest może zawierać `locales: { en: {...}, pl: {...} }`; `lib/plugins/i18n.ts::registerPluginLocales()` rejestruje je w i18next pod namespace `plugin:<slug>`.

## Bezpieczeństwo
- Brak network access w sandboksie (brak `fetch`, brak `require`, brak `process`).
- Brak bezpośredniego dostępu do Prisma/DB  wyłącznie przez `PluginContext.api.storage` (KV, scoped per plugin+user).
- Timeout na wykonanie (`SANDBOX_TIMEOUT_MS`) chroni przed zawieszonym pluginem.
- Każda instalacja/zmiana/recenzja loguje się do `PluginAuditLog` (`lib/plugins/audit.ts`).
```

- [ ] **Step 2: Commit**

```bash
git add docs/plugins.md
git commit -m "docs(plugins): document plugin system architecture and flows"
```

---

## Self-Review Notes

- **Spec coverage:** sandbox (Task 7), no network (Task 7  no `fetch`/`require` exposed), declarative UI (Tasks 3, 15), granular capabilities (Tasks 2, 10), registry in same Prisma DB (Tasks 1, 11), prebuilt bundle in Supabase Storage (Task 6), semver + per-version review (Tasks 1, 11), per-user install (Task 12), manual update (Task 12's `getAvailableUpdate`, never auto-applied), i18n via manifest namespace (Task 14), widgets+routes+menuItems+events+KV (Tasks 5, 10, 13), audit log (Task 9), docs (Task 18).
- **Not yet covered  flag for a follow-up plan:** admin/user-facing dashboard pages (`/app/(dashboard)/admin/plugins`, `/app/(dashboard)/plugins`) that call these API routes, the upload endpoint for new plugin versions (bundle + manifest validation wired together end-to-end), `registerRoute` page rendering (a catch-all App Router route resolving registered plugin paths), and `registerMenuItem` wiring into the actual nav component. This plan delivers the complete backend; UI wiring is a natural next plan.
