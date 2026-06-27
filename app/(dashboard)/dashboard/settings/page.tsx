import { getCurrentUser } from '@/lib/auth/dal'
import { prisma } from '@/lib/prisma'
import { MAX_USERNAME_CHANGES_PER_YEAR } from '@/features/users/validation'
import { ChangeUsernameForm } from '@/components/ui/account/ChangeUsernameForm'
import { ExportAccountData } from '@/components/ui/account/ExportAccountData'
import { DeleteAccountSection } from '@/components/ui/account/DeleteAccountSection'
import { NotificationPreferences } from '@/components/ui/account/NotificationPreferences'
import { SettingsPageTitle } from '@/components/ui/account/SettingsPageTitle'

/**
 * Account settings page  change username, manage notifications,
 * export data, and delete account.
 */
export default async function AccountSettingsPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const changesCount = await prisma.usernameChange.count({
    where: {
      userId: user.id,
      createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
    },
  })

  const remaining = MAX_USERNAME_CHANGES_PER_YEAR - changesCount

  return (
    <main className="max-w-2xl mx-auto py-10 px-4 space-y-4">
      <SettingsPageTitle />

      <ChangeUsernameForm
        initialUsername={user.username ?? null}
        initialRemaining={remaining}
      />

      <NotificationPreferences
        initialMuted={user.notificationsMuted}
        initialEmailEnabled={user.emailNotificationsEnabled}
      />

      <ExportAccountData />

      <DeleteAccountSection username={user.username ?? null} />
    </main>
  )
}
