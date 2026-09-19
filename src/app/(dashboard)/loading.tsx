export default function DashboardLoading() {
  return (
    <div className="flex-1 p-4 md:p-8 bg-[#FAFAFA] min-h-full overflow-y-auto animate-in fade-in duration-150">
      {/* Top fast pulse bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-pulse z-50" />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header Skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200/80 rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-slate-200/50 rounded animate-pulse" />
        </div>

        {/* Action / Filter Bar Skeleton */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <div className="h-8 w-28 bg-slate-200/80 rounded-lg animate-pulse" />
            <div className="h-8 w-24 bg-slate-200/60 rounded-lg animate-pulse" />
            <div className="h-8 w-24 bg-slate-200/60 rounded-lg animate-pulse" />
            <div className="h-8 w-24 bg-slate-200/60 rounded-lg animate-pulse" />
          </div>
          <div className="h-8 w-32 bg-slate-200/70 rounded-lg animate-pulse shrink-0" />
        </div>

        {/* Content Skeleton: Cards or Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div 
              key={i} 
              className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-xs"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 w-36 bg-slate-100 rounded animate-pulse" />
                  </div>
                </div>
                <div className="w-6 h-6 rounded-md bg-slate-100 animate-pulse" />
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5">
                <div className="h-7 bg-slate-200/60 rounded animate-pulse" />
                <div className="h-7 bg-slate-200/60 rounded animate-pulse" />
                <div className="h-7 bg-slate-200/60 rounded animate-pulse" />
              </div>

              {/* Action Button */}
              <div className="h-8 bg-slate-100 rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
