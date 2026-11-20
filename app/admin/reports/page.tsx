// app/admin/reports/page.tsx
//
// WHAT: The CENRO Reports Queue (/admin/reports).
//
// AUTH AND DATA: a server component. It checks the staff session, reads
//   the filters from the address (?status=…&area=…&q=…&page=…), and asks
//   the CITIA-IS API for that page of reports with the staff member's
//   access token. The token never reaches the browser.

import { redirect } from "next/navigation";
import { getCurrentStaffSession } from "@/lib/admin-session";
import { listReports } from "@/lib/staff-reports-api";
import { STATUS_LABEL, STUDY_AREA_LABEL, type StatusCode, type StudyAreaCode } from "@/lib/admin-reports";
import { AdminShell } from "@/components/admin/admin-shell";
import { ReportsQueue, type QueueFilters } from "@/components/admin/reports-queue";
import { LoadProblem } from "@/components/admin/load-problem";

const PAGE_SIZE = 25;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getCurrentStaffSession();
  if (!session) redirect("/admin/login");

  const raw = await searchParams;
  const status = one(raw.status);
  const area = one(raw.area);
  // Unknown values in the address are ignored rather than sent on.
  const filters: QueueFilters = {
    status: status in STATUS_LABEL ? (status as StatusCode) : null,
    area: area in STUDY_AREA_LABEL ? (area as StudyAreaCode) : null,
    q: one(raw.q).trim().slice(0, 100),
    page: Math.max(1, Math.min(10_000, Number.parseInt(one(raw.page), 10) || 1)),
  };

  const result = await listReports(session.accessToken, {
    status: filters.status ?? undefined,
    studyArea: filters.area ?? undefined,
    search: filters.q || undefined,
    limit: PAGE_SIZE,
    offset: (filters.page - 1) * PAGE_SIZE,
  });
  if (!result.ok && result.problem === "refused") redirect("/admin/login?notice=expired");

  return (
    <AdminShell staff={{ email: session.email, fullName: session.fullName, role: session.role }}>
      {result.ok ? (
        <ReportsQueue page={result.data} filters={filters} />
      ) : (
        <LoadProblem what="the reports" />
      )}
    </AdminShell>
  );
}
