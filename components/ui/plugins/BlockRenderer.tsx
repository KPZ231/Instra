'use client'

import type { UIBlock } from '@/lib/plugins/blocks'
import { PluginErrorBoundary } from './PluginErrorBoundary'

interface BlockRendererProps {
  /** Block tree produced by a plugin's widget or route handler */
  blocks: UIBlock[]
}

/**
 * Renders a declarative plugin UIBlock tree using only trusted host
 * components  plugins never ship their own JSX/CSS.
 *
 * @param blocks - Block tree produced by a plugin's widget/route handler
 * @example
 * <BlockRenderer blocks={blocks} />
 */
export function BlockRenderer({ blocks }: BlockRendererProps) {
  return (
    <PluginErrorBoundary>
      <>
        {blocks.map((block, index) => (
          <Block key={`${block.type}-${index}`} block={block} />
        ))}
      </>
    </PluginErrorBoundary>
  )
}

/**
 * Renders a single UIBlock by switching on its discriminated-union type.
 *
 * @param block - A single UIBlock node from the plugin block tree
 */
function Block({ block }: { block: UIBlock }) {
  switch (block.type) {
    case 'text':
      return <p className="text-sm text-accent-bone">{block.value}</p>
    case 'card':
      return (
        <div className="rounded-lg border border-accent-bone/10 p-4">
          <h3 className="mb-2 font-semibold text-accent-bone">{block.title}</h3>
          <BlockRenderer blocks={block.children} />
        </div>
      )
    case 'list':
      return (
        <ul className="list-disc pl-5 text-sm text-accent-bone">
          {block.items.map((item, i) => (
            <li key={`item-${i}`}>{item}</li>
          ))}
        </ul>
      )
    case 'table':
      return (
        <table className="w-full text-sm text-accent-bone">
          <thead>
            <tr>
              {block.columns.map((col, i) => (
                <th key={`col-${i}`} className="text-left">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={`row-${i}`}>
                {row.map((cell, j) => (
                  <td key={`cell-${i}-${j}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    case 'button':
      return (
        <button
          type="button"
          className="rounded bg-success-green px-3 py-1 text-sm text-black"
          data-action={block.action}
        >
          {block.label}
        </button>
      )
  }
}
