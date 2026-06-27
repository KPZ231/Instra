# campaigns

Zautomatyzowany system kampanii marketingowych. Kampania = zadanie wykonywane
`totalRuns` razy, co `intervalMinutes` minut, **bez konieczności trzymania
otwartej przeglądarki**  napędzany przez Vercel Cron.

## Technologie
- **Prisma**  modele `Campaign`, `CampaignRun`
- **Vercel Cron**  `vercel.json`, cron co minutę (plan Pro) lub co godzinę (Hobby)
- **Next.js Server Actions**  CRUD kampanii po stronie użytkownika
- **`lib/social/publisher`**  reużywany handler `PUBLISH_POST`

## Architektura

```
features/campaigns/        ← public feature module (import only from index.ts)
  actions/                 ← Server Actions (createCampaign, pause, resume, delete)
  lib/scheduling.ts        ← computeFirstRunAt()
  validation.ts            ← zod schemas
  index.ts                 ← barrel
  __tests__/               ← vitest unit tests

lib/api/campaigns.ts       ← DB service layer (getDueCampaigns, recordRun, advanceCampaign, ...)
lib/campaigns/handlers.ts  ← action handler registry (PUBLISH_POST, WEBHOOK)
app/api/cron/campaigns/route.ts  ← cron endpoint, gated by CRON_SECRET
vercel.json                ← Vercel Cron schedule
```

## Modele Prisma

### Campaign
| Pole             | Typ             | Opis                                     |
|------------------|-----------------|------------------------------------------|
| `actionType`     | `CampaignAction`| `PUBLISH_POST` lub `WEBHOOK`             |
| `payload`        | `Json`          | Handler-specific: `{ postId }` / `{ url, method?, body? }` |
| `intervalMinutes`| `Int`           | Interwał między uruchomieniami           |
| `totalRuns`      | `Int`           | Docelowa liczba uruchomień               |
| `completedRuns`  | `Int`           | Liczba wykonanych uruchomień             |
| `status`         | `CampaignStatus`| `ACTIVE \| PAUSED \| COMPLETED \| FAILED`|
| `nextRunAt`      | `DateTime`      | Kiedy cron ma wykonać następne zadanie   |

### CampaignRun
Niemodyfikowalny log każdego wykonania  `success`, `error`, `runAt`.

## Przepływ crona

```
Vercel (co minutę) → GET /api/cron/campaigns
  → sprawdź CRON_SECRET
  → getDueCampaigns(50)  [WHERE status=ACTIVE AND nextRunAt <= NOW]
  → Promise.allSettled(campaigns.map(
      → runCampaignHandler(campaign)  [PUBLISH_POST lub WEBHOOK]
      → recordRun(id, success, error?)
      → advanceCampaign(campaign)     [completedRuns++, nextRunAt += interval lub COMPLETED]
    ))
  → invalidatePrefix('db', 'campaigns')
  → return { processed, failed, total }
```

## Zmienne środowiskowe

| Zmienna       | Opis                                                      |
|---------------|-----------------------------------------------------------|
| `CRON_SECRET` | Bearer token dla endpointa crona. `openssl rand -base64 32` |

Vercel automatycznie dodaje `Authorization: Bearer ${CRON_SECRET}` do requestów crona.

## Dodawanie nowego typu akcji

1. Dodaj wariant do `enum CampaignAction` w `prisma/schema.prisma`
2. Dodaj handler do mapy w `lib/campaigns/handlers.ts`
3. Dodaj payload schema w `features/campaigns/validation.ts` (superRefine)
4. `prisma migrate dev --name add_campaign_action_<name>`

## Weryfikacja lokalna

```bash
# 1. Utwórz tabelę
prisma migrate dev --name add_campaigns

# 2. Testy jednostkowe
npx vitest run features/campaigns

# 3. Manualny trigger crona
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/campaigns
# → { "processed": N, "failed": 0, "total": N }

# 4. Bez sekretu → 401
curl http://localhost:3000/api/cron/campaigns
```
