// components/landing/features-strip.tsx
//
// WHAT: Horizontally scrollable feature icons
// CONCEPTS:
//   overflow-x-auto — enables horizontal scroll on mobile
//   scrollbar-hide  — hides scrollbar (defined in globals.css)
//   group-hover     — hover effect on parent affects children
//   dark: prefix    — dark mode variants via Tailwind

import Link from "next/link";
import {
  Leaf,
  MapPin,
  BookOpen,
  LayoutDashboard,
  BrainCircuit,
  ClipboardList,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

const features = [
  { icon: Leaf, label: "Identify a Tree", href: "/identify" },
  { icon: MapPin, label: "Report Sighting", href: "/report" },
  { icon: BookOpen, label: "Species Guide", href: "/species" },
  { icon: LayoutDashboard, label: "CENRO Dashboard", href: "/admin/login" },
  { icon: BrainCircuit, label: "YOLOv8 Detection", href: "/identify" },
  { icon: ClipboardList, label: "Ecological Info", href: "/species" },
  { icon: ShieldCheck, label: "CENRO Backed", href: "/" },
  { icon: Smartphone, label: "Mobile Friendly", href: "/" },
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
          No account required. All community features are freely accessible.
        </p>
      </div>

      {/* Horizontal scroll container */}
      <div className="mx-auto max-w-5xl overflow-x-auto scrollbar-hide pb-2">
        <div className="flex gap-4 w-max px-2 mx-auto">
          {features.map((feature) => (
            <Link
              key={feature.label}
              href={feature.href}
              className="group flex flex-col items-center gap-3 w-28 shrink-0"
            >
              {/*
                Icon box
                bg-card       — white in light, dark surface in dark mode
                border-border — uses CSS variable, auto dark mode
                group-hover   — parent hover triggers child color change
              */}
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 group-hover:border-primary/40 group-hover:shadow-md">
                <feature.icon className="h-8 w-8 text-muted-foreground transition-colors duration-200 group-hover:text-primary" />
              </div>

              {/*
                text-muted-foreground — readable in both light and dark
                group-hover:text-primary — highlights on hover
              */}
              <span className="text-center text-xs font-medium leading-tight text-muted-foreground transition-colors duration-200 group-hover:text-primary">
                {feature.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
