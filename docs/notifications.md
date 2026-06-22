# Notifications

The notifications module provides in-app alerts and optional email delivery for key platform events. It is entirely server-side — no client-side store, no WebSocket. The UI polls `GET /api/notifications`.

---

## Architecture

```
lib/api/notifications.ts          — service layer (createNotification, list, count, markRead)
lib/email/templates/notification.ts — HTML + plain-text email templates
app/api/notifications/route.ts    — GET /api/notifications
app/api/notifications/read/route.ts — POST /api/notifications/read
features/notifications/           — barrel export + updatePreferences server action
```

---

## Notification model

| Field     | Type             | Notes                                      |
|-----------|------------------|--------------------------------------------|
| id        | String (CUID)    | Primary key                                |
| userId    | String           | FK → User (cascade delete)                 |
| type      | NotificationType | See enum below                             |
| title     | String           | Short heading                              |
| message   | String (Text)    | Full body                                  |
| link      | String?          | Optional deep-link for CTA                 |
| read      | Boolean          | Default false                              |
| readAt    | DateTime?        | Set when marked read                       |
| createdAt | DateTime         | Creation timestamp                         |

Indexes: `(userId, read)`, `(userId, createdAt)`.

---

## NotificationType enum

| Value                | Trigger                                        | Email? |
|----------------------|------------------------------------------------|--------|
| CAMPAIGN_COMPLETED   | All campaign runs finished (advanceCampaign)   | Yes    |
| CAMPAIGN_FAILED      | Campaign publish-post run failed (cron)        | Yes    |
| WEBHOOK_FAILED       | Campaign webhook run failed (cron)             | Yes    |
| POST_PUBLISHED       | Social post published (publisher.ts)           | No     |
| POST_FAILED          | Social post failed to publish (publisher.ts)   | No     |
| SOCIAL_CONNECTED     | OAuth callback success (callback route)        | Yes    |
| SOCIAL_DISCONNECTED  | Account disconnected (disconnect route)        | Yes    |

Post events are in-app only — email is reserved for campaign and social account events.

---

## Service functions — `lib/api/notifications.ts`

### `createNotification(input)`
Creates an in-app notification and optionally sends an email. **Never throws** into the caller — all errors are caught and logged. Use `void createNotification(...)` for fire-and-forget.

**Parameters:**
- `input.userId` (string) — target user ID
- `input.type` (NotificationType) — event type
- `input.title` (string) — short heading
- `input.message` (string) — body text
- `input.link` (string, optional) — deep-link for the CTA button

Respects `User.notificationsMuted` (skips DB write) and `User.emailNotificationsEnabled` (skips email).

---

### `listNotifications(userId, limit?)`
Returns up to `limit` (default 20) notifications for the user, newest first.

### `getUnreadCount(userId)`
Returns the count of unread notifications for the user.

### `markRead(userId, id)`
Marks a single notification as read. Verifies ownership via `userId`.

### `markAllRead(userId)`
Marks all unread notifications for the user as read.

---

## API Routes

### `GET /api/notifications`
Returns recent notifications and unread count. Requires session.

**Response:**
```json
{
  "notifications": [...],
  "unreadCount": 3
}
```

### `POST /api/notifications/read`
Marks notification(s) as read. Requires session.

**Body:**
```json
{ "id": "clx..." }   // mark single
{}                    // mark all
```

**Response:** `{ "ok": true }`

---

## Server Action — `updatePreferences`

```ts
import { updatePreferences } from '@/features/notifications'

const [state, action] = useActionState(updatePreferences, {})
```

**FormData fields:**
- `notificationsMuted` — `"true"` or `"false"`
- `emailNotificationsEnabled` — `"true"` or `"false"`

Rate-limited to 10 requests/hour per user (preset: `updatePreferences`).
Calls `revalidatePath('/dashboard/settings')` on success.

---

## Best-effort guarantee

`createNotification` is always called with `void` — it catches all errors internally and logs them via `console.error('[notifications] createNotification failed:', err)`. A notification failure never disrupts the calling flow (cron run, OAuth callback, post publish).

---

## User preferences (User model fields)

| Field                    | Default | Meaning                                      |
|--------------------------|---------|----------------------------------------------|
| notificationsMuted       | false   | Skip in-app notification creation             |
| emailNotificationsEnabled| true    | Send email for eligible notification types    |

Managed via `updatePreferences` server action.
