// app/admin/reports/[id]/photo/route.ts
//
// WHAT: Shows a report's photo to signed-in CENRO staff.
//
// WHY THROUGH THE NEXT.JS SERVER: the photo is in a private bucket, and
//   the API only hands it to a request that carries the staff member's
//   access token. That token lives on this server, never in the browser.
//   So the browser asks this route, which checks the staff session, asks
//   the API with the token, and passes the photo back.
//
// PRIVACY: the reply tells the browser not to keep a copy, and never to
//   treat the file as anything but the image type the API gave.

import { getCurrentStaffSession, StaffPortalUnavailableError } from "@/lib/admin-session";
import { getReportPhoto } from "@/lib/staff-reports-api";

const NO_STORE = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await getCurrentStaffSession();
  } catch (error) {
    if (error instanceof StaffPortalUnavailableError) {
      return new Response(null, { status: 503, headers: NO_STORE });
    }
    throw error;
  }
  if (!session) return new Response(null, { status: 401, headers: NO_STORE });

  const { id } = await params;
  const upstream = await getReportPhoto(session.accessToken, id);
  if (!upstream) return new Response(null, { status: 503, headers: NO_STORE });
  if (!upstream.ok) {
    const status = upstream.status === 404 ? 404 : upstream.status === 401 || upstream.status === 403 ? 401 : 503;
    return new Response(null, { status, headers: NO_STORE });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      ...NO_STORE,
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
    },
  });
}
