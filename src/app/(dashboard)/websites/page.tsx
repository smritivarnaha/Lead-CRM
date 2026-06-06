"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Globe, Copy, CheckCircle2, MoreVertical, X } from "lucide-react";
import { useState, useEffect } from "react";
import { getWebsites, createWebsite } from "@/actions/websites";

type Website = {
  id: string;
  name: string;
  domain: string;
  isActive: boolean;
  createdAt: Date;
};

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteDomain, setNewSiteDomain] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSites = async () => {
    setIsLoading(true);
    const res = await getWebsites();
    if (res.success && res.websites) {
      setWebsites(res.websites);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName || !newSiteDomain) return;
    setIsSubmitting(true);
    
    const res = await createWebsite({ name: newSiteName, domain: newSiteDomain });
    if (res?.success) {
      setNewSiteName("");
      setNewSiteDomain("");
      setIsModalOpen(false);
      fetchSites(); // Refresh list
    } else {
      alert(res?.error || "Failed to create website. Please check database connection.");
    }
    setIsSubmitting(false);
  };

  const copyWebhook = (id: string) => {
    const url = `https://lead-crmsss.vercel.app/api/webhook/receive/${id}`;
    navigator.clipboard.writeText(url);
    alert("Webhook URL copied to clipboard!");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Websites</h2>
          <p className="text-sm text-slate-500 mt-1">Manage client websites and webhook integrations.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          + Add Website
        </Button>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden mt-4">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="w-[300px] font-semibold">Website Name</TableHead>
              <TableHead className="font-semibold">Webhook URL</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Loading websites...</TableCell></TableRow>
            ) : websites.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">No websites found. Add one to get started.</TableCell></TableRow>
            ) : websites.map((site) => (
              <TableRow key={site.id} className="hover:bg-slate-50/50">
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-slate-900">{site.name}</span>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Globe className="h-3 w-3" />
                      {site.domain}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="bg-slate-100 text-slate-800 px-2 py-1 rounded text-xs truncate max-w-[250px]">
                      https://lead-crmsss.vercel.app/api/webhook/receive/{site.id}
                    </code>
                    <button onClick={() => copyWebhook(site.id)} className="text-slate-400 hover:text-blue-600 transition-colors" title="Copy Webhook URL">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
                <TableCell>
                  {site.isActive ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                      Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => alert(`Creating login for ${site.name}. In production, this generates a Client account.`)}
                    >
                      Create Login
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Add New Website</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">Website Name</label>
                <input 
                  required
                  placeholder="e.g. Dr. Anurag Clinic"
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">Domain Name</label>
                <input 
                  required
                  placeholder="e.g. dranurag.com"
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={newSiteDomain}
                  onChange={(e) => setNewSiteDomain(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {isSubmitting ? "Saving..." : "Add Website"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
