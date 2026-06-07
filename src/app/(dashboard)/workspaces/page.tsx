"use client";

import { useState, useEffect } from "react";
import { getWorkspaces, createWorkspace } from "@/actions/workspaces";
import { useUser } from "@clerk/nextjs";
import { 
  Briefcase, 
  Plus, 
  Globe, 
  Users, 
  Layers, 
  Clock, 
  ShieldAlert,
  ArrowRight,
  Code2,
  X,
  FileCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function WorkspacesPage() {
  const { user } = useUser();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const role = user?.publicMetadata?.role as string | undefined;
  const isClient = role === "CLIENT";

  useEffect(() => {
    if (!isClient) {
      fetchWorkspaces();
    } else {
      setLoading(false);
    }
  }, [isClient]);

  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      const res = await getWorkspaces();
      if (res.success && res.workspaces) {
        setWorkspaces(res.workspaces);
      } else {
        toast.error("Failed to load workspaces.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error while loading workspaces.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName || newWorkspaceName.trim() === "") return;
    setSubmitting(true);
    try {
      const res = await createWorkspace(newWorkspaceName);
      if (res.success) {
        toast.success(`Workspace "${newWorkspaceName}" created successfully!`);
        setNewWorkspaceName("");
        setIsModalOpen(false);
        fetchWorkspaces();
      } else {
        toast.error(res.error || "Failed to create workspace.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error connecting to database.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 bg-[#FAFAFA] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Client User - Access Denied View
  if (isClient) {
    return (
      <div className="flex-1 p-8 bg-[#FAFAFA] flex items-center justify-center animate-in fade-in duration-300">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Access Restricted</h3>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Only agency administrators and staff members have access to the Workspaces panel. If you need assistance, please contact your account manager.
          </p>
          <a href="/" className="inline-block w-full">
            <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold">
              Return to Dashboard
            </Button>
          </a>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const totalWorkspaces = workspaces.length;
  const totalWebsites = workspaces.reduce((acc, w) => acc + (w._count?.websites || 0), 0);
  const totalUsers = workspaces.reduce((acc, w) => acc + (w._count?.users || 0), 0);

  return (
    <div className="flex-1 p-6 sm:p-8 bg-[#FAFAFA] overflow-y-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1523] tracking-tight">Workspaces</h1>
          <p className="text-[#6B7280] mt-1 text-sm">Manage multiple client environments and agency organizational units.</p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Workspace
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Workspaces</span>
            <span className="text-2xl font-extrabold text-slate-900">{totalWorkspaces}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Connected Websites</span>
            <span className="text-2xl font-extrabold text-slate-900">{totalWebsites}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Staff & Clients</span>
            <span className="text-2xl font-extrabold text-slate-900">{totalUsers}</span>
          </div>
        </div>
      </div>

      {/* Workspaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaces.map((ws) => (
          <div key={ws.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col group hover:shadow-md hover:border-slate-300 transition-all duration-200">
            <div className="p-6 flex-1 flex flex-col justify-between relative">
              
              {/* Background gradient badge */}
              <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full opacity-5 group-hover:opacity-10 transition-opacity" />

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                    {ws.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">{ws.name}</h3>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Created {new Date(ws.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                    </div>
                  </div>
                </div>

                {/* Workspace stats rows */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-center">
                  <div>
                    <span className="text-sm font-bold text-slate-800">{ws._count?.websites || 0}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Sites</span>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800">{ws._count?.users || 0}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Users</span>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800">{ws._count?.leads || 0}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Leads</span>
                  </div>
                </div>
              </div>

              {/* Workspace ID footer */}
              <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[10px]">ID: {ws.id}</span>
                <span className="flex items-center gap-1 text-indigo-600 font-bold group-hover:gap-2 transition-all cursor-pointer">
                  Manage Settings <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Create New Workspace</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Workspace Name</label>
                <input 
                  type="text" 
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="e.g. Enterprise Clients, Freelance Team"
                  className="w-full border border-slate-300 px-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
                <p className="text-[10px] text-slate-400">This helps group different websites, leads, and users in your agency.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="border-slate-200 text-slate-600"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  {submitting ? "Creating..." : "Create Workspace"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
