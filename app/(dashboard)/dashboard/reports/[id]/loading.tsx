/** Skeleton shown while the report detail page fetches data. */
export default function ReportDetailLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Back + heading */}
      <div className="space-y-2">
        <div className="h-3 w-20 rounded-sm" style={{ background: 'rgba(232,227,217,0.08)' }} />
        <div className="h-7 w-56 rounded-sm" style={{ background: 'rgba(232,227,217,0.1)' }} />
        <div className="h-3 w-32 rounded-sm" style={{ background: 'rgba(232,227,217,0.06)' }} />
      </div>

      {/* Run picker chips */}
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-6 w-20 rounded-sm" style={{ background: 'rgba(232,227,217,0.08)' }} />
        ))}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-sm border p-4 space-y-2"
            style={{ borderColor: 'rgba(232,227,217,0.1)' }}
          >
            <div className="h-2 w-16 rounded-sm" style={{ background: 'rgba(232,227,217,0.06)' }} />
            <div className="h-6 w-12 rounded-sm" style={{ background: 'rgba(232,227,217,0.1)' }} />
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="h-16 rounded-sm" style={{ background: 'rgba(232,227,217,0.04)' }} />
    </div>
  )
}
