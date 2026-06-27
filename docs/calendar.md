# Post Calendar  dokumentacja

## Opis

System kalendarza postów agreguje zaplanowane i opublikowane posty w jeden, posortowany po dacie widok.

## Decyzje architektoniczne

- **Brak nowego modelu w Prisma.** Zaplanowany post = jednorazowa kampania `PUBLISH_POST` (`totalRuns: 1`, `nextRunAt` = wybrany czas). Cron na `/api/cron/campaigns` już obsługuje uruchomienie o właściwej godzinie.
- **Brak nowego crona.** Istniejący polling co minutę wystarczy.

## Kształt danych  `CalendarItem`

Dyskryminowany union (pole `type`):

```ts
type ScheduledCalendarItem = {
  type: 'scheduled'
  date: Date               // Campaign.nextRunAt
  campaignId: string
  postId: string | null    // z Campaign.payload.postId (JSON, brak FK)
  campaignStatus: CampaignStatus
  postContent: string | null
}

type PublishedCalendarItem = {
  type: 'published'
  date: Date               // Post.createdAt
  postId: string
  content: string | null
  socialStatuses: Array<{ platform: Platform; status: PublishStatus; publishedAt: Date | null }>
}
```

## API

### Read

```ts
// lib/api/calendar.ts
getCalendarItems(userId: string, from: Date, to: Date): Promise<CalendarItem[]>
```

Cachowane w Redis pod kluczem `db:calendar:<userId>:<from>:<to>` (TTL 300 s, domyślny preset `db`).

### Write (Server Actions  eksportowane z `features/campaigns`)

| Akcja | Opis |
|-------|------|
| `schedulePost({ postId, scheduledAt })` | Tworzy jednorazową kampanię PUBLISH_POST. Odrzuca przeszłe daty i posty niebelążące do użytkownika. |
| `reschedulePost({ campaignId, scheduledAt })` | Zmienia `nextRunAt` kampanii. Działa tylko gdy `completedRuns === 0` i status `ACTIVE`/`PAUSED`. |
| `deleteCampaign(campaignId)` | Anuluje zaplanowany post (istniejąca akcja, dodatkowo czyści cache kalendarza). |

## Flow end-to-end

1. Użytkownik wybiera post i datę → `schedulePost` tworzy kampanię w DB.
2. Cron (`/api/cron/campaigns`, co minutę) wywołuje `getDueCampaigns` → handler `PUBLISH_POST` → `lib/social/publisher.ts#publishPost`.
3. Po uruchomieniu kampania przechodzi w stan `COMPLETED`, `CampaignRun` loguje wynik.
4. `getCalendarItems` na ten sam zakres zwróci teraz post jako `type: 'published'` (z `Post.createdAt`), a nie `scheduled`.

## Powiązane pliki

- `lib/api/calendar.ts`  serwis read
- `features/campaigns/actions/schedulePost.ts`
- `features/campaigns/actions/reschedulePost.ts`
- `features/campaigns/validation.ts`  `SchedulePostSchema`, `ReschedulePostSchema`
- `lib/api/campaigns.ts`  `updateNextRunAt`, `getDueCampaigns`
- `lib/campaigns/handlers.ts`  handler `PUBLISH_POST`
- `app/api/cron/campaigns/route.ts`  cron endpoint
