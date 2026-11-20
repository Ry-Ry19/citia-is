// components/admin/admin-sidebar.tsx
//
// WHAT: Responsive CENRO administration navigation shell.
//
// ALIGNMENT: Aligned with CITIA-IS Admin UI/UX Design Plan v2.0 Section 4.
//   Navigation groups: Overview, CENRO Work, Reference, Administration.
//
// ROUTE HONESTY: Only /admin exists today. Items whose `available` flag
//   is false render as visibly unavailable entries — never as active links —
//   so the sidebar never suggests working functionality or triggers 404s.
//
// RESPONSIVE: Rendered as a fixed 240px rail on desktop (>=1024px) and inside
//   a mobile drawer Sheet below 1024px / 768px.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FileText,
  LayoutDashboard,
  ExternalLink,
  LogOut,
  Map,
  ScrollText,
  Users,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SiteLogo } from "@/components/common/site-logo";
import { cn } from "@/lib/utils";
import { logoutAdmin } from "@/app/admin/actions";
import { StaffAvatar, type StaffIdentity } from "@/components/admin/staff-avatar";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  /** Set only on routes that exist. Absent or false means "not yet developed". */
  available?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        available: true,
      },
    ],
  },
  {
    label: "CENRO Work",
    items: [
      {
        label: "Reports Queue",
        href: "/admin/reports",
        icon: FileText,
        available: true,
      },
      {
        label: "Monitoring",
        href: "/admin/monitoring",
        icon: Map,
        available: true,
      },
    ],
  },
  {
    label: "Reference",
    items: [
      {
        label: "Species & Management Recommendations",
        href: "/admin/species",
        icon: BookOpen,
        available: true,
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        label: "User Management",
        href: "/admin/users",
        icon: Users,
        available: false,
      },
      {
        label: "Audit Log",
        href: "/admin/audit",
        icon: ScrollText,
        available: false,
      },
    ],
  },
];

/** Breadcrumb label for a pathname. Falls back to the dashboard. */
export function getSectionTitle(pathname: string): string {
  if (pathname.startsWith("/admin/reports/")) {
    return "Report Details";
  }
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.href === pathname) return item.label;
    }
  }
  return "Dashboard";
}

interface AdminSidebarProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  staff?: StaffIdentity;
}

export function AdminSidebar({
  mobileOpen,
  onMobileOpenChange,
  staff,
}: AdminSidebarProps) {
  return (
    <>
      {/* Desktop rail — fixed width 256px (w-64), wide enough for the
          longest label without wrapping */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <AdminSidebarNav staff={staff} />
      </aside>

      {/* Mobile sheet drawer */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-[85%] max-w-xs gap-0 p-0">
          <SheetHeader className="border-b border-border px-4 py-4">
            <SheetTitle className="text-sm font-semibold text-foreground">
              CENRO Administration
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              CITIA-IS Staff Navigation
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <AdminSidebarNav
              staff={staff}
              onNavigate={() => onMobileOpenChange(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

interface AdminSidebarNavProps {
  /** Called after a navigation link is followed (closes the mobile sheet). */
  onNavigate?: () => void;
  staff?: StaffIdentity;
}

function AdminSidebarNav({ onNavigate, staff }: AdminSidebarNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <SiteLogo className="h-8 w-8 shrink-0" />
        <span className="flex flex-col leading-tight">
          <span className="text-base font-extrabold tracking-tight">
            <span className="text-foreground">CITIA</span>
            <span className="text-primary">-IS</span>
          </span>
          <span className="text-sm text-muted-foreground">
            CENRO Portal
          </span>
        </span>
      </div>

      {/* Sections */}
      <nav
        aria-label="Admin sections"
        className="flex-1 overflow-y-auto px-3 pb-4"
      >
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            <p className="px-3 pb-1.5 text-sm font-bold text-muted-foreground">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <SidebarLink
                    item={item}
                    isActive={Boolean(item.available) && pathname === item.href}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Public site link */}
      <div className="px-3 pb-2">
        <Link
          href="/"
          onClick={onNavigate}
          className="focus-ring flex min-h-10 items-center gap-2.5 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
          Public Site
        </Link>
      </div>

      {/* Staff Identity & Sign-out Control at the bottom */}
      <div className="border-t border-border p-3">
        {staff && (
          <div className="mb-2 flex items-center gap-2.5 px-3 py-1" title={staff.email}>
            <StaffAvatar staff={staff} />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-semibold text-foreground">
                {staff.fullName}
              </span>
              <span className="truncate text-sm text-muted-foreground">
                {staff.email}
              </span>
            </span>
          </div>
        )}
        <form action={logoutAdmin}>
          <button
            type="submit"
            onClick={onNavigate}
            className="focus-ring flex min-h-10 w-full items-center gap-2.5 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}

interface SidebarLinkProps {
  item: NavItem;
  isActive: boolean;
  onNavigate?: () => void;
}

function SidebarLink({ item, isActive, onNavigate }: SidebarLinkProps) {
  const Icon = item.icon;

  // Not yet developed — rendered as non-clickable element with 'Soon' pill
  if (!item.available) {
    return (
      <span
        aria-disabled="true"
        className="flex min-h-9 items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground/60 select-none"
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate">{item.label}</span>
        <span className="rounded border border-border px-1 py-0.2 text-sm font-semibold text-muted-foreground/70">
          Soon
          <span className="sr-only"> — page not yet available</span>
        </span>
      </span>
    );
  }

  // Active navigation indicator: 3px accent border, accent text, subtle accent background
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "focus-ring flex min-h-9 items-center gap-2.5 rounded-r-md rounded-l-none border-l-[3px] px-3 py-1.5 text-sm transition-colors",
        isActive
          ? "border-primary bg-primary/10 font-semibold text-primary"
          : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="leading-snug">{item.label}</span>
    </Link>
  );
}
