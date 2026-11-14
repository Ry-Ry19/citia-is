// components/landing/marquee-strip.tsx
//
// WHAT: A slim band under the hero with six short facts about the
//   service, drifting slowly from right to left.
//
// HOW THE SEAMLESS LOOP WORKS:
//   Two identical tracks sit side by side. Each one slides left by its
//   own full width (the "marquee-track" animation in globals.css). As
//   the first track leaves, the second is already filling the same
//   space, so the visitor never sees a jump when the animation
//   restarts.
//
// WHO SEES WHAT:
//   - Most visitors see the two moving tracks. They pause while a
//     pointer is over the band or a finger is pressing it.
//   - Visitors who have asked their device to reduce motion see one
//     still, centred row instead (the list below).
//   - Screen readers are given that same list once. The moving tracks
//     are hidden from them, so nothing is read twice.

import {
  ClipboardCheck,
  Gift,
  MapPin,
  Scale,
  Smartphone,
  UserRoundX,
} from "lucide-react";

const facts = [
  { icon: UserRoundX, label: "No account needed" },
  { icon: Gift, label: "Free to use" },
  { icon: Smartphone, label: "Works with your phone camera" },
  { icon: ClipboardCheck, label: "Every report is reviewed by CENRO" },
  { icon: Scale, label: "The AI suggests, CENRO decides" },
  { icon: MapPin, label: "Made for Iligan City" },
];

/** One full pass of the band, in seconds. Higher is slower. */
const LOOP_SECONDS = 50;

const factClass =
  "inline-flex shrink-0 items-center gap-2.5 text-[0.9375rem] font-medium";

// One row of facts — used once in each moving track.
function FactRow() {
  return (
    <>
      {facts.map((fact) => (
        <span key={fact.label} className={`${factClass} mx-7`}>
          <fact.icon className="h-[1.125rem] w-[1.125rem] shrink-0" />
          {fact.label}
        </span>
      ))}
    </>
  );
}

export function MarqueeStrip() {
  return (
    <section
      aria-label="About this service"
      className="group overflow-hidden bg-primary py-3.5 text-primary-foreground"
    >
      {/* The still list: read by screen readers always, and shown to
          everyone who has asked for reduced motion. */}
      <ul className="sr-only m-0 list-none flex-wrap items-center justify-center gap-x-10 gap-y-2 px-6 motion-reduce:not-sr-only motion-reduce:flex">
        {facts.map((fact) => (
          <li key={fact.label} className={factClass}>
            <fact.icon
              className="h-[1.125rem] w-[1.125rem] shrink-0"
              aria-hidden="true"
            />
            {fact.label}
          </li>
        ))}
      </ul>

      {/* The moving band. The mask fades the facts out at both edges. */}
      <div
        aria-hidden="true"
        className="flex w-max [mask-image:linear-gradient(to_right,transparent,black_6rem,black_calc(100%-6rem),transparent)] motion-reduce:hidden"
      >
        {[0, 1].map((track) => (
          <div
            key={track}
            style={{ animationDuration: `${LOOP_SECONDS}s` }}
            className="inline-flex shrink-0 animate-marquee-track whitespace-nowrap group-hover:[animation-play-state:paused] group-active:[animation-play-state:paused]"
          >
            <FactRow />
          </div>
        ))}
      </div>
    </section>
  );
}
