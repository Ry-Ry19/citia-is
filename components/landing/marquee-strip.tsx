"use client";

import { Zap, MapPinned, Landmark, Sprout, Lock, Globe } from "lucide-react";

const badges = [
  { icon: Zap, label: "Instant AI Inference — YOLOv8" },
  { icon: MapPinned, label: "GIS-Enabled Community Sighting" },
  { icon: Landmark, label: "CENRO Iligan Decision Support" },
  { icon: Sprout, label: "Built for Citizen Science" },
  { icon: Lock, label: "No Account Required for Public Use" },
  { icon: Globe, label: "Tailored for Philippine Environmental Management" },
];

// Single row of badges — reused in both tracks
function BadgeRow({ prefix }: { prefix: string }) {
  return (
    <>
      {badges.map((badge, index) => (
        <span
          key={`${prefix}-${index}`}
          className="mx-8 inline-flex shrink-0 items-center gap-3 text-xs font-bold tracking-wide text-stone-300"
        >
          <badge.icon className="h-6 w-6 shrink-0 text-primary" />
          {badge.label}
          <span className="ml-6 text-white/25">&middot;</span>
        </span>
      ))}
    </>
  );
}

export function MarqueeStrip() {
  return (
    <div
      className="group relative w-full overflow-hidden bg-[#1c1917] py-6"
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
      <div className="flex w-max">
        {/* Track 1 — animates left. group-hover pauses BOTH tracks
            together since they share the parent's `group` class. */}
        <div className="inline-flex flex-shrink-0 animate-marquee-track whitespace-nowrap group-hover:[animation-play-state:paused]">
          <BadgeRow prefix="track1" />
        </div>

        {/* Track 2 — identical clone, creates seamless fill */}
        <div className="inline-flex flex-shrink-0 animate-marquee-track whitespace-nowrap group-hover:[animation-play-state:paused]">
          <BadgeRow prefix="track2" />
        </div>
      </div>
    </div>
  );
}
