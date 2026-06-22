# NotificationsBell

**File:** `components/ui/NotificationsBell.tsx`  
**Type:** Client component (`'use client'`)  
**Technologies:** React, Next.js App Router, framer-motion, lucide-react, react-i18next, Intl API

## Description

Self-contained bell button that shows the notification dropdown panel. Polls `GET /api/notifications` every 30 seconds and on mount to keep unread count and notification list fresh.

- Displays an unread badge (`#00FF41` circle) with the count (`9+` when > 9) when there are unread notifications
- Dropdown uses the project's glassmorphism style (matches the avatar dropdown)
- Each notification item can be clicked to mark it read and optionally navigate to `n.link` via `useRouter`
- "Mark all read" button sends `POST /api/notifications/read` with an empty body
- Click-outside closes the dropdown via a `mousedown` listener + `useRef`
- Relative time is formatted using `Intl.RelativeTimeFormat` — no external date library

## Props

None — fully self-contained.

## API calls

| Method | URL | Body | Purpose |
|--------|-----|------|---------|
| GET | `/api/notifications` | — | Fetch notification list + unread count |
| POST | `/api/notifications/read` | `{ id: string }` | Mark single notification read |
| POST | `/api/notifications/read` | `{}` | Mark all notifications read |

## i18n keys used

- `dashboard.header.notifications` — aria-label when unread count is 0
- `dashboard.notifications.unreadAria` — aria-label with count when unread > 0
- `dashboard.notifications.title` — dropdown header
- `dashboard.notifications.markAllRead` — "mark all" button
- `dashboard.notifications.empty` — empty state message

## Example usage

```tsx
import NotificationsBell from '@/components/ui/NotificationsBell'

// Inside DashboardHeader:
<NotificationsBell />
```
