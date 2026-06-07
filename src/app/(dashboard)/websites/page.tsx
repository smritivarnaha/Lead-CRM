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
import { Globe, Copy, CheckCircle2, X, UserPlus, KeyRound, Download, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { getWebsites, createWebsite, createClientLogin, resetClientPassword, deleteClientLogin } from "@/actions/websites";

type Website = {
  id: string;
  name: string;
  domain: string;
  isActive: boolean;
  createdAt: Date;
  users?: { id: string; email: string; firstName: string | null; lastName: string | null }[];
};

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Website | null>(null);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteDomain, setNewSiteDomain] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create login form state
  const [clientEmail, setClientEmail] = useState("");
  const [clientFirstName, setClientFirstName] = useState("");
  const [clientLastName, setClientLastName] = useState("");
  const [isCreatingLogin, setIsCreatingLogin] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);

  // Edit login state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resetCredentials, setResetCredentials] = useState<{ email: string; password: string } | null>(null);

  const fetchSites = async () => {
    setIsLoading(true);
    try {
      const res = await getWebsites();
      if (res?.success && res.websites) {
        setWebsites(res.websites);
      }
    } catch (e) {
      console.error("Server Action Exception:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName || !newSiteDomain) return;
    setIsSubmitting(true);
    try {
      const res = await createWebsite({ name: newSiteName, domain: newSiteDomain });
      if (res?.success) {
        setNewSiteName("");
        setNewSiteDomain("");
        setIsModalOpen(false);
        fetchSites();
      } else {
        alert(res?.error || "Failed to create website.");
      }
    } catch (e) {
      console.error("Create exception:", e);
      alert("Failed to contact the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openLoginModal = (site: Website) => {
    setSelectedSite(site);
    setClientEmail("");
    setClientFirstName("");
    setClientLastName("");
    setCreatedCredentials(null);
    setIsLoginModalOpen(true);
  };

  const openEditModal = (site: Website) => {
    setSelectedSite(site);
    setResetCredentials(null);
    setIsEditModalOpen(true);
  };

  const handleCreateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSite || !clientEmail || !clientFirstName) return;
    setIsCreatingLogin(true);
    try {
      const res = await createClientLogin({
        email: clientEmail,
        firstName: clientFirstName,
        lastName: clientLastName,
        websiteId: selectedSite.id,
        websiteName: selectedSite.name,
      });
      if (res?.success && res.tempPassword) {
        setCreatedCredentials({ email: clientEmail, password: res.tempPassword });
      } else {
        alert(res?.error || "Failed to create client login.");
      }
    } catch (e) {
      console.error("Login create exception:", e);
      alert("Failed to create client login. Please try again.");
    } finally {
      setIsCreatingLogin(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedSite || !selectedSite.users?.[0]) return;
    const user = selectedSite.users[0];
    setIsResetting(true);
    try {
      const res = await resetClientPassword(user.id);
      if (res?.success && res.tempPassword) {
        setResetCredentials({ email: user.email, password: res.tempPassword });
      } else {
        alert(res?.error || "Failed to reset password.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to reset password.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedSite || !selectedSite.users?.[0]) return;
    if (!confirm("Are you sure you want to delete this user? They will immediately lose access.")) return;
    const user = selectedSite.users[0];
    setIsDeleting(true);
    try {
      const res = await deleteClientLogin(user.id);
      if (res?.success) {
        setIsEditModalOpen(false);
        fetchSites();
      } else {
        alert(res?.error || "Failed to delete user.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete user.");
    } finally {
      setIsDeleting(false);
    }
  };

  const copyCredentials = (credentials: { email: string, password: string } | null) => {
    if (!credentials) return;
    navigator.clipboard.writeText(
      `Login URL: https://lead-crmsss.vercel.app/sign-in\nEmail: ${credentials.email}\nPassword: ${credentials.password}`
    );
    alert("Credentials copied to clipboard!");
  };

  const copyWebhook = (id: string) => {
    const url = `https://lead-crmsss.vercel.app/api/webhook/receive/${id}`;
    navigator.clipboard.writeText(url);
    alert("Webhook URL copied to clipboard!");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Manage client websites and webhook integrations.</p>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          + Add Website
        </Button>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden mt-4">
        <Table>
          <TableHeader className="bg-slate-50 border-b border-slate-200">
            <TableRow>
              <TableHead className="w-[280px] font-semibold text-slate-600">Website Name</TableHead>
              <TableHead className="font-semibold text-slate-600">Webhook URL</TableHead>
              <TableHead className="font-semibold text-slate-600">Status</TableHead>
              <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
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
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 max-w-[320px]">
                      <code className="text-slate-700 text-xs truncate font-medium mr-3">
                        https://lead-crmsss.vercel.app/api/webhook/receive/{site.id}
                      </code>
                      <button onClick={() => copyWebhook(site.id)} className="text-slate-400 hover:text-indigo-600 transition-colors shrink-0" title="Copy Webhook URL">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <a href={`/api/websites/${site.id}/plugin`} download className="flex items-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 px-3 py-2 rounded-lg text-xs font-bold transition-colors border border-indigo-200 shadow-sm shrink-0">
                      <Download className="w-3.5 h-3.5" />
                      WP Plugin
                    </a>
                  </div>
                </TableCell>
                <TableCell>
                  {site.isActive ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 rounded-full px-2.5 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 rounded-full px-2.5 py-0.5">
                      Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {site.users && site.users.length > 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-slate-700 border-slate-300 text-xs flex items-center gap-1.5"
                          onClick={() => openEditModal(site)}
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          Edit Login
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5"
                          onClick={() => openLoginModal(site)}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Create Login
                        </Button>
                      )}
                      <a 
                        href={`/client/${site.id}/settings`} 
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Client Settings & Integration"
                      >
                        <Settings className="h-4 w-4" />
                      </a>
                    </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add Website Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
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
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">Domain Name</label>
                <input
                  required
                  placeholder="e.g. dranurag.com"
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900"
                  value={newSiteDomain}
                  onChange={(e) => setNewSiteDomain(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="text-slate-700 border-slate-300">
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

      {/* Create Client Login Modal */}
      {isLoginModalOpen && selectedSite && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Client Login</h3>
                <p className="text-xs text-slate-500 mt-0.5">For: <span className="font-medium text-slate-700">{selectedSite.name}</span></p>
              </div>
              <button onClick={() => setIsLoginModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {createdCredentials ? (
              /* Success State - Show credentials */
              <div className="p-6 flex flex-col gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-green-800 mb-3">✅ Client account created!</p>
                  <p className="text-xs text-green-700 mb-1">Share these credentials with your client:</p>
                  <div className="bg-white rounded border border-green-200 p-3 mt-2 font-mono text-xs text-slate-800 space-y-1">
                    <p><span className="text-slate-500">Login URL:</span> https://lead-crmsss.vercel.app/sign-in</p>
                    <p><span className="text-slate-500">Email:</span> {createdCredentials.email}</p>
                    <p><span className="text-slate-500">Password:</span> {createdCredentials.password}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => copyCredentials(createdCredentials)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
                    <Copy className="h-4 w-4" /> Copy Credentials
                  </Button>
                  <Button variant="outline" onClick={() => { setIsLoginModalOpen(false); fetchSites(); }} className="text-slate-700 border-slate-300">
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              /* Form State */
              <form onSubmit={handleCreateLogin} className="p-6 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700">First Name *</label>
                    <input
                      required
                      placeholder="e.g. Dr. Anurag"
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900"
                      value={clientFirstName}
                      onChange={(e) => setClientFirstName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700">Last Name</label>
                    <input
                      placeholder="e.g. Sharma"
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900"
                      value={clientLastName}
                      onChange={(e) => setClientLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-700">Client Email *</label>
                  <input
                    required
                    type="email"
                    placeholder="e.g. client@dranurag.com"
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                  <p className="text-xs text-slate-400">A temporary password will be auto-generated. Share it with the client.</p>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-indigo-700">
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>Client will only see leads from <strong>{selectedSite.name}</strong></span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-2">
                  <Button type="button" variant="outline" onClick={() => setIsLoginModalOpen(false)} className="text-slate-700 border-slate-300">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreatingLogin} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    {isCreatingLogin ? "Creating..." : "Create Login"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Edit Client Login Modal */}
      {isEditModalOpen && selectedSite && selectedSite.users?.[0] && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Manage Client Login</h3>
                <p className="text-xs text-slate-500 mt-0.5">For: <span className="font-medium text-slate-700">{selectedSite.name}</span></p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">Current User</p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
                  <p><span className="font-semibold text-slate-900">{selectedSite.users[0].firstName} {selectedSite.users[0].lastName}</span></p>
                  <p className="text-slate-500 text-xs mt-0.5">{selectedSite.users[0].email}</p>
                </div>
              </div>

              {resetCredentials ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-green-800 mb-3">✅ Password reset successful!</p>
                  <div className="bg-white rounded border border-green-200 p-3 mt-2 font-mono text-xs text-slate-800 space-y-1">
                    <p><span className="text-slate-500">Email:</span> {resetCredentials.email}</p>
                    <p><span className="text-slate-500">New Password:</span> {resetCredentials.password}</p>
                  </div>
                  <Button onClick={() => copyCredentials(resetCredentials)} className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 justify-center">
                    <Copy className="h-4 w-4" /> Copy New Credentials
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-slate-600">Since passwords are encrypted securely, you cannot view the current password. If the user forgot it, you can generate a new one.</p>
                  <Button 
                    onClick={handleResetPassword} 
                    disabled={isResetting || isDeleting}
                    variant="outline" 
                    className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  >
                    {isResetting ? "Resetting..." : "Reset Password"}
                  </Button>
                  <div className="h-px bg-slate-100 my-2" />
                  <p className="text-sm text-slate-600">Or you can delete this user entirely to remove their access to the portal.</p>
                  <Button 
                    onClick={handleDeleteUser} 
                    disabled={isDeleting || isResetting}
                    variant="destructive" 
                    className="w-full"
                  >
                    {isDeleting ? "Deleting..." : "Delete User"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
