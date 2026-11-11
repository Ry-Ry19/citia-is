// app/admin/reports/page.tsx
//
// WHAT: The CENRO Reports Queue screen (/admin/reports).
//
// AUTH: Server Component reading the signed staff session cookie.
//   Redirects unauthenticated visitors to /admin/login before rendering.

import { redirect } from "next/navigation";
import { getCurrentStaffSession } from "@/lib/admin-session";
import { AdminShell } from "@/components/admin/admin-shell";
import { ReportsQueue } from "@/components/admin/reports-queue";

export default async function AdminReportsPage() {
  const session = await getCurrentStaffSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminShell staff={{ email: session.email, fullName: session.fullName, role: session.role }}>
      <ReportsQueue />
    </AdminShell>
  );
}
