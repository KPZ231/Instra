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
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Does something cool",
  "author": "Jane Doe",
  "main": "dist/index.js",
  "permissions": [
    "widgets:dashboard:top",
    "storage:kv",
    "events:listen"
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
  // Register widget for DASHBOARD_TOP slot
  context.registerWidget("DASHBOARD_TOP", async () => {
    const stored = await context.api.storage.get("counter");
    const count = (stored as number) || 0;

    return [
      {
        type: "card",
        title: "My Counter",
        children: [
          { type: "text", value: `Count: ${count}` },
          {
            type: "button",
            label: "Increment",
            action: "counter:increment"
          }
        ]
      }
    ] as UIBlock[];
  });

  // Listen to global events
  context.on("user:login", (data) => {
    context.logger.info("User logged in");
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
    "permissions": ["widgets:dashboard:top", "storage:kv"]
  }
]
```

User: `POST /api/plugins/install`

```json
{
  "action": "install",
  "pluginId": "my-plugin",
  "pluginVersionId": "pv_xyz"
}
```

Backend:
1. Weryfikuje, że `PluginVersion` ma status `APPROVED` i należy do `pluginId`
2. Tworzy `PluginInstallation` (pluginId, userId, pluginVersionId, enabled: true)
3. Loguje `PLUGIN_INSTALLED` do `PluginAuditLog`
4. Zwraca `{ ok: true }`

### 5. Rendering (runtime)

Na każdej stronie, która wyświetla widgety (np. dashboard), kod frontendowy woła:

```typescript
const widgets = await renderWidgetsForUser(userId, "DASHBOARD_TOP");
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
export const PLUGIN_CAPABILITIES = [
  // Widget slots
  "widgets:dashboard:top",
  "widgets:dashboard:sidebar",
  "widgets:dashboard:bottom",
  "widgets:settings:general",
  "widgets:settings:advanced",
  "widgets:header:actions",
  "widgets:profile:menu",

  // Routing & Menu
  "routes:register",
  "menu:register",

  // Events
  "events:emit",
  "events:listen",

  // Storage
  "storage:kv",
] as const;
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
      // slot="DASHBOARD_TOP" → check "widgets:dashboard:top" in permissions
      const requiredCap = WIDGET_SLOT_CAPABILITY[slot];
      if (!permissions.includes(requiredCap)) {
        throw new Error(`Plugin ${plugin.slug} lacks permission: ${requiredCap}`);
      }
      // register handler...
    },
    api: {
      storage: {
        get(key) {
          if (!permissions.includes("storage:kv")) {
            throw new Error("No storage:kv permission");
          }
          return getPluginData(plugin.id, userId, key);
        },
        // ... similar for set
      }
    },
    // ... similar for on/off/emit
  };
}
```

Jeśli plugin spróbuje użyć uprawnienia, które nie ma, rzuci wyjątek → blok błędu + audit log.

## Sandboksowanie (node:vm)

**lib/plugins/sandbox.ts:**

```typescript
export function loadPluginModule(
  bundleCode: string,
  sandbox?: Record<string, unknown>
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
- `setTimeout`, `clearTimeout` (capped)
- `module` + `module.exports` (CommonJS interface)
- **Brak:** `require`, `fs`, `net`, `http`, `process`, `child_process`, `eval`, `fetch`

**Timeout:** `SANDBOX_TIMEOUT_MS` (500ms) ustawiony w `lib/plugins/config.ts`. Jeśli plugin zawiesza się, renderowanie dla tego pluginu przerywa się z błędem.

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
): Promise<unknown> {
  return prisma.pluginData.findUnique({
    where: { pluginId_userId_key: { pluginId, userId, key } },
    select: { value: true }
  });
}

export async function setPluginData(
  pluginId: string,
  userId: string,
  key: string,
  value: unknown
): Promise<void> {
  await prisma.pluginData.upsert({
    where: { pluginId_userId_key: { pluginId, userId, key } },
    update: { value },
    create: { pluginId, userId, key, value }
  });
}
```

**W pluginie:**

```typescript
export async function init(context: PluginContext) {
  const stored = await context.api.storage.get("myKey");
  if (stored) {
    context.logger.info("Value found in storage");
  }

  await context.api.storage.set("myKey", { count: 42, name: "test" });
}
```

Brak namespace izolacji — wszystkie klucze są per-plugin per-user. Rekomendacja: używaj prefiksu, np. `"feature:subkey"`.

## Events i Event Bus

Plugin może słuchać i emitować globalne eventy przez `PluginContext`:

```typescript
context.on("user:login", (data) => {
  context.logger.info("User logged in");
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

Pluginy **nie** dostarczają JSX/React. Zamiast tego zwracają `UIBlock[]` — deklaratywne drzewo strukturalne.

**UIBlock schema** (`lib/plugins/blocks.ts`):

```typescript
export type UIBlock =
  | { type: "text"; value: string }
  | { type: "card"; title: string; children: UIBlock[] }
  | { type: "list"; items: string[] }
  | { type: "table"; columns: string[]; rows: string[][] }
  | { type: "button"; label: string; action: string };
```

Ograniczenia walidatora:
- `card.children` max 50 elementów
- `list.items` max 200 elementów
- `table.columns` max 20, `table.rows` max 500

**BlockRenderer** (`components/ui/plugins/BlockRenderer.tsx`):

```typescript
function BlockRenderer({ block }: { block: UIBlock }) {
  switch (block.type) {
    case "text":
      return <p>{block.value}</p>;
    case "card":
      return (
        <div>
          <h3>{block.title}</h3>
          <div>
            {block.children.map((b, i) => (
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
    children: [
      { type: "text", value: "Total users: 1234" },
      {
        type: "list",
        items: ["Active: 890", "Inactive: 344"]
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
  "name": "my-plugin",
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

Lokalizacje są dostępne przez mechanizm i18next aplikacji. Plugin nie ma bezpośredniego dostępu do funkcji `t()` przez `PluginContext`.

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
  details?: Record<string, unknown>,
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
      "widgets:dashboard:top",
      "storage:kv"
    ]
  }
]
```

### POST /api/plugins/install

Install/uninstall/toggle/checkUpdate pluginu (authenticated).

Używa `discriminatedUnion` na polu `action`. Każdy wariant wymaga innych pól:

**install:**

```json
{
  "action": "install",
  "pluginId": "clxyz...",
  "pluginVersionId": "clpv..."
}
```

Odpowiedź: `{ "ok": true }`

**uninstall:**

```json
{
  "action": "uninstall",
  "pluginId": "clxyz..."
}
```

Odpowiedź: `{ "ok": true }`

**toggle:**

```json
{
  "action": "toggle",
  "pluginId": "clxyz...",
  "enabled": true
}
```

Odpowiedź: `{ "ok": true }`

**checkUpdate:**

```json
{
  "action": "checkUpdate",
  "pluginId": "clxyz...",
  "currentVersion": "1.0.0"
}
```

Odpowiedź: `{ "update": { ... } | null }`

Update nigdy nie jest instalowany automatycznie — user musi jawnie wywołać `install` z nowym `pluginVersionId`.

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
- Timeout na wykonanie: 500ms (`SANDBOX_TIMEOUT_MS`)
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
- Sprawdza format semver dla `version`

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
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "My first plugin",
  "author": "You",
  "main": "dist/index.js",
  "permissions": [
    "widgets:dashboard:top",
    "storage:kv"
  ]
}
```

3. **src/index.ts:**

```typescript
import { PluginContext } from "@/types/plugin";
import { UIBlock } from "@/lib/plugins/blocks";

export async function init(context: PluginContext) {
  context.registerWidget("DASHBOARD_TOP", async () => {
    return [
      {
        type: "card",
        title: "Hello",
        children: [
          { type: "text", value: "Plugin is working!" }
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

User: `GET /api/plugins` → `POST /api/plugins/install` z `action: "install"`, `pluginId` i `pluginVersionId`

8. **Rendering:**

Na stronie dashboard: `renderWidgetsForUser(userId, "DASHBOARD_TOP")` → pokazuje widget z pluginu.

### Best Practices

- **Mały scope:** Jeden plugin = jedno zadanie
- **Uprawnienia:** Deklaruj tylko to, co potrzebujesz
- **Errory:** Zawsze wrap w try/catch; zwróć error UIBlock
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
- Przykład: `"permissions": ["widgets:dashboard:top", "storage:kv"]`

### Plugin zawiesza się (timeout)

- Sandbox timeout: 500ms (`SANDBOX_TIMEOUT_MS` w `lib/plugins/config.ts`)
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
    handler: () => UIBlock[] | Promise<UIBlock[]>
  ): void;

  registerRoute(
    path: string,
    handler: () => UIBlock[] | Promise<UIBlock[]>
  ): void;

  registerMenuItem(item: { label: string; path: string }): void;

  // Storage (per-plugin-per-user KV)
  api: {
    storage: {
      get(key: string): Promise<unknown>;
      set(key: string, value: unknown): Promise<void>;
    };
  };

  // Events & Hooks
  on(event: string, listener: (payload: unknown) => void): void;
  off(event: string, listener: (payload: unknown) => void): void;
  emit(event: string, payload: unknown): void;

  // Logging
  logger: {
    info(message: string): void;
    error(message: string): void;
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
