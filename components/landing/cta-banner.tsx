// components/landing/cta-banner.tsx
//
// WHAT: Final call-to-action section before the footer
// LAYOUT: A field of vertically-scrolling label chips runs behind
//   the CTA text — same "logo wall" pattern as the Fortune 100
//   reference, built from CITIA-IS's own vocabulary.
// CONCEPTS:
//   Margin-based uniform tiling — fixes a real seam-drift bug.
//     Using container `gap` between doubled marquee items creates
//     (2N-1) gaps across 2N items, so 50% height ≠ exactly one
//     copy's height — causing a visible "jump" every loop. Giving
//     EVERY item its own mb-* (including the last) makes each item
//     occupy identical "height + margin," so N items always equal
//     exactly half of 2N items — translateY(-50%) lands perfectly.
//   Tiered responsive columns — 3 on mobile, 5 on tablet, 6 on
//     desktop, via a small visibility lookup table (same Record
//     pattern as StatusBadge's variant lookup).
//   Outline-variant override — variant="outline" bakes in an
//     opaque bg-background and a hover:text-foreground flip. Both
//     had to be explicitly overridden, or light text on a light
//     background stays invisible until hovered.

import Link from "next/link";
import { ArrowRight, TreePine, Leaf, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MarqueeItem {
  icon: LucideIcon;
  label: string;
}

const marqueeItems: MarqueeItem[] = [
  { icon: Leaf, label: "Mahogany" },
  { icon: ShieldCheck, label: "Invasive Species" },
  { icon: TreePine, label: "CENRO Iligan City" },
  { icon: Leaf, label: "Native Forests" },
  { icon: ShieldCheck, label: "Community Reports" },
  { icon: TreePine, label: "Ecological Balance" },
  { icon: Leaf, label: "YOLOv8 Detection" },
  { icon: ShieldCheck, label: "Protect Our Trees" },
];

type ColumnVisibility = "always" | "sm" | "lg";

const visibilityClasses: Record<ColumnVisibility, string> = {
  always: "",
  sm: "hidden sm:block",
  lg: "hidden lg:block",
};

// 3 columns visible on mobile (always), 5 from sm+, all 6 from lg+
const columns: {
  reverse: boolean;
  duration: string;
  visibility: ColumnVisibility;
}[] = [
  { reverse: false, duration: "22s", visibility: "always" },
  { reverse: true, duration: "18s", visibility: "sm" },
  { reverse: false, duration: "26s", visibility: "always" },
  { reverse: true, duration: "20s", visibility: "sm" },
  { reverse: false, duration: "24s", visibility: "always" },
  { reverse: true, duration: "19s", visibility: "lg" },
];

function MarqueeColumn({
  reverse,
  duration,
  visibility,
}: {
  reverse: boolean;
  duration: string;
  visibility: ColumnVisibility;
}) {
  return (
    <div
      className={`w-28 shrink-0 overflow-hidden sm:w-32 lg:w-40 ${visibilityClasses[visibility]}`}
    >
      <div
        className="flex flex-col"
        style={{
          animationName: "marquee-vertical",
          animationDuration: duration,
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {[...marqueeItems, ...marqueeItems].map((item, index) => (
          <div
            key={index}
            className="mb-10 flex flex-col items-center gap-1 text-center"
          >
            <item.icon className="h-20 w-20 text-primary-foreground/50" />
            <span className="text-sm font-medium leading-tight text-primary-foreground/50">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CTABanner() {
  return (
    <section className="relative overflow-hidden bg-primary px-6 py-20 text-center">
      {/* Decorative vertical marquee field */}
      <div
        className="pointer-events-none absolute inset-0 flex justify-center gap-6 sm:gap-8 lg:gap-10"
        aria-hidden="true"
      >
        {columns.map((col, index) => (
          <MarqueeColumn key={index} {...col} />
        ))}
      </div>

      {/* Dimming tint */}
      <div
        className="pointer-events-none absolute inset-0 bg-primary/70"
        aria-hidden="true"
      />

      {/* Edge fades */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-primary to-transparent"
        aria-hidden="true"
      />

      {/* Real content */}
      <div className="relative z-10 mx-auto max-w-2xl">
        <TreePine className="mx-auto mb-4 h-10 w-10 text-primary-foreground/70" />

        <h2 className="text-2xl font-bold text-primary-foreground sm:text-3xl">
          Help Protect Iligan City&apos;s Ecosystem
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-primary-foreground/80">
          Every identification and report helps CENRO monitor and manage
          invasive Mahogany before it spreads further into native forests.
        </p>

        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            render={<Link href="/identify" />}
            nativeButton={false}
            size="lg"
            variant="secondary"
            className="bg-primary-foreground"
          >
            Start Identifying
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <Button
            render={<Link href="/report" />}
            nativeButton={false}
            size="lg"
            variant="outline"
            className="bg-transparent text-primary-foreground"
          >
            Submit a Report
          </Button>
        </div>
      </div>
    </section>
  );
}
