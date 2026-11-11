// app/admin/species/page.tsx
//
// WHAT: The CENRO Species Reference and Management Recommendations
//   portal screen (/admin/species).
//
// AUTH: Server Component reading the signed staff session cookie via
//   getCurrentStaffSession(). Unauthenticated visitors are redirected to
//   /admin/login before rendering any administrative markup.
//
// SCOPE: Authenticated CENRO staff access only. Allows officers to
//   review confirmed botanical reference data, native baselines, and
//   associated Management Recommendations for environmental decision support.
//
// DATA INTEGRITY: Contains confirmed thesis reference data for Mahogany
//   (Swietenia macrophylla) along with demonstration native comparison flora.
//   Clearly notes that recommendations are informational and do NOT
//   authorize tree cutting or removal. No live backend database is connected.

import { redirect } from "next/navigation";
import { getCurrentStaffSession } from "@/lib/admin-session";
import { AdminShell } from "@/components/admin/admin-shell";
import { SpeciesWorkspace } from "@/components/admin/species-workspace";

export const metadata = {
  title: "Species & Management Recommendations | CITIA-IS Admin",
  description:
    "CENRO botanical reference library, species identification profiles, and Management Recommendations.",
};

export default async function AdminSpeciesPage() {
  const session = await getCurrentStaffSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminShell staff={{ email: session.email, fullName: session.fullName, role: session.role }}>
      <SpeciesWorkspace />
    </AdminShell>
  );
}
