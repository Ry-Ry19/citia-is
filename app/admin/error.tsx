"use client";

// app/admin/error.tsx
//
// WHAT: Shown when a staff page cannot check the sign-in — the CITIA-IS
//   API or Supabase is unreachable (StaffPortalUnavailableError) — or any
//   other server error occurs in /admin. The staff member can retry
//   instead of being sent round and round the sign-in page.

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" aria-hidden="true" />
        <h1 className="mt-4 text-lg font-semibold text-foreground">
          The staff portal is temporarily unavailable
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your sign-in could not be checked right now. Please try again in a moment.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Link
            href="/"
            className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted"
          >
            Public site
          </Link>
        </div>
      </div>
    </main>
  );
}
