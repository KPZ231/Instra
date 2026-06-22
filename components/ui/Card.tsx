interface CardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

/**
 * Reusable Card wrapper with project surface styling.
 *
 * @param children - Card contents
 * @param className - Additional Tailwind classes
 *
 * @example
 * <Card className="p-4"><PostCard post={post} /></Card>
 */
export function Card({ children, className = '', style }: CardProps) {
  return (
    <div
      className={`rounded-sm border ${className}`}
      style={{
        background: 'var(--color-surface-container-lowest)',
        borderColor: 'rgba(255,255,255,0.1)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
