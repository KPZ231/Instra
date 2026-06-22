# Reports Module

## Opis
System generowania raportów analitycznych. Użytkownik tworzy definicję raportu (nazwa, wybrane sekcje, opcjonalny interwał), a system generuje snapshoty danych na żądanie lub automatycznie w oparciu o cron.

## Technologie
- **Prisma** — modele `Report`, `ReportRun`
- **Vercel Cron** — `app/api/cron/reports/route.ts`, schedule `0 * * * *`
- **Redis Cache** — cache invalidation przez `invalidatePrefix('db','reports')`
- **Rate limiting** — Upstash Redis, presety `generateReport` (5/h), `createReport` (10/h)
- **Notyfikacje** — in-app `REPORT_READY` przez `createNotification`

## Architektura

```
lib/api/reports.ts          — data access (server-only)
lib/reports/generate.ts     — generator snapshotu (server-only)
lib/reports/__tests__/      — unit tests

features/reports/
  validation.ts             — Zod schemas
  actions/createReport.ts   — server action: utwórz definicję
  actions/generateReportNow.ts — server action: generuj natychmiast
  actions/setReportStatus.ts   — server action: pauza/wznów
  actions/deleteReport.ts      — server action: usuń
  index.ts                  — barrel

components/ui/reports/
  ReportForm.tsx            — formularz tworzenia (sekcje + interwał)
  ReportList.tsx            — lista raportów z akcjami
  ReportView.tsx            — widok snapshotu raportu

app/(dashboard)/dashboard/reports/
  page.tsx                  — lista raportów (SSR)
  new/page.tsx              — formularz nowego raportu
  [id]/page.tsx             — podgląd raportu (SSR, ownership check)

app/api/cron/reports/route.ts — cron endpoint (CRON_SECRET gate)
```

## Parametry

### `Report`
| Pole | Typ | Opis |
|------|-----|------|
| `name` | `string` | Nazwa raportu (1–100 zn.) |
| `config` | `Json` | `{ sections: string[] }` — wybrane sekcje |
| `intervalDays` | `Int?` | `null` = on-demand; `>=7` dla harmonogramu |
| `status` | `ReportStatus` | `ACTIVE` lub `PAUSED` |
| `nextRunAt` | `DateTime?` | Następne uruchomienie (null gdy on-demand) |

### Sekcje
| Klucz | Zawartość |
|-------|-----------|
| `stats` | `totals` + `delta` (sumy metryk, zmiana %) |
| `chart` | `series` (dane wykresu, max 30 punktów) |
| `posts` | `posts` (top 10 postów wg engagement rate) |
| `prediction` | `prediction` (prognoza, poziom pewności) |
| `tip` | `dailyTip` (wskazówka dnia) |

## Bezpieczeństwo
- **Ownership check** w każdej operacji read/mutate — `getReport(id, userId)` zwraca null gdy brak prawa
- **Rate limit**: `generateReport` 5/h, `createReport` 10/h per-account (`ip:userId`)
- **Cron** chroniony `Authorization: Bearer $CRON_SECRET` → 401
- Dane snapshotu = wyłącznie metryki własne usera

## Przykład użycia (server action)

```ts
// Tworzenie raportu tygodniowego
const result = await createReport({}, {
  name: 'Weekly overview',
  sections: ['stats', 'chart', 'posts'],
  intervalDays: 7,
})
// result.reportId → ID nowego raportu

// Generowanie natychmiastowe
const run = await generateReportNow({}, { id: reportId })
// run.runId → ID nowego ReportRun
```

## Weryfikacja
1. `prisma migrate dev` — sprawdź modele w Prisma Studio
2. Utwórz raport przez UI → "Generuj teraz" → pojawia się ReportRun + notification
3. `curl -H "Authorization: Bearer $CRON_SECRET" /api/cron/reports` → `{ processed, failed, total }`
4. Rate limit: 6× "Generuj teraz" w godzinę → 6. zwraca błąd
5. `npx vitest run lib/reports/__tests__/generate.test.ts`
