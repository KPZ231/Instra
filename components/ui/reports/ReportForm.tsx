'use client'

import { useActionState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { createReport } from '@/features/reports/actions/createReport'
import type { CreateReportState } from '@/features/reports/actions/createReport'

const SECTION_OPTIONS = [
  { key: 'stats',      label: 'reports.sections.stats' },
  { key: 'chart',      label: 'reports.sections.chart' },
  { key: 'posts',      label: 'reports.sections.posts' },
  { key: 'prediction', label: 'reports.sections.prediction' },
  { key: 'tip',        label: 'reports.sections.tip' },
] as const

const INTERVAL_OPTIONS = [
  { label: 'reports.form.interval_none', value: undefined },
  { label: 'reports.form.interval_week',    value: 7  },
  { label: 'reports.form.interval_2weeks',  value: 14 },
  { label: 'reports.form.interval_month',   value: 30 },
] as const

interface ReportFormProps {
  onSuccess?: (reportId: string) => void
}

/**
 * Form for creating a new report definition.
 * User selects sections to include and an optional recurrence interval.
 *
 * @param onSuccess - Called with the new report ID on success
 *
 * @example
 * <ReportForm onSuccess={(id) => router.push(`/dashboard/reports/${id}`)} />
 */
export function ReportForm({ onSuccess }: ReportFormProps) {
  const { t }      = useTranslation('common')
  const router     = useRouter()
  const [state, action, isPending] = useActionState<CreateReportState, FormData>(
    async (prev, formData) => {
      const sections = (SECTION_OPTIONS
        .map((s) => s.key)
        .filter((k) => formData.get(k) === 'on')) as string[]

      const intervalVal = formData.get('intervalDays')
      const intervalDays = intervalVal ? parseInt(intervalVal as string, 10) : undefined

      const result = await createReport(prev, {
        name: formData.get('name') as string,
        sections: sections as ('stats' | 'chart' | 'posts' | 'prediction' | 'tip')[],
        intervalDays,
      })

      if (result.success && result.reportId) {
        if (onSuccess) {
          onSuccess(result.reportId)
        } else {
          router.push(`/dashboard/reports/${result.reportId}`)
        }
      }
      return result
    },
    {},
  )

  return (
    <form action={action} className="space-y-6">
      {/* Name */}
      <div>
        <label
          htmlFor="report-name"
          className="block font-mono text-xs tracking-[0.1em] uppercase mb-2"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          {t('reports.form.name')}
        </label>
        <input
          id="report-name"
          name="name"
          type="text"
          required
          maxLength={100}
          placeholder={t('reports.form.name_placeholder')}
          aria-invalid={!!state.errors?.name}
          aria-describedby={state.errors?.name ? 'report-name-error' : undefined}
          className="w-full px-3 py-2 rounded-sm border bg-transparent font-mono text-sm focus:outline-none focus:ring-1 min-h-[44px]"
          style={{
            borderColor: 'rgba(232,227,217,0.2)',
            color: 'var(--color-on-surface)',
          }}
        />
        {state.errors?.name && (
          <p id="report-name-error" className="mt-1 font-mono text-xs" style={{ color: 'var(--color-error)' }}>
            {state.errors.name[0]}
          </p>
        )}
      </div>

      {/* Sections */}
      <div>
        <p
          className="font-mono text-xs tracking-[0.1em] uppercase mb-3"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          {t('reports.form.sections')}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SECTION_OPTIONS.map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-sm border transition-colors"
              style={{ borderColor: 'rgba(232,227,217,0.15)' }}
            >
              <input
                type="checkbox"
                name={key}
                defaultChecked
                className="accent-current"
              />
              <span className="font-mono text-xs" style={{ color: 'var(--color-on-surface)' }}>
                {t(label)}
              </span>
            </label>
          ))}
        </div>
        {state.errors?.sections && (
          <p className="mt-1 font-mono text-xs" style={{ color: 'var(--color-error)' }}>
            {state.errors.sections[0]}
          </p>
        )}
      </div>

      {/* Interval */}
      <div>
        <label
          htmlFor="report-interval"
          className="block font-mono text-xs tracking-[0.1em] uppercase mb-2"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          {t('reports.form.interval')}
        </label>
        <select
          id="report-interval"
          name="intervalDays"
          className="w-full px-3 py-2 rounded-sm border bg-transparent font-mono text-sm focus:outline-none focus:ring-1 min-h-[44px]"
          style={{
            borderColor: 'rgba(232,227,217,0.2)',
            color: 'var(--color-on-surface)',
          }}
        >
          {INTERVAL_OPTIONS.map(({ label, value }) => (
            <option key={label} value={value ?? ''} style={{ background: '#1a1a1a' }}>
              {t(label)}
            </option>
          ))}
        </select>
      </div>

      {state.errors?._form && (
        <p className="font-mono text-xs" style={{ color: 'var(--color-error)' }}>
          {state.errors._form[0]}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full sm:w-auto px-6 py-2 rounded-sm font-mono text-xs tracking-[0.08em] uppercase border transition-opacity hover:opacity-80 disabled:opacity-50 min-h-[44px]"
        style={{
          borderColor: 'rgba(232,227,217,0.3)',
          color: 'var(--color-accent-bone)',
        }}
      >
        {isPending ? t('reports.form.creating') : t('reports.form.create')}
      </button>
    </form>
  )
}
