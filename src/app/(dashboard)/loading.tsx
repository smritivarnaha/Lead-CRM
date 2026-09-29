export default function DashboardLoading() {
  return (
    <div className="w-full h-full flex flex-col space-y-6 animate-in fade-in duration-150">
      {/* Sleek top indeterminate progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 via-indigo-500 to-purple-600 animate-pulse z-50 shadow-sm" />

      {/* Page Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-44 bg-slate-200/70 rounded-lg animate-pulse" />
        <div className="h-4 w-64 bg-slate-100 rounded animate-pulse" />
      </div>

      {/* Neutral Content Skeleton Container (matches any page: tables, kanban, forms, charts) */}
      <div className="flex-1 min-h-[380px] bg-white/70 backdrop-blur-xs rounded-2xl border border-slate-200/60 p-6 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div className="h-8 w-36 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-8 w-24 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-3 pt-2">
          <div className="h-10 w-full bg-slate-50 rounded-xl animate-pulse" />
          <div className="h-10 w-full bg-slate-50/70 rounded-xl animate-pulse" />
          <div className="h-10 w-full bg-slate-50/50 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
