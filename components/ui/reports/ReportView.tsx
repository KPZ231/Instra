'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReportRun } from '@prisma/client'
import type { AnalyticsOverviewData } from '@/features/analytics'
import { formatMetricValue } from '@/features/analytics'

type ReportSnapshot = Partial<{
  stats:      Pick<AnalyticsOverviewData, 'totals' | 'delta'>
  chart:      Pick<AnalyticsOverviewData, 'series'>
  posts:      Pick<AnalyticsOverviewData, 'posts'>
  prediction: Pick<AnalyticsOverviewData, 'prediction'>
  tip:        Pick<AnalyticsOverviewData, 'dailyTip'>
}>

interface ReportViewProps {
  run: ReportRun
}

/**
 * Renders the snapshot data from a ReportRun, section by section.
 * Reuses the analytics data shapes; renders inline (no heavy chart lib dependency).
 *
 * @param run - ReportRun row (data field contains the snapshot)
 *
 * @example
 * <ReportView run={latestRun} />
 */
export function ReportView({ run }: ReportViewProps) {
  const { t } = useTranslation('common')
  const data  = run.data as ReportSnapshot
  const [popupBlocked, setPopupBlocked] = useState(false)

  function handleDownload() {
    const html = buildPrintHtml(data, new Date(run.generatedAt).toLocaleString(), t)
    const url  = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    const w    = window.open(url, '_blank')
    if (w) {
      w.addEventListener('load', () => URL.revokeObjectURL(url))
    } else {
      URL.revokeObjectURL(url)
      setPopupBlocked(true)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p
          className="font-mono text-xs tracking-[0.1em] uppercase"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          {t('reports.view.generated')} {new Date(run.generatedAt).toLocaleString()}
        </p>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleDownload}
            className="font-mono text-xs uppercase tracking-[0.08em] px-3 py-1.5 rounded-sm border transition-opacity hover:opacity-80 min-h-[36px]"
            style={{ borderColor: 'rgba(232,227,217,0.3)', color: 'var(--color-accent-bone)' }}
          >
            {t('reports.view.download')}
          </button>
          {popupBlocked && (
            <p className="font-mono text-[10px]" style={{ color: 'var(--color-error)' }}>
              {t('reports.detail.popup_blocked')}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      {data.stats && (
        <Section title={t('reports.sections.stats')}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(
              [
                ['impressions', data.stats.totals.impressions],
                ['reach',       data.stats.totals.reach],
                ['clicks',      data.stats.totals.clicks],
                ['likes',       data.stats.totals.likes],
              ] as [string, number][]
            ).map(([key, val]) => (
              <div
                key={key}
                className="rounded-sm border p-4"
                style={{ borderColor: 'rgba(232,227,217,0.1)' }}
              >
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.1em] mb-1"
                  style={{ color: 'var(--color-on-surface-variant)' }}
                >
                  {t(`analytics.stats.${key}`)}
                </p>
                <p className="font-mono text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>
                  {formatMetricValue(val)}
                </p>
                {data.stats!.delta.engagementRate != null && key === 'likes' && (
                  <p
                    className="font-mono text-[11px] mt-0.5"
                    style={{
                      color: (data.stats!.delta.engagementRate ?? 0) >= 0 ? 'var(--color-success-green)' : 'var(--color-error)',
                    }}
                  >
                    {(data.stats!.delta.engagementRate ?? 0) > 0 ? '+' : ''}
                    {data.stats!.delta.engagementRate}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Chart */}
      {data.chart && data.chart.series.length > 0 && (
        <Section title={t('reports.sections.chart')}>
          {/* ponytail: sparkline text fallback  no chart lib added for snapshots */}
          <div className="flex items-end gap-1 h-16 overflow-x-auto">
            {data.chart.series.slice(-30).map((point) => {
              const h = Math.max(4, Math.round((point.value / 100) * 64))
              return (
                <div
                  key={point.date}
                  title={`${point.date}: ${point.value.toFixed(1)}`}
                  className="flex-shrink-0 w-2 rounded-t-sm"
                  style={{ height: h, background: 'var(--color-primary)', opacity: 0.7 }}
                />
              )
            })}
          </div>
          <p
            className="font-mono text-[10px] mt-1"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            {t('reports.view.chart_last30')}
          </p>
        </Section>
      )}

      {/* Prediction */}
      {data.prediction && (
        <Section title={t('reports.sections.prediction')}>
          <p className="font-mono text-sm" style={{ color: 'var(--color-on-surface)' }}>
            {t('reports.view.confidence')}:{' '}
            <span style={{ color: 'var(--color-primary)' }}>{data.prediction.prediction.confidence}</span>
          </p>
        </Section>
      )}

      {/* Posts */}
      {data.posts && data.posts.posts.length > 0 && (
        <Section title={t('reports.sections.posts')}>
          <div className="space-y-2">
            {data.posts.posts.slice(0, 10).map((post) => (
              <div
                key={post.postId}
                className="flex justify-between items-center gap-4 px-3 py-2 rounded-sm border"
                style={{ borderColor: 'rgba(232,227,217,0.08)' }}
              >
                <p
                  className="font-mono text-xs truncate flex-1"
                  style={{ color: 'var(--color-on-surface)' }}
                >
                  {post.content?.slice(0, 80) ?? '(no content)'}
                </p>
                <span
                  className="font-mono text-xs shrink-0"
                  style={{ color: 'var(--color-on-surface-variant)' }}
                >
                  {(post.metrics.engagementRate * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Tip */}
      {data.tip && (
        <Section title={t('reports.sections.tip')}>
          <p className="font-mono text-sm" style={{ color: 'var(--color-on-surface)' }}>
            {t(`analytics.tips.${data.tip.dailyTip.key}`, data.tip.dailyTip.params ?? {})}
          </p>
        </Section>
      )}
    </div>
  )
}

// ─── Print HTML builder ───────────────────────────────────────────────────────

/** Escapes user-controlled strings before inserting into HTML to prevent XSS. */
function esc(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildPrintHtml(data: ReportSnapshot, generatedAt: string, t: (k: string) => string): string {
  const sections: string[] = []

  if (data.stats) {
    const { totals, delta } = data.stats
    sections.push(`
      <h2>${esc(t('reports.sections.stats'))}</h2>
      <table>
        <tr><th>${esc(t('analytics.stats.impressions'))}</th><td>${esc(String(totals.impressions))}</td></tr>
        <tr><th>${esc(t('analytics.stats.reach'))}</th><td>${esc(String(totals.reach))}</td></tr>
        <tr><th>${esc(t('analytics.stats.clicks'))}</th><td>${esc(String(totals.clicks))}</td></tr>
        <tr><th>${esc(t('analytics.stats.likes'))}</th><td>${esc(String(totals.likes))}</td></tr>
        <tr><th>${esc(t('analytics.stats.engagementRate'))}</th><td>${esc(String(delta.engagementRate))}%</td></tr>
      </table>`)
  }

  if (data.prediction) {
    const confKey = `analytics.chart.confidence.${data.prediction.prediction.confidence}`
    sections.push(`
      <h2>${esc(t('reports.sections.prediction'))}</h2>
      <p>${esc(t('reports.view.confidence'))}: <strong>${esc(t(confKey))}</strong></p>`)
  }

  if (data.posts?.posts.length) {
    const rows = data.posts.posts.slice(0, 10).map(p =>
      `<tr><td>${esc(p.content?.slice(0, 100))}</td><td>${esc((p.metrics.engagementRate * 100).toFixed(1))}%</td></tr>`
    ).join('')
    sections.push(`
      <h2>${esc(t('reports.sections.posts'))}</h2>
      <table><tr><th>Content</th><th>${esc(t('analytics.posts.engagement'))}</th></tr>${rows}</table>`)
  }

  if (data.tip) {
    sections.push(`
      <h2>${esc(t('reports.sections.tip'))}</h2>
      <p>${esc(t(`analytics.tips.${data.tip.dailyTip.key}`))}</p>`)
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(t('reports.page.title') || 'Report')}</title>
  <style>
    body { font-family: monospace; padding: 2rem; color: #111; }
    h1   { font-size: 1.2rem; margin-bottom: 0.25rem; }
    h2   { font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.1em;
           margin-top: 1.5rem; margin-bottom: 0.5rem; color: #555; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; }
    th, td { border: 1px solid #ddd; padding: 0.4rem 0.6rem; text-align: left; font-size: 0.85rem; }
    th { background: #f5f5f5; }
    p  { font-size: 0.9rem; }
    @media print { body { padding: 0; } }
  </style>
  <script>window.onload = () => window.print()</script>
  </head><body>
  <h1>${esc(t('reports.view.title') || 'Report')}</h1>
  <p style="color:#888;font-size:0.8rem">${esc(t('reports.view.generated'))} ${esc(generatedAt)}</p>
  ${sections.join('\n')}
  </body></html>`
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        className="font-mono text-xs tracking-[0.1em] uppercase mb-3"
        style={{ color: 'var(--color-on-surface-variant)' }}
      >
        {title}
      </p>
      {children}
    </div>
  )
}
