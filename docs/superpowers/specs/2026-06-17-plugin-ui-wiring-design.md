# Plugin UI Wiring  Design Spec
_2026-06-17_

## Overview

Wire the plugin system backend (Tasks 1-18) into the dashboard UI. Four surfaces:
1. Dashboard widget slot  renders plugin UIBlocks on the main dashboard
2. Plugin marketplace  browse, install, uninstall, update
3. Plugin upload  any user submits a bundle for review
4. Admin review panel  admin approves/rejects pending plugins

Architecture: **Server Components first**. Pages fetch data server-side (Prisma/service functions). Only interactive elements (buttons, forms) are Client Components.

---

## Routing

| Route | Component | Access |
|---|---|---|
| `/dashboard/plugins` | PluginMarketplace | all users |
| `/dashboard/plugins/upload` | PluginUploadPage | all users |
| `/dashboard/admin/plugins` | AdminReviewPanel | ADMIN only |

---

## 1. Dashboard Widget Slot

**File:** `components/dashboard/DashboardWidgetSlot.tsx` (Server Component)

- Calls `renderWidgetsForUser(userId, WidgetSlot.DASHBOARD_TOP)` from `lib/plugins/render.ts`
- Wraps result in `PluginErrorBoundary`
- Renders `UIBlock[]` via `BlockRenderer`
- When no plugins installed or no widgets registered: shows subtle empty state ("Brak aktywnych pluginów  przeglądaj marketplace")

**Integration:** Replace dashed placeholder in `DashboardOverview.tsx` (Row 3, right column) with `<DashboardWidgetSlot />`.

---

## 2. Plugin Marketplace

**File:** `app/(dashboard)/dashboard/plugins/page.tsx` (Server Component)

Data fetched server-side:
- `listApprovedPlugins()` → all approved plugin versions
- `getUserInstallations(userId)` → user's installed plugins (Map pluginId → installation)
- `getAvailableUpdate` called per installed plugin to detect updates

**Component:** `components/dashboard/plugins/PluginCard.tsx`

Card layout (dark surface, 1px border rgba(255,255,255,0.06), hover 0.15):
```
[slug]                          [INSTALLED] or [UPDATE]
Plugin Name                     ← Hanken Grotesk white
Short description               ← bone color
Author · v1.2.0 · 3 caps       ← mono outline color
[widget] [storage] [events]     ← capability chips
                    [Odinstaluj] or [Zainstaluj]
```

**Component:** `components/dashboard/plugins/InstallButton.tsx` (Client Component)
- Props: `pluginId`, `pluginVersionId`, `installed: boolean`, `hasUpdate: boolean`, `latestVersionId?: string`
- Calls `POST /api/plugins/install` with appropriate action
- On success: `router.refresh()`
- Loading state: button disabled + spinner

**Empty state:** When 0 approved plugins  mono text "Brak dostępnych pluginów".

---

## 3. Plugin Upload

**File:** `app/(dashboard)/dashboard/plugins/upload/page.tsx` (Server Component shell + Client Form)

**Component:** `components/dashboard/plugins/UploadForm.tsx` (Client Component)

Fields:
- `slug`  kebab-case identifier (unique)
- `name`  display name
- `description`  short description
- `version`  semver (e.g. `1.0.0`)
- `manifest`  JSON textarea or file upload of manifest.json
- `bundle`  file input, accepts `.js` only

Flow:
1. User fills form, selects files
2. `POST /api/plugins/upload` (multipart/form-data)
3. Server: validate manifest via `parseManifest()`, upload bundle via `uploadBundle()`, call `createPlugin()` + auto `submitVersionForReview()`
4. Redirect to `/dashboard/plugins` with success message

**New API route:** `app/api/plugins/upload/route.ts`
- Auth: 401 if unauthenticated
- Parse multipart: `slug`, `name`, `description`, `version`, `manifest` (JSON string), `bundle` (file)
- Validate: manifest schema, bundle is `.js`, semver version
- `uploadBundle(slug, version, bundleBuffer)`
- `createPlugin({ slug, name, description, authorId, version, manifest, bundleStorageKey })`
- `submitVersionForReview(newVersion.id)`
- Returns 201 `{ pluginId, versionId }`

---

## 4. Admin Review Panel

**File:** `app/(dashboard)/dashboard/admin/plugins/page.tsx` (Server Component)
- Auth guard: redirect to `/dashboard` if `user.role !== 'ADMIN'`
- Data: `prisma.pluginVersion.findMany({ where: { status: 'PENDING_REVIEW' }, include: { plugin: true } })`

**Component:** `components/dashboard/plugins/AdminReviewCard.tsx`

Layout:
```
[PENDING REVIEW]   submitted 2 days ago
Plugin Name (slug)
Author: user@email.com · v1.0.0
Description...
Capabilities: [widget:dashboard:top] [storage:kv]
manifest.json preview (collapsible)
        [Odrzuć ▾]  [Zatwierdź]
```

**Component:** `components/dashboard/plugins/ReviewActions.tsx` (Client Component)
- Approve: calls `POST /api/admin/plugins/[versionId]/review` with `{ decision: 'approve' }`
- Reject: reveals textarea for reason, then `{ decision: 'reject', reason }`
- On success: `router.refresh()`

**Sidebar:** `DashboardSidebar.tsx`  add Admin link (`/dashboard/admin/plugins`) visible only when `user.role === 'ADMIN'`. Requires sidebar to receive `role` prop from layout.

---

## Visual Design

- All surfaces: `var(--color-surface-container-lowest)` background, 1px border `rgba(255,255,255,0.06)`
- Labels/secondary text: `var(--color-on-surface-variant)`, JetBrains Mono, uppercase, tracked
- Primary values: `var(--color-primary)` (white), Hanken Grotesk
- Capability chips: rectangular 2px radius, bone border, mono uppercase text, no fill
- Buttons: Primary = white solid; Secondary = bone border transparent; Danger = `#93000a` border
- Cards hover: border opacity → 0.15
- Inputs: dark bg, 1px border 20% white, focus → 100% white

---

## i18n Keys

New keys needed in `locales/pl/common.json` and `locales/en/common.json`:
- `plugins.marketplace.*`  marketplace headings, empty states
- `plugins.upload.*`  form labels, success/error messages
- `plugins.admin.*`  admin panel headings, actions
- `dashboard.plugins.*`  widget slot labels

---

## File Summary

New files:
- `app/(dashboard)/dashboard/plugins/page.tsx`
- `app/(dashboard)/dashboard/plugins/upload/page.tsx`
- `app/(dashboard)/dashboard/admin/plugins/page.tsx`
- `app/api/plugins/upload/route.ts`
- `components/dashboard/plugins/PluginCard.tsx`
- `components/dashboard/plugins/InstallButton.tsx`
- `components/dashboard/plugins/UploadForm.tsx`
- `components/dashboard/plugins/AdminReviewCard.tsx`
- `components/dashboard/plugins/ReviewActions.tsx`
- `components/dashboard/DashboardWidgetSlot.tsx`

Modified files:
- `components/dashboard/DashboardOverview.tsx`  replace placeholder with DashboardWidgetSlot
- `components/dashboard/DashboardSidebar.tsx`  admin link, role prop
- `app/(dashboard)/layout.tsx`  pass role to sidebar
- `locales/pl/common.json` + `locales/en/common.json`  new i18n keys
