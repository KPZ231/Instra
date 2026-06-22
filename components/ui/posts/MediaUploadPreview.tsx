'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { MAX_POST_MEDIA } from '@/features/posts/validation'

interface MediaUploadPreviewProps {
  /** Array of File objects selected by the user */
  files: File[]
  /** Callback called with the index of the file to remove */
  onRemove: (index: number) => void
}

/**
 * Displays a grid of thumbnail previews for files selected in the PostComposer.
 * Each thumbnail has a remove button. Object URLs are created once per render
 * cycle and revoked on cleanup to prevent memory leaks.
 * Respects the MAX_POST_MEDIA limit from validation config.
 *
 * @param files    - Array of File objects selected by the user (max MAX_POST_MEDIA)
 * @param onRemove - Callback called with the index of the file to remove
 *
 * @example
 * <MediaUploadPreview files={selectedFiles} onRemove={(i) => removeFile(i)} />
 */
export function MediaUploadPreview({ files, onRemove }: MediaUploadPreviewProps) {
  const [urls, setUrls] = useState<string[]>([])

  useEffect(() => {
    const newUrls = files.map((file) => URL.createObjectURL(file))
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrls(newUrls)
    return () => newUrls.forEach((url) => URL.revokeObjectURL(url))
  }, [files])

  if (files.length === 0) return null

  const displayFiles = files.slice(0, MAX_POST_MEDIA)

  return (
    <div className="grid grid-cols-3 gap-2" role="list" aria-label="Selected media previews">
      {displayFiles.map((file, i) => {
        const url = urls[i] ?? ''
        return (
          <div
            key={`${file.name}-${file.lastModified}-${i}`}
            className="relative aspect-square rounded-sm overflow-hidden bg-[var(--surface-container)]"
            role="listitem"
          >
            {url && (
              <Image
                src={url}
                alt={`Selected image ${i + 1}: ${file.name}`}
                fill
                className="object-cover"
                sizes="150px"
              />
            )}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center text-xs font-bold hover:bg-black/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white transition-colors"
              aria-label={`Remove image ${i + 1}`}
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
