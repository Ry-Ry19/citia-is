// app/admin/page.tsx
//
// WHAT: The CENRO administration dashboard home (/admin).
//
// AUTH: this is a Server Component. It reads the signed staff session
//   cookie and redirects to the sign-in screen when there is no valid
//   session, so an unauthenticated visitor never receives any dashboard
//   markup.
//
//   The proxy.ts guard covers this route too, but the check here is
//   deliberate: the page is the real security boundary, and the proxy
//   alone is not enough because Server Actions are not separate routes.
//
// DATA: the figures and the pending list come from the CITIA-IS API,
//   requested here with the staff member's access token. The token stays
//   on the server; the dashboard receives only the figures.

import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getCurrentStaffSession } from "@/lib/admin-session";
import { getDashboard, listReports } from "@/lib/staff-reports-api";

export default async function AdminDashboardPage() {
  const session = await getCurrentStaffSession();

  if (!session) {
    redirect("/admin/login");
  }

  const [summary, pending] = await Promise.all([
    getDashboard(session.accessToken),
    listReports(session.accessToken, { status: "pending_review", limit: 8 }),
  ]);
  if ((!summary.ok && summary.problem === "refused") || (!pending.ok && pending.problem === "refused")) {
    redirect("/admin/login?notice=expired");
  }

  return (
    <AdminDashboard
      staff={{ email: session.email, fullName: session.fullName, role: session.role }}
      summary={summary.ok ? summary.data : null}
      pending={pending.ok ? pending.data.items : []}
    />
  );
}
