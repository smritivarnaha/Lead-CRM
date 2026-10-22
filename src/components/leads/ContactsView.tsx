"use client";

import React, { useState, useMemo } from "react";
import { Search, Phone, Mail, MessageCircle, MapPin, Globe, Users, ExternalLink, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useActiveProfile } from "@/components/providers/ActiveProfileProvider";
import { LeadDetailsModal } from "./LeadDetailsModal";

function formatWhatsAppUrl(phone: string, name?: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  const text = encodeURIComponent(
    `Hi ${name && name !== "Unknown" ? name : "there"}, thank you for reaching out to us! How can we assist you today?`
  );
  return `https://wa.me/${normalized}?text=${text}`;
}

export function ContactsView({ initialLeads }: { initialLeads: any[] }) {
  const { activeWebsiteId, websites } = useActiveProfile();
  const [leads, setLeads] = useState<any[]>(initialLeads);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  // Deduplicate leads into unique contacts (grouped by normalized phone or email)
  const contacts = useMemo(() => {
    const scopedLeads = activeWebsiteId
      ? leads.filter((l) => l.websiteId === activeWebsiteId)
      : leads;

    const map = new Map<string, { lead: any; inquiryCount: number }>();

    for (const lead of scopedLeads) {
      const phoneKey = lead.phone ? lead.phone.replace(/\D/g, "").slice(-10) : "";
      const emailKey = lead.email ? lead.email.toLowerCase().trim() : "";
      const key = phoneKey || emailKey || lead.id;

      const existing = map.get(key);
      if (existing) {
        existing.inquiryCount += 1;
      } else {
        map.set(key, { lead, inquiryCount: 1 });
      }
    }

    let list = Array.from(map.values());

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(({ lead }) => {
        return (
          (lead.fullName && lead.fullName.toLowerCase().includes(q)) ||
          (lead.phone && lead.phone.toLowerCase().includes(q)) ||
          (lead.email && lead.email.toLowerCase().includes(q)) ||
          (lead.city && lead.city.toLowerCase().includes(q)) ||
          (lead.website?.name && lead.website.name.toLowerCase().includes(q))
        );
      });
    }

    return list;
  }, [leads, activeWebsiteId, searchQuery]);

  const activeSiteName = activeWebsiteId
    ? websites.find((w) => w.id === activeWebsiteId)?.name
    : null;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[#1A1523] tracking-tight">Contacts Directory</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EDE9FE] text-[#7C3AED]">
              {contacts.length} {contacts.length === 1 ? "Contact" : "Contacts"}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Unified, deduplicated address book of everyone who has contacted{" "}
            {activeSiteName ? <span className="font-semibold text-slate-700">{activeSiteName}</span> : "your websites"}.
          </p>
        </div>

        {/* Instant Search */}
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, email, city..."
            className="w-full h-10 pl-10 pr-8 rounded-xl border border-[#E8E4F3] bg-white text-xs font-medium text-[#1A1523] placeholder:text-slate-400 outline-none focus:border-[#7C3AED] shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-2xl border border-[#E8E4F3] shadow-sm overflow-hidden">
        {contacts.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#F7F5FF] flex items-center justify-center text-[#7C3AED] mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#1A1523]">No contacts found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No contacts match "${searchQuery}".`
                : "Contacts are automatically created and deduplicated as leads arrive from your websites."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap text-xs">
              <thead className="bg-[#F7F5FF] border-b border-[#E8E4F3] text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Contact Name</th>
                  <th className="px-5 py-3.5">Phone & Email</th>
                  <th className="px-5 py-3.5">Location</th>
                  <th className="px-5 py-3.5">Website Profile</th>
                  <th className="px-5 py-3.5 text-center">Enquiries</th>
                  <th className="px-6 py-3.5 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4F3]">
                {contacts.map(({ lead, inquiryCount }) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-[#F7F5FF]/70 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#EDE9FE] text-[#7C3AED] font-bold text-xs flex items-center justify-center shrink-0">
                          {(lead.fullName || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-[#1A1523] text-[13px]">
                            {lead.fullName || "Unknown Contact"}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Last active {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="space-y-1">
                        {lead.phone ? (
                          <div className="flex items-center gap-1.5 font-semibold text-[#1A1523]">
                            <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{lead.phone}</span>
                          </div>
                        ) : null}
                        {lead.email ? (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="truncate max-w-[200px]">{lead.email}</span>
                          </div>
                        ) : null}
                        {!lead.phone && !lead.email && (
                          <span className="text-slate-400 italic">No contact info</span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      {lead.city || lead.state ? (
                        <div className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>{[lead.city, lead.state].filter(Boolean).join(", ")}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700">
                        <Globe className="w-3 h-3 text-[#7C3AED]" />
                        {lead.website?.name || "Website"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {inquiryCount} {inquiryCount === 1 ? "Lead" : "Leads"}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {lead.phone && (
                          <>
                            <a
                              href={`tel:${lead.phone}`}
                              title="Call Now"
                              className="h-8 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1 font-semibold text-[11px] transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5" /> Call
                            </a>
                            <a
                              href={formatWhatsAppUrl(lead.phone, lead.fullName)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Chat on WhatsApp"
                              className="h-8 px-2.5 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] border border-[#25D366]/30 inline-flex items-center gap-1 font-bold text-[11px] transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                            </a>
                          </>
                        )}
                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            title="Send Email"
                            className="h-8 w-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 inline-flex items-center justify-center transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedLead(lead)}
                          className="h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                        >
                          Details <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lead Details Drawer */}
      <LeadDetailsModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onStatusChange={(leadId: string, newStatus: string) => {
          setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
          setSelectedLead((prev: any) => (prev && prev.id === leadId ? { ...prev, status: newStatus } : prev));
        }}
      />
    </div>
  );
}
