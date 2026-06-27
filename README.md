# Instra

A full-stack social media management platform built with Next.js 16, React 19, and TypeScript. Instra lets users create, schedule, and publish social media content  with an extensible plugin system, AI caption generation, analytics, campaign scheduling, and full i18n support.

---

## Features

- **Social Feed**  create posts with image carousels (up to 10 images), likes, cursor-based pagination, Redis-cached feed
- **Campaign Scheduler**  schedule posts via Vercel Cron, webhook delivery, SSRF-guarded
- **AI Captions**  generate captions via OpenRouter (Vercel AI SDK)
- **Plugin System**  sandboxed, declarative plugins with widget slots, KV storage, audit log, and a marketplace
- **Notifications**  bell UI + user preference management
- **Analytics & Reports**  dashboards with metrics and scheduled report runs
- **Authentication**  NextAuth v5 with email verification
- **i18n**  English and Polish (easily extensible)
- **Dark-first design**  "Executive Precision" design system, Tailwind CSS v4

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS v4, Framer Motion |
| Auth | NextAuth v5 + `@auth/prisma-adapter` |
| Database | PostgreSQL via Prisma 7 |
| BaaS | Supabase (Storage) |
| Cache / Rate-limit | Upstash Redis |
| AI | Vercel AI SDK + OpenRouter |
| Plugin sandbox | `isolated-vm` |
| Forms | React Hook Form + Zod |
| Testing | Vitest |
| Deployment | Vercel |

---

## Project Structure

```
/app             App Router pages, layouts, API routes
/components      Shared UI components
/features        Feature modules (auth, ai, campaigns, posts, …)
/plugins         Plugin loader, registry, context API
/lib             Helpers, Prisma client, Supabase, cache, rate-limit, AI
/prisma          schema.prisma + migrations
/locales         /en/common.json, /pl/common.json
/docs            Module documentation
/types           Global TypeScript types
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Upstash Redis account
- Supabase project (for Storage)
- OpenRouter API key (for AI captions)

### Installation

```bash
git clone https://github.com/your-org/instra.git
cd instra
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```env
# Database
DATABASE_URL=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# OpenRouter (AI captions)
OPENROUTER_API_KEY=
OPENROUTER_MODEL=           # optional, defaults to openai/gpt-oss-120b:free

# Email
EMAIL_SERVER_HOST=
EMAIL_SERVER_PORT=
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=
EMAIL_FROM=
```

### Database Setup

```bash
npx prisma migrate dev
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (single run) |
| `npm run test:watch` | Vitest (watch mode) |

---

## Plugin System

Instra supports community plugins. A plugin lives in `/plugins/my-plugin/` and must include:

- `manifest.json`  name, version, permissions, widget slots
- `index.ts`  exports `init()` and optionally `destroy()`

Plugins run in an isolated sandbox (`isolated-vm`). They communicate with the host only through `PluginContext`  no direct database, filesystem, or network access. See [`/docs/plugins.md`](docs/plugins.md) for the full API.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

---

## License

See [LICENSE](LICENSE).
