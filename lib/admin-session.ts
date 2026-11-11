// lib/admin-session.ts
//
// WHAT: Who is signed in to the CENRO staff portal.
//
// THREE CHECKS, ALL REQUIRED:
//   1. A Supabase Auth session (httpOnly cookies, see lib/supabase-server.ts),
//      verified with getClaims() — never with getSession() alone.
//   2. The CITIA-IS sign-in cookie: a small signed token holding the
//      sign-in time. It enforces the 8-hour staff session, which
//      Supabase's own long-lived cookies cannot.
//   3. GET /staff/me on the CITIA-IS API: the account must have an ACTIVE
//      staff profile. Disabling a profile locks the person out on their
//      next page load.
//
// Every server page calls getCurrentStaffSession(), so each page is its
//   own security boundary — proxy.ts is a convenience, not the only check.
//
// The token helpers take everything they need as arguments and never
//   touch "next/headers", so proxy.ts can use them too.

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkStaff } from "@/lib/staff-api";

// ── Configuration ──────────────────────────────────────────────────────────

/** Holds the signed sign-in time for the 8-hour limit. */
export const SIGN_IN_COOKIE = "citia_staff_signin";

/** The cookie of the old single-account sign-in, removed when seen. */
export const LEGACY_SESSION_COOKIE = "citia_admin_session";

/** A staff session lasts 8 hours, then the staff member signs in again. */
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

/**
 * The secret that signs the sign-in cookie. Null when missing or too
 * short, so callers fail closed instead of throwing mid-request.
 */
export function getSessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  return secret;
}

export function signInCookieOptions(maxAge: number) {
  return {
    // JavaScript cannot read it, so an injected script cannot steal it.
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface StaffSession {
  userId: string;
  email: string;
  fullName: string;
  role: "administrator" | "cenro_staff";
  /** End of the 8-hour session, as seconds since the epoch. */
  expiresAt: number;
}

/** State returned by the sign-in, reset and new-password actions. */
export interface LoginState {
  error?: string;
  notice?: string;
}

/** The staff check could not run (API or Supabase unreachable). Not a sign-out. */
export class StaffPortalUnavailableError extends Error {
  constructor() {
    super("The CENRO staff portal is temporarily unavailable.");
    this.name = "StaffPortalUnavailableError";
  }
}

// ── The sign-in cookie ─────────────────────────────────────────────────────

/** `expiresAt` must be an ABSOLUTE time in seconds since the epoch. */
export async function createSignInToken(
  userId: string,
  secret: string,
  expiresAt: number
): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(new TextEncoder().encode(secret));
}

/**
 * Returns the signed-in user id and the session end, or null — never
 * throws — for a missing, tampered, wrongly signed or expired cookie.
 */
export async function readSignInToken(
  token: string | undefined
): Promise<{ userId: string; expiresAt: number } | null> {
  const secret = getSessionSecret();
  if (!secret || !token) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || !payload.sub || !payload.exp) return null;
    return { userId: payload.sub, expiresAt: payload.exp };
  } catch {
    return null;
  }
}

// ── Current request ───────────────────────────────────────────────────────

/**
 * The staff member signed in for this request, or null.
 *
 * Throws StaffPortalUnavailableError when the check itself cannot run, so
 * the page shows "temporarily unavailable" (app/admin/error.tsx) instead
 * of sending the staff member round and round the sign-in page.
 */
export async function getCurrentStaffSession(): Promise<StaffSession | null> {
  const cookieStore = await cookies();
  const signIn = await readSignInToken(cookieStore.get(SIGN_IN_COOKIE)?.value);
  if (!signIn) return null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getClaims();
  if (error) {
    if (isAuthRetryableFetchError(error)) throw new StaffPortalUnavailableError();
    return null;
  }
  const claims = data?.claims;
  // The 8-hour cookie must belong to the same person as the Supabase session.
  if (!claims || claims.sub !== signIn.userId) return null;

  // getClaims() has verified this session; its token is what the API checks.
  const accessToken = (await supabase.auth.getSession()).data.session?.access_token;
  if (!accessToken) return null;

  const staff = await checkStaff(accessToken);
  if (staff.status === "refused") return null;
  if (staff.status === "unavailable") throw new StaffPortalUnavailableError();

  return {
    userId: signIn.userId,
    email: staff.profile.email ?? (typeof claims.email === "string" ? claims.email : ""),
    fullName: staff.profile.fullName,
    role: staff.profile.role,
    expiresAt: signIn.expiresAt,
  };
}
