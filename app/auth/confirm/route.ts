// app/auth/confirm/route.ts
//
// WHAT: Where a password-reset email link lands. It exchanges the link's
//   one-time token for a short Supabase session, then opens the page that
//   sets the new password.
//
// TWO LINK FORMATS:
//   - ?code=…  Supabase's DEFAULT reset email (used until custom SMTP lets
//     the template be edited). The code only works in the browser that
//     asked for the reset, which holds the matching PKCE verifier cookie.
//   - ?token_hash=…&type=recovery  A customised template (see
//     docs/ADMIN_AUTH_SETUP.md); works in any browser.
//
// SAFE REDIRECTS: only password recovery is accepted, and the "next" page
//   must be inside /admin, so the link cannot send someone to another site.

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const DEFAULT_NEXT = "/admin/update-password";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const next = request.nextUrl.searchParams.get("next") ?? DEFAULT_NEXT;
  const safeNext = /^\/admin\/[a-z-]*$/.test(next) ? next : DEFAULT_NEXT;

  const code = request.nextUrl.searchParams.get("code");

  if (code || (tokenHash && type === "recovery")) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash! });
      if (!error) {
        return NextResponse.redirect(new URL(safeNext, request.url));
      }
    }
  }

  return NextResponse.redirect(new URL("/admin/login?notice=link-invalid", request.url));
}
