import { AppLayout } from "@/components/layout/AppLayout";
import PushPermissionBanner from "@/components/PushPermissionBanner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout>
      {children}
      <PushPermissionBanner />
    </AppLayout>
  );
}
