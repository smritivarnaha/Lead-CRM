"use client";

import { useState, useEffect } from "react";
import { getActivityLog, ActivityItem } from "@/actions/activity";
import { 
  Activity, 
  MessageSquare, 
  Smartphone, 
  Bell, 
  Globe,
  Clock, 
  ArrowUpRight, 
  RefreshCw,
  Search,
  Filter,
  UserCheck
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "leads" | "notes" | "alerts">("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchLogs(false);
  }, []);

  const fetchLogs = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const res = await getActivityLog();
      if (res.success && res.activities) {
        setActivities(res.activities);
        setFilteredActivities(res.activities);
      } else {
        toast.error("Failed to load activity logs.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error while loading logs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let result = activities;

    // Filter by type
    if (activeFilter === "leads") {
      result = activities.filter((a) => a.type === "lead_create");
    } else if (activeFilter === "notes") {
      result = activities.filter((a) => a.type === "note_create");
    } else if (activeFilter === "alerts") {
      result = activities.filter((a) => a.type === "sms_alert" || a.type === "push_alert");
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(term) ||
          a.description.toLowerCase().includes(term) ||
          a.websiteName.toLowerCase().includes(term)
      );
    }

    setFilteredActivities(result);
  }, [activeFilter, searchTerm, activities]);

  // Helper for relative time formatting
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  // Helper to fetch details icon based on type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "lead_create":
        return (
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Globe className="w-4 h-4" />
          </div>
        );
      case "note_create":
        return (
          <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <MessageSquare className="w-4 h-4" />
          </div>
        );
      case "sms_alert":
        return (
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Smartphone className="w-4 h-4" />
          </div>
        );
      case "push_alert":
        return (
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Bell className="w-4 h-4" strokeWidth={2.2} />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
            <Activity className="w-4 h-4" />
          </div>
        );
    }
  };

  // Compute stat metrics
  const totalActions = activities.length;
  const noteActions = activities.filter(a => a.type === 'note_create').length;
  const alertActions = activities.filter(a => a.type === 'sms_alert' || a.type === 'push_alert').length;

  if (loading) {
    return (
      <div className="flex-1 p-8 bg-[#FAFAFA] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 sm:p-8 bg-[#FAFAFA] overflow-y-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1523] tracking-tight font-sans">Activity Log</h1>
          <p className="text-[#6B7280] mt-1 text-sm">Chronological audit trail of all leads, log notes, and system alerts.</p>
        </div>

        <button 
          onClick={() => fetchLogs(true)} 
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#E8E4F3] hover:bg-[#F3F0FF] hover:text-[#7C3AED] text-slate-700 text-xs font-bold rounded-xl shadow-sm transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh Log
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-[#E8E4F3] p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#F7F5FF] flex items-center justify-center text-[#7C3AED]">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Actions</span>
            <span className="text-2xl font-extrabold text-slate-900">{totalActions}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E4F3] p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FFFBEB] flex items-center justify-center text-[#F59E0B]">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Logs Recorded</span>
            <span className="text-2xl font-extrabold text-slate-900">{noteActions}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E4F3] p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED]">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Alerts Sent</span>
            <span className="text-2xl font-extrabold text-slate-900">{alertActions}</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#E8E4F3] rounded-2xl p-4 shadow-sm">
        
        {/* Type Filter Buttons */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeFilter === "all" ? "bg-[#7C3AED] text-white" : "text-slate-500 hover:text-slate-800 hover:bg-[#F3F0FF]"}`}
          >
            All Activity
          </button>
          <button
            onClick={() => setActiveFilter("leads")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeFilter === "leads" ? "bg-[#EFF6FF] text-[#3B82F6]" : "text-slate-500 hover:text-[#3B82F6] hover:bg-[#EFF6FF]"}`}
          >
            Leads Only
          </button>
          <button
            onClick={() => setActiveFilter("notes")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeFilter === "notes" ? "bg-[#FFFBEB] text-[#F59E0B]" : "text-slate-500 hover:text-[#F59E0B] hover:bg-[#FFFBEB]"}`}
          >
            Call Logs / Notes
          </button>
          <button
            onClick={() => setActiveFilter("alerts")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeFilter === "alerts" ? "bg-[#EDE9FE] text-[#7C3AED]" : "text-slate-500 hover:text-[#7C3AED] hover:bg-[#EDE9FE]"}`}
          >
            System Alerts
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:max-w-xs">
          <input
            type="text"
            placeholder="Search activity description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-[#E8E4F3] rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EDE9FE] focus:bg-white focus:border-[#7C3AED] transition-all"
          />
          <Search className="absolute left-3.5 top-3.5 w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white border border-[#E8E4F3] rounded-2xl shadow-sm overflow-hidden mt-4">
        {filteredActivities.length > 0 ? (
          <Table>
            <TableHeader className="bg-[#F7F5FF] border-b border-[#E8E4F3]">
              <TableRow>
                <TableHead className="font-bold text-slate-700 text-xs">Action / Event</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Website</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Description & Details</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs text-center">Time</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs text-right">Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.map((act) => (
                <TableRow key={act.id} className="hover:bg-[#F3F0FF]/50 border-b border-[#E8E4F3]">
                  <TableCell className="align-middle">
                    <div className="flex items-center gap-3">
                      {getActivityIcon(act.type)}
                      <span className="font-bold text-slate-900 text-[13px] whitespace-nowrap">{act.title}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="align-middle">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#F7F5FF] text-slate-600 border border-[#E8E4F3] uppercase tracking-wide">
                      {act.websiteName}
                    </span>
                  </TableCell>
                  
                  <TableCell className="align-middle">
                    <div className="space-y-1">
                      <p className="text-slate-600 text-xs leading-relaxed">{act.description}</p>
                      {act.meta && (
                        <div className="bg-slate-50/80 border border-[#E8E4F3] rounded-xl p-3 mt-1.5 text-xs text-slate-700 font-sans space-y-1 max-w-lg shadow-inner">
                          {act.meta.content && (
                            <p className="font-medium italic text-slate-800">"{act.meta.content}"</p>
                          )}
                          {(act.meta.phone || act.meta.email || act.meta.temperature) && (
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 font-semibold mt-1">
                              {act.meta.phone && <span>📞 {act.meta.phone}</span>}
                              {act.meta.email && <span>✉️ {act.meta.email}</span>}
                              {act.meta.temperature && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  act.meta.temperature === "HOT" ? "bg-red-50 text-red-600" :
                                  act.meta.temperature === "WARM" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                                }`}>
                                  {act.meta.temperature}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-center align-middle">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatRelativeTime(act.timestamp)}</span>
                    </span>
                  </TableCell>

                  <TableCell className="text-right align-middle">
                    <Link href={act.link} className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-[#7C3AED] hover:underline whitespace-nowrap">
                      View Lead <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
              <Activity className="w-6 h-6" />
            </div>
            <h4 className="text-slate-900 font-bold mb-1">No activities found</h4>
            <p className="text-slate-500 text-sm max-w-xs">
              {searchTerm ? "No logs match your current search query. Try another term." : "Activity logs will appear automatically as new leads and client updates occur."}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
