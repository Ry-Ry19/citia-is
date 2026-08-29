// components/common/status-badge.tsx
//
// WHAT: A small colored pill for status/classification labels
// WHY EXTRACTED: the exact same "colored pill" pattern was needed
//   in three places (species classification, hazard level, report
//   status) — rather than copy-pasting the same conditional class
//   logic each time, it lives here once and gets imported everywhere.
// CONCEPT: Record<K, V> — a typed lookup table. Instead of an
//   if/else chain checking each possible variant, this maps every
//   variant name directly to its class string, so adding a new
//   variant later is a one-line addition, not a new branch.

type BadgeVariant = "destructive" | "success" | "warning";

interface StatusBadgeProps {
  label: string;
  variant: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  destructive: "bg-foreground/10 text-destructive",
  success: "bg-foreground/10 text-success",
  warning: "bg-foreground/10 text-warning",
};

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${variantClasses[variant]}`}
    >
      {label}
    </span>
  );
}