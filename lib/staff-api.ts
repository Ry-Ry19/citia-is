// lib/staff-api.ts
//
// WHAT: Asks the CITIA-IS API (GET /staff/me) whether a signed-in
//   Supabase user is an ACTIVE CENRO staff member. Server-side only: the
//   access token is sent from the Next.js server, never from the browser.
//
// WHY ASK THE API: the staff list and roles live in citia.staff_profiles,
//   which only FastAPI may read. A signed-in Supabase account is not
//   staff until the API says so.

export interface StaffProfile {
  id: string;
  fullName: string;
  role: "administrator" | "cenro_staff";
  email: string | null;
}

export type StaffCheck =
  | { status: "staff"; profile: StaffProfile }
  /** Not signed in properly, or not an active staff member. */
  | { status: "refused" }
  /** The check could not run (API down, misconfigured). Not a refusal. */
  | { status: "unavailable" };

const REQUEST_TIMEOUT_MS = 8_000;
const ROLES: readonly string[] = ["administrator", "cenro_staff"];

function toProfile(body: unknown): StaffProfile | null {
  if (typeof body !== "object" || body === null) return null;
  const { id, full_name, role, email } = body as Record<string, unknown>;
  if (typeof id !== "string" || !id) return null;
  if (typeof full_name !== "string" || !full_name) return null;
  if (typeof role !== "string" || !ROLES.includes(role)) return null;
  if (email !== null && email !== undefined && typeof email !== "string") return null;
  return {
    id,
    fullName: full_name,
    role: role as StaffProfile["role"],
    email: typeof email === "string" ? email : null,
  };
}

export async function checkStaff(accessToken: string): Promise<StaffCheck> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) return { status: "unavailable" };

  try {
    const response = await fetch(`${baseUrl}/staff/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.status === 401 || response.status === 403) return { status: "refused" };
    if (!response.ok) return { status: "unavailable" };

    const profile = toProfile(await response.json());
    return profile ? { status: "staff", profile } : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
