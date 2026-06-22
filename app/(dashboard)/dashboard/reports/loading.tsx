/** Skeleton shown while the reports list page fetches data. */
export default function ReportsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-16 rounded-sm" style={{ background: 'rgba(232,227,217,0.08)' }} />
          <div className="h-7 w-32 rounded-sm" style={{ background: 'rgba(232,227,217,0.1)' }} />
        </div>
        <div className="h-9 w-28 rounded-sm" style={{ background: 'rgba(232,227,217,0.08)' }} />
      </div>

      {/* Rows */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-sm border p-4 flex flex-col sm:flex-row gap-4"
          style={{ borderColor: 'rgba(232,227,217,0.1)' }}
        >
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 rounded-sm" style={{ background: 'rgba(232,227,217,0.1)' }} />
            <div className="h-3 w-32 rounded-sm" style={{ background: 'rgba(232,227,217,0.06)' }} />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-9 w-20 rounded-sm" style={{ background: 'rgba(232,227,217,0.06)' }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
