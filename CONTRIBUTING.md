# Contributing to Instra

Thank you for your interest in contributing! Please read this document before opening a pull request.

---

## Getting Started

1. Fork the repository and clone your fork.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in the required values.
4. Run migrations: `npx prisma migrate dev`
5. Start the dev server: `npm run dev`

---

## Development Guidelines

- **TypeScript everywhere**  no `any`.
- **No direct DB/fetch in components**  use services in `/lib/api/`.
- **Business logic** goes in hooks or services, not in components.
- **`async/await`** always; never `.then()` in new code.
- Follow the naming conventions in [CLAUDE.md](CLAUDE.md).
- Every new public function/hook/component needs a JSDoc comment (`@param`, `@returns`, `@example`).
- Every new module needs a doc file in `/docs/<name>.md`.

---

## Commits

One feature or fix per commit (atomic changes). Format:

```
type(scope): short description

feat(posts): add image carousel support
fix(auth): handle expired session token
docs(plugins): update widget slot list
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

Do **not** commit: `.env`, `node_modules`, generated Prisma files.

---

## Pull Requests

- Branch off `master`: `git checkout -b feat/my-feature`
- Keep PRs focused  one concern per PR.
- Fill in the PR template (what changed, how to test).
- All checks must pass before merge: lint, tests, Lighthouse SEO ≥ 90.

---

## Plugin Contributions

See [`/docs/plugins.md`](docs/plugins.md) for the full plugin API. Plugins must:

- Pass `manifest.json` JSON Schema validation.
- Not access DB, filesystem, or network outside `PluginContext`.
- Include a `README.md` inside the plugin directory.

---

## Reporting Issues

Open a GitHub Issue with:
- Steps to reproduce
- Expected vs actual behaviour
- Browser/Node version if relevant

---

## Code of Conduct

Be respectful. Harassment of any kind will not be tolerated.
