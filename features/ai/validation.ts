import { z } from 'zod'

export const GenerateCaptionSchema = z.object({
  prompt: z.string().min(1, 'required').max(500, 'max 500 chars'),
})

export type GenerateCaptionInput = z.infer<typeof GenerateCaptionSchema>
