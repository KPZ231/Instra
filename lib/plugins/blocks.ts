import { z } from 'zod'

const baseBlock = z.object({ type: z.string() })

export const uiBlockSchema: z.ZodType<UIBlock> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('text'), value: z.string() }),
    z.object({
      type: z.literal('card'),
      title: z.string(),
      children: z.array(uiBlockSchema).max(50),
    }),
    z.object({
      type: z.literal('list'),
      items: z.array(z.string()).max(200),
    }),
    z.object({
      type: z.literal('table'),
      columns: z.array(z.string()).max(20),
      rows: z.array(z.array(z.string())).max(500),
    }),
    z.object({
      type: z.literal('button'),
      label: z.string(),
      action: z.string().min(1),
    }),
  ]),
)

export type UIBlock =
  | { type: 'text'; value: string }
  | { type: 'card'; title: string; children: UIBlock[] }
  | { type: 'list'; items: string[] }
  | { type: 'table'; columns: string[]; rows: string[][] }
  | { type: 'button'; label: string; action: string }

void baseBlock
