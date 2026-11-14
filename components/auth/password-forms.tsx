// components/auth/password-forms.tsx
//
// WHAT: The two password-reset forms of the CENRO staff portal:
//   - ForgotPasswordForm asks for an email and sends a reset link.
//   - UpdatePasswordForm sets the new password after the link is opened.
//
// Both submit to server actions in app/admin/actions.ts. The reset reply
//   is the same whether or not the email belongs to an account.

"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, updatePassword } from "@/app/admin/actions";
import type { LoginState } from "@/lib/admin-session";

function Messages({ state }: { state: LoginState }) {
  return (
    <>
      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {state.error}
        </p>
      )}
      {state.notice && (
        <p role="status" className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground">
          {state.notice}
        </p>
      )}
    </>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(requestPasswordReset, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5 text-left">
        <Label htmlFor="email" className="text-xs font-medium text-foreground">
          Email Address
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="staff@cenro.gov.ph"
          className="h-10 rounded-md text-sm"
        />
      </div>
      <Messages state={state} />
      <Button type="submit" className="h-10 w-full rounded-md text-xs font-semibold" disabled={isPending}>
        {isPending ? "Sending…" : "Send reset link"}
      </Button>
      <p className="pt-2 text-center text-xs text-muted-foreground">
        <Link href="/admin/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(updatePassword, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5 text-left">
        <Label htmlFor="password" className="text-xs font-medium text-foreground">
          New password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          className="h-10 rounded-md text-sm"
        />
        <p className="text-xs text-muted-foreground">At least 12 characters.</p>
      </div>
      <div className="space-y-1.5 text-left">
        <Label htmlFor="confirm" className="text-xs font-medium text-foreground">
          Repeat new password
        </Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          className="h-10 rounded-md text-sm"
        />
      </div>
      <Messages state={state} />
      <Button type="submit" className="h-10 w-full rounded-md text-xs font-semibold" disabled={isPending}>
        {isPending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
