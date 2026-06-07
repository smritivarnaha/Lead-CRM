"use client";

import { useState, useEffect } from "react";
import { getWebsites } from "@/actions/websites";
import { getLeads } from "@/actions/leads";
import { useUser } from "@clerk/nextjs";
import { 
  Link2, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Settings,
  SendHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SVGIcons } from "@/components/IntegrationTab";

type WebsiteStatus = {
  id: string;
  name: string;
  domain: string;
  logoUrl: string | null;
  status: "live" | "idle" | "pending";
  totalLeads: number;
  lastActive: string | null;
  activeIntegrations: {
    wordpress: boolean;
    sheets: boolean;
    html: boolean;
    webhook: boolean;
  };
};

export default function IntegrationsPage() {
  const { user } = useUser();
  const [websites, setWebsites] = useState<any[]>([]);
  const [allLeads, setAllLeads] = useState<any[]>([]);
  const [websiteStatuses, setWebsiteStatuses] = useState<WebsiteStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const role = user?.publicMetadata?.role as string | undefined;
  const userWebsiteId = user?.publicMetadata?.websiteId as string | undefined;
  const isClient = role === "CLIENT" && !!userWebsiteId;

  useEffect(() => {
    fetchData();
  }, [isClient, userWebsiteId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [webRes, leadRes] = await Promise.all([
        getWebsites(),
        getLeads()
      ]);

      let sites = [];
      let leads = [];

      if (webRes.success && webRes.websites) {
        sites = isClient 
          ? webRes.websites.filter((w: any) => w.id === userWebsiteId)
          : webRes.websites;
        setWebsites(sites);
      }

      if (leadRes.success && leadRes.leads) {
        leads = leadRes.leads;
        setAllLeads(leads);
      }

      // Compute integration status for each site
      const computedStatuses: WebsiteStatus[] = sites.map((site: any) => {
        const siteLeads = leads.filter((l: any) => l.websiteId === site.id);
        const totalLeads = siteLeads.length;
        
        let status: "live" | "idle" | "pending" = "pending";
        let lastActive: string | null = null;

        const activeIntegrations = {
          wordpress: false,
          sheets: false,
          html: false,
          webhook: false
        };

        if (totalLeads > 0) {
          const sortedLeads = [...siteLeads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          const latestLead = sortedLeads[0];
          lastActive = latestLead.createdAt;

          // Check if latest lead was in the last 24 hours
          const latestTime = new Date(latestLead.createdAt).getTime();
          const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
          status = latestTime >= oneDayAgo ? "live" : "idle";

          // Detect active integration types based on lead sources
          siteLeads.forEach((l: any) => {
            const src = (l.source || "").toLowerCase();
            if (src.includes("wordpress") || src.includes("wp")) activeIntegrations.wordpress = true;
            else if (src.includes("sheet")) activeIntegrations.sheets = true;
            else if (src.includes("html") || src.includes("form") || src.includes("snippet")) activeIntegrations.html = true;
            else if (src.includes("webhook") || src.includes("api") || src.includes("ping")) activeIntegrations.webhook = true;
          });

          // Fallback if source didn't match cleanly: mark at least one active based on website
          if (!Object.values(activeIntegrations).some(Boolean)) {
            activeIntegrations.html = true; // Default fallback
          }
        }

        return {
          id: site.id,
          name: site.name,
          domain: site.domain,
          logoUrl: site.logoUrl,
          status,
          totalLeads,
          lastActive,
          activeIntegrations
        };
      });

      setWebsiteStatuses(computedStatuses);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load integrations status.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger test webhook ping
  const triggerPing = async (siteId: string) => {
    setPingingId(siteId);
    try {
      const res = await fetch(`/api/webhook/receive/${siteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "CRM Integration Test Ping",
          email: "ping-test@leadflow.app",
          phone: "+91 99999 99999",
          message: "This is an automated test lead to verify that the webhook integration is active and leads are logging correctly.",
          source: "Webhook Test Ping",
          formName: "CRM Connectivity Check"
        })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Test ping sent! A new lead 'CRM Integration Test Ping' has been successfully logged into the pipeline.");
        // Refetch immediately to update status dots to live
        fetchData();
      } else {
        toast.error("Ping failed: " + (data.error || "Unexpected response"));
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to send test ping. Check server logs.");
    } finally {
      setPingingId(null);
    }
  };

  // Filter list by search term
  const filteredStatuses = websiteStatuses.filter(
    (ws) =>
      ws.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ws.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex-1 p-8 bg-[#FAFAFA] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 sm:p-8 bg-[#FAFAFA] overflow-y-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1523] tracking-tight">Integrations Status</h1>
          <p className="text-[#6B7280] mt-1 text-sm">Monitor data endpoints, active webhook channels, and connection integrity.</p>
        </div>

        <button 
          onClick={fetchData} 
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-sm transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
        </button>
      </div>

      {/* Filter Toolbar (Only for Super Admins) */}
      {!isClient && (
        <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-4 shadow-sm max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search website name or domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white transition-all"
            />
            <Search className="absolute left-3.5 top-3.5 w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>
      )}

      {/* Integrations Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {filteredStatuses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-[11px] uppercase tracking-wider font-sans">
                  <th className="px-6 py-4.5">Client / Website</th>
                  <th className="px-6 py-4.5 text-center">WordPress</th>
                  <th className="px-6 py-4.5 text-center">Google Sheets</th>
                  <th className="px-6 py-4.5 text-center">HTML Form</th>
                  <th className="px-6 py-4.5 text-center">Webhook API</th>
                  <th className="px-6 py-4.5 text-center">Traffic Status</th>
                  <th className="px-6 py-4.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredStatuses.map((ws) => (
                  <tr key={ws.id} className="hover:bg-slate-50/50 transition-colors">
                    
                    {/* Website Column */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden p-1 shrink-0">
                          {ws.logoUrl ? (
                            <img src={ws.logoUrl} alt={ws.name} className="w-full h-full object-contain rounded-md" />
                          ) : (
                            <Globe className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="overflow-hidden space-y-0.5">
                          <h4 className="font-bold text-slate-900 text-sm truncate max-w-[150px]">{ws.name}</h4>
                          <a href={`https://${ws.domain}`} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-slate-400 hover:text-indigo-600 flex items-center gap-0.5 truncate max-w-[150px]">
                            {ws.domain} <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        </div>
                      </div>
                    </td>

                    {/* WordPress Column */}
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex flex-col items-center justify-center gap-1.5">
                        <SVGIcons.WordPress className="w-6 h-6 object-contain opacity-80" />
                        {ws.activeIntegrations.wordpress ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                            Pending
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Google Sheets Column */}
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex flex-col items-center justify-center gap-1.5">
                        <SVGIcons.GoogleSheets className="w-6 h-6 object-contain opacity-80" />
                        {ws.activeIntegrations.sheets ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                            Pending
                          </span>
                        )}
                      </div>
                    </td>

                    {/* HTML Form Column */}
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex flex-col items-center justify-center gap-1.5">
                        <SVGIcons.HTML className="w-6 h-6 object-contain opacity-80" />
                        {ws.activeIntegrations.html ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                            Pending
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Webhook Column */}
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex flex-col items-center justify-center gap-1.5">
                        <SVGIcons.Webhook className="w-6 h-6 object-contain opacity-80 bg-slate-50 rounded p-0.5" />
                        {ws.activeIntegrations.webhook ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                            Pending
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Traffic Status Column */}
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex flex-col items-center gap-1">
                        {ws.status === "live" && (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-200 shadow-sm animate-pulse">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            LIVE TRAFFIC
                          </span>
                        )}
                        {ws.status === "idle" && (
                          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-amber-200 shadow-sm">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                            IDLE (ACTIVE)
                          </span>
                        )}
                        {ws.status === "pending" && (
                          <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-500 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-slate-200">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                            PENDING SETUP
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {ws.totalLeads} Lead{ws.totalLeads === 1 ? "" : "s"}
                        </span>
                      </div>
                    </td>

                    {/* Action Column */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Ping / Connection Check Button */}
                        <Button
                          disabled={pingingId !== null}
                          onClick={() => triggerPing(ws.id)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                          <SendHorizontal className="w-3.5 h-3.5" />
                          {pingingId === ws.id ? "Pinging..." : "Send Ping"}
                        </Button>
                        
                        {/* Configure Link */}
                        <a href={isClient ? `/settings` : `/client/${ws.id}/settings`} className="p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl transition-all" title="Configure Integration">
                          <Settings className="w-4 h-4" />
                        </a>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl py-16 px-4 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mx-auto mb-4">
              <Link2 className="w-6 h-6" />
            </div>
            <h4 className="text-slate-900 font-bold mb-1">No integrations monitored</h4>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              {searchTerm ? "No websites match your current search query. Try another name." : "Monitored endpoints will appear automatically once client websites are added to your workspace."}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
