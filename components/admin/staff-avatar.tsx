// components/admin/staff-avatar.tsx
//
// WHAT: The signed-in staff member's identity for the portal header and
//   sidebar, and their profile picture.
//
// PICTURE: CITIA-IS stores no staff photos, so the picture is the staff
//   member's initials in a coloured circle, made from their name. Nothing
//   is uploaded or fetched from another service. Uploaded photos could be
//   added later with AvatarImage, keeping the initials as the fallback.

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface StaffIdentity {
  email: string;
  fullName: string;
  role: "administrator" | "cenro_staff";
}

export const ROLE_LABELS: Record<StaffIdentity["role"], string> = {
  administrator: "Administrator",
  cenro_staff: "CENRO Staff",
};

/** "Ryan Recososa" → "RR", "Maria" → "MA", no name → first letter of the email. */
export function staffInitials(staff: StaffIdentity): string {
  const words = staff.fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (staff.email[0] ?? "?").toUpperCase();
}

export function StaffAvatar({
  staff,
  size = "default",
  className,
}: {
  staff: StaffIdentity;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  return (
    // Decorative: the name is always shown or announced next to it.
    <Avatar size={size} className={className} aria-hidden="true">
      <AvatarFallback className="bg-primary/15 text-xs font-bold text-primary">
        {staffInitials(staff)}
      </AvatarFallback>
    </Avatar>
  );
}

/** Name and role, used beside the avatar. */
export function StaffNameplate({ staff, className }: { staff: StaffIdentity; className?: string }) {
  return (
    <span className={cn("flex min-w-0 flex-col leading-tight", className)}>
      <span className="truncate text-xs font-semibold text-foreground">{staff.fullName}</span>
      <span className="truncate text-xs text-muted-foreground">
        {ROLE_LABELS[staff.role]} · CENRO Iligan City
      </span>
    </span>
  );
}
