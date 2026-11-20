// app/admin/monitoring/page.tsx
//
// WHAT: The Environmental Monitoring page (/admin/monitoring): a map of
//   sighting reports beside the list of the same reports.
//
// AUTH AND DATA: a server component. It checks the staff session, then
//   loads the latest reports from the CITIA-IS API with the staff
//   member's access token. The map and list filter them in the browser.

import { redirect } from "next/navigation";
import { getCurrentStaffSession } from "@/lib/admin-session";
import { listReports } from "@/lib/staff-reports-api";
import { AdminShell } from "@/components/admin/admin-shell";
import { MonitoringWorkspace } from "@/components/admin/monitoring-workspace";
import { LoadProblem } from "@/components/admin/load-problem";

// The most reports the map loads at once (the API's largest page).
const MAP_LIMIT = 200;

export default async function AdminMonitoringPage() {
  const session = await getCurrentStaffSession();
  if (!session) redirect("/admin/login");

  const result = await listReports(session.accessToken, { limit: MAP_LIMIT });
  if (!result.ok && result.problem === "refused") redirect("/admin/login?notice=expired");

  return (
    <AdminShell staff={{ email: session.email, fullName: session.fullName, role: session.role }}>
      {result.ok ? (
        <>
          <MonitoringWorkspace reports={result.data.items} />
          {result.data.total > result.data.items.length && (
            <p className="text-sm text-muted-foreground">
              The map shows the latest {result.data.items.length} of {result.data.total} reports.
              Use the Reports Queue to search older ones.
            </p>
          )}
        </>
      ) : (
        <LoadProblem what="the map reports" />
      )}
    </AdminShell>
  );
}
