// app/admin/reports/[id]/page.tsx
//
// WHAT: The CENRO review page for one sighting report (/admin/reports/<ref>).
//
// AUTH AND DATA: a server component. It checks the staff session (and
//   redirects to sign-in without one), then loads the report from the
//   CITIA-IS API with the staff member's access token. The token stays on
//   the server; the screen receives only the report.

import { notFound, redirect } from "next/navigation";
import { getCurrentStaffSession } from "@/lib/admin-session";
import { getReport } from "@/lib/staff-reports-api";
import { AdminShell } from "@/components/admin/admin-shell";
import { ReportDetail } from "@/components/admin/report-detail";
import { LoadProblem } from "@/components/admin/load-problem";

interface AdminReportDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminReportDetailPage({ params }: AdminReportDetailPageProps) {
  const session = await getCurrentStaffSession();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const result = await getReport(session.accessToken, decodeURIComponent(id));
  if (!result.ok && result.problem === "refused") redirect("/admin/login?notice=expired");
  if (!result.ok && result.problem === "not_found") notFound();

  return (
    <AdminShell staff={{ email: session.email, fullName: session.fullName, role: session.role }}>
      {result.ok ? (
        <ReportDetail report={result.data} />
      ) : (
        <LoadProblem what="this report" backHref="/admin/reports" backLabel="Back to the Reports Queue" />
      )}
    </AdminShell>
  );
}
