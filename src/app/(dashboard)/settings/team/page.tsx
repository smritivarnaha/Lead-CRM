import { getAuthenticatedUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Shield, User as UserIcon, Mail, Building, Globe } from "lucide-react";

export default async function TeamPage() {
  const currentUser = await getAuthenticatedUser();
  if (currentUser?.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      workspace: true,
      website: true,
    },
  });

  const websites = await prisma.website.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col h-full gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Team Management</h2>
        <p className="text-sm text-slate-500 mt-1">Manage users, roles, and website assignments.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Assignment</th>
                <th className="px-6 py-4">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                        {user.firstName?.[0] || user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === "SUPER_ADMIN" ? "bg-purple-100 text-purple-800" :
                      user.role === "CLIENT_ADMIN" ? "bg-blue-100 text-blue-800" :
                      "bg-slate-100 text-slate-800"
                    }`}>
                      {user.role === "SUPER_ADMIN" && <Shield className="w-3 h-3 mr-1" />}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.website ? (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-medium text-xs bg-emerald-50 px-2 py-1 rounded w-max">
                        <Globe className="w-3.5 h-3.5" />
                        {user.website.name}
                      </div>
                    ) : user.role === "SUPER_ADMIN" ? (
                      <span className="text-xs text-slate-400">All Access</span>
                    ) : (
                      <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
