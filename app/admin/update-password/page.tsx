// app/admin/update-password/page.tsx
//
// WHAT: Set a new password after opening a reset link. The link (handled
//   by app/auth/confirm) creates a short Supabase session; without one,
//   this page only explains that the link has expired.

import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { UpdatePasswordForm } from "@/components/auth/password-forms";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function UpdatePasswordPage() {
  const supabase = await createSupabaseServerClient();
  const claims = supabase ? (await supabase.auth.getClaims()).data?.claims : null;

  if (!claims) {
    return (
      <AuthCard
        title="Reset link expired"
        description="This password reset link is invalid or has already been used."
      >
        <Link
          href="/admin/forgot-password"
          className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground"
        >
          Request a new link
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" description="You will sign in again with the new password.">
      <UpdatePasswordForm />
    </AuthCard>
  );
}
