# Instra — AGENTS.md

## Rola
Doświadczony full-stack developer. Stack: **Next.js, React, TypeScript, Supabase (Prisma ORM), Vercel**.

---

## Kod — zasady ogólne
- TypeScript wszędzie; brak `any`
- Małe, jednoodpowiedzialne funkcje i komponenty (SRP)
- Opisowe nazwy — kod samodokumentujący
- Każdy plik dokumentowany w `/docs/<nazwa>.md` (opis, technologie, parametry, przykład)
- Logika biznesowa w hookach/serwisach, nie w komponentach
- Nad funkcją dokumentacja co robi funkcja
- Nigdy `fetch`/Prisma bezpośrednio w komponencie — tylko przez serwisy w `/lib/api/`
- `async/await` zawsze; nigdy `.then()` w nowym kodzie

---

## Nazewnictwo

| Typ | Konwencja | Przykład |
|-----|-----------|---------|
| Komponenty React | PascalCase | `UserProfile.tsx` |
| Hooki | camelCase + `use` | `useAuth.ts` |
| Helpery/utility | camelCase | `formatDate.ts` |
| Strony (App Router) | kebab-case | `app/user-settings/page.tsx` |
| Typy/interfejsy | PascalCase | `UserTypes.ts` |
| Stałe globalne | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| Handlery zdarzeń | prefix `handle` | `handleSubmit` |
| Booleany | prefix `is/has/can/should` | `isLoading` |
| Props interfejsy | suffix `Props` | `UserCardProps` |
| Enumy | nazwa PascalCase, wartości UPPER_SNAKE | `UserRole.ADMIN` |

---

## Architektura

```
/app            → App Router (strony, layouty, API routes)
/components     → Reużywalne komponenty
/features       → Izolowane moduły: /auth, /billing itd. — każdy z index.ts (barrel)
/plugins        → Plugin loader, registry, context API
/lib            → Helpery, prisma, supabase, config.ts, api/<nazwa>.ts
/prisma         → schema.prisma + migracje
/locales        → /en/common.json, /pl/common.json
/docs           → Dokumentacja modułów
/types          → Globalne typy TS
```

- Feature = własny katalog w `/features`, izolacja pełna, eksport tylko przez `index.ts`
- Open/Closed — moduły otwarte na rozszerzenie, zamknięte na modyfikację
- Feature flags dla eksperymentalnych funkcji — konfiguracja w `/lib/config.ts`
- Zustand lub Context API dla stanu globalnego; brak prop drillingu

---

## Baza danych
- Dostęp **wyłącznie przez Prisma** — nigdy surowy SQL
- Zmiany schematu → `schema.prisma` + `prisma migrate dev` + aktualizacja `/docs/database.md`

---

## i18n
- Każdy tekst w UI przez `t("klucz")` — nigdy hardcoded string w JSX
- Klucze w `/locales/<lang>/common.json`

---

## SEO
- Każda strona: unikalny `metadata` / `generateMetadata()` z `title` (50–60 zn.) i `description` (120–155 zn.) przez i18n
- JSON-LD na stronach marketingowych — schematy w `/lib/seo/schemas.ts`
- `<link rel="canonical">` + `hreflang` dla wersji językowych
- Obrazy: `next/image` z `alt`; fonty: `next/font`; lazy load: `next/dynamic`
- `app/sitemap.ts` (bez `/app/`, `/api/`) + `app/robots.ts`
- URLe: kebab-case, opisowe segmenty, bez polskich znaków
- Strony publiczne: SSG lub ISR — nigdy CSR
- Lighthouse SEO ≥ 90 w CI (blokuje merge)

---

## Bezpieczeństwo
- Sanityzacja inputów przeciwko XSS/SQL Injection; walidacja po stronie serwera
- Prisma ORM — brak surowego SQL
- Hasła: bcrypt lub Argon2
- Nagłówki: CSP, HSTS, X-Frame-Options (`DENY`), X-Content-Type-Options
- Ciasteczka: `HttpOnly`, `Secure`, `SameSite`
- CSRF tokeny; CORS tylko dla zaufanych domen
- Rate limiting na API i formularzach logowania
- Sekrety tylko w `.env` — nigdy w kodzie
- Brak stack trace'ów w odpowiedziach API
- Walidacja MIME + rozszerzenia przy uploadzie plików
- Szyfrowanie danych wrażliwych w spoczynku (AES-256)
- `npm audit` / Dependabot regularnie

---

## System pluginów (open source)

**Struktura:** `/plugins/my-plugin/` — `index.ts`, `manifest.json`, `components/`, `hooks/`, `types/`, `README.md`

**Kluczowe interfejsy** (pełna definicja w `/types/plugin.ts`):
- `InstraPlugin`: `name`, `version`, `description`, `author`, `permissions`, `init()`, `destroy?()`
- `PluginContext`: `registerWidget`, `registerRoute`, `registerMenuItem`, `on/off/emit`, `api`, `logger`, `i18n`
- `WidgetSlot`: `dashboard:top/sidebar/bottom`, `settings:general/advanced`, `header:actions`, `profile:menu`

**Zasady bezpieczeństwa pluginów:**
- Plugin komunikuje się z appką **wyłącznie przez `PluginContext`** — brak dostępu do DB, env, serwisów
- Walidacja `manifest.json` przez JSON Schema przed załadowaniem
- `ErrorBoundary` na każdym slocie UI
- Audyt log wszystkich akcji pluginów
- Brak wykonania kodu pluginu server-side bez sandboxu
- Pluginy npm → weryfikacja przed publikacją w rejestrze Instra

---

## Design
- Przed implementacją UI przejrzyj `DESIGN.md` i stosuj zmienne kolorów z `globals.css`.
- Uzywaj to stylów TailwindCSS
- Kazdy dluzszy element kodu frontendowego ma byc osobnym komponentem umieszczonym w `/components/ui`
---

## Zasady pracy
- Przed kodem — przemyśl architekturę, przy niejasności zapytaj
- Jedna funkcjonalność na commit (atomowe zmiany)
- Nie zostawiaj `TODO` bez opisu
- Nie commituj `.env`, `node_modules`, wygenerowanych plików Prismy
- JSDoc na każdej publicznej funkcji/hooku/komponencie z `@param`, `@returns`, `@example`
- Repozytorium musi zawierać: `CONTRIBUTING.md`, `CHANGELOG.md`, `LICENSE`