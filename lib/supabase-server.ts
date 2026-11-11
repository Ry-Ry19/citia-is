// lib/supabase-server.ts
//
// WHAT: The Supabase Auth client for CENRO staff sign-in, used ONLY in
//   server code (server actions, server pages, route handlers, proxy.ts).
//   There is no browser Supabase client in CITIA-IS.
//
// HTTPONLY COOKIES: @supabase/ssr makes its session cookies readable by
//   JavaScript by default, because a browser client would need them.
//   With no browser client, they are made httpOnly, so a script injected
//   into the page cannot steal a staff session.
//
// CONFIGURATION: SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in .env.local.
//   Neither has a NEXT_PUBLIC_ prefix, so neither is sent to the browser.

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const SUPABASE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  // Only sent over HTTPS once the site is live.
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

/** Returns null when sign-in is not configured, so callers fail closed. */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !url.startsWith("https://") || !publishableKey) return null;
  return { url, publishableKey };
}

/**
 * A Supabase client for the current request. Create a new one for every
 * request; never share one between requests.
 */
export async function createSupabaseServerClient() {
  // Read first: it marks the calling page as per-request, so a page is
  // never built once with a "not configured" answer frozen into it.
  const cookieStore = await cookies();

  const config = getSupabaseConfig();
  if (!config) return null;

  return createServerClient(config.url, config.publishableKey, {
    cookieOptions: SUPABASE_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server pages cannot set cookies. proxy.ts refreshes the
          // session before any page renders, so this is safe to ignore.
        }
      },
    },
  });
}
