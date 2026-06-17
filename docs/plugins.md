# Plugin System

## Opis

Backend systemu pluginów: rejestr (`Plugin`/`PluginVersion`), instalacje per-użytkownik, sandboksowane wykonanie (`node:vm`), deklaratywne UI (`UIBlock`), granularne uprawnienia (capabilities), KV storage, event bus i audit log.

Pluginy rozszerzają Instę przez rejestrację widgetów w predefiniowanych słotach UI, trasy routingu, pozycje menu i eventy globalne. Każdy plugin jest uruchamiany w izolowanym sandboksie; nigdy nie ma dostępu do bazy danych, systemu plików czy sieci poza explicite udostępnionymi API.

## Technologie

- **Next.js** (App Router) — API routes do zarządzania pluginami, rejestracji
- **Prisma 7** + **PostgreSQL** — rejestr pluginów, wersje, instalacje per-user, KV storage, audit log
- **node:vm** — sandboksowanie kodu pluginu, brak dostępu do fs/network/process, timeouty
- **Supabase Storage** (`plugin-bundles` bucket) — hosting bundlów pluginów (CommonJS `dist/index.js`)
- **Zod** — walidacja manifest.json
- **i18next** — rejestracja lokalizacji pluginów pod namespace `plugin:<slug>`
- **Vitest** — testy jednostkowe dla modułów sandbox, render, registry

## Architektura

```
lib/plugins/
  ├── config.ts           — PLUGIN_CAPABILITIES enum, WIDGET_SLOT_CAPABILITY map
  ├── blocks.ts           — UIBlock discriminated union (text, card, list, table, button)
  ├── manifest.ts         — parseManifest(), walidacja schematu manifest.json
  ├── storage.ts          — uploadBundle(), downloadBundle() (Supabase Storage)
  ├── sandbox.ts          — loadPluginModule(), callPluginExport() (node:vm)
  ├── kv.ts               — getPluginData(), setPluginData() (per-plugin-per-user KV)
  ├── audit.ts            — logPluginAction(), listPluginAuditLog()
  ├── context.ts          — createPluginContext() (PluginContext builder)
  ├── registry.ts         — createPlugin(), submitVersionForReview(), approveVersion(), rejectVersion(), listApprovedPlugins()
  ├── installations.ts    — installPlugin(), uninstallPlugin(), togglePlugin(), getUserInstallations(), getAvailableUpdate()
  ├── render.ts           — renderWidgetsForUser(userId, slot) → UIBlock[]
  └── i18n.ts             — registerPluginLocales(pluginId, locales)

components/ui/plugins/
  ├── BlockRenderer.tsx            — renders UIBlock tree → HTML/React
  └── PluginErrorBoundary.tsx      — React error boundary + audit logging

app/api/
  ├── admin/plugins/route.ts                          — GET list PENDING_REVIEW versions
  ├── admin/plugins/[versionId]/review/route.ts       — POST approve/reject version
  ├── plugins/route.ts                                — GET list approved plugins
  └── plugins/install/route.ts                        — POST install/uninstall/toggle/checkUpdate

types/
  └── plugin.ts           — InstraPlugin, PluginContext, PluginManifest interfaces

prisma/
  └── schema.prisma       — Plugin, PluginVersion, PluginInstallation, PluginData, PluginAuditLog models
```

## Przepływ publikacji

### 1. Tworzenie pluginu (developer)

Developer tworzy plugin:

```
my-plugin/
  ├── package.json
  ├── manifest.json        — metadane, uprawnienia, słoty
  ├── src/
  │   └── index.ts         — export { init }
  └── dist/
      └── index.js         — CommonJS bundle (built)
```

**manifest.json** przykład:

```json
{
  "slug": "my-plugin",
  "version": "1.0.0",
  "name": "My Plugin",
  "description": "Does something cool",
  "author": "Jane Doe",
  "permissions": [
    "widget:dashboard:top",
    "api.storage.get",
    "api.storage.set",
    "events.on",
    "i18n.t"
  ],
  "locales": {
    "en": { "title": "My Plugin" },
    "pl": { "title": "Mój Plugin" }
  }
}
```

**src/index.ts** przykład:

```typescript
import { PluginContext } from "@/types/plugin";
import { UIBlock } from "@/lib/plugins/blocks";

export async function init(context: PluginContext) {
  // Register widget for dashboard:top slot
  context.registerWidget("dashboard:top", async () => {
    const stored = await context.api.storage.get("counter");
    const count = (stored?.value as number) || 0;

    return [
      {
        type: "card",
        title: "My Counter",
        blocks: [
          { type: "text", content: `Count: ${count}` },
          {
            type: "button",
            label: "Increment",
            onClick: async () => {
              await context.api.storage.set("counter", count + 1);
              // UI will re-render on next page load
            }
          }
        ]
      }
    ] as UIBlock[];
  });

  // Listen to global events
  context.on("user:login", (data) => {
    context.logger.info("User logged in", data);
  });
}
```

### 2. Submit do recenzji

Developer buduje bundle (`npm run build` → `dist/index.js`) i wysyła:

```bash
POST /api/plugins/registry/submit
Content-Type: application/json

{
  "manifest": {...},
  "bundleUrl": "https://..."  /* bundle file (CommonJS) */
}
```

Backend:
1. Waliduje `manifest.json` (Zod schema)
2. Tworzy rekord `Plugin` (jeśli nowy) lub pobiera istniejący
3. Dodaje nowy `PluginVersion` ze statusem `DRAFT`
4. Ładuje bundle do `plugin-bundles` bucket w Supabase Storage
5. Zwraca `{ versionId, status: "DRAFT" }`
6. Developer: `submitVersionForReview(versionId)` → status zmienia się na `PENDING_REVIEW`

### 3. Admin review

Admin: `GET /api/admin/plugins` → lista wersji o statusie `PENDING_REVIEW`:

```json
[
  {
    "id": "v_xyz",
    "pluginSlug": "my-plugin",
    "version": "1.0.0",
    "status": "PENDING_REVIEW",
    "submittedAt": "2026-01-15T10:00:00Z",
    "manifest": {...}
  }
]
```

Admin ocenia: `POST /api/admin/plugins/v_xyz/review`

```json
{
  "action": "approve",
  "notes": "Looks good"
}
```

Backend:
- Sprawdza permissje (admin-only)
- Zmienia `PluginVersion.status` na `APPROVED` lub `REJECTED`
- Loguje akcję do `PluginAuditLog`
- Zwraca `{ status: "APPROVED" }`

Tylko `APPROVED` wersje pojawiają się w `GET /api/plugins`.

### 4. User install

User: `GET /api/plugins` → lista zatwierdzonych pluginów (najnowsza wersja każdego):

```json
[
  {
    "id": "my-plugin",
    "slug": "my-plugin",
    "name": "My Plugin",
    "description": "...",
    "author": "Jane Doe",
    "latestVersion": "1.0.0",
    "permissions": ["widget:dashboard:top", "api.storage.get", "api.storage.set"]
  }
]
```

User: `POST /api/plugins/install`

```json
{
  "action": "install",
  "pluginSlug": "my-plugin"
}
```

Backend:
1. Pobiera najnowszą `APPROVED` wersję pluginu
2. Tworzy `PluginInstallation` (pluginId, userId, pluginVersionId, enabled: true)
3. Loguje `PLUGIN_INSTALLED` do `PluginAuditLog`
4. Zwraca `{ installed: true, version: "1.0.0" }`

### 5. Rendering (runtime)

Na każdej stronie, która wyświetla widgety (np. dashboard), kod frontendowy woła:

```typescript
const widgets = await renderWidgetsForUser(userId, "dashboard:top");
```

**Przepływ:**

```
renderWidgetsForUser(userId, slot)
  ↓
  Get enabled PluginInstallations for user
  ↓
  For each installation:
    ↓ downloadBundle(pluginVersionId) from Supabase
    ↓ loadPluginModule(bundleCode, sandbox)  [node:vm]
    ↓ createPluginContext(plugin, userId, capabilities)
    ↓ callPluginExport(module.init, context, TIMEOUT)  [timeouted]
    ↓ Call registered widget handler for slot → UIBlock[]
    
    If error:
      ↓ Log to PluginAuditLog (error entry)
      ↓ Return ErrorBoundary UIBlock
    
  ↓
  Merge all UIBlock[] → return to frontend
  ↓
  BlockRenderer renders tree → HTML/React
```

## Uprawnienia (Capabilities)

Każdy plugin deklaruje swoje uprawnienia w `manifest.json`.`permissions` array.

**Lista dostępnych capabilities** (`lib/plugins/config.ts`):

```typescript
export enum PluginCapability {
  // UI Registration
  WIDGET_DASHBOARD_TOP = "widget:dashboard:top",
  WIDGET_DASHBOARD_SIDEBAR = "widget:dashboard:sidebar",
  WIDGET_DASHBOARD_BOTTOM = "widget:dashboard:bottom",
  WIDGET_SETTINGS_GENERAL = "widget:settings:general",
  WIDGET_SETTINGS_ADVANCED = "widget:settings:advanced",
  WIDGET_HEADER_ACTIONS = "widget:header:actions",
  WIDGET_PROFILE_MENU = "widget:profile:menu",

  // Storage & Data
  API_STORAGE_GET = "api.storage.get",      // PluginData read
  API_STORAGE_SET = "api.storage.set",      // PluginData write
  API_STORAGE_DELETE = "api.storage.delete", // PluginData delete

  // Events & Hooks
  EVENTS_ON = "events.on",
  EVENTS_OFF = "events.off",
  EVENTS_EMIT = "events.emit",

  // Internationalization
  I18N_T = "i18n.t",

  // Routing (future)
  ROUTE_REGISTER = "route:register",

  // Menu (future)
  MENU_ITEM_REGISTER = "menu:item:register",

  // Logger
  LOGGER = "logger",
}
```

**Każda metoda `PluginContext` sprawdza capability:**

```typescript
// context.ts
export function createPluginContext(
  plugin: Plugin,
  userId: string,
  permissions: PluginCapability[]
): PluginContext {
  return {
    registerWidget(slot, handler) {
      // slot="dashboard:top" → check WIDGET_DASHBOARD_TOP in permissions
      const requiredCap = WIDGET_SLOT_CAPABILITY[slot];
      if (!permissions.includes(requiredCap)) {
        throw new Error(`Plugin ${plugin.slug} lacks permission: ${requiredCap}`);
      }
      // register handler...
    },
    api: {
      storage: {
        get(key) {
          if (!permissions.includes(PluginCapability.API_STORAGE_GET)) {
            throw new Error("No api.storage.get permission");
          }
          return getPluginData(plugin.id, userId, key);
        },
        // ... similar for set, delete
      }
    },
    // ... similar for on/off/emit, logger, i18n.t
  };
}
```

Jeśli plugin spróbuje użyć uprawnienia, które nie ma, rzuci wyjątek → blok błędu + audit log.

## Sandboksowanie (node:vm)

**lib/plugins/sandbox.ts:**

```typescript
export function loadPluginModule(
  bundleCode: string,
  sandbox?: Record<string, any>
) {
  // CommonJS emulation
  const context = {
    module: { exports: {} },
    require: () => { throw new Error("require not allowed"); },
    global: {},
    // No fs, net, process, child_process, etc.
    // Only: console, setTimeout, clearTimeout (capped), Math, JSON, etc.
    ...sandbox
  };

  vm.runInNewContext(bundleCode, context);
  return context.module.exports;
}

export async function callPluginExport(
  fn: Function,
  context: PluginContext,
  timeoutMs: number
) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Plugin execution timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    Promise.resolve(fn(context))
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
```

**Globalne obiekty dostępne w sandboksie:**

- `console` (debug, log, warn, error)
- `JSON`, `Math`, `Date`, `Object`, `Array`, `String`, `Number`, `Boolean`
- `setTimeout`, `clearTimeout` (capped at ~5s)
- `module` + `module.exports` (CommonJS interface)
- **Brak:** `require`, `fs`, `net`, `http`, `process`, `child_process`, `eval`, `fetch`

**Timeout:** `SANDBOX_TIMEOUT_MS` (default 5000ms) ustawiony w `lib/plugins/config.ts`. Jeśli plugin zawiesza się, renderowanie dla tego pluginu przerywa się z błędem.

## Storage (KV per-plugin-per-user)

Każdy plugin może przechowywać dane per-user w `PluginData` tabeli:

```prisma
model PluginData {
  id            String   @id @default(cuid())
  pluginId      String
  userId        String
  key           String
  value         Json     // Dowolny JSON
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([pluginId, userId, key])
}
```

**API:**

```typescript
// lib/plugins/kv.ts
export async function getPluginData(
  pluginId: string,
  userId: string,
  key: string
): Promise<{ value: Json } | null> {
  return prisma.pluginData.findUnique({
    where: { pluginId_userId_key: { pluginId, userId, key } },
    select: { value: true }
  });
}

export async function setPluginData(
  pluginId: string,
  userId: string,
  key: string,
  value: Json
): Promise<void> {
  await prisma.pluginData.upsert({
    where: { pluginId_userId_key: { pluginId, userId, key } },
    update: { value },
    create: { pluginId, userId, key, value }
  });
}

export async function deletePluginData(
  pluginId: string,
  userId: string,
  key: string
): Promise<void> {
  await prisma.pluginData.delete({
    where: { pluginId_userId_key: { pluginId, userId, key } }
  });
}
```

**W pluginie:**

```typescript
export async function init(context: PluginContext) {
  const stored = await context.api.storage.get("myKey");
  if (stored) {
    console.log("Stored value:", stored.value);
  }

  await context.api.storage.set("myKey", { count: 42, name: "test" });
  await context.api.storage.delete("myKey");
}
```

Brak namespace izolacji — wszystkie klucze są per-plugin per-user. Rekomendacja: używaj prefiksu, np. `"feature:subkey"`.

## Events i Event Bus

Plugin może słuchać i emitować globalne eventy przez `PluginContext`:

```typescript
context.on("user:login", (data) => {
  console.log("User logged in:", data);
});

context.emit("custom:event", { detail: "..." });

context.off("user:login", handler);
```

**Wbudowane eventy:**
- `user:login` — użytkownik zalogował się
- `user:logout` — użytkownik wylogował się
- `plugin:installed` — plugin zainstalowany
- `plugin:uninstalled` — plugin odinstalowany
- `plugin:error` — plugin rzucił wyjątek

Event bus przechowywany w-memorii (będzie utrwalony po dodaniu pub/sub layer, np. Redis).

## Renderowanie (UIBlock)

Pluginy **nie** dostarcdzają JSX/React. Zamiast tego zwracają `UIBlock[]` — deklaratywne drzewo strukturalne.

**UIBlock schema** (`lib/plugins/blocks.ts`):

```typescript
export type UIBlock =
  | {
      type: "text";
      content: string;
      className?: string;
    }
  | {
      type: "card";
      title?: string;
      blocks: UIBlock[];
      className?: string;
    }
  | {
      type: "list";
      items: { label: string; value: string }[];
      className?: string;
    }
  | {
      type: "table";
      columns: { key: string; label: string }[];
      rows: Record<string, any>[];
      className?: string;
    }
  | {
      type: "button";
      label: string;
      onClick?: () => Promise<void>;
      variant?: "primary" | "secondary" | "danger";
      className?: string;
    };
```

**BlockRenderer** (`components/ui/plugins/BlockRenderer.tsx`):

```typescript
function BlockRenderer({ block }: { block: UIBlock }) {
  switch (block.type) {
    case "text":
      return <p className={block.className}>{block.content}</p>;
    case "card":
      return (
        <div className={block.className}>
          {block.title && <h3>{block.title}</h3>}
          <div>
            {block.blocks.map((b, i) => (
              <BlockRenderer key={i} block={b} />
            ))}
          </div>
        </div>
      );
    // ... other types
  }
}
```

**Przykład output pluginu:**

```typescript
const blocks: UIBlock[] = [
  {
    type: "card",
    title: "Stats",
    blocks: [
      { type: "text", content: "Total users: 1234" },
      {
        type: "list",
        items: [
          { label: "Active", value: "890" },
          { label: "Inactive", value: "344" }
        ]
      }
    ]
  }
];
```

Renderuje jako:

```html
<div>
  <h3>Stats</h3>
  <p>Total users: 1234</p>
  <ul>
    <li>Active: 890</li>
    <li>Inactive: 344</li>
  </ul>
</div>
```

## Lokalizacja (i18n)

Plugin może deklarować swoje stringi w manifest.json:

```json
{
  "slug": "my-plugin",
  "locales": {
    "en": {
      "title": "My Plugin",
      "description": "Does cool things"
    },
    "pl": {
      "title": "Mój Plugin",
      "description": "Robi fajne rzeczy"
    }
  }
}
```

Na renderowaniu: `lib/plugins/i18n.ts::registerPluginLocales(pluginId, locales)` rejestruje je w i18next pod namespace `plugin:<slug>`:

```typescript
// i18next configuration
i18next.addResourceBundle("en", "plugin:my-plugin", {
  title: "My Plugin",
  description: "Does cool things"
});

i18next.addResourceBundle("pl", "plugin:my-plugin", {
  title: "Mój Plugin",
  description: "Robi fajne rzeczy"
});
```

W pluginie:

```typescript
export async function init(context: PluginContext) {
  // Requires "i18n.t" permission
  const title = context.i18n.t("plugin:my-plugin:title");
  const desc = context.i18n.t("plugin:my-plugin:description");

  return [
    {
      type: "card",
      title,
      blocks: [{ type: "text", content: desc }]
    }
  ];
}
```

## Audit Log

Każda akcja na pluginach loguje się do `PluginAuditLog`:

```prisma
model PluginAuditLog {
  id            String   @id @default(cuid())
  pluginId      String
  userId        String?  // null for admin actions
  action        String   // PLUGIN_INSTALLED, PLUGIN_UPDATED, etc.
  details       Json?    // Additional context
  error         String?  // Error message if action failed
  createdAt     DateTime @default(now())
}
```

**Działania logowane:**

- `PLUGIN_CREATED` — developer stworzył plugin
- `PLUGIN_SUBMITTED_FOR_REVIEW` — dev zasubmitował wersję
- `PLUGIN_APPROVED` — admin zatwierdził wersję
- `PLUGIN_REJECTED` — admin odrzucił wersję
- `PLUGIN_INSTALLED` — user zainstalował plugin
- `PLUGIN_UNINSTALLED` — user odinstalował plugin
- `PLUGIN_UPDATED` — user zainstalował nową wersję
- `PLUGIN_ENABLED` — user włączył plugin
- `PLUGIN_DISABLED` — user wyłączył plugin
- `PLUGIN_EXECUTED` — plugin ran successfully at render time
- `PLUGIN_ERROR` — plugin threw error at render time

**API:**

```typescript
// lib/plugins/audit.ts
export async function logPluginAction(
  pluginId: string,
  userId: string | null,
  action: string,
  details?: Record<string, any>,
  error?: string
): Promise<void> {
  await prisma.pluginAuditLog.create({
    data: { pluginId, userId, action, details, error }
  });
}

export async function listPluginAuditLog(
  pluginId: string,
  limit = 50
): Promise<PluginAuditLog[]> {
  return prisma.pluginAuditLog.findMany({
    where: { pluginId },
    orderBy: { createdAt: "desc" },
    take: limit
  });
}
```

Admin dashboard może wyświetlić audit log dla każdego pluginu.

## API Routes

### GET /api/plugins

List zatwierdzonych pluginów (publiczny):

**Query params:** brak

**Response:**

```json
[
  {
    "id": "my-plugin",
    "slug": "my-plugin",
    "name": "My Plugin",
    "description": "Does cool things",
    "author": "Jane Doe",
    "latestVersion": "1.0.0",
    "permissions": [
      "widget:dashboard:top",
      "api.storage.get",
      "api.storage.set"
    ]
  }
]
```

### POST /api/plugins/install

Install/uninstall/toggle/checkUpdate pluginu (authenticated):

**Body:**

```json
{
  "action": "install" | "uninstall" | "toggle" | "checkUpdate",
  "pluginSlug": "my-plugin"
}
```

**Responses:**

- `action: "install"` → `{ installed: true, version: "1.0.0" }`
- `action: "uninstall"` → `{ installed: false }`
- `action: "toggle"` → `{ enabled: true/false }`
- `action: "checkUpdate"` → `{ updateAvailable: boolean, newVersion?: "1.1.0" }`

Update nigdy nie jest instalowany automatycznie — user musi jawnie pobrać nową wersję. Instal jest przymocowany do konkretnego `PluginVersionId`.

### GET /api/admin/plugins

List wersji do recenzji (admin only):

**Query params:** brak

**Response:**

```json
[
  {
    "id": "pv_xyz",
    "pluginSlug": "my-plugin",
    "version": "1.0.0",
    "status": "PENDING_REVIEW",
    "submittedAt": "2026-01-15T10:00:00Z",
    "submittedBy": "jane@example.com",
    "manifest": {
      "slug": "my-plugin",
      "name": "My Plugin",
      "permissions": [...]
    }
  }
]
```

### POST /api/admin/plugins/[versionId]/review

Approve/reject wersję (admin only):

**Body:**

```json
{
  "action": "approve" | "reject",
  "notes": "Looks good" | "Unsafe manifest"
}
```

**Response:**

```json
{
  "status": "APPROVED" | "REJECTED",
  "notes": "..."
}
```

## Bezpieczeństwo

### 1. Sandboksowanie

- Brak dostępu do `fs`, `net`, `http`, `child_process`, `eval`, itp.
- Timeout na wykonanie (default 5s)
- CommonJS emulation: `require` rzuca wyjątek

### 2. Capability-based access control

- Plugin deklaruje uprawnienia w manifest.json
- Każda metoda `PluginContext` sprawdza capability
- Brak uprawnienia = wyjątek

### 3. Per-user scope

- KV storage izolowany: `(pluginId, userId, key)`
- Instalacja per-user → każdy user widzi/instaluje niezależnie
- User nigdy nie może dostać się do danych innego usera

### 4. Manifest validation

- `lib/plugins/manifest.ts::parseManifest()` waliduje schema
- Nie dopuszcza nieznanego pola `permissions`
- Sprawdza format `slug` (alphanumeric + `-`)

### 5. Audit trail

- Każda instalacja, zmiana, recenzja loguje się
- Admin może odnieść się do historii dla każdego pluginu

### 6. Bundle integrity

- Bundle hostowany na Supabase Storage (read-only)
- Admin review przed `APPROVED` → niemożliwe publikować złośliwy kod bez audytu
- Bundle hash mogą być (future) weryfikowani przy załadowaniu

## Instalacja pluginu (for plugin authors)

### Quickstart

1. **Utwórz projekt:**

```bash
mkdir my-plugin && cd my-plugin
npm init -y
npm install typescript @types/node
```

2. **manifest.json:**

```json
{
  "slug": "my-plugin",
  "version": "1.0.0",
  "name": "My Plugin",
  "description": "My first plugin",
  "author": "You",
  "permissions": [
    "widget:dashboard:top",
    "api.storage.get",
    "api.storage.set",
    "logger"
  ]
}
```

3. **src/index.ts:**

```typescript
import { PluginContext } from "@/types/plugin";
import { UIBlock } from "@/lib/plugins/blocks";

export async function init(context: PluginContext) {
  context.registerWidget("dashboard:top", async () => {
    return [
      {
        type: "card",
        title: "Hello",
        blocks: [
          { type: "text", content: "Plugin is working!" }
        ]
      }
    ] as UIBlock[];
  });
}
```

4. **Build:**

```bash
npx tsc src/index.ts --module commonjs --outDir dist
```

**dist/index.js** powinien zawierać:

```javascript
module.exports = { init: [Function] };
```

5. **Submit:**

Wyślij `manifest.json` i `dist/index.js` do backendowego endpointu (TBD):
```
POST /api/plugins/registry/submit
```

6. **Admin review:**

Admin: `GET /api/admin/plugins` → `POST /api/admin/plugins/[id]/review` z `action: "approve"`

7. **User install:**

User: `GET /api/plugins` → `POST /api/plugins/install` z `pluginSlug: "my-plugin"`

8. **Rendering:**

Na stronie dashboard: `renderWidgetsForUser(userId, "dashboard:top")` → pokazuje widget z pluginu.

### Best Practices

- **Mały scope:** Jeden plugin = jedno zadanie
- **Uprawnienia:** Deklaruj tylko to, co potrzebujesz
- **Errory:** Zawsze wrap w try/catch; zwróć error UIBlock
- **i18n:** Zawsze tłumacz UI stringi
- **Docs:** Dołącz README.md z instrukcjami użytkownika
- **License:** Wybierz open-source license (MIT, Apache 2.0, itp.)
- **Versioning:** Używaj semver (MAJOR.MINOR.PATCH)

## Ograniczenia (current)

- **Routing:** `registerRoute()` deklaruje się w manifest, ale front-end routing TBD
- **Menu:** `registerMenuItem()` dostępne, ale wiring do nav komponentu TBD
- **Event bus:** In-memory, nie persisted/clustered — będzie Redis pub/sub
- **Upload endpoint:** API do wysłania bundla + manifest TBD — wymaga walidacji MIME + size limits
- **UI customization:** Pluginy mogą zwrócić tylko predefiniowane bloki (text, card, list, table, button); brak custom React komponentów

## Troubleshooting

### Plugin nie pokazuje się w GET /api/plugins

- Sprawdź: czy wersja ma status `APPROVED`?
- Admin: `GET /api/admin/plugins` → sprawdź `status` kolumnę

### Plugin wyrzuca "No permission" error

- Sprawdź: czy deklarowałeś capability w `manifest.json`?
- Przykład: `"permissions": ["widget:dashboard:top", "api.storage.get"]`

### Plugin zawiesza się (timeout)

- Sandbox timeout: 5000ms (konfigurowalny w `lib/plugins/config.ts`)
- Przyczyny: nieskończona pętla, synchroniczny polling, itp.
- Rozwiązanie: optimize plugin code

### Plugin nie ma dostępu do danych innego usera

- By design — KV storage scoped per `(pluginId, userId, key)`
- Admin users mogą logować się jako inny user (future feature), wtedy widzą ich dane

## API dla Plugin Developers (PluginContext)

```typescript
interface PluginContext {
  // UI Registration
  registerWidget(
    slot: WidgetSlot,
    handler: () => Promise<UIBlock[]>
  ): void;

  registerRoute(
    path: string,
    handler: () => Promise<UIBlock[]>
  ): void;

  registerMenuItem(
    label: string,
    onClick: () => Promise<void>
  ): void;

  // Storage (per-plugin-per-user KV)
  api: {
    storage: {
      get(key: string): Promise<{ value: Json } | null>;
      set(key: string, value: Json): Promise<void>;
      delete(key: string): Promise<void>;
    };
  };

  // Events & Hooks
  on(event: string, handler: (data: any) => void): void;
  off(event: string, handler: (data: any) => void): void;
  emit(event: string, data: any): void;

  // Internationalization
  i18n: {
    t(key: string, defaultValue?: string): string;
  };

  // Logging
  logger: {
    debug(msg: string, data?: any): void;
    info(msg: string, data?: any): void;
    warn(msg: string, data?: any): void;
    error(msg: string, data?: any): void;
  };
}
```

## Future Enhancements

- [ ] **Plugin auto-updates:** Opcja per-plugin "auto-update minor/patch versions"
- [ ] **Webhook events:** Pluginy mogą słuchać real-time z webhookow (stripe, github, itp.)
- [ ] **Admin dashboard UI:** Interfejs do przeglądania pluginów, recenzji, audit logs
- [ ] **User plugin page:** Strona z zainstalowanymi pluginami, toggles, delete
- [ ] **Plugin API versioning:** Manifest deklaruje `apiVersion: "1.0"` → kompatybilność
- [ ] **Custom React exports (future):** Pluginy mogą eksportować safe React components
- [ ] **Redis event bus:** Pub/sub dla multi-instance deployments
- [ ] **Plugin dependency manifest:** Plugin A może wymagać Plugin B

---

**Dokument ostatnio zaktualizowany:** 2026-06-17
