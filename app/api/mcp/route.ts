import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyApiToken } from '@/lib/api/apiTokens'
import { rateLimit, RateLimitError } from '@/lib/rate-limit'
import {
  getUserPosts,
  createPostByUser,
} from '@/lib/api/posts'
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  deleteCampaign,
} from '@/lib/api/campaigns'
import {
  listReports,
  getReport,
  createReport,
} from '@/lib/api/reports'
import { getPostsAnalyticsOverviewByUser } from '@/lib/api/analytics'

export const maxDuration = 60

const mcpHandler = createMcpHandler(
  (server) => {
    // ─── Posts ────────────────────────────────────────────────────────────────

    server.tool(
      'list_posts',
      'List the authenticated user\'s posts (newest first, max 100).',
      {},
      async (_args, extra) => {
        const userId = extra.authInfo?.extra?.userId as string
        const posts = await getUserPosts(userId)
        return { content: [{ type: 'text' as const, text: JSON.stringify(posts) }] }
      },
    )

    server.tool(
      'create_post',
      'Create a text-only post (no media) on behalf of the authenticated user.',
      {
        content:   z.string().min(1).max(2200).describe('Post text content'),
        platforms: z.array(z.string()).min(1).describe('Target platforms (e.g. ["INSTAGRAM"])'),
      },
      async ({ content, platforms }, extra) => {
        const userId = extra.authInfo?.extra?.userId as string
        const post = await createPostByUser(userId, content, platforms)
        return { content: [{ type: 'text' as const, text: JSON.stringify(post) }] }
      },
    )

    // ─── Campaigns ────────────────────────────────────────────────────────────

    server.tool(
      'list_campaigns',
      'List all campaigns for the authenticated user.',
      {},
      async (_args, extra) => {
        const userId = extra.authInfo?.extra?.userId as string
        const campaigns = await listCampaigns(userId)
        return { content: [{ type: 'text' as const, text: JSON.stringify(campaigns) }] }
      },
    )

    server.tool(
      'get_campaign',
      'Get a single campaign by ID (ownership enforced).',
      { id: z.string().describe('Campaign ID') },
      async ({ id }, extra) => {
        const userId = extra.authInfo?.extra?.userId as string
        const campaign = await getCampaign(id)
        if (!campaign || campaign.userId !== userId) {
          return { content: [{ type: 'text' as const, text: 'Not found' }], isError: true }
        }
        return { content: [{ type: 'text' as const, text: JSON.stringify(campaign) }] }
      },
    )

    server.tool(
      'create_campaign',
      'Create a new campaign for the authenticated user.',
      {
        name:            z.string().min(1).describe('Campaign name'),
        actionType:      z.enum(['PUBLISH_POST', 'WEBHOOK']),
        payload:         z.record(z.string(), z.unknown()).describe('Action payload (postId for PUBLISH_POST, url for WEBHOOK)'),
        intervalMinutes: z.number().int().positive().describe('Interval between runs in minutes'),
        totalRuns:       z.number().int().positive().describe('Total number of runs'),
        nextRunAt:       z.string().datetime().describe('ISO 8601 datetime for the first run'),
      },
      async ({ name, actionType, payload, intervalMinutes, totalRuns, nextRunAt }, extra) => {
        const userId = extra.authInfo?.extra?.userId as string
        const campaign = await createCampaign({
          userId,
          name,
          actionType,
          payload,
          intervalMinutes,
          totalRuns,
          nextRunAt: new Date(nextRunAt),
        })
        return { content: [{ type: 'text' as const, text: JSON.stringify(campaign) }] }
      },
    )

    server.tool(
      'delete_campaign',
      'Delete a campaign (ownership enforced).',
      { id: z.string().describe('Campaign ID') },
      async ({ id }, extra) => {
        const userId = extra.authInfo?.extra?.userId as string
        const campaign = await getCampaign(id)
        if (!campaign || campaign.userId !== userId) {
          return { content: [{ type: 'text' as const, text: 'Not found' }], isError: true }
        }
        await deleteCampaign(id)
        return { content: [{ type: 'text' as const, text: 'Deleted' }] }
      },
    )

    // ─── Reports ──────────────────────────────────────────────────────────────

    server.tool(
      'list_reports',
      'List all reports for the authenticated user.',
      {},
      async (_args, extra) => {
        const userId = extra.authInfo?.extra?.userId as string
        const reports = await listReports(userId)
        return { content: [{ type: 'text' as const, text: JSON.stringify(reports) }] }
      },
    )

    server.tool(
      'get_report',
      'Get a single report by ID (ownership enforced).',
      { id: z.string().describe('Report ID') },
      async ({ id }, extra) => {
        const userId = extra.authInfo?.extra?.userId as string
        const report = await getReport(id, userId)
        if (!report) {
          return { content: [{ type: 'text' as const, text: 'Not found' }], isError: true }
        }
        return { content: [{ type: 'text' as const, text: JSON.stringify(report) }] }
      },
    )

    server.tool(
      'create_report',
      'Create a new analytics report for the authenticated user.',
      {
        name:         z.string().min(1).describe('Report name'),
        sections:     z.array(z.string()).min(1).describe('Report sections (e.g. ["engagement","reach"])'),
        intervalDays: z.number().int().positive().optional().describe('Auto-refresh interval in days'),
      },
      async ({ name, sections, intervalDays }, extra) => {
        const userId = extra.authInfo?.extra?.userId as string
        const report = await createReport({ userId, name, config: { sections }, intervalDays })
        return { content: [{ type: 'text' as const, text: JSON.stringify(report) }] }
      },
    )

    // ─── Analytics ────────────────────────────────────────────────────────────

    server.tool(
      'get_analytics',
      'Get the engagement analytics overview for the authenticated user\'s posts.',
      {},
      async (_args, extra) => {
        const userId = extra.authInfo?.extra?.userId as string
        const overview = await getPostsAnalyticsOverviewByUser(userId)
        return { content: [{ type: 'text' as const, text: JSON.stringify(overview) }] }
      },
    )
  },
  { serverInfo: { name: 'instra', version: '1.0.0' } },
  { disableSse: true },
)

/**
 * MCP endpoint: Streamable HTTP, gated by Personal Access Token (Bearer header).
 * Supports GET, POST, DELETE as required by the MCP Streamable HTTP spec.
 *
 * @see /docs/mcp.md
 */
async function handler(req: Request): Promise<Response> {
  const authHeader = req.headers.get('authorization') ?? ''
  const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!rawToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = await verifyApiToken(rawToken)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // ponytail: keyed by userId so rate-limit is per-account, not per-IP
    await rateLimit('mcpRequest', () => userId)
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    throw error
  }

  // Attach userId via withMcpAuth shim so tools can read extra.authInfo.extra.userId
  const authed = withMcpAuth(
    mcpHandler,
    () => ({ token: rawToken, clientId: userId, scopes: [], extra: { userId } }),
  )

  return authed(req)
}

export { handler as GET, handler as POST, handler as DELETE }
