/**
 * Unit tests for generateReportRun section filtering.
 * Mocks analytics and Prisma  tests that only selected sections appear in the snapshot.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

// ─── Mocks (hoisted  vi.mock calls are hoisted to top) ──────────────────────

const mockCreate = vi.hoisted(() => vi.fn())
const mockUpdate = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: {
    reportRun: { create: mockCreate },
    report:    { update: mockUpdate },
  },
}))

vi.mock('@/lib/api/analytics', () => ({
  getPostsAnalyticsOverview: vi.fn().mockResolvedValue({
    totals:     { impressions: 1000, reach: 500, views: 200, clicks: 50, shares: 10, comments: 5, likes: 30, engagementRate: 0.05, lastCapturedAt: null },
    delta:      { engagementRate: 12 },
    series:     [{ date: '2026-06-01', value: 42, metrics: { likes: 1, comments: 0, shares: 0, clicks: 0 } }],
    prediction: { points: [], confidence: 'low' },
    posts:      [],
    dailyTip:   { key: 'no_media', priority: 'high' },
  }),
}))

vi.mock('@/lib/api/notifications', () => ({
  createNotification: vi.fn(),
}))

// ─── Tests ───────────────────────────────────────────────────────────────────

import { generateReportRun } from '../generate'
import type { Report } from '@prisma/client'

function makeReport(sections: string[]): Report {
  return {
    id:          'r-1',
    userId:      'u-1',
    name:        'Test',
    config:      { sections },
    intervalDays: null,
    status:      'ACTIVE',
    nextRunAt:   null,
    lastRunAt:   null,
    createdAt:   new Date(),
    updatedAt:   new Date(),
  } as unknown as Report
}

describe('generateReportRun', () => {
  beforeEach(() => {
    mockCreate.mockResolvedValue({ id: 'run-1', reportId: 'r-1', data: {}, generatedAt: new Date() })
    mockUpdate.mockResolvedValue({})
    mockCreate.mockClear()
    mockUpdate.mockClear()
  })

  it('includes only selected sections', async () => {
    await generateReportRun(makeReport(['stats', 'tip']))
    const saved = mockCreate.mock.calls[0][0].data.data
    expect(saved).toHaveProperty('stats')
    expect(saved).toHaveProperty('tip')
    expect(saved).not.toHaveProperty('chart')
    expect(saved).not.toHaveProperty('posts')
    expect(saved).not.toHaveProperty('prediction')
  })

  it('includes all sections when all are selected', async () => {
    await generateReportRun(makeReport(['stats', 'chart', 'posts', 'prediction', 'tip']))
    const saved = mockCreate.mock.calls[0][0].data.data
    expect(Object.keys(saved)).toHaveLength(5)
  })

  it('updates lastRunAt after generating', async () => {
    await generateReportRun(makeReport(['stats']))
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'r-1' },
      data:  expect.objectContaining({ lastRunAt: expect.any(Date) }),
    })
  })
})

// ─── Validation (Zod) ────────────────────────────────────────────────────────

import { CreateReportSchema } from '@/features/reports/validation'

describe('CreateReportSchema', () => {
  it('rejects intervalDays < 7', () => {
    const r = CreateReportSchema.safeParse({ name: 'x', sections: ['stats'], intervalDays: 3 })
    expect(r.success).toBe(false)
  })

  it('accepts intervalDays === 7', () => {
    const r = CreateReportSchema.safeParse({ name: 'x', sections: ['stats'], intervalDays: 7 })
    expect(r.success).toBe(true)
  })

  it('accepts on-demand (no intervalDays)', () => {
    const r = CreateReportSchema.safeParse({ name: 'x', sections: ['stats'] })
    expect(r.success).toBe(true)
  })

  it('rejects empty sections', () => {
    const r = CreateReportSchema.safeParse({ name: 'x', sections: [] })
    expect(r.success).toBe(false)
  })
})
