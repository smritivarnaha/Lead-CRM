"use client";

import { useState, useEffect, useRef } from "react";
import { getLeads } from "@/actions/leads";
import { useUser } from "@clerk/nextjs";
import { useActiveProfile } from "@/components/providers/ActiveProfileProvider";
import { 
  TrendingUp, 
  Users, 
  Target, 
  DollarSign, 
  RefreshCw,
  Award,
  MousePointerClick
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

export default function AnalyticsPage() {
  const { user } = useUser();
  const { websites, activeWebsiteId, setActiveWebsiteId } = useActiveProfile();
  const [allLeads, setAllLeads] = useState<any[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>(activeWebsiteId || "all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("7d");
  const hasFetchedRef = useRef(false);

  const role = user?.publicMetadata?.role as string | undefined;
  const userWebsiteId = user?.publicMetadata?.websiteId as string | undefined;
  const isClient = role === "CLIENT" && !!userWebsiteId;

  // Sync with Header active profile selector in 0ms
  useEffect(() => {
    if (isClient && userWebsiteId) {
      setSelectedSiteId(userWebsiteId);
    } else {
      setSelectedSiteId(activeWebsiteId || "all");
    }
  }, [activeWebsiteId, isClient, userWebsiteId]);

  useEffect(() => {
    setMounted(true);
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchData(false);
    }
  }, []);

  const fetchData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const leadRes = await getLeads();
      if (leadRes.success && leadRes.leads) {
        setAllLeads(leadRes.leads);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load analytics data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Instant 0ms client-side filtering by website and time range
  useEffect(() => {
    let tempLeads = allLeads;
    const effectiveSiteId = isClient && userWebsiteId ? userWebsiteId : selectedSiteId;
    if (effectiveSiteId !== "all") {
      tempLeads = allLeads.filter((l) => l.websiteId === effectiveSiteId);
    }

    const now = new Date();
    if (timeRange === "7d") {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      tempLeads = tempLeads.filter(l => new Date(l.createdAt) >= sevenDaysAgo);
    } else if (timeRange === "30d") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      tempLeads = tempLeads.filter(l => new Date(l.createdAt) >= thirtyDaysAgo);
    }

    setFilteredLeads(tempLeads);
  }, [selectedSiteId, allLeads, timeRange, isClient, userWebsiteId]);

  // Real-time Calculations
  const totalLeads = filteredLeads.length;
  const convertedLeads = filteredLeads.filter(l => l.status === "CONVERTED").length;
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
  const estimatedPipelineValue = totalLeads * 1000;

  // 1. Trend Area Chart
  const getTrendData = () => {
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 15;
    return Array.from({ length: days }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = timeRange === "7d" 
        ? d.toLocaleDateString("en-US", { weekday: "short" }) 
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const dateStr = d.toDateString();
      const count = filteredLeads.filter(l => new Date(l.createdAt).toDateString() === dateStr).length;
      return { name: label, Leads: count, date: dateStr };
    }).reverse();
  };

  // 2. Lead Temperature Donut
  const getTempData = () => {
    const hot = filteredLeads.filter(l => l.temperature === "HOT").length;
    const warm = filteredLeads.filter(l => l.temperature === "WARM").length;
    const cold = filteredLeads.filter(l => l.temperature === "COLD" || !l.temperature).length;
    return [
      { name: "Hot 🔥", value: hot, color: "#EF4444" },
      { name: "Warm ☀️", value: warm, color: "#F59E0B" },
      { name: "Cold ❄️", value: cold, color: "#3B82F6" },
    ].filter(t => t.value > 0);
  };

  // 3. Stage Funnel Bar Chart
  const getStageData = () => {
    const stages = ["NEW", "CONTACTED", "BUSY", "FOLLOW_UP", "CONVERTED", "LOST"];
    const stageLabels: Record<string, string> = {
      NEW: "New Leads",
      CONTACTED: "Contacted",
      BUSY: "No Answer",
      FOLLOW_UP: "Follow Up",
      CONVERTED: "Converted",
      LOST: "Junk/Lost"
    };
    const colors: Record<string, string> = {
      NEW: "#6366F1",
      CONTACTED: "#8B5CF6",
      BUSY: "#64748B",
      FOLLOW_UP: "#F59E0B",
      CONVERTED: "#10B981",
      LOST: "#EF4444"
    };
    return stages.map(stage => {
      const count = filteredLeads.filter(l => l.status === stage).length;
      return {
        name: stageLabels[stage],
        Leads: count,
        color: colors[stage]
      };
    });
  };

  // 4. Lead Sources Chart
  const getSourceData = () => {
    const sourceCounts: Record<string, number> = {};
    filteredLeads.forEach(l => {
      let src = l.source || "Website Form";
      if (src.toLowerCase().includes("wordpress") || src.toLowerCase().includes("wp")) src = "WordPress";
      else if (src.toLowerCase().includes("sheet")) src = "Google Sheets";
      else if (src.toLowerCase().includes("webhook")) src = "Webhook API";
      else if (src.toLowerCase().includes("html")) src = "HTML Snippet";
      
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    });
    return Object.entries(sourceCounts).map(([name, count]) => ({
      name,
      Leads: count,
    })).sort((a, b) => b.Leads - a.Leads).slice(0, 5);
  };

  // 5. Top Performing Pages Table
  const getTopPages = () => {
    const pageCounts: Record<string, { url: string; count: number; conversions: number }> = {};
    filteredLeads.forEach(l => {
      let url = l.pageUrl || "Direct Submission / Other";
      try {
        if (url !== "Direct Submission / Other") {
          const parsed = new URL(url);
          url = parsed.pathname === "/" ? parsed.host : parsed.host + parsed.pathname;
        }
      } catch (e) {}

      if (!pageCounts[url]) {
        pageCounts[url] = { url, count: 0, conversions: 0 };
      }
      pageCounts[url].count++;
      if (l.status === "CONVERTED") {
        pageCounts[url].conversions++;
      }
    });
    return Object.values(pageCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const trendData = getTrendData();
  const tempData = getTempData();
  const stageData = getStageData();
  const sourceData = getSourceData();
  const topPages = getTopPages();

  return (
    <div className="flex-1 p-6 sm:p-8 bg-[#FAFAFA] overflow-y-auto space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1523] tracking-tight">Analytics Suite</h1>
          <p className="text-[#6B7280] mt-1 text-sm">Real-time performance metrics and lead conversion trends.</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {!isClient && websites.length > 0 && (
            <select
              value={selectedSiteId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedSiteId(val);
                setActiveWebsiteId(val === "all" ? null : val);
              }}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 shadow-sm outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Websites ({websites.length})</option>
              {websites.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}

          {/* Time range selector */}
          <div className="bg-white border border-slate-200 rounded-xl p-1 shadow-sm flex items-center gap-0.5">
            <button
              onClick={() => setTimeRange("7d")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeRange === "7d" ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:text-slate-900"}`}
            >
              7D
            </button>
            <button
              onClick={() => setTimeRange("30d")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeRange === "30d" ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:text-slate-900"}`}
            >
              30D
            </button>
            <button
              onClick={() => setTimeRange("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeRange === "all" ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:text-slate-900"}`}
            >
              ALL
            </button>
          </div>

          <button 
            onClick={() => fetchData(true)} 
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-sm text-slate-500 hover:text-slate-800 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing || loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI Card 1: Total Leads */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-50 rounded-full blur-xl group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Leads</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-950 tracking-tight">{loading ? "—" : totalLeads}</h3>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-indigo-600 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Active Leads Tracked</span>
          </div>
        </div>

        {/* KPI Card 2: Converted Leads */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-emerald-50 rounded-full blur-xl group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Converted Leads</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-950 tracking-tight">{loading ? "—" : convertedLeads}</h3>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-emerald-600 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Success Targets Met</span>
          </div>
        </div>

        {/* KPI Card 3: Conversion Rate */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-purple-50 rounded-full blur-xl group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conversion Rate</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-950 tracking-tight">{loading ? "—" : `${conversionRate}%`}</h3>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-purple-600 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Visitor-to-Lead Ratio</span>
          </div>
        </div>

        {/* KPI Card 4: Estimated Pipeline Value */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-amber-50 rounded-full blur-xl group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pipeline Value</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-950 tracking-tight">
            {loading ? "—" : `$${estimatedPipelineValue.toLocaleString()}`}
          </h3>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-amber-600 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Est. ($1,000 / Lead)</span>
          </div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Chart 1: Volume Trend */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Lead Volume Trend</h3>
              <p className="text-xs text-slate-500">Track how many leads are generated over time.</p>
            </div>
            <div className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">Live</div>
          </div>
          
          <div className="h-72 w-full">
            {mounted && !loading ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none", color: "#f8fafc" }}
                    labelStyle={{ fontWeight: "bold", color: "#94a3b8" }}
                  />
                  <Area type="monotone" dataKey="Leads" stroke="#6366F1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLeads)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-slate-50 rounded-xl animate-pulse" />
            )}
          </div>
        </div>

        {/* Chart 2: Lead Temperature Donut */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="font-bold text-slate-900 text-base">Lead Temperature</h3>
            <p className="text-xs text-slate-500">Quality mix of cold, warm, and hot leads.</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center relative">
            {mounted && !loading ? (
              totalLeads > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tempData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {tempData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none", color: "#f8fafc" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 text-sm font-semibold">No data available</div>
              )
            ) : (
              <div className="w-32 h-32 rounded-full border-8 border-slate-100 animate-pulse" />
            )}

            {/* Total count overlay */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-slate-950">{loading ? "—" : totalLeads}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Leads</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-4 mt-2">
            {tempData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Chart 3: Pipeline Stages */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="font-bold text-slate-900 text-base">Pipeline Stage Funnel</h3>
            <p className="text-xs text-slate-500">Distribution of leads across CRM status stages.</p>
          </div>
          
          <div className="h-64 w-full">
            {mounted && !loading ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} width={80} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none", color: "#f8fafc" }}
                  />
                  <Bar dataKey="Leads" radius={[0, 4, 4, 0]}>
                    {stageData.map((entry: any, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-slate-50 rounded-xl animate-pulse" />
            )}
          </div>
        </div>

        {/* Chart 4: Lead Sources */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="font-bold text-slate-900 text-base">Lead Generation Sources</h3>
            <p className="text-xs text-slate-500">Identify which tools are driving the most lead entries.</p>
          </div>

          <div className="h-64 w-full">
            {mounted && !loading ? (
              sourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sourceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none", color: "#f8fafc" }}
                    />
                    <Bar dataKey="Leads" fill="#7C3AED" radius={[4, 4, 0, 0]} maxBarSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-semibold">
                  No source data available
                </div>
              )
            ) : (
              <div className="w-full h-full bg-slate-50 rounded-xl animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Top Pages Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Top Performing Landing Pages</h3>
            <p className="text-xs text-slate-500">Most popular pages where forms were submitted.</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
            <MousePointerClick className="w-5 h-5" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                <th className="px-6 py-3.5">Page Path / Domain</th>
                <th className="px-6 py-3.5 text-center">Total Leads</th>
                <th className="px-6 py-3.5 text-center">Conversions</th>
                <th className="px-6 py-3.5 text-right">Success Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topPages.length > 0 ? (
                topPages.map((page, idx) => {
                  const rate = page.count > 0 ? Math.round((page.conversions / page.count) * 100) : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-700 truncate max-w-md">{page.url}</td>
                      <td className="px-6 py-4 text-center font-semibold text-slate-800">{page.count}</td>
                      <td className="px-6 py-4 text-center font-semibold text-emerald-600">{page.conversions}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">{rate}%</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-400 font-semibold">
                    {loading ? "Loading page metrics..." : "No page data collected yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
