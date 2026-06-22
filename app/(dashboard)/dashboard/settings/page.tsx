import { getCurrentUser } from '@/lib/auth/dal'
import { prisma } from '@/lib/prisma'
import { MAX_USERNAME_CHANGES_PER_YEAR } from '@/features/users/validation'
import { ChangeUsernameForm } from '@/components/ui/account/ChangeUsernameForm'
import { ExportAccountData } from '@/components/ui/account/ExportAccountData'
import { DeleteAccountSection } from '@/components/ui/account/DeleteAccountSection'
import { NotificationPreferences } from '@/components/ui/account/NotificationPreferences'

/**
 * Account settings page — allows the user to change their username,
 * export their data, and delete their account.
 * Server component: fetches user and username-change count before rendering.
 */
export default async function AccountSettingsPage() {
  const user = await getCurrentUser()
  if (!user) return null

  // Count username changes in the last 12 months to enforce the yearly limit
  const changesCount = await prisma.usernameChange.count({
    where: {
      userId: user.id,
      // eslint-disable-next-line react-hooks/purity
      createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
    },
  })

  const remaining = MAX_USERNAME_CHANGES_PER_YEAR - changesCount

  return (
    <main className="max-w-xl mx-auto py-10 px-4 space-y-8">
      <h1
        className="font-mono text-lg font-bold uppercase tracking-[0.1em]"
        style={{ color: 'var(--color-on-surface)' }}
      >
        Account Settings
      </h1>

      <ChangeUsernameForm
        initialUsername={user.username ?? null}
        initialRemaining={remaining}
      />

      <div
        className="border-t"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      />

      <NotificationPreferences
        initialMuted={user.notificationsMuted}
        initialEmailEnabled={user.emailNotificationsEnabled}
      />

      <div
        className="border-t"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      />

      <ExportAccountData />

      <DeleteAccountSection username={user.username ?? null} />
    </main>
  )
}
