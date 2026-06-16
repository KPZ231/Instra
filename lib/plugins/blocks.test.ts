import { describe, it, expect } from 'vitest'
import { uiBlockSchema } from './blocks'

describe('uiBlockSchema', () => {
  it('accepts a valid card block with nested children', () => {
    const result = uiBlockSchema.safeParse({
      type: 'card',
      title: 'Hello',
      children: [{ type: 'text', value: 'World' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects an unknown block type', () => {
    const result = uiBlockSchema.safeParse({ type: 'iframe', src: 'evil.com' })
    expect(result.success).toBe(false)
  })

  it('rejects a button block without an action name', () => {
    const result = uiBlockSchema.safeParse({ type: 'button', label: 'Click' })
    expect(result.success).toBe(false)
  })
})
