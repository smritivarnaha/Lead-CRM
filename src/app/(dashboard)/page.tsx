"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, TrendingUp, TrendingDown, Globe, Inbox,
  PhoneCall, RefreshCw, CheckCircle2, Loader2, AlertCircle
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useState, useEffect } from "react";
import { getDashboardStats } from "@/actions/dashboard";

type DashboardData = Awaited<ReturnType<typeof getDashboardStats>>;

const statusColors: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700 border-blue-200",
  CONTACTED: "bg-yellow-50 text-yellow-700 border-yellow-200",
  FOLLOW_UP: "bg-orange-50 text-orange-700 border-orange-200",
  CONVERTED: "bg-green-50 text-green-700 border-green-200",
  LOST: "bg-red-50 text-red-700 border-red-200",
  NO_RESPONSE: "bg-slate-50 text-slate-600 border-slate-200",
};

const priorityColors: Record<string, string> = {
  HIGH: "bg-red-500",
  NORMAL: "bg-blue-500",
  LOW: "bg-slate-400",
};

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
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
  const chartData = data?.success && data.chartData && data.chartData.length > 0
    ? data.chartData
    : [
        { name: "Mon", leads: 0 }, { name: "Tue", leads: 0 }, { name: "Wed", leads: 0 },
        { name: "Thu", leads: 0 }, { name: "Fri", leads: 0 }, { name: "Sat", leads: 0 }, { name: "Sun", leads: 0 },
      ];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">Live overview of all your leads and websites.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-2 transition-colors shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <span className="text-lg">Loading live data...</span>
        </div>
      )}

      {data && !data.success && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">Could not load data: {data.error}</p>
        </div>
      )}

      {stats && (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Leads */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Leads</CardTitle>
                <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.totalLeads.toLocaleString()}</div>
                <p className="text-xs text-slate-500 mt-1">
                  <span className="text-blue-600 font-medium">{stats.leadsToday} today</span>
                  {" · "}{stats.leadsThisMonth} this month
                </p>
              </CardContent>
            </Card>

            {/* Monthly Growth */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Monthly Growth</CardTitle>
                <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center">
                  {stats.monthGrowth >= 0
                    ? <TrendingUp className="h-4 w-4 text-green-600" />
                    : <TrendingDown className="h-4 w-4 text-red-500" />}
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${stats.monthGrowth >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {stats.monthGrowth >= 0 ? "+" : ""}{stats.monthGrowth}%
                </div>
                <p className="text-xs text-slate-500 mt-1">vs last month</p>
              </CardContent>
            </Card>

            {/* Conversion Rate */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Conversion Rate</CardTitle>
                <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.conversionRate}%</div>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.convertedLeads} of {stats.totalLeads} leads converted
                </p>
              </CardContent>
            </Card>

            {/* Active Websites */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Active Websites</CardTitle>
                <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center">
                  <Globe className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.activeWebsites}</div>
                <p className="text-xs text-slate-500 mt-1">Connected &amp; receiving leads</p>
              </CardContent>
            </Card>
          </div>

          {/* Pipeline + Chart Row */}
          <div className="grid gap-6 lg:grid-cols-7">
            {/* Bar Chart */}
            <Card className="col-span-4 border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-900 text-base">Lead Volume — Last 7 Days</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: "rgba(59,130,246,0.05)" }}
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                      />
                      <Bar dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pipeline Status */}
            <Card className="col-span-3 border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-900 text-base">Pipeline Status</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {[
                  { label: "New", count: stats.newLeads, icon: <Inbox className="h-4 w-4 text-blue-500" />, color: "bg-blue-500", status: "NEW" },
                  { label: "Contacted", count: stats.contactedLeads, icon: <PhoneCall className="h-4 w-4 text-yellow-500" />, color: "bg-yellow-500", status: "CONTACTED" },
                  { label: "Follow Up", count: stats.followUpLeads, icon: <RefreshCw className="h-4 w-4 text-orange-500" />, color: "bg-orange-500", status: "FOLLOW_UP" },
                  { label: "Converted", count: stats.convertedLeads, icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, color: "bg-green-500", status: "CONVERTED" },
                ].map(({ label, count, icon, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                      {icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-slate-700">{label}</span>
                        <span className="text-sm font-bold text-slate-900">{count}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${color} rounded-full transition-all`}
                          style={{ width: stats.totalLeads > 0 ? `${Math.round((count / stats.totalLeads) * 100)}%` : "0%" }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Recent Leads Table */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900 text-base">Recent Leads</CardTitle>
            </CardHeader>
            <CardContent>
              {recentLeads && recentLeads.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {recentLeads.map((lead: {
                    id: string;
                    fullName: string;
                    source?: string;
                    status: string;
                    priority: string;
                    createdAt: string;
                    website?: { name: string };
                  }) => (
                    <div key={lead.id} className="flex items-center gap-4 py-3">
                      <div className={`h-2 w-2 rounded-full flex-shrink-0 ${priorityColors[lead.priority] || "bg-slate-400"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{lead.fullName}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {lead.website?.name || "Unknown site"} · {lead.source || "Website Form"}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-xs flex-shrink-0 ${statusColors[lead.status] || statusColors.NEW}`}>
                        {lead.status.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-slate-400 flex-shrink-0 w-16 text-right">
                        {timeAgo(lead.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No leads yet. Connect your first website to start receiving leads.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
