'use client'

import { useTransition } from 'react'
import { useTranslation } from 'react-i18next'
import { generateCaption } from '@/features/ai'

interface AiCaptionButtonProps {
  /** Current content of the composer — used as the generation prompt. */
  prompt: string
  /** Called with the generated caption text on success. */
  onGenerated: (text: string) => void
}

/**
 * Small "Generate" button that calls the generateCaption server action and
 * populates the PostComposer textarea with the result.
 * Language is inferred automatically from the prompt content.
 *
 * @param prompt      - Current composer text (sent as the AI prompt)
 * @param onGenerated - Callback that receives the generated caption
 *
 * @example
 * <AiCaptionButton prompt={content} onGenerated={setContent} />
 */
export function AiCaptionButton({ prompt, onGenerated }: AiCaptionButtonProps) {
  const { t } = useTranslation()
  const [isPending, startTransition] = useTransition()

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateCaption({}, { prompt: prompt || ' ' })
      if (result.text) {
        onGenerated(result.text)
      }
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isPending}
        aria-label={t('posts.composer.ai.generate_aria')}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-opacity hover:opacity-80 disabled:opacity-40"
        style={{ color: 'var(--color-primary)' }}
      >
        {isPending ? (
          <>
            <span aria-hidden="true" className="animate-spin">⟳</span>
            {t('posts.composer.ai.generating')}
          </>
        ) : (
          <>
            <span aria-hidden="true">✦</span>
            {t('posts.composer.ai.generate')}
          </>
        )}
      </button>
    </div>
  )
}
