// components/landing/marquee-strip.tsx
//
// WHAT: Auto-scrolling horizontal strip of system features
// USES: Lucide React icons — consistent with the rest of the app
// CONCEPT: Content duplicated for seamless CSS animation loop

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

// Each badge has an icon component and a label
// Icon is stored as a component reference — rendered as <item.icon />
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

export function MarqueeStrip() {
  return (
    // overflow-hidden clips content that animates outside bounds
    <div className="overflow-hidden bg-stone-800 py-3.5">
      {/*
        animate-marquee — defined in globals.css @layer utilities
        whitespace-nowrap — prevents wrapping to next line
        flex — lays all badges in a horizontal row
      */}
      <div className="flex animate-marquee whitespace-nowrap">
        {/*
          Spread badges twice: [...badges, ...badges]
          First copy scrolls left → second copy fills the gap
          When animation resets, user never sees the jump
        */}
        {[...badges, ...badges].map((badge, index) => (
          <span
            key={index}
            // inline-flex keeps icon and text on same line
            className="mx-8 inline-flex items-center gap-2 text-xs font-medium tracking-wide text-stone-300"
          >
            {/* Lucide icon — h-3.5 w-3.5 matches text-xs size */}
            <badge.icon className="h-3.5 w-3.5 text-primary flex-shrink-0" />

            {badge.label}

            {/* Separator dot */}
            <span className="ml-6 text-stone-600">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
