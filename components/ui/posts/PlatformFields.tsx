'use client'

import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import type { PlatformId } from './PlatformSelector'
import { PLATFORMS } from './PlatformSelector'

/** Per-platform character limits */
export const PLATFORM_CHAR_LIMITS: Record<PlatformId, number> = {
  instagram: 2200,
  facebook: 63206,
  twitter: 280,
  tiktok: 2200,
  linkedin: 3000,
  youtube: 5000,
}

/** Hints shown below the content textarea per platform (single mode) */
const PLATFORM_HINTS: Record<PlatformId, string> = {
  instagram: 'Up to 2,200 chars · 30 hashtags · up to 10 images',
  facebook: 'Up to 63,206 chars · link preview supported',
  twitter: '280 chars per tweet · thread option available',
  tiktok: 'Up to 2,200 chars · hashtags boost reach',
  linkedin: 'Up to 3,000 chars · tag connections by @name',
  youtube: 'Title up to 100 chars · description up to 5,000 chars',
}

/** Platform-specific form data */
export interface PlatformSpecificData {
  hashtags?: string
  firstComment?: boolean
  altText?: string
  isThread?: boolean
  articleTitle?: string
  videoTitle?: string
  tags?: string
}

export type AllPlatformData = Partial<Record<PlatformId, PlatformSpecificData>>

interface PlatformFieldsProps {
  platforms: PlatformId[]
  data: AllPlatformData
  onChange: (id: PlatformId, patch: Partial<PlatformSpecificData>) => void
  /** "single" renders one platform's fields inline; "multi" renders tabbed sections */
  mode: 'single' | 'multi'
}

/**
 * Renders platform-specific extra fields (hashtags, alt text, thread mode, etc.)
 * for the selected platform(s). In single mode shows one platform's fields.
 * In multi mode renders a tab bar to switch between per-platform extras.
 *
 * @param platforms - Currently selected platform IDs
 * @param data      - Map of platform ID → its current field values
 * @param onChange  - Called with (platformId, fieldPatch) on any field change
 * @param mode      - "single" or "multi" layout
 *
 * @example
 * <PlatformFields
 *   platforms={['instagram']}
 *   data={platformData}
 *   onChange={handlePlatformDataChange}
 *   mode="single"
 * />
 */
export function PlatformFields({ platforms, data, onChange, mode }: PlatformFieldsProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<PlatformId>(platforms[0])

  const activePlatform = mode === 'single' ? platforms[0] : (activeTab ?? platforms[0])

  if (platforms.length === 0) return null

  // Ensure activeTab stays valid when platforms change
  const safeTab = platforms.includes(activePlatform) ? activePlatform : platforms[0]

  return (
    <div className="space-y-3">
      {/* Tab bar — multi mode only */}
      {mode === 'multi' && (
        <div
          className="flex gap-1 flex-wrap border-b pb-2"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          role="tablist"
          aria-label={t('posts.composer.platform_fields.tabs_label')}
        >
          {platforms.map((id) => {
            const meta = PLATFORMS.find((p) => p.id === id)!
            const isActive = safeTab === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(id)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm font-mono text-[10px] tracking-[0.06em] uppercase transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                style={
                  isActive
                    ? {
                        background: `${meta.color}14`,
                        borderBottom: `2px solid ${meta.color}`,
                        color: meta.color,
                        outlineColor: meta.color,
                        marginBottom: -2,
                      }
                    : {
                        color: 'var(--color-outline)',
                        outlineColor: 'var(--color-outline)',
                      }
                }
              >
                <PlatformIcon id={id} size={10} />
                {meta.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Fields for the active/single platform */}
      <PlatformExtraFields
        platformId={safeTab}
        data={data[safeTab] ?? {}}
        onChange={(patch) => onChange(safeTab, patch)}
        t={t}
      />
    </div>
  )
}

/** Single-platform hint line */
export function PlatformHint({ platformId }: { platformId: PlatformId }) {
  return (
    <p
      className="font-mono text-[10px]"
      style={{ color: 'var(--color-outline)' }}
    >
      {PLATFORM_HINTS[platformId]}
    </p>
  )
}

// ── Internal helpers ──────────────────────────────────────────────────────────

interface ExtraFieldsProps {
  platformId: PlatformId
  data: PlatformSpecificData
  onChange: (patch: Partial<PlatformSpecificData>) => void
  t: (key: string, opts?: Record<string, unknown>) => string
}

function PlatformExtraFields({ platformId, data, onChange, t }: ExtraFieldsProps) {
  const fieldClass =
    'w-full px-3 py-2 rounded-sm font-mono text-xs bg-transparent border transition-colors focus:outline-none focus:ring-1'
  const fieldStyle = {
    borderColor: 'rgba(255,255,255,0.1)',
    color: 'var(--color-on-surface)',
  }
  const labelClass = 'font-mono text-[10px] uppercase tracking-[0.08em]'
  const labelStyle = { color: 'var(--color-outline)' }

  switch (platformId) {
    case 'instagram':
      return (
        <div className="space-y-3">
          {/* Hashtags */}
          <div className="space-y-1">
            <label className={labelClass} style={labelStyle}>
              {t('posts.composer.platform_fields.hashtags')}
            </label>
            <input
              type="text"
              name="instagram_hashtags"
              placeholder="#photography #travel #instagood"
              maxLength={500}
              value={data.hashtags ?? ''}
              onChange={(e) => onChange({ hashtags: e.target.value })}
              className={fieldClass}
              style={fieldStyle}
            />
            <p className="font-mono text-[10px]" style={{ color: 'var(--color-outline)' }}>
              {t('posts.composer.platform_fields.hashtags_hint', { max: 30 })}
            </p>
          </div>
          {/* First comment toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <span
              className="relative w-8 h-4 rounded-full border transition-colors"
              style={{
                background: data.firstComment ? '#E1306C22' : 'transparent',
                borderColor: data.firstComment ? '#E1306C' : 'rgba(255,255,255,0.15)',
              }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform duration-200"
                style={{
                  background: data.firstComment ? '#E1306C' : 'var(--color-outline)',
                  transform: data.firstComment ? 'translateX(16px)' : 'translateX(0)',
                }}
              />
              <input
                type="checkbox"
                name="instagram_firstComment"
                checked={data.firstComment ?? false}
                onChange={(e) => onChange({ firstComment: e.target.checked })}
                className="sr-only"
              />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.06em]" style={{ color: 'var(--color-outline)' }}>
              {t('posts.composer.platform_fields.first_comment')}
            </span>
          </label>
        </div>
      )

    case 'twitter':
      return (
        <div className="space-y-3">
          {/* Alt text for images */}
          <div className="space-y-1">
            <label className={labelClass} style={labelStyle}>
              {t('posts.composer.platform_fields.alt_text')}
            </label>
            <input
              type="text"
              name="twitter_altText"
              placeholder={t('posts.composer.platform_fields.alt_text_placeholder')}
              maxLength={1000}
              value={data.altText ?? ''}
              onChange={(e) => onChange({ altText: e.target.value })}
              className={fieldClass}
              style={fieldStyle}
            />
          </div>
          {/* Thread toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <span
              className="relative w-8 h-4 rounded-full border transition-colors"
              style={{
                background: data.isThread ? '#ffffff22' : 'transparent',
                borderColor: data.isThread ? '#ffffff' : 'rgba(255,255,255,0.15)',
              }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform duration-200"
                style={{
                  background: data.isThread ? '#ffffff' : 'var(--color-outline)',
                  transform: data.isThread ? 'translateX(16px)' : 'translateX(0)',
                }}
              />
              <input
                type="checkbox"
                name="twitter_isThread"
                checked={data.isThread ?? false}
                onChange={(e) => onChange({ isThread: e.target.checked })}
                className="sr-only"
              />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.06em]" style={{ color: 'var(--color-outline)' }}>
              {t('posts.composer.platform_fields.thread_mode')}
            </span>
          </label>
        </div>
      )

    case 'tiktok':
      return (
        <div className="space-y-1">
          <label className={labelClass} style={labelStyle}>
            {t('posts.composer.platform_fields.hashtags')}
          </label>
          <input
            type="text"
            name="tiktok_hashtags"
            placeholder="#fyp #viral #trending"
            maxLength={500}
            value={data.hashtags ?? ''}
            onChange={(e) => onChange({ hashtags: e.target.value })}
            className={fieldClass}
            style={fieldStyle}
          />
          <p className="font-mono text-[10px]" style={{ color: 'var(--color-outline)' }}>
            {t('posts.composer.platform_fields.tiktok_hashtags_hint')}
          </p>
        </div>
      )

    case 'linkedin':
      return (
        <div className="space-y-1">
          <label className={labelClass} style={labelStyle}>
            {t('posts.composer.platform_fields.article_title')}
          </label>
          <input
            type="text"
            name="linkedin_articleTitle"
            placeholder={t('posts.composer.platform_fields.article_title_placeholder')}
            maxLength={200}
            value={data.articleTitle ?? ''}
            onChange={(e) => onChange({ articleTitle: e.target.value })}
            className={fieldClass}
            style={fieldStyle}
          />
          <p className="font-mono text-[10px]" style={{ color: 'var(--color-outline)' }}>
            {t('posts.composer.platform_fields.article_title_hint')}
          </p>
        </div>
      )

    case 'youtube':
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className={labelClass} style={labelStyle}>
              {t('posts.composer.platform_fields.video_title')}
              <span className="ml-1 text-[#ffb4ab]">*</span>
            </label>
            <input
              type="text"
              name="youtube_videoTitle"
              placeholder={t('posts.composer.platform_fields.video_title_placeholder')}
              maxLength={100}
              value={data.videoTitle ?? ''}
              onChange={(e) => onChange({ videoTitle: e.target.value })}
              className={fieldClass}
              style={fieldStyle}
            />
            {data.videoTitle && (
              <p className="font-mono text-[10px] text-right" style={{ color: 'var(--color-outline)' }}>
                {data.videoTitle.length}/100
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className={labelClass} style={labelStyle}>
              {t('posts.composer.platform_fields.tags')}
            </label>
            <input
              type="text"
              name="youtube_tags"
              placeholder={t('posts.composer.platform_fields.tags_placeholder')}
              maxLength={500}
              value={data.tags ?? ''}
              onChange={(e) => onChange({ tags: e.target.value })}
              className={fieldClass}
              style={fieldStyle}
            />
            <p className="font-mono text-[10px]" style={{ color: 'var(--color-outline)' }}>
              {t('posts.composer.platform_fields.tags_hint')}
            </p>
          </div>
        </div>
      )

    case 'facebook':
      // Facebook needs no extra fields beyond the main content
      return (
        <p className="font-mono text-[10px]" style={{ color: 'var(--color-outline)' }}>
          {t('posts.composer.platform_fields.facebook_hint')}
        </p>
      )

    default:
      return null
  }
}

/** Tiny inline SVG brand icons */
export function PlatformIcon({ id, size = 12 }: { id: PlatformId; size?: number }) {
  const s = size
  switch (id) {
    case 'instagram':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'facebook':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      )
    case 'twitter':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      )
    case 'tiktok':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.83a8.18 8.18 0 0 0 4.79 1.53V6.93a4.84 4.84 0 0 1-1.02-.24z" />
        </svg>
      )
    case 'linkedin':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      )
    case 'youtube':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
          <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="var(--color-surface, #000)" />
        </svg>
      )
  }
}
