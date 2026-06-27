import { getCurrentUser } from '@/lib/auth/dal'
import Link from 'next/link'

/**
 * Dashboard profile page  displays the current user's profile details.
 * Server component: reads session and renders user info without client-side hydration.
 */
export default async function ProfilePage() {
  const user = await getCurrentUser()

  if (!user) return null

  const initial = (user.name ?? user.email ?? '?')[0].toUpperCase()
  const memberSince = new Date(user.createdAt).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <main className="max-w-xl mx-auto py-10 px-4 space-y-6">
      <h1
        className="font-mono text-lg font-bold uppercase tracking-[0.1em]"
        style={{ color: 'var(--color-on-surface)' }}
      >
        My Profile
      </h1>

      {/* Profile card */}
      <div
        className="rounded-sm border p-6 space-y-4"
        style={{
          background: 'var(--color-surface-container-lowest)',
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        {/* Avatar + name row */}
        <div className="flex items-center gap-4">
          {/* Avatar fallback initial */}
          <div
            className="w-12 h-12 rounded-sm flex items-center justify-center font-mono text-lg font-bold uppercase shrink-0"
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: 'var(--color-primary)',
            }}
            aria-hidden="true"
          >
            {initial}
          </div>

          <div className="space-y-0.5 min-w-0">
            {user.name && (
              <p
                className="font-sans text-sm font-medium truncate"
                style={{ color: 'var(--color-on-surface)' }}
              >
                {user.name}
              </p>
            )}
            {user.username && (
              <p
                className="font-mono text-xs tracking-[0.06em]"
                style={{ color: 'var(--color-on-surface-variant)' }}
              >
                @{user.username}
              </p>
            )}
          </div>

          {/* Role badge */}
          <span
            className="ml-auto font-mono text-[10px] uppercase tracking-[0.1em] px-2 py-1 rounded-sm border shrink-0"
            style={{
              color: 'var(--color-on-surface-variant)',
              borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            {user.role}
          </span>
        </div>

        {/* Details */}
        <div
          className="space-y-2 pt-2 border-t text-sm"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-[10px] uppercase tracking-[0.08em] w-24 shrink-0"
              style={{ color: 'var(--color-on-surface-variant)' }}
            >
              Email
            </span>
            <span style={{ color: 'var(--color-on-surface)' }}>{user.email}</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="font-mono text-[10px] uppercase tracking-[0.08em] w-24 shrink-0"
              style={{ color: 'var(--color-on-surface-variant)' }}
            >
              Member since
            </span>
            <span style={{ color: 'var(--color-on-surface)' }}>{memberSince}</span>
          </div>
        </div>
      </div>

      <Link href="/dashboard/settings" className="btn btn-secondary">
        Edit in settings
      </Link>
    </main>
  )
}
