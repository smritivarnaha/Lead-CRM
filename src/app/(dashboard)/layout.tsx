import { AppLayout } from "@/components/layout/AppLayout";
import PushPermissionBanner from "@/components/PushPermissionBanner";

import { getAuthenticatedUser } from "@/lib/auth";
import { AlertCircle } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();
  
  if (user?.role === "STAFF" && !user.websiteId && !user.workspaceId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Pending</h1>
            <p className="text-gray-500">
              Welcome! Your account has been created successfully, but you haven't been assigned to a website or workspace yet.
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700">
            Please contact your administrator to get access to your dashboard.
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      {children}
      <PushPermissionBanner />
    </AppLayout>
  );
}
