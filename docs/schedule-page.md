# Schedule Page  dokumentacja

## Opis

Strona `/dashboard/schedule` wyświetla miesięczny kalendarz postów użytkownika  zarówno zaplanowanych, jak i opublikowanych. Pozwala zaplanować nowy post na wybrany dzień/godzinę, przesunąć termin zaplanowanego posta lub go anulować.

## Technologie

- **Next.js 15 App Router**  strona jako async Server Component
- **`lib/api/calendar.ts`**  `getCalendarItems` (pobiera dane, Redis-cached 300 s)
- **`lib/api/posts.ts`**  `getUserPosts` (lista postów użytkownika do pickera)
- **`features/campaigns`**  `schedulePost`, `reschedulePost`, `deleteCampaign` (Server Actions)
- **TailwindCSS** + design tokens z `globals.css`
- **react-i18next**  wszystkie teksty UI przez `t()` (klucze `schedule.*`)

## Pliki

| Plik | Rola |
|------|------|
| `app/(dashboard)/dashboard/schedule/page.tsx` | Server Component  auth, fetch, render |
| `components/ui/calendar/PostCalendar.tsx` | Siatka miesięczna (7 kol.), nawigacja miesiąca |
| `components/ui/calendar/DayPanel.tsx` | Panel dnia  lista, formularz schedulowania, reschedule, cancel |
| `locales/en/common.json` → `schedule.*` | Angielskie klucze i18n |
| `locales/pl/common.json` → `schedule.*` | Polskie klucze i18n |

## Parametry URL

| Param | Opis | Przykład |
|-------|------|---------|
| `?month=YYYY-MM` | Wyświetlany miesiąc. Domyślnie bieżący. | `?month=2026-08` |

## Komponenty

### `PostCalendar`

```tsx
<PostCalendar month="2026-07" items={items} posts={posts} />
```

- Prop `month: string`  `"YYYY-MM"`.
- Prop `items: CalendarItem[]`  z `getCalendarItems`.
- Prop `posts: UserPostOption[]`  z `getUserPosts`.
- Siatka 7 kolumn (Pon–Nd), offset weekday, `today` zaznaczony bone-ringiem.
- Chip zaplanowany = bone left-border; opublikowany = green left-border.
- Desktop: tekstowe chipsiki (max 3 + overflow); mobile: kolorowe kropki + liczba.
- Klik komórki → `DayPanel`.

### `DayPanel`

```tsx
<DayPanel date="2026-07-04" items={dayItems} posts={userPosts} onClose={fn} />
```

- Modal (`fixed inset-0 z-50`), `role="dialog"`, Escape zamyka.
- Sekcja **Scheduled**  reschedule (`datetime-local` + przycisk) + cancel (przez `ConfirmDialog`).
- Sekcja **Published**  read-only z platform chips.
- Formularz **Schedule a post**  `PostSelector` (multi-select) + `datetime-local` (domyślnie 09:00 wybranego dnia).

## Flow end-to-end

1. Użytkownik klika dzień → `DayPanel` otwiera się z itemami i formularzem.
2. Wybiera post(y) + godzinę → `schedulePost({}, { postId, scheduledAt })` dla każdego posta.
3. Cron co minutę → handler `PUBLISH_POST` → publikuje post.
4. Następny render miesiąca → post pojawia się jako `type: 'published'` (zielony chip).

## Powiązane pliki

- `lib/api/calendar.ts`  serwis read (CalendarItem union)
- `features/campaigns/actions/schedulePost.ts`
- `features/campaigns/actions/reschedulePost.ts`
- `features/campaigns/actions/deleteCampaign.ts`
- `components/ui/campaigns/PostSelector.tsx`  reużyty picker
- `components/ui/ConfirmDialog.tsx`  reużyty dialog anulowania
- `docs/calendar.md`  architektura backendu
