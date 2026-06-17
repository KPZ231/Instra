import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/config'
import { installPlugin, uninstallPlugin, togglePlugin, getAvailableUpdate } from '@/lib/plugins/installations'
import { prisma } from '@/lib/prisma'
import { PluginReviewStatus } from '@prisma/client'

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
    // Audit logging is delegated to the service layer: installPlugin, uninstallPlugin, togglePlugin,
    // and getAvailableUpdate each call logPluginAction internally to record all user actions.
    switch (parsed.data.action) {
      case 'install': {
        // Validate that the requested plugin version is approved before delegating to service layer
        const version = await prisma.pluginVersion.findUnique({
          where: { id: parsed.data.pluginVersionId },
        })
        if (
          !version ||
          version.status !== PluginReviewStatus.APPROVED ||
          version.pluginId !== parsed.data.pluginId
        ) {
          return NextResponse.json(
            { error: 'Version is not installable' },
            { status: 400 },
          )
        }
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
    const KNOWN_USER_ERRORS = ['already installed', 'is not approved', 'not found', 'is not installable']
    const isUserError =
      err instanceof Error && KNOWN_USER_ERRORS.some(k => err.message.toLowerCase().includes(k))
    const message = isUserError ? (err as Error).message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: isUserError ? 400 : 500 })
  }
}
