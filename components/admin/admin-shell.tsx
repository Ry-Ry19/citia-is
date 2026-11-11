// components/admin/admin-shell.tsx
//
// WHAT: Interactive layout shell for CENRO administration pages.
//
// RESPONSIBILITY:
//   - Houses the AdminSidebar and handles the responsive mobile drawer state
//   - Houses the AdminHeader and provides staff identity
//   - Enforces the 1280px max-width content container and background canvas

"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import type { StaffIdentity } from "@/components/admin/staff-avatar";

interface AdminShellProps {
  children: React.ReactNode;
  staff: StaffIdentity;
}

export function AdminShell({ children, staff }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
        staff={staff}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader
          onOpenNav={() => setMobileOpen(true)}
          staff={staff}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
