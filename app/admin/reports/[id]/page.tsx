// app/admin/reports/[id]/page.tsx
//
// WHAT: The CENRO individual Report Detail & verification screen (/admin/reports/[id]).
//
// AUTH: Server Component reading the signed staff session cookie.
//   Redirects unauthenticated visitors to /admin/login before rendering.

import { redirect } from "next/navigation";
import { getCurrentStaffSession } from "@/lib/admin-session";
import { AdminShell } from "@/components/admin/admin-shell";
import { ReportDetail } from "@/components/admin/report-detail";

interface AdminReportDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminReportDetailPage({
  params,
}: AdminReportDetailPageProps) {
  const session = await getCurrentStaffSession();

  if (!session) {
    redirect("/admin/login");
  }

  const { id } = await params;

  return (
    <AdminShell staff={{ email: session.email, fullName: session.fullName, role: session.role }}>
      <ReportDetail reportId={id} staffEmail={session.email} />
    </AdminShell>
  );
}
