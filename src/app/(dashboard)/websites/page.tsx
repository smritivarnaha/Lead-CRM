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
import { Globe, Copy, CheckCircle2, MoreVertical } from "lucide-react";
import { useState } from "react";

const websites = [
  {
    id: "site_abc123",
    name: "Dr. Anurag Neuro Clinic",
    domain: "dranuragneuro.com",
    webhookUrl: "https://lead-crmsss.vercel.app/api/webhook/receive/site_abc123",
    status: "Active",
    lastLead: "10 mins ago",
  },
  {
    id: "site_def456",
    name: "Gulmohar IVF",
    domain: "gulmoharivf.com",
    webhookUrl: "https://lead-crmsss.vercel.app/api/webhook/receive/site_def456",
    status: "Active",
    lastLead: "2 hours ago",
  },
  {
    id: "site_ghi789",
    name: "ABC Hospital",
    domain: "abchospital.com",
    webhookUrl: "https://lead-crmsss.vercel.app/api/webhook/receive/site_ghi789",
    status: "Inactive",
    lastLead: "Never",
  },
];

export default function WebsitesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Websites</h2>
          <p className="text-sm text-slate-500 mt-1">Manage client websites and webhook integrations.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
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
              <TableHead className="font-semibold">Last Lead</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {websites.map((site) => (
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
                      {site.webhookUrl}
                    </code>
                    <button className="text-slate-400 hover:text-blue-600 transition-colors" title="Copy Webhook URL">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
                <TableCell>
                  {site.status === "Active" ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                      Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-slate-600 text-sm">
                  {site.lastLead}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => alert(`Creating login for ${site.name}. In production, this calls /api/websites/${site.id}/users with an auto-generated password.`)}
                    >
                      Create Login
                    </Button>
                    <button className="text-slate-400 hover:text-slate-900 p-2">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
