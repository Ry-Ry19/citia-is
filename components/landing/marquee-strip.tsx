"use client";

import {
  Leaf,
  MapPin,
  BookOpen,
  LayoutDashboard,
  BrainCircuit,
  ClipboardList,
  ShieldCheck,
  Smartphone,
  TreePine,
  FileText,
  Users,
  Bell,
} from "lucide-react";

const badges = [
  { icon: Leaf, label: "AI Tree Identification" },
  { icon: MapPin, label: "Report a Sighting" },
  { icon: BookOpen, label: "Species Guide" },
  { icon: LayoutDashboard, label: "CENRO Dashboard" },
  { icon: BrainCircuit, label: "YOLOv8 Powered" },
  { icon: ClipboardList, label: "Management Recommendations" },
  { icon: FileText, label: "Ecological Impact Info" },
  { icon: ShieldCheck, label: "Free Community Access" },
  { icon: TreePine, label: "Mahogany Detection" },
  { icon: Users, label: "Centralized Records" },
  { icon: Bell, label: "CENRO Backed" },
  { icon: Smartphone, label: "Mobile Friendly" },
];

// Single row of badges — reused in both tracks
function BadgeRow({ prefix }: { prefix: string }) {
  return (
    <>
      {badges.map((badge, index) => (
        <span
          key={`${prefix}-${index}`}
          className="mx-8 inline-flex shrink-0 items-center gap-2 text-xs font-medium tracking-wide text-stone-300"
        >
          <badge.icon className="h-3.5 w-3.5 shrink-0 text-primary" />
          {badge.label}
          <span className="ml-6 text-stone-600">·</span>
        </span>
      ))}
    </>
  );
}

export function MarqueeStrip() {
  return (
    <div
      style={{
        overflow: "hidden",
        width: "100%",
        backgroundColor: "#1c1917",
        paddingTop: "14px",
        paddingBottom: "14px",
      }}
    >
      {/*
        HOW SEAMLESS LOOP WORKS WITH TWO DIVS:

        Both Track1 and Track2 are identical.
        They sit side by side inside a flex container.
        Track1 animates from 0 to -100% of its own width.
        As Track1 exits left, Track2 is already filling
        the exact same space from the right.
        When Track1 resets to 0, it snaps back behind Track2
        which has taken its place — user never sees the jump.

        This is more reliable than -50% on one long div
        because each track is self-contained and the
        browser measures each independently.
      */}
      <div
        style={{
          display: "flex",
          width: "max-content",
        }}
      >
        {/* Track 1 — animates left */}
        <div
          style={{
            display: "inline-flex",
            whiteSpace: "nowrap",
            flexShrink: 0,
            animation: "marquee-track 30s linear infinite",
          }}
        >
          <BadgeRow prefix="track1" />
        </div>

        {/* Track 2 — identical clone, creates seamless fill */}
        <div
          style={{
            display: "inline-flex",
            whiteSpace: "nowrap",
            flexShrink: 0,
            animation: "marquee-track 30s linear infinite",
          }}
        >
          <BadgeRow prefix="track2" />
        </div>
      </div>
    </div>
  );
}
