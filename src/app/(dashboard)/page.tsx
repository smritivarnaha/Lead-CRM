"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Clock, Globe } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

const data = [
  { name: "Mon", leads: 42 },
  { name: "Tue", leads: 38 },
  { name: "Wed", leads: 55 },
  { name: "Thu", leads: 48 },
  { name: "Fri", leads: 62 },
  { name: "Sat", leads: 24 },
  { name: "Sun", leads: 18 },
];

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h2>
        <p className="text-sm text-slate-500 mt-1">Here is what's happening with your leads today.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">2,350</div>
            <p className="text-xs text-green-600 flex items-center mt-1 font-medium">
              <TrendingUp className="h-3 w-3 mr-1" /> +18.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">12.5%</div>
            <p className="text-xs text-green-600 flex items-center mt-1 font-medium">
              <TrendingUp className="h-3 w-3 mr-1" /> +2.4% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">4m 12s</div>
            <p className="text-xs text-red-600 flex items-center mt-1 font-medium">
              +1m 2s from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Websites</CardTitle>
            <Globe className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">24</div>
            <p className="text-xs text-slate-500 mt-1">
              3 domains pending verification
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Lead Volume</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  />
                  <Bar
                    dataKey="leads"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    className="fill-blue-600"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-slate-200 shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle className="text-slate-900">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <div className="space-y-8">
              {[
                { name: "John Doe", action: "converted to a patient", time: "Just now", icon: "🎉" },
                { name: "Sarah Smith", action: "was escalated to management", time: "5m ago", icon: "⚠️" },
                { name: "Dr. Anurag Clinic", action: "connected a new form", time: "1h ago", icon: "🔌" },
                { name: "Emily Davis", action: "was marked as Contacted", time: "2h ago", icon: "📞" },
                { name: "Michael Scott", action: "submitted a lead form", time: "3h ago", icon: "📥" },
              ].map((activity, i) => (
                <div key={i} className="flex items-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 mr-4 text-lg">
                    {activity.icon}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none text-slate-900">{activity.name}</p>
                    <p className="text-sm text-slate-500">{activity.action}</p>
                  </div>
                  <div className="ml-auto font-medium text-xs text-slate-400">
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
