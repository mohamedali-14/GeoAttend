function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-800 rounded-lg ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-[#00D084] border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm animate-pulse">Loading GeoAttend...</p>
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
      <Pulse className="h-4 w-1/3" />
      <Pulse className="h-8 w-1/2" />
      <Pulse className="h-3 w-2/3" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Pulse className="w-12 h-12 rounded-full" />
        <div className="flex flex-col gap-2 flex-1">
          <Pulse className="h-6 w-48" />
          <Pulse className="h-4 w-32" />
        </div>
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({length: 4}).map((_,i) => <CardSkeleton key={i} />)}
      </div>
      {/* Content */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
          <Pulse className="h-5 w-1/3" />
          {Array.from({length:5}).map((_,i) => <Pulse key={i} className="h-12" />)}
        </div>
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
          <Pulse className="h-5 w-1/3" />
          <Pulse className="h-40" />
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col divide-y divide-slate-800">
      {Array.from({length: rows}).map((_,i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Pulse className="w-9 h-9 rounded-full flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <Pulse className="h-4 w-1/3" />
            <Pulse className="h-3 w-1/4" />
          </div>
          <Pulse className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
