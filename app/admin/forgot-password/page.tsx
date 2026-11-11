// app/admin/forgot-password/page.tsx
//
// WHAT: Request a password-reset email for a CENRO staff account.
//   Public: it must work for someone who cannot sign in.

import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/password-forms";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      description="Enter your staff email address and we will send you a reset link."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
