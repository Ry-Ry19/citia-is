// components/common/status-badge.tsx
//
// WHAT: A small pill for status/classification labels
// WHY EXTRACTED: the exact same "status pill" pattern was needed
//   in three places (species classification, hazard level, report
//   status) — rather than copy-pasting the same conditional class
//   logic each time, it lives here once and gets imported everywhere.
// CONCEPT: Record<K, V> — a typed lookup table. Instead of an
//   if/else chain checking each possible variant, this maps every
//   variant name directly to its class string, so adding a new
//   variant later is a one-line addition, not a new branch.
//
// HOW IT READS: the label is always in the normal text colour, so it
//   is readable in both themes. The status colour is carried by the
//   dot beside it. (Amber text on a pale background was too faint.)

type BadgeVariant = "destructive" | "success" | "warning";

interface StatusBadgeProps {
  label: string;
  variant: BadgeVariant;
}

const dotClasses: Record<BadgeVariant, string> = {
  destructive: "bg-destructive",
  success: "bg-success",
  warning: "bg-warning",
};

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2.5 py-0.5 text-sm font-medium text-foreground">
      <span
        aria-hidden="true"
        className={`h-2 w-2 shrink-0 rounded-full ${dotClasses[variant]}`}
      />
      {label}
    </span>
  );
}
