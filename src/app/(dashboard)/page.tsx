"use client";

import { useState, useEffect } from "react";
import { getDashboardStats } from "@/actions/dashboard";
import {
  Users, TrendingUp, TrendingDown, Globe,
  Inbox, PhoneCall, RefreshCw, CheckCircle2,
  Loader2, AlertCircle, ArrowUpRight, ArrowDownRight,
  Zap,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

type DashboardData = Awaited<ReturnType<typeof getDashboardStats>>;

/* ─── helpers ─── */
function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  NEW:         { bg: "#EDE9FE", text: "#7C3AED", dot: "#7C3AED" },
  CONTACTED:   { bg: "#DBEAFE", text: "#1D4ED8", dot: "#3B82F6" },
  FOLLOW_UP:   { bg: "#FEF3C7", text: "#B45309", dot: "#F59E0B" },
  CONVERTED:   { bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
  LOST:        { bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444" },
  NO_RESPONSE: { bg: "#F3F4F6", text: "#374151", dot: "#9CA3AF" },
};

const PRIORITY_DOT: Record<string, string> = {
  HIGH:   "#EF4444",
  NORMAL: "#7C3AED",
  LOW:    "#9CA3AF",
};

/* ─── Stat Card ─── */
function StatCard({
  label, value, sub, icon, accentColor, accentBg, trend, trendLabel,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; accentColor: string; accentBg: string;
  trend?: number; trendLabel?: string;
}) {
  const isUp = trend === undefined ? null : trend >= 0;
  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-white p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
      style={{ border: "1px solid #E8E4F3", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      {/* Soft gradient circle in top-right */}
      <div
        className="absolute -top-6 -right-6 h-24 w-24 rounded-full opacity-10"
        style={{ background: accentColor }}
      />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12.5px] font-medium" style={{ color: "#9CA3AF" }}>
            {label}
          </p>
          <p
            className="mt-1.5 text-[28px] font-bold leading-none tracking-tight"
            style={{ color: "#1A1523" }}
          >
            {value}
          </p>
          {sub && (
            <p className="mt-1 text-[12px]" style={{ color: "#9CA3AF" }}>
              {sub}
            </p>
          )}
          {trend !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
                style={{
                  background: isUp ? "#D1FAE5" : "#FEE2E2",
                  color: isUp ? "#065F46" : "#991B1B",
                }}
              >
                {isUp ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {Math.abs(trend)}%
              </span>
              {trendLabel && (
                <span className="text-[11px]" style={{ color: "#9CA3AF" }}>
                  {trendLabel}
                </span>
              )}
            </div>
          )}
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
          style={{ background: accentBg }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ─── Custom Tooltip ─── */
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 text-[13px] shadow-lg"
      style={{ background: "#1A1523", color: "#fff", border: "none" }}
    >
      <p className="font-semibold">{label}</p>
      <p style={{ color: "#A78BFA" }}>{payload[0].value} leads</p>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getDashboardStats();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = data?.success ? data.stats : null;
  const recentLeads = data?.success ? data.recentLeads : [];
  const chartData =
    data?.success && data.chartData && data.chartData.length > 0
      ? data.chartData
      : [
          { name: "Mon", leads: 0 }, { name: "Tue", leads: 0 }, { name: "Wed", leads: 0 },
          { name: "Thu", leads: 0 }, { name: "Fri", leads: 0 }, { name: "Sat", leads: 0 },
          { name: "Sun", leads: 0 },
        ];

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* ─── Top bar ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight" style={{ color: "#1A1523" }}>
            Dashboard
          </h2>
          <p className="mt-0.5 text-[13px]" style={{ color: "#9CA3AF" }}>
            Live overview of all your leads and websites.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border bg-white px-3.5 py-2 text-[13px] font-medium transition-all hover:border-[#7C3AED] hover:text-[#7C3AED] disabled:opacity-60"
          style={{ borderColor: "#E8E4F3", color: "#6B7280" }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ─── Loading ─── */}
      {loading && !data && (
        <div className="flex items-center justify-center py-24" style={{ color: "#9CA3AF" }}>
          <Loader2 className="h-6 w-6 animate-spin mr-3" />
          <span className="text-[14px]">Loading live data…</span>
        </div>
      )}

      {/* ─── Error ─── */}
      {data && !data.success && (
        <div
          className="flex items-center gap-3 rounded-xl p-4 text-sm"
          style={{ background: "#FEE2E2", color: "#991B1B", border: "1px solid #FECACA" }}
        >
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          Could not load data. Please refresh.
        </div>
      )}

      {stats && (
        <>
          {/* ─── KPI Cards ─── */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Leads"
              value={stats.totalLeads.toLocaleString()}
              sub={`${stats.leadsToday} today · ${stats.leadsThisMonth} this month`}
              icon={<Users className="h-5 w-5" style={{ color: "#7C3AED" }} strokeWidth={1.75} />}
              accentColor="#7C3AED"
              accentBg="#EDE9FE"
              trend={stats.monthGrowth}
              trendLabel="vs last month"
            />
            <StatCard
              label="Monthly Growth"
              value={`${stats.monthGrowth >= 0 ? "+" : ""}${stats.monthGrowth}%`}
              sub="vs last month"
              icon={
                stats.monthGrowth >= 0
                  ? <TrendingUp className="h-5 w-5" style={{ color: "#10B981" }} strokeWidth={1.75} />
                  : <TrendingDown className="h-5 w-5" style={{ color: "#EF4444" }} strokeWidth={1.75} />
              }
              accentColor={stats.monthGrowth >= 0 ? "#10B981" : "#EF4444"}
              accentBg={stats.monthGrowth >= 0 ? "#D1FAE5" : "#FEE2E2"}
            />
            <StatCard
              label="Conversion Rate"
              value={`${stats.conversionRate}%`}
              sub={`${stats.convertedLeads} of ${stats.totalLeads} converted`}
              icon={<CheckCircle2 className="h-5 w-5" style={{ color: "#3B82F6" }} strokeWidth={1.75} />}
              accentColor="#3B82F6"
              accentBg="#DBEAFE"
            />
            <StatCard
              label="Active Websites"
              value={stats.activeWebsites}
              sub="Connected & receiving leads"
              icon={<Globe className="h-5 w-5" style={{ color: "#F59E0B" }} strokeWidth={1.75} />}
              accentColor="#F59E0B"
              accentBg="#FEF3C7"
            />
          </div>

          {/* ─── Chart + Pipeline ─── */}
          <div className="grid gap-5 lg:grid-cols-7">
            {/* Area Chart */}
            <div
              className="col-span-4 rounded-2xl bg-white p-5"
              style={{ border: "1px solid #E8E4F3", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-semibold" style={{ color: "#1A1523" }}>
                    Lead Volume
                  </h3>
                  <p className="text-[12px]" style={{ color: "#9CA3AF" }}>Last 7 days</p>
                </div>
                <span
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: "#EDE9FE", color: "#7C3AED" }}
                >
                  <Zap className="h-3 w-3" strokeWidth={2} />
                  Live
                </span>
              </div>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#F3F0FF" strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#C4B8FF"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      dy={6}
                    />
                    <YAxis
                      stroke="#C4B8FF"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#7C3AED", strokeWidth: 1, strokeDasharray: "4 4" }} />
                    <Area
                      type="monotone"
                      dataKey="leads"
                      stroke="#7C3AED"
                      strokeWidth={2.5}
                      fill="url(#purpleGrad)"
                      dot={{ fill: "#7C3AED", r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "#7C3AED", stroke: "#fff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pipeline Status */}
            <div
              className="col-span-3 rounded-2xl bg-white p-5"
              style={{ border: "1px solid #E8E4F3", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <div className="mb-4">
                <h3 className="text-[14px] font-semibold" style={{ color: "#1A1523" }}>
                  Pipeline Status
                </h3>
                <p className="text-[12px]" style={{ color: "#9CA3AF" }}>Lead stage breakdown</p>
              </div>
              <div className="flex flex-col gap-4">
                {[
                  {
                    label: "New", count: stats.newLeads,
                    icon: <Inbox className="h-4 w-4" style={{ color: "#7C3AED" }} strokeWidth={1.75} />,
                    bar: "#7C3AED", bg: "#EDE9FE",
                  },
                  {
                    label: "Contacted", count: stats.contactedLeads,
                    icon: <PhoneCall className="h-4 w-4" style={{ color: "#3B82F6" }} strokeWidth={1.75} />,
                    bar: "#3B82F6", bg: "#DBEAFE",
                  },
                  {
                    label: "Follow Up", count: stats.followUpLeads,
                    icon: <RefreshCw className="h-4 w-4" style={{ color: "#F59E0B" }} strokeWidth={1.75} />,
                    bar: "#F59E0B", bg: "#FEF3C7",
                  },
                  {
                    label: "Converted", count: stats.convertedLeads,
                    icon: <CheckCircle2 className="h-4 w-4" style={{ color: "#10B981" }} strokeWidth={1.75} />,
                    bar: "#10B981", bg: "#D1FAE5",
                  },
                ].map(({ label, count, icon, bar, bg }) => {
                  const pct =
                    stats.totalLeads > 0
                      ? Math.round((count / stats.totalLeads) * 100)
                      : 0;
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0"
                        style={{ background: bg }}
                      >
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[13px] font-medium" style={{ color: "#1A1523" }}>
                            {label}
                          </span>
                          <span className="text-[13px] font-bold" style={{ color: "#1A1523" }}>
                            {count}
                          </span>
                        </div>
                        <div
                          className="h-1.5 w-full rounded-full overflow-hidden"
                          style={{ background: "#F3F0FF" }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: bar }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mini bar chart for pipeline */}
              <div className="mt-5 pt-4" style={{ borderTop: "1px solid #F3F0FF" }}>
                <p className="text-[11px] font-medium mb-2" style={{ color: "#9CA3AF" }}>
                  Stage Distribution
                </p>
                <div className="h-[60px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: "New",    v: stats.newLeads },
                        { name: "Cont",   v: stats.contactedLeads },
                        { name: "FU",     v: stats.followUpLeads },
                        { name: "Conv",   v: stats.convertedLeads },
                      ]}
                      margin={{ top: 0, right: 0, left: -30, bottom: 0 }}
                      barCategoryGap="30%"
                    >
                      <XAxis dataKey="name" stroke="#C4B8FF" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip
                        cursor={{ fill: "rgba(124,58,237,0.05)" }}
                        contentStyle={{ borderRadius: "8px", border: "1px solid #E8E4F3", fontSize: 12 }}
                      />
                      <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                        {["#7C3AED", "#3B82F6", "#F59E0B", "#10B981"].map((color, index) => (
                          <Cell key={index} fill={color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Recent Leads Table ─── */}
          <div
            className="rounded-2xl bg-white overflow-hidden"
            style={{ border: "1px solid #E8E4F3", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            {/* Table header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid #F3F0FF" }}
            >
              <div>
                <h3 className="text-[14px] font-semibold" style={{ color: "#1A1523" }}>
                  Recent Leads
                </h3>
                <p className="text-[12px]" style={{ color: "#9CA3AF" }}>
                  Latest incoming leads across all websites
                </p>
              </div>
              <a
                href="/leads"
                className="text-[13px] font-medium transition-colors hover:underline"
                style={{ color: "#7C3AED" }}
              >
                View all →
              </a>
            </div>

            {recentLeads && recentLeads.length > 0 ? (
              <div>
                {/* Column headers */}
                <div
                  className="grid px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide"
                  style={{
                    color: "#9CA3AF",
                    borderBottom: "1px solid #F3F0FF",
                    gridTemplateColumns: "1fr 160px 120px 120px 80px",
                  }}
                >
                  <span>NAME</span>
                  <span>SOURCE</span>
                  <span>STATUS</span>
                  <span>WEBSITE</span>
                  <span className="text-right">TIME</span>
                </div>
                {recentLeads.map((lead: {
                  id: string; fullName: string; source?: string; status: string;
                  priority: string; createdAt: string; website?: { name: string };
                }, i: number) => {
                  const s = STATUS_STYLE[lead.status] || STATUS_STYLE.NEW;
                  const initials = lead.fullName
                    .split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                  return (
                    <div
                      key={lead.id}
                      className="grid items-center px-5 py-3 transition-colors hover:bg-[#F9F7FF] cursor-pointer"
                      style={{
                        borderBottom: i < recentLeads.length - 1 ? "1px solid #F7F5FF" : "none",
                        gridTemplateColumns: "1fr 160px 120px 120px 80px",
                      }}
                    >
                      {/* Name + avatar */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative flex-shrink-0">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white"
                            style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)" }}
                          >
                            {initials}
                          </div>
                          <span
                            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white"
                            style={{ background: PRIORITY_DOT[lead.priority] || "#9CA3AF" }}
                          />
                        </div>
                        <span
                          className="text-[13.5px] font-semibold truncate"
                          style={{ color: "#1A1523" }}
                        >
                          {lead.fullName}
                        </span>
                      </div>
                      {/* Source */}
                      <span className="text-[13px] truncate" style={{ color: "#6B7280" }}>
                        {lead.source || "Website Form"}
                      </span>
                      {/* Status badge */}
                      <div>
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold"
                          style={{ background: s.bg, color: s.text }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                            style={{ background: s.dot }}
                          />
                          {lead.status.replace("_", " ")}
                        </span>
                      </div>
                      {/* Website */}
                      <span
                        className="text-[12px] truncate"
                        style={{ color: "#9CA3AF" }}
                      >
                        {lead.website?.name || "—"}
                      </span>
                      {/* Time */}
                      <span
                        className="text-right text-[12px]"
                        style={{ color: "#9CA3AF" }}
                      >
                        {timeAgo(lead.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
                  style={{ background: "#EDE9FE" }}
                >
                  <Inbox className="h-7 w-7" style={{ color: "#7C3AED" }} strokeWidth={1.75} />
                </div>
                <p className="text-[14px] font-semibold mb-1" style={{ color: "#1A1523" }}>
                  No leads yet
                </p>
                <p className="text-[13px]" style={{ color: "#9CA3AF" }}>
                  Connect your first website to start receiving leads.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
