# NotificationPreferences

**File:** `components/ui/account/NotificationPreferences.tsx`  
**Type:** Client component (`'use client'`)  
**Technologies:** React (`useActionState`), react-i18next, server action from `features/notifications`

## Description

Settings section with two toggle checkboxes for notification preferences:

1. **Mute in-app notifications** (`notificationsMuted`)  stops notifications from appearing in the bell dropdown
2. **Email notifications** (`emailNotificationsEnabled`)  enables/disables email alerts for campaigns and connected accounts

Submits via `updatePreferences` server action (from `features/notifications/index.ts`) using `useActionState`. Displays a form-level error from `state.errors._form` and switches the submit button text to "Saved!" on `state.success`.

### Checkbox trick

HTML checkboxes only submit when checked. Each checkbox is preceded by a hidden `<input>` with the "off" value so the server always receives a value for both fields regardless of checkbox state. `formData.get()` returns the last value with the given name, so the checkbox overrides the hidden input when checked.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `initialMuted` | `boolean` | Current `notificationsMuted` from the database |
| `initialEmailEnabled` | `boolean` | Current `emailNotificationsEnabled` from the database |

## i18n keys used

All under `account.notifications.*`:  
`title`, `muteLabel`, `muteHelper`, `emailLabel`, `emailHelper`, `save`, `saved`

## Rendered in

`app/(dashboard)/dashboard/settings/page.tsx`  between `<ChangeUsernameForm>` and `<ExportAccountData>`.

## Example usage

```tsx
import { NotificationPreferences } from '@/components/ui/account/NotificationPreferences'

<NotificationPreferences
  initialMuted={user.notificationsMuted}
  initialEmailEnabled={user.emailNotificationsEnabled}
/>
```
