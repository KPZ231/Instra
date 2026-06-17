import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/config'
import { installPlugin, uninstallPlugin, togglePlugin, getAvailableUpdate } from '@/lib/plugins/installations'

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('install'), pluginId: z.string(), pluginVersionId: z.string() }),
  z.object({ action: z.literal('uninstall'), pluginId: z.string() }),
  z.object({ action: z.literal('toggle'), pluginId: z.string(), enabled: z.boolean() }),
  z.object({ action: z.literal('checkUpdate'), pluginId: z.string(), currentVersion: z.string() }),
])

/**
 * POST /api/plugins/install
 * Installs, uninstalls, toggles, or checks for an available update on a
 * plugin for the authenticated user. Updates are never applied automatically.
 * @param request - Request body must match one of the action schemas
 * @returns JSON `{ ok: true }` on success, or `{ update }` for checkUpdate
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    switch (parsed.data.action) {
      case 'install': {
        await installPlugin(userId, parsed.data.pluginId, parsed.data.pluginVersionId)
        return NextResponse.json({ ok: true })
      }
      case 'uninstall': {
        await uninstallPlugin(userId, parsed.data.pluginId)
        return NextResponse.json({ ok: true })
      }
      case 'toggle': {
        await togglePlugin(userId, parsed.data.pluginId, parsed.data.enabled)
        return NextResponse.json({ ok: true })
      }
      case 'checkUpdate': {
        const update = await getAvailableUpdate(parsed.data.pluginId, parsed.data.currentVersion)
        return NextResponse.json({ update })
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
