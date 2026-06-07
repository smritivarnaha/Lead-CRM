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
  ArrowRight, 
  Search, 
  Check, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  RefreshCw
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
            else if (src.includes("html") || src.includes("form")) activeIntegrations.html = true;
            else if (src.includes("webhook") || src.includes("api")) activeIntegrations.webhook = true;
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
          <p className="text-[#6B7280] mt-1 text-sm">Monitor data endpoints, active webhook channels, and traffic status.</p>
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

      {/* Main Content Grid */}
      <div className="space-y-6">
        
        {filteredStatuses.length > 0 ? (
          filteredStatuses.map((ws) => (
            <div key={ws.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:shadow-md hover:border-slate-300 transition-all duration-200">
              
              {/* Left Column: Branding and Live Status */}
              <div className="flex items-center gap-4 min-w-[280px]">
                <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden p-1 shrink-0">
                  {ws.logoUrl ? (
                    <img src={ws.logoUrl} alt={ws.name} className="w-full h-full object-contain rounded-md" />
                  ) : (
                    <Globe className="w-6 h-6 text-slate-400" />
                  )}
                </div>

                <div className="space-y-1 overflow-hidden">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-bold text-slate-900 text-base leading-tight truncate">{ws.name}</h3>
                    
                    {/* Live Dot Status */}
                    {ws.status === "live" && (
                      <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                        <span>Live</span>
                      </span>
                    )}
                    {ws.status === "idle" && (
                      <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-100">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        <span>Idle</span>
                      </span>
                    )}
                    {ws.status === "pending" && (
                      <span className="flex items-center gap-1.5 bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                        <span>Offline</span>
                      </span>
                    )}
                  </div>
                  
                  <a href={`https://${ws.domain}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-slate-400 hover:text-slate-600 flex items-center gap-1 truncate">
                    {ws.domain} <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                </div>
              </div>

              {/* Middle Column: Integration channels checklist */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-4 lg:py-3.5 lg:px-6">
                
                {/* Channel 1: WordPress */}
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 shadow-sm">
                  <SVGIcons.WordPress className="w-5 h-5 object-contain" />
                  <span>WordPress</span>
                  {ws.activeIntegrations.wordpress ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-1 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-slate-300 ml-1 shrink-0" />
                  )}
                </div>

                {/* Channel 2: Google Sheets */}
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 shadow-sm">
                  <SVGIcons.GoogleSheets className="w-5 h-5 object-contain" />
                  <span>Sheets</span>
                  {ws.activeIntegrations.sheets ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-1 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-slate-300 ml-1 shrink-0" />
                  )}
                </div>

                {/* Channel 3: HTML Snippet */}
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 shadow-sm">
                  <SVGIcons.HTML className="w-5 h-5 object-contain" />
                  <span>HTML Form</span>
                  {ws.activeIntegrations.html ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-1 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-slate-300 ml-1 shrink-0" />
                  )}
                </div>

                {/* Channel 4: Webhook API */}
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 shadow-sm">
                  <SVGIcons.Webhook className="w-5 h-5 shrink-0" />
                  <span>Webhook API</span>
                  {ws.activeIntegrations.webhook ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-1 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-slate-300 ml-1 shrink-0" />
                  )}
                </div>

              </div>

              {/* Right Column: Connection Meta Stats & Action */}
              <div className="flex items-center justify-between sm:justify-start lg:justify-end gap-6 shrink-0 border-t border-slate-100 pt-4 lg:border-t-0 lg:pt-0">
                <div className="text-left lg:text-right space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Traffic</span>
                  <span className="text-base font-extrabold text-slate-800 block">{ws.totalLeads} lead submissions</span>
                  {ws.lastActive && (
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      Last hit: {new Date(ws.lastActive).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>

                <a href={isClient ? `/settings` : `/client/${ws.id}/settings`} className="shrink-0">
                  <Button className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 px-4 py-2.5 rounded-xl shadow-sm">
                    Configure <ChevronRight className="w-4 h-4" />
                  </Button>
                </a>
              </div>

            </div>
          ))
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
