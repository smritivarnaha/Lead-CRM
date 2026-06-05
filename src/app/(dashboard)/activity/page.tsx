export default function ActivityPage() {
  return (
    <div className="flex flex-col h-full gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Activity Log</h2>
        <p className="text-sm text-slate-500 mt-1">System-wide audit trail and activity history.</p>
      </div>
      <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-500">Activity log coming soon...</p>
        </div>
      </div>
    </div>
  );
}
