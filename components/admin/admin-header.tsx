// components/admin/admin-header.tsx
//
// WHAT: Top bar for the CENRO administration workspace.
//
// RESPONSIVE: on small screens it carries the button that opens the
//   sidebar sheet. The sheet itself lives in admin-sidebar.tsx; the
//   page owns the open/closed state and passes `onOpenNav` down.
//
// IDENTITY: the profile chip shows the signed-in staff member's picture
//   (initials), name and role from their staff profile. On phones only
//   the picture shows. The link to the public site is in the sidebar.

"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { getSectionTitle } from "@/components/admin/admin-sidebar";
import {
  ROLE_LABELS,
  StaffAvatar,
  StaffNameplate,
  type StaffIdentity,
} from "@/components/admin/staff-avatar";

interface AdminHeaderProps {
  onOpenNav: () => void;
  /** The signed-in staff member, from their staff profile. */
  staff: StaffIdentity;
}

export function AdminHeader({ onOpenNav, staff }: AdminHeaderProps) {
  const pathname = usePathname();
  const sectionTitle = getSectionTitle(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl sm:px-6">
      {/* Mobile navigation trigger */}
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open admin navigation"
        className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <li className="whitespace-nowrap">CENRO Iligan City</li>
          <li aria-hidden="true">/</li>
          <li className="truncate font-semibold text-foreground">
            {sectionTitle}
          </li>
        </ol>
      </nav>

      {/* Right-hand actions */}
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        {/* Signed-in staff member */}
        <div
          className="flex min-h-11 items-center gap-2.5 rounded-lg border border-border bg-card px-2 sm:pr-3"
          title={staff.email}
        >
          <StaffAvatar staff={staff} />
          <StaffNameplate staff={staff} className="hidden max-w-48 sm:flex" />
          <span className="sr-only sm:hidden">
            Signed in as {staff.fullName}, {ROLE_LABELS[staff.role]}
          </span>
        </div>
      </div>
    </header>
  );
}
