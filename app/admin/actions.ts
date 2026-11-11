// app/admin/actions.ts
//
// WHAT: The CENRO staff portal's sign-in, sign-out and password actions.
//
// "use server" at the top of the file makes every export in it a
//   server action. They run on the server, so they can use the Supabase
//   server client and set httpOnly cookies. Only server actions belong
//   here: every export becomes a callable endpoint.
//
// SIGN-IN: Supabase Auth checks the password. The new session then has to
//   pass GET /staff/me (an ACTIVE staff profile) before the 8-hour
//   CITIA-IS sign-in cookie is set. Every failure shows the same message,
//   so the form never reveals whether an account exists.

"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import {
  createSignInToken,
  getSessionSecret,
  LEGACY_SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  SIGN_IN_COOKIE,
  signInCookieOptions,
  type LoginState,
} from "@/lib/admin-session";
import { checkStaff } from "@/lib/staff-api";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const GENERIC_ERROR = "That email address and password combination was not recognised.";
const NOT_CONFIGURED =
  "Staff sign-in is not configured on this server. Contact the system administrator.";
const UNAVAILABLE = "Staff sign-in is temporarily unavailable. Please try again later.";
const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

const MIN_PASSWORD_LENGTH = 12;

/**
 * Handles a staff sign-in. On success it sets the session cookies and
 * redirects to the dashboard.
 */
export async function loginAdmin(
  _previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: GENERIC_ERROR };

  const secret = getSessionSecret();
  const supabase = await createSupabaseServerClient();
  if (!secret || !supabase) return { error: NOT_CONFIGURED };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    if (error && isAuthRetryableFetchError(error)) return { error: UNAVAILABLE };
    if (error?.status === 429) return { error: TOO_MANY };
    return { error: GENERIC_ERROR };
  }

  // A correct password is not enough: the account must be active staff.
  const staff = await checkStaff(data.session.access_token);
  if (staff.status !== "staff") {
    await supabase.auth.signOut({ scope: "local" });
    return { error: staff.status === "refused" ? GENERIC_ERROR : UNAVAILABLE };
  }

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = await createSignInToken(data.user.id, secret, expiresAt);

  const cookieStore = await cookies();
  cookieStore.set(SIGN_IN_COOKIE, token, signInCookieOptions(SESSION_TTL_SECONDS));
  cookieStore.delete(LEGACY_SESSION_COOKIE);

  redirect("/admin");
}

/** Ends the staff session on this device and returns to the sign-in screen. */
export async function logoutAdmin(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut({ scope: "local" });
  }

  const cookieStore = await cookies();
  cookieStore.delete(SIGN_IN_COOKIE);
  cookieStore.delete(LEGACY_SESSION_COOKIE);

  redirect("/admin/login");
}

/**
 * Sends a password-reset email. The reply is the same whether or not the
 * address belongs to an account.
 */
export async function requestPasswordReset(
  _previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Please enter your email address." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: NOT_CONFIGURED };

  // The email link returns here. Supabase only follows it if this exact
  // address is in the project's Redirect URLs allow-list.
  const origin = (await headers()).get("origin");
  const redirectTo = origin && /^https?:\/\/[^/]+$/.test(origin) ? `${origin}/auth/confirm` : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error && isAuthRetryableFetchError(error)) return { error: UNAVAILABLE };
  if (error?.status === 429) return { error: TOO_MANY };

  return {
    notice:
      "If this email belongs to a CENRO staff account, a password reset link has been sent. Check your inbox.",
  };
}

/**
 * Sets a new password for the account signed in by a reset link, then
 * signs out so the staff member signs in again with the new password.
 */
export async function updatePassword(
  _previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Use at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (password !== confirm) return { error: "The two passwords do not match." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: NOT_CONFIGURED };

  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return { error: "This reset link has expired. Please request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") {
      return { error: "Choose a password different from your current one." };
    }
    if (error.code === "weak_password") {
      return { error: "That password is too weak. Choose a longer, less common one." };
    }
    if (isAuthRetryableFetchError(error)) return { error: UNAVAILABLE };
    return { error: "The password could not be changed. Please request a new reset link." };
  }

  await supabase.auth.signOut({ scope: "local" });
  const cookieStore = await cookies();
  cookieStore.delete(SIGN_IN_COOKIE);

  redirect("/admin/login?notice=password-updated");
}
