'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { createCampaign } from '@/features/campaigns'
import type { CreateCampaignState } from '@/features/campaigns'
import type { UserPostOption } from '@/lib/api/posts'
import { PostSelector } from './PostSelector'

type ActionType = 'PUBLISH_POST' | 'WEBHOOK'
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface CreateCampaignFormProps {
  posts: UserPostOption[]
}

const INTERVAL_PRESETS: Array<{ label: string; key: string; minutes: number }> = [
  { label: '15m', key: '15m', minutes: 15 },
  { label: '1h', key: '1h', minutes: 60 },
  { label: '6h', key: '6h', minutes: 360 },
  { label: '24h', key: '24h', minutes: 1440 },
]

const INPUT_CLASS =
  'w-full rounded-sm border px-3 py-2 text-sm bg-transparent outline-none focus:ring-1 disabled:opacity-40 min-h-[44px]'
const INPUT_STYLE = {
  borderColor: 'rgba(255,255,255,0.12)',
  background: 'var(--color-surface-container)',
  color: 'var(--color-on-surface)',
  caretColor: 'var(--color-primary)',
}

const LABEL_CLASS = 'block font-mono text-xs uppercase tracking-[0.08em] mb-1.5'
const LABEL_STYLE = { color: 'var(--color-on-surface-variant)' }
const HINT_CLASS = 'text-xs mt-1.5 leading-relaxed'
const HINT_STYLE = { color: 'var(--color-outline)' }

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return (
    <ul role="alert" aria-live="polite">
      {errors.map((e) => (
        <li key={e} className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>
          {e}
        </li>
      ))}
    </ul>
  )
}

/**
 * Form for creating a new campaign.
 * Renders a multi-post selector for PUBLISH_POST and webhook fields for WEBHOOK.
 * Each field has a helper text describing what it requires and does.
 *
 * @param posts - User's posts available for selection
 * @example
 * <CreateCampaignForm posts={posts} />
 */
export function CreateCampaignForm({ posts }: CreateCampaignFormProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState<CreateCampaignState>({})

  // Form state
  const [name, setName] = useState('')
  const [actionType, setActionType] = useState<ActionType>('WEBHOOK')
  const [intervalMinutes, setIntervalMinutes] = useState(60)
  const [totalRuns, setTotalRuns] = useState(5)
  const [startAt, setStartAt] = useState('')

  // PUBLISH_POST payload  multi-select
  const [postIds, setPostIds] = useState<string[]>([])

  // WEBHOOK payload
  const [url, setUrl] = useState('')
  const [method, setMethod] = useState<HttpMethod>('POST')
  const [body, setBody] = useState('')

  function buildPayload(): Record<string, unknown> {
    if (actionType === 'PUBLISH_POST') return { postIds }
    return { url, method, ...(body ? { body } : {}) }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await createCampaign(state, {
        name,
        actionType,
        payload: buildPayload(),
        intervalMinutes,
        totalRuns,
        startAt: startAt ? new Date(startAt) : undefined,
      })
      setState(result)
      if (result.success) {
        toast.success(t('campaigns.toast.created'))
        router.push('/dashboard/campaigns')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Form-level errors */}
      {state.errors?._form?.map((err) => (
        <p
          key={err}
          role="alert"
          className="text-xs p-3 rounded-sm border"
          style={{ color: '#ffb4ab', borderColor: 'rgba(255,75,75,0.3)', background: 'rgba(255,75,75,0.06)' }}
        >
          {err}
        </p>
      ))}

      {/* Name */}
      <div>
        <label htmlFor="name" className={LABEL_CLASS} style={LABEL_STYLE}>
          {t('campaigns.field.name')}
          <span className="ml-1" style={{ color: '#ffb4ab' }} aria-hidden>*</span>
        </label>
        <div className="relative">
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('campaigns.field.name_placeholder')}
            maxLength={100}
            required
            disabled={isPending}
            className={INPUT_CLASS}
            style={INPUT_STYLE}
            autoComplete="off"
          />
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] tabular-nums pointer-events-none"
            style={{ color: 'var(--color-outline)' }}
          >
            {name.length}/100
          </span>
        </div>
        <p className={HINT_CLASS} style={HINT_STYLE}>{t('campaigns.field.name_help')}</p>
        <FieldError errors={state.errors?.name} />
      </div>

      {/* Action type */}
      <div>
        <p className={LABEL_CLASS} style={LABEL_STYLE}>
          {t('campaigns.field.action_type')}
          <span className="ml-1" style={{ color: '#ffb4ab' }} aria-hidden>*</span>
        </p>
        <div className="flex gap-2" role="group" aria-label={t('campaigns.field.action_type')}>
          {(['WEBHOOK', 'PUBLISH_POST'] as ActionType[]).map((type) => {
            const isActive = actionType === type
            return (
              <button
                key={type}
                type="button"
                onClick={() => setActionType(type)}
                className="font-mono text-xs uppercase tracking-[0.08em] px-4 py-2 rounded-sm border transition-opacity min-h-[44px]"
                style={{
                  borderColor: isActive ? 'var(--color-accent-bone)' : 'rgba(255,255,255,0.12)',
                  color: isActive ? 'var(--color-accent-bone)' : 'var(--color-on-surface-variant)',
                  background: isActive ? 'rgba(232,227,217,0.06)' : 'transparent',
                }}
                aria-pressed={isActive}
              >
                {t(`campaigns.action.${type.toLowerCase()}`)}
              </button>
            )
          })}
        </div>
        <p className={HINT_CLASS} style={HINT_STYLE}>{t('campaigns.field.action_type_help')}</p>
        <FieldError errors={state.errors?.actionType} />
      </div>

      {/* Payload  progressive disclosure */}
      {actionType === 'PUBLISH_POST' && (
        <div>
          <p className={LABEL_CLASS} style={LABEL_STYLE}>
            {t('campaigns.field.posts')}
            <span className="ml-1" style={{ color: '#ffb4ab' }} aria-hidden>*</span>
          </p>
          <PostSelector
            posts={posts}
            selected={postIds}
            onChange={setPostIds}
            disabled={isPending}
          />
          <p className={HINT_CLASS} style={HINT_STYLE}>{t('campaigns.field.posts_help')}</p>
          <FieldError errors={state.errors?.payload} />
        </div>
      )}

      {actionType === 'WEBHOOK' && (
        <div className="space-y-5">
          <div>
            <label htmlFor="url" className={LABEL_CLASS} style={LABEL_STYLE}>
              {t('campaigns.field.url')}
              <span className="ml-1" style={{ color: '#ffb4ab' }} aria-hidden>*</span>
            </label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t('campaigns.field.url_placeholder')}
              required
              disabled={isPending}
              className={INPUT_CLASS}
              style={INPUT_STYLE}
              autoComplete="off"
            />
            <p className={HINT_CLASS} style={HINT_STYLE}>{t('campaigns.field.url_help')}</p>
            <FieldError errors={state.errors?.payload} />
          </div>

          <div>
            <label htmlFor="method" className={LABEL_CLASS} style={LABEL_STYLE}>
              {t('campaigns.field.method')}
            </label>
            <select
              id="method"
              value={method}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
              disabled={isPending}
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            >
              {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as HttpMethod[]).map((m) => (
                <option key={m} value={m} style={{ background: '#121212' }}>
                  {m}
                </option>
              ))}
            </select>
            <p className={HINT_CLASS} style={HINT_STYLE}>{t('campaigns.field.method_help')}</p>
          </div>

          <div>
            <label htmlFor="body" className={LABEL_CLASS} style={LABEL_STYLE}>
              {t('campaigns.field.body')}
            </label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('campaigns.field.body_placeholder')}
              rows={3}
              disabled={isPending}
              className="w-full rounded-sm border px-3 py-2 text-sm outline-none focus:ring-1 disabled:opacity-40 resize-y font-mono"
              style={INPUT_STYLE}
            />
            <p className={HINT_CLASS} style={HINT_STYLE}>{t('campaigns.field.body_help')}</p>
          </div>
        </div>
      )}

      {/* Interval */}
      <div>
        <label htmlFor="intervalMinutes" className={LABEL_CLASS} style={LABEL_STYLE}>
          {t('campaigns.field.interval')}
          <span className="ml-1" style={{ color: '#ffb4ab' }} aria-hidden>*</span>
        </label>
        <div className="flex gap-2 mb-2 flex-wrap">
          {INTERVAL_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setIntervalMinutes(p.minutes)}
              className="font-mono text-[10px] uppercase tracking-[0.08em] px-2.5 py-1 rounded-sm border transition-opacity min-h-[32px]"
              style={{
                borderColor: intervalMinutes === p.minutes ? 'var(--color-accent-bone)' : 'rgba(255,255,255,0.12)',
                color: intervalMinutes === p.minutes ? 'var(--color-accent-bone)' : 'var(--color-on-surface-variant)',
              }}
              aria-pressed={intervalMinutes === p.minutes}
            >
              {t(`campaigns.interval_preset.${p.key}`)}
            </button>
          ))}
        </div>
        <input
          id="intervalMinutes"
          type="number"
          value={intervalMinutes}
          onChange={(e) => setIntervalMinutes(Number(e.target.value))}
          min={1}
          required
          disabled={isPending}
          className={INPUT_CLASS}
          style={INPUT_STYLE}
        />
        <p className={HINT_CLASS} style={HINT_STYLE}>{t('campaigns.field.interval_help')}</p>
        <FieldError errors={state.errors?.intervalMinutes} />
      </div>

      {/* Total runs */}
      <div>
        <label htmlFor="totalRuns" className={LABEL_CLASS} style={LABEL_STYLE}>
          {t('campaigns.field.total_runs')}
          <span className="ml-1" style={{ color: '#ffb4ab' }} aria-hidden>*</span>
        </label>
        <input
          id="totalRuns"
          type="number"
          value={totalRuns}
          onChange={(e) => setTotalRuns(Number(e.target.value))}
          min={1}
          max={10000}
          required
          disabled={isPending}
          className={INPUT_CLASS}
          style={INPUT_STYLE}
        />
        <p className={HINT_CLASS} style={HINT_STYLE}>{t('campaigns.field.total_runs_help')}</p>
        <FieldError errors={state.errors?.totalRuns} />
      </div>

      {/* Start at */}
      <div>
        <label htmlFor="startAt" className={LABEL_CLASS} style={LABEL_STYLE}>
          {t('campaigns.field.start_at')}
        </label>
        <input
          id="startAt"
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          disabled={isPending}
          className={INPUT_CLASS}
          style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
        />
        <p className={HINT_CLASS} style={HINT_STYLE}>{t('campaigns.field.start_at_help')}</p>
      </div>

      {/* Submit */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary disabled:opacity-40 min-h-[44px]"
        >
          {isPending ? t('campaigns.new.saving') : t('campaigns.new.save')}
        </button>
      </div>
    </form>
  )
}
