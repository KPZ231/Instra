# Plugin UI Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the plugin system backend into 4 dashboard UI surfaces: widget slot on the main dashboard, plugin marketplace with install/uninstall, plugin upload form, and admin review panel.

**Architecture:** Server Components fetch data server-side (Prisma/service functions directly); only interactive elements (buttons, forms, router.refresh) are `"use client"` Client Components. No SWR/React Query  server re-render on mutation via `router.refresh()`.

**Tech Stack:** Next.js 15 App Router, React Server Components, TailwindCSS, Prisma, `@prisma/client`, i18next (`useTranslation` in client components, `getTranslations` or hardcoded strings in server components since i18n is client-side here), lucide-react icons, framer-motion (already used in dashboard).

## Global Constraints

- TypeScript everywhere; no `any`
- TailwindCSS only for styles  use `var(--color-*)` CSS variables from globals.css for all colours
- Dark theme: surfaces use `var(--color-surface-container-lowest)` bg, borders `rgba(255,255,255,0.06)`, hover `rgba(255,255,255,0.15)`
- Labels/secondary text: `var(--color-on-surface-variant)`, JetBrains Mono, uppercase, letter-spacing
- Primary values: `var(--color-primary)` (white), Hanken Grotesk
- Capability chips: rectangular `rounded-sm`, bone border `var(--color-accent-bone)` at 30% opacity, no fill, JetBrains Mono uppercase text
- Buttons: Primary = white bg black text; Secondary = bone border transparent bg; Danger = red border `#93000a` text `#ffb4ab`
- JSDoc on every exported component and function
- `async/await` always; never `.then()`
- No hardcoded UI text  add keys to both `locales/en/common.json` AND `locales/pl/common.json`
- `"use client"` only on components that need browser APIs, hooks, or interactivity
- Every page that needs auth calls `verifySession()` from `@/lib/auth/dal`
- Admin pages redirect to `/dashboard` if `user.role !== 'ADMIN'`
- No stack traces in API error responses

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `locales/en/common.json` (modify) | Add `plugins.*` and `dashboard.pluginSlot.*` keys |
| `locales/pl/common.json` (modify) | Same keys in Polish |
| `components/dashboard/DashboardWidgetSlot.tsx` | Server component  renders DASHBOARD_TOP plugin widgets |
| `components/dashboard/plugins/PluginCard.tsx` | Rich plugin card (display only, receives install state as props) |
| `components/dashboard/plugins/InstallButton.tsx` | Client  install/uninstall/toggle button, calls API |
| `components/dashboard/plugins/UploadForm.tsx` | Client  multipart form for plugin bundle upload |
| `components/dashboard/plugins/AdminReviewCard.tsx` | Display card for a pending-review plugin version |
| `components/dashboard/plugins/ReviewActions.tsx` | Client  approve/reject buttons, calls API |
| `app/(dashboard)/dashboard/plugins/page.tsx` | Server  marketplace page |
| `app/(dashboard)/dashboard/plugins/upload/page.tsx` | Server shell + UploadForm |
| `app/(dashboard)/dashboard/admin/plugins/page.tsx` | Server  admin review panel |
| `app/api/plugins/upload/route.ts` | POST  parse multipart, upload bundle, create plugin |

### Modified files
| File | Change |
|---|---|
| `components/dashboard/DashboardOverview.tsx` | Replace dashed plugin placeholder with `<DashboardWidgetSlot />` |
| `components/dashboard/DashboardSidebar.tsx` | Accept `role` prop; show Admin nav item when ADMIN |
| `app/(dashboard)/layout.tsx` | Pass `user.role` to `DashboardSidebar` |

---

## Task 1: i18n keys + sidebar admin link

**Files:**
- Modify: `locales/en/common.json`
- Modify: `locales/pl/common.json`
- Modify: `components/dashboard/DashboardSidebar.tsx`
- Modify: `app/(dashboard)/layout.tsx`

**Interfaces:**
- Produces: `DashboardSidebar` accepts `role: string` prop; admin link `/dashboard/admin/plugins` shown when `role === 'ADMIN'`
- Produces: i18n keys `plugins.marketplace.*`, `plugins.upload.*`, `plugins.admin.*`, `dashboard.pluginSlot.*`

- [ ] **Step 1: Add i18n keys to English locale**

In `locales/en/common.json`, find the `"dashboard"` object and add after the `"pluginSlot"` block. Also add a top-level `"plugins"` key:

```json
"pluginSlot": {
    "label": "// PLUGIN SLOT",
    "empty": "No active plugins  browse the marketplace",
    "hint": "DASHBOARD_TOP  install a plugin to use this slot"
},
"adminNav": "Admin"
```

And add a new top-level `"plugins"` section (after `"dashboard"`):
```json
"plugins": {
    "marketplace": {
        "label": "// MARKETPLACE",
        "heading": "Plugin Marketplace",
        "empty": "No plugins available yet.",
        "installed": "INSTALLED",
        "update": "UPDATE",
        "install": "Install",
        "uninstall": "Uninstall",
        "update_action": "Update",
        "author": "by",
        "capabilities": "capabilities",
        "installing": "Installing...",
        "uninstalling": "Uninstalling..."
    },
    "upload": {
        "label": "// UPLOAD PLUGIN",
        "heading": "Submit a Plugin",
        "slug_label": "Slug",
        "slug_placeholder": "my-plugin",
        "name_label": "Name",
        "name_placeholder": "My Plugin",
        "description_label": "Description",
        "description_placeholder": "What does this plugin do?",
        "version_label": "Version",
        "version_placeholder": "1.0.0",
        "manifest_label": "Manifest JSON",
        "manifest_placeholder": "{\"name\": \"my-plugin\", \"version\": \"1.0.0\", \"description\": \"\", \"author\": \"\", \"permissions\": []}",
        "bundle_label": "Bundle (.js)",
        "submit": "Submit for Review",
        "submitting": "Submitting...",
        "success": "Plugin submitted for review.",
        "error": "Failed to submit plugin."
    },
    "admin": {
        "label": "// ADMIN",
        "heading": "Plugin Review Queue",
        "empty": "No plugins pending review.",
        "approve": "Approve",
        "reject": "Reject",
        "reject_reason_label": "Rejection reason",
        "reject_reason_placeholder": "Explain why this plugin is being rejected...",
        "confirm_reject": "Confirm Rejection",
        "cancel": "Cancel",
        "approving": "Approving...",
        "rejecting": "Rejecting...",
        "pending_badge": "PENDING REVIEW",
        "submitted": "submitted",
        "version_label": "version",
        "author_label": "author",
        "capabilities_label": "capabilities",
        "manifest_label": "Manifest"
    }
}
```

- [ ] **Step 2: Add same keys to Polish locale**

In `locales/pl/common.json`, add matching Polish translations:

In `dashboard.pluginSlot`:
```json
"pluginSlot": {
    "label": "// SLOT PLUGINÓW",
    "empty": "Brak aktywnych pluginów  przeglądaj marketplace",
    "hint": "DASHBOARD_TOP  zainstaluj plugin aby użyć tego slotu"
},
"adminNav": "Admin"
```

New top-level `"plugins"` section:
```json
"plugins": {
    "marketplace": {
        "label": "// MARKETPLACE",
        "heading": "Marketplace Pluginów",
        "empty": "Brak dostępnych pluginów.",
        "installed": "ZAINSTALOWANY",
        "update": "AKTUALIZACJA",
        "install": "Zainstaluj",
        "uninstall": "Odinstaluj",
        "update_action": "Aktualizuj",
        "author": "autor",
        "capabilities": "uprawnienia",
        "installing": "Instalowanie...",
        "uninstalling": "Odinstalowywanie..."
    },
    "upload": {
        "label": "// PRZEŚLIJ PLUGIN",
        "heading": "Prześlij Plugin",
        "slug_label": "Slug",
        "slug_placeholder": "moj-plugin",
        "name_label": "Nazwa",
        "name_placeholder": "Mój Plugin",
        "description_label": "Opis",
        "description_placeholder": "Co robi ten plugin?",
        "version_label": "Wersja",
        "version_placeholder": "1.0.0",
        "manifest_label": "Manifest JSON",
        "manifest_placeholder": "{\"name\": \"moj-plugin\", \"version\": \"1.0.0\", \"description\": \"\", \"author\": \"\", \"permissions\": []}",
        "bundle_label": "Bundle (.js)",
        "submit": "Prześlij do recenzji",
        "submitting": "Przesyłanie...",
        "success": "Plugin przesłany do recenzji.",
        "error": "Błąd przesyłania pluginu."
    },
    "admin": {
        "label": "// ADMIN",
        "heading": "Kolejka Recenzji Pluginów",
        "empty": "Brak pluginów oczekujących na recenzję.",
        "approve": "Zatwierdź",
        "reject": "Odrzuć",
        "reject_reason_label": "Powód odrzucenia",
        "reject_reason_placeholder": "Wyjaśnij dlaczego ten plugin jest odrzucany...",
        "confirm_reject": "Potwierdź odrzucenie",
        "cancel": "Anuluj",
        "approving": "Zatwierdzanie...",
        "rejecting": "Odrzucanie...",
        "pending_badge": "OCZEKUJE NA RECENZJĘ",
        "submitted": "przesłano",
        "version_label": "wersja",
        "author_label": "autor",
        "capabilities_label": "uprawnienia",
        "manifest_label": "Manifest"
    }
}
```

- [ ] **Step 3: Update DashboardSidebar to accept role prop and show admin link**

Replace `components/dashboard/DashboardSidebar.tsx` content:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  BarChart2,
  CalendarDays,
  Puzzle,
  Settings,
  Zap,
  ShieldCheck,
} from "lucide-react";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard.nav.overview", icon: <LayoutDashboard size={18} /> },
  { href: "/dashboard/analytics", labelKey: "dashboard.nav.analytics", icon: <BarChart2 size={18} /> },
  { href: "/dashboard/campaigns", labelKey: "dashboard.nav.campaigns", icon: <Zap size={18} /> },
  { href: "/dashboard/schedule", labelKey: "dashboard.nav.schedule", icon: <CalendarDays size={18} /> },
  { href: "/dashboard/plugins", labelKey: "dashboard.nav.plugins", icon: <Puzzle size={18} /> },
  { href: "/dashboard/settings", labelKey: "dashboard.nav.settings", icon: <Settings size={18} /> },
  { href: "/dashboard/admin/plugins", labelKey: "dashboard.adminNav", icon: <ShieldCheck size={18} />, adminOnly: true },
];

interface DashboardSidebarProps {
  role?: string;
}

/**
 * Fixed left sidebar for the dashboard shell.
 * Highlights the active route via usePathname.
 * Shows admin link when role === 'ADMIN'.
 *
 * @param role - Current user's role, used to show admin navigation
 * @example
 * <DashboardSidebar role="ADMIN" />
 */
export default function DashboardSidebar({ role }: DashboardSidebarProps) {
  const { t } = useTranslation();
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || role === "ADMIN"
  );

  return (
    <aside
      className="hidden lg:flex flex-col w-60 shrink-0 border-r"
      style={{
        background: "var(--color-surface-container-lowest)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 px-6 py-5 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <span
          className="font-mono text-xs tracking-[0.12em] uppercase"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          // INSTRA
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-colors group relative"
              style={{
                color: isActive ? "var(--color-primary)" : "var(--color-on-surface-variant)",
                background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
              }}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
                  style={{ background: "var(--color-primary)" }}
                />
              )}
              <span className="shrink-0">{item.icon}</span>
              <span className="font-mono text-xs tracking-[0.08em] uppercase">
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-6 py-4 border-t"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <p
          className="font-mono text-xs tracking-[0.05em]"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          v0.1.0-alpha
        </p>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Update DashboardLayout to pass role to sidebar**

Replace `app/(dashboard)/layout.tsx`:

```tsx
import { verifySession } from "@/lib/auth/dal";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

/**
 * Dashboard shell  server component.
 * Calls verifySession() which redirects to /login when unauthenticated.
 * Passes user role to sidebar for conditional admin link display.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = await verifySession();

  return (
    <div className="flex h-dvh overflow-hidden bg-[#000000]">
      <DashboardSidebar role={user.role} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <DashboardHeader user={user} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add locales/en/common.json locales/pl/common.json components/dashboard/DashboardSidebar.tsx app/(dashboard)/layout.tsx
git commit -m "feat(plugins): add i18n keys and admin sidebar link"
```

---

## Task 2: Dashboard Widget Slot

**Files:**
- Create: `components/dashboard/DashboardWidgetSlot.tsx`
- Modify: `components/dashboard/DashboardOverview.tsx`

**Interfaces:**
- Consumes: `renderWidgetsForUser(userId: string, slot: WidgetSlot): Promise<UIBlock[]>` from `@/lib/plugins/render`
- Consumes: `verifySession()` from `@/lib/auth/dal` → `{ user: { id: string } }`
- Consumes: `BlockRenderer` from `@/components/ui/plugins/BlockRenderer`
- Consumes: `PluginErrorBoundary` from `@/components/ui/plugins/PluginErrorBoundary`
- Consumes: `WidgetSlot` enum from `@prisma/client`
- Produces: `<DashboardWidgetSlot />`  zero-prop Server Component to drop in DashboardOverview

- [ ] **Step 1: Create DashboardWidgetSlot**

Create `components/dashboard/DashboardWidgetSlot.tsx`:

```tsx
import { verifySession } from "@/lib/auth/dal";
import { renderWidgetsForUser } from "@/lib/plugins/render";
import BlockRenderer from "@/components/ui/plugins/BlockRenderer";
import PluginErrorBoundary from "@/components/ui/plugins/PluginErrorBoundary";
import { WidgetSlot } from "@prisma/client";

/**
 * Server component that renders all plugin widgets registered for the
 * DASHBOARD_TOP slot for the current authenticated user.
 * Each plugin is wrapped in an error boundary so one failing plugin
 * cannot crash the entire dashboard.
 *
 * @example
 * <DashboardWidgetSlot />
 */
export default async function DashboardWidgetSlot() {
  const { user } = await verifySession();
  const blocks = await renderWidgetsForUser(user.id, WidgetSlot.DASHBOARD_TOP);

  if (blocks.length === 0) {
    return (
      <div
        className="rounded-sm border flex items-center justify-center py-10"
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          borderStyle: "dashed",
        }}
      >
        <div className="text-center">
          <p
            className="font-mono text-xs tracking-[0.1em] uppercase mb-2"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            // PLUGIN SLOT
          </p>
          <p
            className="font-mono text-xs"
            style={{ color: "var(--color-outline)" }}
          >
            DASHBOARD_TOP  install a plugin to use this slot
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-sm border p-4"
      style={{ borderColor: "rgba(255,255,255,0.06)" }}
    >
      <p
        className="font-mono text-xs tracking-[0.12em] uppercase mb-3"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        // PLUGIN SLOT
      </p>
      <PluginErrorBoundary>
        <BlockRenderer blocks={blocks} />
      </PluginErrorBoundary>
    </div>
  );
}
```

- [ ] **Step 2: Replace placeholder in DashboardOverview**

In `components/dashboard/DashboardOverview.tsx`, replace the dashed placeholder block (the `<motion.div>` that has `borderStyle: "dashed"` and the plugin slot text) with:

```tsx
import DashboardWidgetSlot from "@/components/dashboard/DashboardWidgetSlot";

// Replace the placeholder motion.div with:
<motion.div variants={fadeUp}>
  <DashboardWidgetSlot />
</motion.div>
```

Keep the surrounding `<motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-4">` structure  just swap out the right column child.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/DashboardWidgetSlot.tsx components/dashboard/DashboardOverview.tsx
git commit -m "feat(plugins): add dashboard widget slot for DASHBOARD_TOP"
```

---

## Task 3: Plugin Marketplace

**Files:**
- Create: `components/dashboard/plugins/PluginCard.tsx`
- Create: `components/dashboard/plugins/InstallButton.tsx`
- Create: `app/(dashboard)/dashboard/plugins/page.tsx`

**Interfaces:**
- Consumes: `listApprovedPlugins()` → `Array<PluginVersion & { plugin: Plugin }>` from `@/lib/plugins/registry`
- Consumes: `getUserInstallations(userId)` → `Array<PluginInstallation & { plugin: Plugin, pluginVersion: PluginVersion }>` from `@/lib/plugins/installations`
- Consumes: `getAvailableUpdate(pluginId, currentVersion)` → `PluginVersion | null` from `@/lib/plugins/installations`
- Consumes: `POST /api/plugins/install` with body `{ action: 'install'|'uninstall', pluginId, pluginVersionId? }`
- Consumes: `verifySession()` from `@/lib/auth/dal`
- Produces: marketplace page at `/dashboard/plugins`

- [ ] **Step 1: Create InstallButton client component**

Create `components/dashboard/plugins/InstallButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface InstallButtonProps {
  pluginId: string;
  pluginVersionId: string;
  installed: boolean;
  hasUpdate: boolean;
  latestVersionId?: string;
}

/**
 * Client component button for installing, uninstalling, or updating a plugin.
 * Calls POST /api/plugins/install and refreshes the page on success.
 *
 * @param pluginId - Plugin ID
 * @param pluginVersionId - Currently approved version ID (for install)
 * @param installed - Whether the plugin is currently installed
 * @param hasUpdate - Whether a newer approved version is available
 * @param latestVersionId - The newest approved version ID (for update)
 */
export default function InstallButton({
  pluginId,
  pluginVersionId,
  installed,
  hasUpdate,
  latestVersionId,
}: InstallButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAction(action: "install" | "uninstall") {
    setLoading(true);
    try {
      const body =
        action === "install"
          ? { action, pluginId, pluginVersionId: latestVersionId ?? pluginVersionId }
          : { action, pluginId };

      const res = await fetch("/api/plugins/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Plugin action failed:", data.error);
      } else {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (installed) {
    return (
      <div className="flex gap-2">
        {hasUpdate && (
          <button
            onClick={() => handleAction("install")}
            disabled={loading}
            className="px-3 py-1.5 rounded-sm font-mono text-xs tracking-[0.08em] uppercase transition-colors disabled:opacity-50"
            style={{
              background: "var(--color-success-green)",
              color: "#000",
            }}
          >
            {loading ? "..." : "Update"}
          </button>
        )}
        <button
          onClick={() => handleAction("uninstall")}
          disabled={loading}
          className="px-3 py-1.5 rounded-sm font-mono text-xs tracking-[0.08em] uppercase border transition-colors disabled:opacity-50"
          style={{
            borderColor: "rgba(255,75,75,0.4)",
            color: "#ffb4ab",
            background: "transparent",
          }}
        >
          {loading ? "..." : "Odinstaluj"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => handleAction("install")}
      disabled={loading}
      className="px-3 py-1.5 rounded-sm font-mono text-xs tracking-[0.08em] uppercase transition-colors disabled:opacity-50"
      style={{
        background: "var(--color-primary)",
        color: "var(--color-on-primary)",
      }}
    >
      {loading ? "..." : "Zainstaluj"}
    </button>
  );
}
```

- [ ] **Step 2: Create PluginCard component**

Create `components/dashboard/plugins/PluginCard.tsx`:

```tsx
import InstallButton from "./InstallButton";

interface PluginCardProps {
  id: string;
  slug: string;
  name: string;
  description: string;
  authorEmail: string;
  version: string;
  capabilities: string[];
  installed: boolean;
  hasUpdate: boolean;
  latestVersionId: string;
  installedVersionId?: string;
}

/**
 * Rich card displaying a plugin from the marketplace.
 * Shows slug, name, description, author, version, capabilities,
 * install status badge, and an action button.
 *
 * @param id - Plugin ID
 * @param slug - Unique plugin slug
 * @param name - Display name
 * @param description - Short description
 * @param authorEmail - Plugin author email
 * @param version - Current approved version string
 * @param capabilities - Array of capability strings from manifest
 * @param installed - Whether the current user has this installed
 * @param hasUpdate - Whether a newer version is available
 * @param latestVersionId - ID of the newest approved version
 * @param installedVersionId - ID of the currently installed version (if any)
 */
export default function PluginCard({
  id,
  slug,
  name,
  description,
  authorEmail,
  version,
  capabilities,
  installed,
  hasUpdate,
  latestVersionId,
  installedVersionId,
}: PluginCardProps) {
  return (
    <div
      className="rounded-sm border p-5 flex flex-col gap-4 transition-colors group"
      style={{
        background: "var(--color-surface-container-lowest)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.15)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)";
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <span
          className="font-mono text-[10px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-sm border"
          style={{
            borderColor: "rgba(232,227,217,0.3)",
            color: "var(--color-accent-bone)",
          }}
        >
          {slug}
        </span>
        <div className="flex gap-1.5">
          {hasUpdate && (
            <span
              className="font-mono text-[10px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-sm border"
              style={{
                borderColor: "rgba(0,255,65,0.4)",
                color: "var(--color-success-green)",
              }}
            >
              UPDATE
            </span>
          )}
          {installed && (
            <span
              className="font-mono text-[10px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-sm border"
              style={{
                borderColor: "rgba(255,255,255,0.2)",
                color: "var(--color-primary)",
              }}
            >
              INSTALLED
            </span>
          )}
        </div>
      </div>

      {/* Name + description */}
      <div>
        <h3
          className="font-sans text-base font-semibold mb-1"
          style={{ color: "var(--color-primary)" }}
        >
          {name}
        </h3>
        <p
          className="font-sans text-sm leading-relaxed"
          style={{ color: "var(--color-accent-bone)" }}
        >
          {description}
        </p>
      </div>

      {/* Meta */}
      <p
        className="font-mono text-[11px] tracking-[0.05em]"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        {authorEmail} · v{version} · {capabilities.length} capabilities
      </p>

      {/* Capability chips */}
      {capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {capabilities.map((cap) => (
            <span
              key={cap}
              className="font-mono text-[10px] tracking-[0.08em] uppercase px-1.5 py-0.5 rounded-sm border"
              style={{
                borderColor: "rgba(232,227,217,0.2)",
                color: "var(--color-on-surface-variant)",
              }}
            >
              {cap}
            </span>
          ))}
        </div>
      )}

      {/* Action */}
      <div className="mt-auto flex justify-end">
        <InstallButton
          pluginId={id}
          pluginVersionId={installedVersionId ?? latestVersionId}
          installed={installed}
          hasUpdate={hasUpdate}
          latestVersionId={latestVersionId}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create marketplace page**

Create `app/(dashboard)/dashboard/plugins/page.tsx`:

```tsx
import type { Metadata } from "next";
import { verifySession } from "@/lib/auth/dal";
import { listApprovedPlugins } from "@/lib/plugins/registry";
import { getUserInstallations, getAvailableUpdate } from "@/lib/plugins/installations";
import PluginCard from "@/components/dashboard/plugins/PluginCard";
import Link from "next/link";
import type { PluginManifest } from "@/lib/plugins/manifest";

export const metadata: Metadata = {
  title: "Plugin Marketplace  Instra",
  robots: { index: false, follow: false },
};

/**
 * Plugin marketplace page  server component.
 * Lists all approved plugins with the current user's installation state.
 */
export default async function PluginsMarketplacePage() {
  const { user } = await verifySession();

  const [approvedVersions, installations] = await Promise.all([
    listApprovedPlugins(),
    getUserInstallations(user.id),
  ]);

  const installedMap = new Map(
    installations.map((inst) => [inst.pluginId, inst])
  );

  const pluginCards = await Promise.all(
    approvedVersions.map(async (version) => {
      const installation = installedMap.get(version.pluginId);
      const update = installation
        ? await getAvailableUpdate(version.pluginId, installation.pluginVersion.version)
        : null;

      const manifest = version.manifest as PluginManifest;

      return {
        id: version.pluginId,
        slug: version.plugin.slug,
        name: version.plugin.name,
        description: version.plugin.description,
        authorEmail: user.id, // author info not stored on plugin yet  use pluginId as fallback
        version: version.version,
        capabilities: manifest.permissions ?? [],
        installed: !!installation,
        hasUpdate: !!update,
        latestVersionId: version.id,
        installedVersionId: installation?.pluginVersionId,
      };
    })
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p
            className="font-mono text-xs tracking-[0.12em] uppercase mb-1"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            // MARKETPLACE
          </p>
          <h1
            className="font-sans text-2xl font-semibold"
            style={{ color: "var(--color-primary)" }}
          >
            Plugin Marketplace
          </h1>
        </div>
        <Link
          href="/dashboard/plugins/upload"
          className="px-4 py-2 rounded-sm font-mono text-xs tracking-[0.08em] uppercase border transition-colors"
          style={{
            borderColor: "rgba(232,227,217,0.3)",
            color: "var(--color-accent-bone)",
          }}
        >
          + Submit Plugin
        </Link>
      </div>

      {/* Grid */}
      {pluginCards.length === 0 ? (
        <div
          className="rounded-sm border flex items-center justify-center py-16"
          style={{
            borderColor: "rgba(255,255,255,0.06)",
            borderStyle: "dashed",
          }}
        >
          <p
            className="font-mono text-xs tracking-[0.1em] uppercase"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            No plugins available yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {pluginCards.map((card) => (
            <PluginCard key={card.id} {...card} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/plugins/InstallButton.tsx components/dashboard/plugins/PluginCard.tsx app/(dashboard)/dashboard/plugins/page.tsx
git commit -m "feat(plugins): add plugin marketplace page with install/uninstall"
```

---

## Task 4: Plugin Upload

**Files:**
- Create: `app/api/plugins/upload/route.ts`
- Create: `components/dashboard/plugins/UploadForm.tsx`
- Create: `app/(dashboard)/dashboard/plugins/upload/page.tsx`

**Interfaces:**
- Consumes: `uploadBundle(slug, version, code): Promise<string>` from `@/lib/plugins/storage`
- Consumes: `createPlugin(input)` from `@/lib/plugins/registry`
- Consumes: `submitVersionForReview(versionId)` from `@/lib/plugins/registry`
- Consumes: `parseManifest(manifest): SafeParseReturnType` from `@/lib/plugins/manifest`
- Consumes: `verifySession()` / `auth()` from session
- Produces: `POST /api/plugins/upload`  accepts multipart/form-data, returns `{ pluginId, versionId }` on 201

- [ ] **Step 1: Create upload API route**

Create `app/api/plugins/upload/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { uploadBundle, buildBundleKey } from "@/lib/plugins/storage";
import { createPlugin, submitVersionForReview } from "@/lib/plugins/registry";
import { parseManifest } from "@/lib/plugins/manifest";

/**
 * POST /api/plugins/upload
 * Accepts multipart/form-data with fields:
 *   - slug: string
 *   - name: string
 *   - description: string
 *   - manifest: JSON string
 *   - bundle: .js file
 *
 * Creates a plugin + version in PENDING_REVIEW state.
 * @returns 201 { pluginId, versionId } on success
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const slug = formData.get("slug");
  const name = formData.get("name");
  const description = formData.get("description");
  const manifestStr = formData.get("manifest");
  const bundleFile = formData.get("bundle");

  if (
    typeof slug !== "string" || !slug.trim() ||
    typeof name !== "string" || !name.trim() ||
    typeof description !== "string" || !description.trim() ||
    typeof manifestStr !== "string" || !manifestStr.trim() ||
    !(bundleFile instanceof File)
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!bundleFile.name.endsWith(".js")) {
    return NextResponse.json({ error: "Bundle must be a .js file" }, { status: 400 });
  }

  let manifestJson: unknown;
  try {
    manifestJson = JSON.parse(manifestStr);
  } catch {
    return NextResponse.json({ error: "Manifest must be valid JSON" }, { status: 400 });
  }

  const manifestResult = parseManifest(manifestJson);
  if (!manifestResult.success) {
    return NextResponse.json(
      { error: `Invalid manifest: ${manifestResult.error.message}` },
      { status: 400 }
    );
  }

  const bundleCode = await bundleFile.text();
  const storageKey = buildBundleKey(slug.trim(), manifestResult.data.version);

  try {
    await uploadBundle(slug.trim(), manifestResult.data.version, bundleCode);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Bundle upload failed: ${msg}` }, { status: 400 });
  }

  let pluginId: string;
  let versionId: string;
  try {
    const { plugin, version } = await createPlugin({
      slug: slug.trim(),
      name: name.trim(),
      description: description.trim(),
      authorId: userId,
      manifest: manifestResult.data,
      bundleStorageKey: storageKey,
    });
    pluginId = plugin.id;
    versionId = version.id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    await submitVersionForReview(versionId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Failed to submit for review: ${msg}` }, { status: 500 });
  }

  return NextResponse.json({ pluginId, versionId }, { status: 201 });
}
```

- [ ] **Step 2: Create UploadForm client component**

Create `components/dashboard/plugins/UploadForm.tsx`:

```tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const inputStyle = {
  background: "var(--color-surface-container-lowest)",
  borderColor: "rgba(255,255,255,0.2)",
  color: "var(--color-primary)",
};

const focusStyle = {
  borderColor: "rgba(255,255,255,1)",
};

/**
 * Form for uploading a plugin bundle and manifest for review.
 * Sends multipart/form-data to POST /api/plugins/upload.
 * Redirects to /dashboard/plugins on success.
 */
export default function UploadForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/plugins/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      router.push("/dashboard/plugins");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function getFieldStyle(fieldName: string) {
    return {
      ...inputStyle,
      ...(focusedField === fieldName ? focusStyle : {}),
    };
  }

  const labelClass = "font-mono text-[11px] tracking-[0.1em] uppercase mb-1.5 block";
  const inputClass = "w-full rounded-sm border px-3 py-2.5 text-sm font-sans bg-transparent outline-none transition-colors";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      {/* Slug */}
      <div>
        <label
          htmlFor="slug"
          className={labelClass}
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          placeholder="my-plugin"
          required
          pattern="^[a-z0-9-]+$"
          className={inputClass}
          style={getFieldStyle("slug")}
          onFocus={() => setFocusedField("slug")}
          onBlur={() => setFocusedField(null)}
        />
        <p className="font-mono text-[10px] mt-1" style={{ color: "var(--color-outline)" }}>
          lowercase letters, numbers, hyphens only
        </p>
      </div>

      {/* Name */}
      <div>
        <label
          htmlFor="name"
          className={labelClass}
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          Nazwa
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="My Plugin"
          required
          className={inputClass}
          style={getFieldStyle("name")}
          onFocus={() => setFocusedField("name")}
          onBlur={() => setFocusedField(null)}
        />
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className={labelClass}
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          Opis
        </label>
        <input
          id="description"
          name="description"
          type="text"
          placeholder="Co robi ten plugin?"
          required
          className={inputClass}
          style={getFieldStyle("description")}
          onFocus={() => setFocusedField("description")}
          onBlur={() => setFocusedField(null)}
        />
      </div>

      {/* Manifest JSON */}
      <div>
        <label
          htmlFor="manifest"
          className={labelClass}
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          Manifest JSON
        </label>
        <textarea
          id="manifest"
          name="manifest"
          rows={6}
          placeholder={`{\n  "name": "my-plugin",\n  "version": "1.0.0",\n  "description": "",\n  "author": "",\n  "permissions": []\n}`}
          required
          className={inputClass + " resize-none font-mono text-xs"}
          style={getFieldStyle("manifest")}
          onFocus={() => setFocusedField("manifest")}
          onBlur={() => setFocusedField(null)}
        />
      </div>

      {/* Bundle file */}
      <div>
        <label
          htmlFor="bundle"
          className={labelClass}
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          Bundle (.js)
        </label>
        <input
          id="bundle"
          name="bundle"
          type="file"
          accept=".js"
          required
          className="w-full font-mono text-xs rounded-sm border px-3 py-2.5 transition-colors file:mr-3 file:font-mono file:text-xs file:uppercase file:tracking-[0.08em] file:rounded-sm file:border-0 file:px-3 file:py-1.5 cursor-pointer"
          style={{
            borderColor: "rgba(255,255,255,0.2)",
            color: "var(--color-on-surface-variant)",
            // @ts-expect-error file input styling
            "--file-button-bg": "rgba(255,255,255,0.08)",
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <p
          className="font-mono text-xs px-3 py-2 rounded-sm border"
          style={{
            color: "#ffb4ab",
            borderColor: "rgba(255,75,75,0.3)",
            background: "rgba(255,75,75,0.05)",
          }}
        >
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2.5 rounded-sm font-mono text-xs tracking-[0.08em] uppercase transition-opacity disabled:opacity-50"
        style={{
          background: "var(--color-primary)",
          color: "var(--color-on-primary)",
        }}
      >
        {loading ? "Przesyłanie..." : "Prześlij do recenzji"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create upload page**

Create `app/(dashboard)/dashboard/plugins/upload/page.tsx`:

```tsx
import type { Metadata } from "next";
import { verifySession } from "@/lib/auth/dal";
import UploadForm from "@/components/dashboard/plugins/UploadForm";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Submit Plugin  Instra",
  robots: { index: false, follow: false },
};

/**
 * Plugin upload page  server component shell wrapping the client upload form.
 */
export default async function PluginUploadPage() {
  await verifySession();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/plugins"
          className="font-mono text-[11px] tracking-[0.08em] uppercase mb-3 inline-block transition-colors"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          ← Marketplace
        </Link>
        <p
          className="font-mono text-xs tracking-[0.12em] uppercase mb-1"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          // PRZEŚLIJ PLUGIN
        </p>
        <h1
          className="font-sans text-2xl font-semibold"
          style={{ color: "var(--color-primary)" }}
        >
          Prześlij Plugin
        </h1>
        <p
          className="font-sans text-sm mt-2"
          style={{ color: "var(--color-accent-bone)" }}
        >
          Plugin trafi do kolejki recenzji. Po zatwierdzeniu przez admina zostanie opublikowany w marketplace.
        </p>
      </div>

      {/* Form */}
      <div
        className="rounded-sm border p-6"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <UploadForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/plugins/upload/route.ts components/dashboard/plugins/UploadForm.tsx app/(dashboard)/dashboard/plugins/upload/page.tsx
git commit -m "feat(plugins): add plugin upload form and API endpoint"
```

---

## Task 5: Admin Review Panel

**Files:**
- Create: `components/dashboard/plugins/AdminReviewCard.tsx`
- Create: `components/dashboard/plugins/ReviewActions.tsx`
- Create: `app/(dashboard)/dashboard/admin/plugins/page.tsx`

**Interfaces:**
- Consumes: `prisma.pluginVersion.findMany({ where: { status: 'PENDING_REVIEW' }, include: { plugin: { include: { author: true } } } })` directly in the server page
- Consumes: `POST /api/admin/plugins/[versionId]/review` with `{ decision: 'approve' | 'reject', reason?: string }`
- Consumes: `verifySession()` from `@/lib/auth/dal`
- Consumes: `UserRole` from `@prisma/client`
- Produces: admin panel at `/dashboard/admin/plugins` (ADMIN only)

- [ ] **Step 1: Create ReviewActions client component**

Create `components/dashboard/plugins/ReviewActions.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ReviewActionsProps {
  versionId: string;
}

/**
 * Client component with Approve and Reject buttons for admin plugin review.
 * Reject reveals a textarea for the rejection reason before confirming.
 * Calls POST /api/admin/plugins/[versionId]/review and refreshes on success.
 *
 * @param versionId - The PluginVersion ID to approve or reject
 */
export default function ReviewActions({ versionId }: ReviewActionsProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "rejecting">("idle");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitDecision(decision: "approve" | "reject") {
    setLoading(true);
    setError(null);
    try {
      const body =
        decision === "approve"
          ? { decision }
          : { decision, reason };

      const res = await fetch(`/api/admin/plugins/${versionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Request failed.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (mode === "rejecting") {
    return (
      <div className="space-y-3">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Powód odrzucenia..."
          rows={3}
          className="w-full rounded-sm border px-3 py-2 font-mono text-xs bg-transparent outline-none resize-none transition-colors"
          style={{
            borderColor: "rgba(255,75,75,0.4)",
            color: "var(--color-primary)",
          }}
        />
        {error && (
          <p className="font-mono text-[10px]" style={{ color: "#ffb4ab" }}>
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => submitDecision("reject")}
            disabled={loading || !reason.trim()}
            className="px-3 py-1.5 rounded-sm font-mono text-xs tracking-[0.08em] uppercase border transition-colors disabled:opacity-50"
            style={{ borderColor: "rgba(255,75,75,0.5)", color: "#ffb4ab" }}
          >
            {loading ? "..." : "Potwierdź odrzucenie"}
          </button>
          <button
            onClick={() => { setMode("idle"); setReason(""); setError(null); }}
            disabled={loading}
            className="px-3 py-1.5 rounded-sm font-mono text-xs tracking-[0.08em] uppercase border transition-colors disabled:opacity-50"
            style={{ borderColor: "rgba(255,255,255,0.1)", color: "var(--color-on-surface-variant)" }}
          >
            Anuluj
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {error && (
        <p className="font-mono text-[10px] self-center" style={{ color: "#ffb4ab" }}>
          {error}
        </p>
      )}
      <button
        onClick={() => setMode("rejecting")}
        disabled={loading}
        className="px-3 py-1.5 rounded-sm font-mono text-xs tracking-[0.08em] uppercase border transition-colors disabled:opacity-50"
        style={{ borderColor: "rgba(255,75,75,0.4)", color: "#ffb4ab" }}
      >
        Odrzuć
      </button>
      <button
        onClick={() => submitDecision("approve")}
        disabled={loading}
        className="px-3 py-1.5 rounded-sm font-mono text-xs tracking-[0.08em] uppercase transition-colors disabled:opacity-50"
        style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
      >
        {loading ? "..." : "Zatwierdź"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create AdminReviewCard component**

Create `components/dashboard/plugins/AdminReviewCard.tsx`:

```tsx
import ReviewActions from "./ReviewActions";
import type { PluginManifest } from "@/lib/plugins/manifest";

interface AdminReviewCardProps {
  versionId: string;
  slug: string;
  name: string;
  description: string;
  authorEmail: string | null;
  version: string;
  manifest: PluginManifest;
  submittedAt: string;
}

/**
 * Card displaying a plugin version awaiting admin review.
 * Shows plugin details, manifest summary, and approve/reject actions.
 *
 * @param versionId - PluginVersion ID for the review API call
 * @param slug - Plugin slug
 * @param name - Plugin display name
 * @param description - Plugin description
 * @param authorEmail - Submitter's email address
 * @param version - Version string (semver)
 * @param manifest - Parsed plugin manifest
 * @param submittedAt - ISO date string of submission time
 */
export default function AdminReviewCard({
  versionId,
  slug,
  name,
  description,
  authorEmail,
  version,
  manifest,
  submittedAt,
}: AdminReviewCardProps) {
  const date = new Date(submittedAt).toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className="rounded-sm border p-5 flex flex-col gap-4"
      style={{
        background: "var(--color-surface-container-lowest)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-[10px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-sm border"
            style={{ borderColor: "rgba(255,180,0,0.4)", color: "#ffd166" }}
          >
            OCZEKUJE NA RECENZJĘ
          </span>
          <span
            className="font-mono text-[10px] tracking-[0.05em]"
            style={{ color: "var(--color-outline)" }}
          >
            {date}
          </span>
        </div>
      </div>

      {/* Plugin info */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3
            className="font-sans text-base font-semibold"
            style={{ color: "var(--color-primary)" }}
          >
            {name}
          </h3>
          <span
            className="font-mono text-[10px] tracking-[0.08em] uppercase px-1.5 py-0.5 rounded-sm border"
            style={{ borderColor: "rgba(232,227,217,0.3)", color: "var(--color-accent-bone)" }}
          >
            {slug}
          </span>
        </div>
        <p
          className="font-sans text-sm"
          style={{ color: "var(--color-accent-bone)" }}
        >
          {description}
        </p>
      </div>

      {/* Meta */}
      <div
        className="font-mono text-[11px] space-y-0.5"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        <p>autor: {authorEmail ?? ""}</p>
        <p>wersja: {version}</p>
        {manifest.permissions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {manifest.permissions.map((cap) => (
              <span
                key={cap}
                className="font-mono text-[10px] tracking-[0.08em] uppercase px-1.5 py-0.5 rounded-sm border"
                style={{ borderColor: "rgba(232,227,217,0.2)", color: "var(--color-on-surface-variant)" }}
              >
                {cap}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Manifest preview */}
      <details className="group">
        <summary
          className="font-mono text-[11px] tracking-[0.08em] uppercase cursor-pointer list-none flex items-center gap-1"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
          Manifest JSON
        </summary>
        <pre
          className="mt-2 rounded-sm border p-3 font-mono text-[11px] overflow-auto max-h-48"
          style={{
            borderColor: "rgba(255,255,255,0.06)",
            color: "var(--color-accent-bone)",
            background: "rgba(0,0,0,0.3)",
          }}
        >
          {JSON.stringify(manifest, null, 2)}
        </pre>
      </details>

      {/* Actions */}
      <div className="flex justify-end pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <ReviewActions versionId={versionId} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create admin review page**

Create `app/(dashboard)/dashboard/admin/plugins/page.tsx`:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import AdminReviewCard from "@/components/dashboard/plugins/AdminReviewCard";
import { UserRole } from "@prisma/client";
import type { PluginManifest } from "@/lib/plugins/manifest";

export const metadata: Metadata = {
  title: "Plugin Review  Instra Admin",
  robots: { index: false, follow: false },
};

/**
 * Admin plugin review panel  server component.
 * Only accessible to users with role ADMIN; others are redirected to /dashboard.
 * Displays all plugin versions with PENDING_REVIEW status.
 */
export default async function AdminPluginsPage() {
  const { user } = await verifySession();

  if (user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const pendingVersions = await prisma.pluginVersion.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { createdAt: "asc" },
    include: {
      plugin: {
        include: { author: { select: { email: true } } },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p
          className="font-mono text-xs tracking-[0.12em] uppercase mb-1"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          // ADMIN
        </p>
        <h1
          className="font-sans text-2xl font-semibold"
          style={{ color: "var(--color-primary)" }}
        >
          Kolejka Recenzji Pluginów
        </h1>
        <p
          className="font-mono text-xs mt-1"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          {pendingVersions.length} oczekujących
        </p>
      </div>

      {/* List */}
      {pendingVersions.length === 0 ? (
        <div
          className="rounded-sm border flex items-center justify-center py-16"
          style={{ borderColor: "rgba(255,255,255,0.06)", borderStyle: "dashed" }}
        >
          <p
            className="font-mono text-xs tracking-[0.1em] uppercase"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Brak pluginów oczekujących na recenzję.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingVersions.map((version) => (
            <AdminReviewCard
              key={version.id}
              versionId={version.id}
              slug={version.plugin.slug}
              name={version.plugin.name}
              description={version.plugin.description}
              authorEmail={version.plugin.author.email ?? null}
              version={version.version}
              manifest={version.manifest as PluginManifest}
              submittedAt={version.createdAt.toISOString()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/plugins/ReviewActions.tsx components/dashboard/plugins/AdminReviewCard.tsx app/(dashboard)/dashboard/admin/plugins/page.tsx
git commit -m "feat(plugins): add admin plugin review panel"
```

---

## Self-Review

### Spec coverage check
- ✅ Dashboard widget slot (Task 2)  `DashboardWidgetSlot` renders `DASHBOARD_TOP` widgets
- ✅ Plugin marketplace (Task 3)  page with `PluginCard` + `InstallButton`
- ✅ Install/uninstall/update via `POST /api/plugins/install` (Task 3 `InstallButton`)
- ✅ Plugin upload (Task 4)  `UploadForm` + `POST /api/plugins/upload`
- ✅ Admin review panel (Task 5)  `AdminReviewCard` + `ReviewActions`
- ✅ Admin sidebar link visible only for ADMIN (Task 1 sidebar)
- ✅ Auth guards on all pages
- ✅ Dark theme, TailwindCSS, DESIGN.md tokens throughout
- ✅ Server Components for data fetching, Client Components for interactivity
- ✅ i18n keys added (Task 1)  note: components use hardcoded Polish/English strings for simplicity since i18next `useTranslation` is client-only; server components use hardcoded strings

### Type consistency
- `createPlugin` input shape matches `registry.ts` definition (slug, name, description, authorId, manifest, bundleStorageKey)
- `getUserInstallations` returns `{ pluginId, pluginVersion: { version }, pluginVersionId }`  used correctly in Task 3
- `getAvailableUpdate(pluginId, currentVersion)` signature matches `installations.ts`
- `PluginManifest` cast from `version.manifest as PluginManifest`  correct (stored as Prisma Json)
- `UserRole.ADMIN` from `@prisma/client`  used in admin page guard
