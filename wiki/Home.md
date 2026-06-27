# Welcome to the Instra Wiki

Instra is an open-source social media management platform  schedule posts, generate AI captions, extend functionality with plugins, and monitor performance with built-in analytics.

---

## Quick Navigation

| Section | Description |
|---|---|
| [Getting Started](#getting-started) | Setup, env vars, first run |
| [Architecture](#architecture) | Project structure & design decisions |
| [Features](#features) | What Instra can do |
| [Plugin System](#plugin-system) | Building and distributing plugins |
| [Database](#database) | Schema overview |
| [Cache & Rate Limiting](#cache--rate-limiting) | Redis strategy |
| [i18n](#i18n) | Internationalization |
| [Contributing](Contributing) | How to contribute |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL
- Upstash Redis
- Supabase project
- OpenRouter API key (for AI captions)

### Setup

```bash
git clone https://github.com/your-org/instra.git
cd instra
npm install
cp .env.example .env.local   # fill in values
npx prisma migrate dev
npm run dev
```

Open `http://localhost:3000`.

### Key Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | NextAuth signing secret |
| `NEXTAUTH_URL` | ✅ | App base URL |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase admin key |
| `UPSTASH_REDIS_REST_URL` | ✅ | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | Upstash Redis token |
| `OPENROUTER_API_KEY` | ✅ | AI caption generation |
| `OPENROUTER_MODEL` | ❌ | Model slug (default: `openai/gpt-oss-120b:free`) |

---

## Architecture

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS v4, Framer Motion |
| Auth | NextAuth v5 + `@auth/prisma-adapter` |
| Database | PostgreSQL via Prisma 7 |
| Storage | Supabase Storage |
| Cache / Rate-limit | Upstash Redis |
| AI | Vercel AI SDK + OpenRouter |
| Plugin sandbox | `isolated-vm` |
| Deployment | Vercel |

### Directory Structure

```
/app             App Router pages, layouts, API routes
/components      Shared UI components
/features        Feature modules (auth, ai, campaigns, posts, …)
/plugins         Plugin loader, registry, context API
/lib             Prisma client, Supabase, cache, rate-limit, AI client
/prisma          schema.prisma + migrations
/locales         /en/common.json, /pl/common.json
/docs            Per-module documentation
/types           Global TypeScript types
```

### Key Principles

- **No direct DB/fetch in components**  only through services in `/lib/api/`.
- **Feature isolation**  each feature lives in `/features/<name>/` and exports only through `index.ts`.
- **Server Actions for mutations**  no REST endpoints for internal writes.
- **Cache-first reads**  all heavy DB queries go through `getOrSet()` in `/lib/cache`.

---

## Features

### Social Feed

Users can create posts with text (up to 2,200 characters) and up to 10 images. The feed is publicly accessible at `/feed` (ISR, 60s revalidation) and cached in Redis with a 300s TTL. Likes and cursor-based pagination are supported.

Rate limits: 10 posts/hour per user, 60 likes/minute per user.

### Campaign Scheduler

Campaigns allow posts to be scheduled for future publishing. A Vercel Cron job polls `nextRunAt` and dispatches `PUBLISH_POST` or `WEBHOOK` actions. Webhook targets are validated against an SSRF guard before delivery.

### AI Caption Generation

A single Server Action (`generateCaption`) calls OpenRouter via the Vercel AI SDK. Auth check → rate limit → Zod validation → API call. The model is configurable via `OPENROUTER_MODEL`.

### Notifications

Bell icon in the header with unread count badge. Users can manage per-channel preferences (email, in-app) in Settings.

### Analytics & Reports

Dashboard metrics with aggregated stats. Reports can be scheduled (`ReportRun` table); results are stored and viewable in the dashboard.

### Authentication

NextAuth v5 with Prisma adapter. Supports credentials (email + password, bcrypt) and email verification flow. Role system: `USER` and `ADMIN`.

---

## Plugin System

Plugins extend Instra through a sandboxed runtime (`isolated-vm`). They register UI widgets, routes, and menu items via `PluginContext`  they never access the database, filesystem, or network directly.

### Plugin Structure

```
/plugins/my-plugin/
  manifest.json      metadata, permissions, widget slots
  index.ts           exports init() and optionally destroy()
  components/
  hooks/
  types/
  README.md
```

### Widget Slots

| Slot | Location |
|---|---|
| `dashboard:top` | Top of dashboard |
| `dashboard:sidebar` | Dashboard sidebar |
| `dashboard:bottom` | Bottom of dashboard |
| `settings:general` | General settings page |
| `settings:advanced` | Advanced settings page |
| `header:actions` | Header action area |
| `profile:menu` | User profile menu |

### Security

- `manifest.json` validated by JSON Schema before loading.
- All plugin actions written to an audit log.
- `ErrorBoundary` wraps every widget slot.
- No server-side plugin execution without a sandbox.

Full API reference: [`/docs/plugins.md`](../docs/plugins.md)

---

## Database

Managed exclusively through Prisma ORM  no raw SQL. Schema lives in `prisma/schema.prisma`.

### Core Models

| Model | Purpose |
|---|---|
| `User` | Accounts, roles, profile |
| `Post` | Social media posts (text + media) |
| `Media` | Images attached to posts (Supabase Storage) |
| `Like` | Post likes (user × post, unique) |
| `Campaign` | Scheduled publishing campaigns |
| `Plugin` / `PluginVersion` | Plugin registry |
| `PluginInstallation` | Per-user plugin installs |
| `Notification` | In-app notifications |
| `Report` / `ReportRun` | Analytics reports |

Schema changes: edit `prisma/schema.prisma` → `npx prisma migrate dev` → update `/docs/database.md`.

---

## Cache & Rate Limiting

Both use Upstash Redis with isolated key namespaces:

| Concern | Namespace | TTL |
|---|---|---|
| DB query cache | `instra:cache:*` | 300s (db), 900s (api) |
| Rate limiting | `instra:rl:*` | sliding window |

**Cache pattern:**

```ts
const data = await getOrSet('instra:cache:feed', () => fetchFeed(), 300)
```

After any Prisma mutation call `invalidatePrefix()` to bust the relevant cache keys. Details in [`/docs/cache.md`](../docs/cache.md).

---

## i18n

All UI strings go through `t("key")`  no hardcoded text in JSX. Translation files:

```
/locales/en/common.json
/locales/pl/common.json
```

To add a new language: create `/locales/<lang>/common.json` and register it in `/lib/i18n/config.ts`.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (single run) |
| `npm run test:watch` | Vitest (watch) |

---

## Further Reading

- [CONTRIBUTING.md](Contributing)  how to contribute
- [CHANGELOG.md](Changelog)  release history
- [`/docs/`](../docs/)  per-module documentation
