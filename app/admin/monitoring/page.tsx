// app/admin/monitoring/page.tsx
//
// WHAT: The CENRO Environmental Monitoring Map screen (/admin/monitoring).
//
// AUTH: Server Component reading the signed staff session cookie.
//   Redirects unauthenticated visitors to /admin/login before rendering.

import { redirect } from "next/navigation";
import { getCurrentStaffSession } from "@/lib/admin-session";
import { AdminShell } from "@/components/admin/admin-shell";
import { MonitoringWorkspace } from "@/components/admin/monitoring-workspace";

export default async function AdminMonitoringPage() {
  const session = await getCurrentStaffSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminShell staff={{ email: session.email, fullName: session.fullName, role: session.role }}>
      <MonitoringWorkspace />
    </AdminShell>
  );
}
