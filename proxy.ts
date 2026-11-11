// proxy.ts
//
// WHAT: The route guard for the CENRO staff portal.
//
// NEXT 16: the "middleware" file name is deprecated and has been
//   renamed to "proxy". Next 16 also always runs Proxy on the Node.js
//   runtime, so this file can use ordinary server code.
//
// WHAT IT DOES for every /admin request:
//   1. Refreshes the Supabase Auth session and writes the renewed
//      httpOnly cookies — server pages cannot set cookies themselves.
//   2. Lets the public sign-in and password-reset pages through.
//   3. Sends anyone without a valid session, or whose 8-hour session has
//      ended, to the sign-in screen.
//
// IMPORTANT: this guard is a convenience, not the whole security
//   boundary. Server actions are not separate routes, and proxies can
//   have bypass bugs, so every page and action checks the session for
//   itself — see lib/admin-session.ts.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  LEGACY_SESSION_COOKIE,
  readSignInToken,
  SIGN_IN_COOKIE,
} from "@/lib/admin-session";
import { getSupabaseConfig, SUPABASE_COOKIE_OPTIONS } from "@/lib/supabase-server";

// Reachable without a staff session.
const PUBLIC_ADMIN_PATHS = new Set([
  "/admin/login",
  "/admin/forgot-password",
  "/admin/update-password",
]);

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  let userId: string | null = null;

  const config = getSupabaseConfig();
  const supabase = config
    ? createServerClient(config.url, config.publishableKey, {
        cookieOptions: SUPABASE_COOKIE_OPTIONS,
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet, headers) {
            for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
            response = NextResponse.next({ request });
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options);
            }
            // Responses that set session cookies must never be cached.
            for (const [name, value] of Object.entries(headers ?? {})) {
              response.headers.set(name, value);
            }
          },
        },
      })
    : null;

  if (supabase) {
    // Refreshes an expiring token, and verifies it — getSession() alone
    // must never be trusted in server code.
    const { data } = await supabase.auth.getClaims();
    userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  }

  if (PUBLIC_ADMIN_PATHS.has(request.nextUrl.pathname)) {
    return response;
  }

  const signIn = await readSignInToken(request.cookies.get(SIGN_IN_COOKIE)?.value);
  if (userId && signIn && signIn.userId === userId) {
    return response;
  }

  // Signed out, or the 8-hour session has ended: end the Supabase session
  // too, so the staff member must sign in again.
  const hadSignIn = request.cookies.has(SIGN_IN_COOKIE);
  if (supabase && userId) {
    await supabase.auth.signOut({ scope: "local" });
  }

  const loginUrl = new URL("/admin/login", request.url);
  if (hadSignIn && !signIn) loginUrl.searchParams.set("notice", "expired");

  const redirect = NextResponse.redirect(loginUrl);
  // Carry over the cookie changes the sign-out made (clearing the session).
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  redirect.cookies.delete(SIGN_IN_COOKIE);
  redirect.cookies.delete(LEGACY_SESSION_COOKIE);
  redirect.headers.set("Cache-Control", "private, no-store");
  return redirect;
}

export const config = {
  matcher: ["/admin/:path*"],
};
