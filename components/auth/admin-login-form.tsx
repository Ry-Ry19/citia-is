// components/auth/admin-login-form.tsx
//
// WHAT: The CENRO staff sign-in form.
//
// HOW IT WORKS: The <form> submits to the loginAdmin server action.
//   Supabase Auth checks the password, the CITIA-IS API checks that the
//   account is active CENRO staff, and the action then sets httpOnly
//   session cookies and redirects to /admin. A staff session lasts 8 hours.
//
// SECURITY: Displays a single generic error message on failure to prevent
//   account enumeration (does not disclose whether the email or password was wrong).

"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAdmin } from "@/app/admin/actions";
import type { LoginState } from "@/lib/admin-session";

export function AdminLoginForm({ notice }: { notice?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    loginAdmin,
    {}
  );

  return (
    <div className="w-full">
      <div className="mb-5 space-y-1 text-center">
        <h2 className="text-base font-semibold text-foreground">
          Staff Authentication
        </h2>
        <p className="text-xs text-muted-foreground">
          Enter your authorized credentials to continue
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        {/* Email Address */}
        <div className="space-y-1.5 text-left">
          <Label htmlFor="email" className="text-xs font-medium text-foreground">
            Email Address
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="staff@cenro.gov.ph"
            autoComplete="email"
            required
            className="h-10 rounded-md text-sm"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5 text-left">
          <Label
            htmlFor="password"
            className="text-xs font-medium text-foreground"
          >
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              className="h-10 rounded-md pr-10 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="focus-ring absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Password reset (a staff session always lasts 8 hours) */}
        <div className="flex justify-end pt-0.5">
          <Link href="/admin/forgot-password" className="text-xs font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        {/* Notice from a redirect (session ended, password updated…) */}
        {notice && !state.error && (
          <p
            role="status"
            className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground"
          >
            {notice}
          </p>
        )}

        {/* Authentication error banner */}
        {state.error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {state.error}
          </p>
        )}

        {/* Submit action */}
        <Button
          type="submit"
          className="h-10 w-full rounded-md text-xs font-semibold"
          disabled={isPending}
        >
          {isPending ? "Signing in…" : "Sign In"}
        </Button>

        {/* Public site link */}
        <p className="pt-2 text-center text-xs text-muted-foreground">
          Not staff?{" "}
          <Link href="/" className="font-medium text-primary hover:underline">
            Return to public site
          </Link>
        </p>
      </form>
    </div>
  );
}
