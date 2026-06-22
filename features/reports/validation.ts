import { z } from 'zod'

const VALID_SECTIONS = ['stats', 'chart', 'posts', 'prediction', 'tip'] as const

/**
 * Schema for creating a new report definition.
 * intervalDays is optional; when provided, must be >= 7 (minimum weekly).
 */
export const CreateReportSchema = z.object({
  name:         z.string().min(1).max(100),
  sections:     z
    .array(z.enum(['stats', 'chart', 'posts', 'prediction', 'tip']))
    .min(1, 'Select at least one section')
    .refine(
      (arr) => arr.every((s) => (VALID_SECTIONS as readonly string[]).includes(s)),
      'Invalid section',
    ),
  intervalDays: z.number().int().min(7).optional(),
})

export type CreateReportInput = z.infer<typeof CreateReportSchema>

export const SetReportStatusSchema = z.object({
  id:     z.string().min(1),
  status: z.enum(['ACTIVE', 'PAUSED']),
})

export const DeleteReportSchema = z.object({
  id: z.string().min(1),
})

export const GenerateReportNowSchema = z.object({
  id: z.string().min(1),
})
