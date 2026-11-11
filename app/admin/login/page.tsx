// app/admin/login/page.tsx
//
// WHAT: The CENRO staff sign-in screen (/admin/login).
//
// AUTH: If there is already a valid staff session, redirect straight
//   to the dashboard (/admin) instead of showing the form again.
//
// NOTICES: ?notice=expired | password-updated | link-invalid explains why
//   the staff member is back on this screen.
//
// LAYOUT: Split unified card with the intro video media panel and
//   the staff login form side-by-side.

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminLoginForm } from "@/components/auth/admin-login-form";
import { getCurrentStaffSession } from "@/lib/admin-session";

const NOTICES: Record<string, string> = {
  expired: "Your 8-hour staff session has ended. Please sign in again.",
  "password-updated": "Your password was changed. Please sign in with the new password.",
  "link-invalid": "That password reset link is invalid or has expired. Please request a new one.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const session = await getCurrentStaffSession();

  if (session) {
    redirect("/admin");
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 pt-20 pb-12 md:pt-12">
      {/* Back to public site */}
      <Link
        href="/"
        className="focus-ring absolute left-6 top-8 z-10 flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to home
      </Link>

      {/* Single unified card with video panel and login fields */}
      <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl md:flex-row">
        {/* Left Side: Dark media panel (Desktop: Left/order-1, Mobile: Bottom/order-2) */}
        <div className="order-2 flex flex-col bg-neutral-950 md:order-1 md:w-3/5">
          {/* Media content */}
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-black md:aspect-auto md:h-full">
            <video
              className="h-full w-full object-cover opacity-90"
              autoPlay
              loop
              muted
              playsInline
              aria-hidden="true"
            >
              <source src="/assets/videos/citia-intro.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>

        {/* Right Side: Login fields (Desktop: Right/order-2, Mobile: Top/order-1) */}
        <div className="order-1 flex flex-col justify-center items-stretch p-8 sm:p-6 md:order-2 md:w-2/5 bg-card">
          <AdminLoginForm notice={notice ? NOTICES[notice] : undefined} />
        </div>
      </div>

      {/* Copyright — outside the card */}
      <p className="mt-6 max-w-md text-center text-xs text-muted-foreground">
        Copyright © 2026 onwards, CENRO &amp; CITIA-IS Development Team.
      </p>
    </main>
  );
}
