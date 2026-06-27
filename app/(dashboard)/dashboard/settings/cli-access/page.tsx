import { getCurrentUser } from '@/lib/auth/dal'
import { listApiTokens } from '@/lib/api/apiTokens'
import { CreateTokenForm } from '@/components/ui/cli/CreateTokenForm'
import { TokenList } from '@/components/ui/cli/TokenList'

/**
 * CLI Access settings page.
 * Lets users create and revoke Personal Access Tokens for the Instra MCP server.
 * Server component: fetches the current user's tokens before rendering.
 *
 * @example
 * // Accessible at /dashboard/settings/cli-access
 */
export const metadata = {
  title: 'CLI Access  Instra',
  description: 'Manage Personal Access Tokens to connect external CLI agents to your Instra account.',
}

export default async function CliAccessPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const tokens = await listApiTokens(user.id)

  const ENDPOINT = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/mcp`

  return (
    <main className="max-w-2xl mx-auto py-10 px-4 space-y-10">
      <div className="space-y-1">
        <h1
          className="font-mono text-lg font-bold uppercase tracking-[0.1em]"
          style={{ color: 'var(--color-on-surface)' }}
        >
          CLI Access
        </h1>
        <p className="text-sm opacity-60" style={{ color: 'var(--color-on-surface)' }}>
          Create a token, paste it into your agent&apos;s MCP config, and it will act on your behalf.
        </p>
      </div>

      {/* Quick-start config */}
      <section className="space-y-2">
        <h2
          className="font-mono text-xs font-semibold uppercase tracking-widest opacity-60"
          style={{ color: 'var(--color-on-surface)' }}
        >
          MCP Endpoint
        </h2>
        <pre
          className="rounded p-3 text-xs font-mono overflow-x-auto"
          style={{ background: 'var(--color-surface-variant)', color: 'var(--color-on-surface-variant)' }}
        >
{`{
  "mcpServers": {
    "instra": {
      "url": "${ENDPOINT}",
      "headers": { "Authorization": "Bearer <your-token>" }
    }
  }
}`}
        </pre>
      </section>

      {/* Create token */}
      <section className="space-y-3">
        <h2
          className="font-mono text-xs font-semibold uppercase tracking-widest opacity-60"
          style={{ color: 'var(--color-on-surface)' }}
        >
          New Token
        </h2>
        <CreateTokenForm />
      </section>

      {/* Token list */}
      <section className="space-y-3">
        <h2
          className="font-mono text-xs font-semibold uppercase tracking-widest opacity-60"
          style={{ color: 'var(--color-on-surface)' }}
        >
          Active Tokens
        </h2>
        <TokenList tokens={tokens} />
      </section>
    </main>
  )
}
