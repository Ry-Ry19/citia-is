// components/landing/features-strip.tsx
//
// WHAT: Responsive grid of descriptive feature cards (title + icon +
//   one-sentence description), replacing the old bare-icon scroll row.
// CONCEPTS:
//   Responsive grid       — grid-cols-1 → sm:grid-cols-2 → lg:grid-cols-4
//   group-hover            — parent hover drives icon/text color together
//   Public vs admin cueing — an "Admin" badge marks staff-only cards so
//                            guest users never wonder what they can click
//
// TOKEN NOTE: the icon circle uses bg-primary/10 (a 10%-opacity tint of
//   --primary) instead of separate light/dark hardcoded hex values.
//   Opacity modifiers on a token automatically produce the right tone
//   in both themes — no dark: variant needed, and no arbitrary colors.
//
// CONTENT NOTE: consolidated from 8 items down to the 4 that represent
//   genuinely distinct actions (the other 4 in the old list — YOLOv8
//   Detection, Ecological Info, CENRO Backed, Mobile Friendly — were
//   restating these same 4 ideas). Flag if you'd rather keep all 8.

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Leaf, MapPin, BookOpen, LayoutDashboard, Lock } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  adminOnly?: boolean;
}

const features: Feature[] = [
  {
    icon: Leaf,
    title: "AI Identification",
    description: "Upload a leaf photo for instant YOLOv8 Mahogany detection.",
    href: "/identify",
  },
  {
    icon: MapPin,
    title: "Community Reporting",
    description: "Log tree coordinates directly to notify local authorities.",
    href: "/report",
  },
  {
    icon: BookOpen,
    title: "Ecological Insights",
    description: "Access guidance on invasive impacts and tree management.",
    href: "/species",
  },
  {
    icon: LayoutDashboard,
    title: "CENRO Monitoring",
    description: "Centralized dashboard for verification and field records.",
    href: "/admin/login",
    adminOnly: true,
  },
];

export function FeaturesStrip() {
  return (
    <section id="features-strip" className="bg-muted py-14 px-6">
      {/* Heading */}
      <div className="mx-auto mb-10 max-w-5xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          What CITIA-IS Offers
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Everything Your Community Needs
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No account required for community features &mdash; CENRO staff sign in
          separately.
        </p>
      </div>

      {/* Feature card grid */}
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <Link
            key={feature.title}
            href={feature.href}
            className="group relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
          >
            {/* Admin badge — only rendered for staff-only cards, so
                guest users get a clear visual cue before clicking */}
            {feature.adminOnly && (
              <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Lock className="h-2.5 w-2.5" />
                Admin
              </span>
            )}

            {/* Icon circle — bg-primary/10 = a soft tint of the brand
                green, correct in both light and dark mode automatically */}
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors duration-300 group-hover:bg-primary/15">
              <feature.icon className="h-6 w-6 text-primary" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
