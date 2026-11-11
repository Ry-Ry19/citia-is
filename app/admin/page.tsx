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
// DATA INTEGRITY: the dashboard body still shows clearly labelled
//   SAMPLE DATA only. No report API, database, or map source is
//   connected. See components/admin/admin-dashboard.tsx.

import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getCurrentStaffSession } from "@/lib/admin-session";

export default async function AdminDashboardPage() {
  const session = await getCurrentStaffSession();

  if (!session) {
    redirect("/admin/login");
  }

  return <AdminDashboard staff={{ email: session.email, fullName: session.fullName, role: session.role }} />;
}
