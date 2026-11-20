// components/landing/features-strip.tsx
//
// WHAT: The "How CITIA-IS helps" section of the landing page — four
//   plates, each built around a photograph, followed by the entry
//   point for CENRO staff.
//
// WHY IT IS BUILT THIS WAY:
//   Every plate leads with a picture, and every picture carries a
//   small drawn mark that matches what the feature does:
//
//     Identify — a scanning frame with a sweep line, the same idea as
//                the camera scanner on /identify.
//     Report   — a location ping that expands out of a pin, the way a
//                sighting travels out to CENRO.
//     Species  — a survey crosshair with a slowly turning measuring
//                ring, the way a field team measures.
//     Access   — a band of light that glides across the picture.
//
//   A mark only moves while its own plate is pointed at (or has
//   keyboard focus). On phones and tablets, which have no pointer, the
//   marks keep moving. Visitors who ask for reduced motion see them
//   still (the rule for that is in globals.css).
//
//   The grid is deliberately uneven (5 / 7 / 4 / 3 of twelve columns)
//   so the lead plate is the largest.
//
// PHOTO SLOTS:
//   A plate either has a photograph (`image`) or is waiting for one
//   (`awaiting`). A waiting plate shows a tinted panel that says which
//   photograph belongs there. To fill a slot, save the picture in
//   public/assets/images, import it below, and give the plate an
//   `image` and `alt` instead of `awaiting`.
//
// TEXT AND MARKS ON PHOTOGRAPHS: these sit on images whose brightness
//   cannot be predicted, so they use literal white rather than a theme
//   token. On a waiting plate the mark uses the primary colour instead.

"use client";

import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import type { StaticImageData } from "next/image";
import {
  BookOpen,
  Check,
  HandHeart,
  ImagePlus,
  Lock,
  MapPin,
  MapPinned,
  ScanLine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Photographs are imported rather than written as string paths so that
// Next.js can work out their size and build a small blurred preview
// for each one. The preview is what the visitor sees for the moment it
// takes the real picture to arrive, instead of an empty panel.
import fieldPhoto from "@/public/assets/images/field-documentation.jpg";
import canopyPhoto from "@/public/assets/images/mahogany-forest.jpg";

/**
 * The overlay drawn on top of a plate's picture.
 *
 * - "scan"   a targeting frame with a line that sweeps down it
 * - "ping"   concentric rings expanding out of a location pin
 * - "survey" a crosshair with a turning measurement ring
 * - "sheen"  a band of soft light that glides across the picture
 */
type PlateMark = "scan" | "ping" | "survey" | "sheen";

interface CommunityFeature {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Where the plate leads. Omitted for the "no account" note. */
  href?: string;
  action?: string;
  /** The photograph, when the plate has one. */
  image?: StaticImageData;
  alt?: string;
  /** Caption that slides up over the photograph on hover. */
  caption?: string;
  /** For a plate with no photograph yet: which picture belongs here. */
  awaiting?: string;
  mark: PlateMark;
  /** Grid placement on large screens. */
  span: string;
  /** How the picture is sized inside the plate. */
  photoClass: string;
  /** The `sizes` hint for the Next.js image loader. */
  sizes: string;
}

const communityFeatures: CommunityFeature[] = [
  {
    icon: ScanLine,
    title: "Identify a Tree",
    description:
      "Take or upload a leaf photo to check whether it may be Mahogany.",
    href: "/identify",
    action: "Identify a Tree",
    awaiting: "Someone photographing a leaf with a phone",
    mark: "scan",
    span: "lg:col-span-5 lg:row-span-2",
    // The lead plate fills the two rows it spans, so its picture takes
    // the leftover height and the words stay compact.
    photoClass: "relative isolate min-h-[300px] flex-1 overflow-hidden lg:min-h-[420px]",
    sizes: "(max-width: 1023px) 100vw, 42vw",
  },
  {
    icon: MapPinned,
    title: "Report a Sighting",
    description:
      "Share a photo and location to help document Mahogany sightings in your community.",
    href: "/report",
    action: "Report a Sighting",
    image: fieldPhoto,
    alt: "Two people measuring and documenting a large tree in a forest.",
    caption: "Documenting a tree on site",
    mark: "ping",
    span: "lg:col-span-7",
    photoClass: "relative isolate h-[260px] overflow-hidden",
    sizes: "(max-width: 1023px) 100vw, 58vw",
  },
  {
    icon: BookOpen,
    title: "Learn about Mahogany",
    description:
      "Explore how to recognize Mahogany, learn about its ecological impact, and read Management Recommendations.",
    href: "/species",
    action: "Explore the Species Guide",
    awaiting: "A close view of Mahogany bark, fruit or seeds",
    mark: "survey",
    span: "lg:col-span-4",
    photoClass: "relative isolate h-[230px] overflow-hidden",
    sizes: "(max-width: 1023px) 100vw, 34vw",
  },
  {
    icon: HandHeart,
    title: "Free and easy to use",
    description:
      "Explore CITIA-IS community features without creating an account.",
    image: canopyPhoto,
    alt: "A dense stand of Mahogany trees with a bright green canopy.",
    caption: "Mahogany canopy",
    mark: "sheen",
    span: "lg:col-span-3",
    photoClass: "relative isolate h-[230px] overflow-hidden",
    sizes: "(max-width: 1023px) 100vw, 25vw",
  },
];

// A mark is paused until its own plate is hovered or focused. Devices
// with no pointer (phones, tablets) let it run.
// The "!" marks each rule as important. Without it, the plate-scan,
// plate-ping and plate-sheen classes in globals.css (which set the
// whole `animation` property) would switch the mark back to running.
const runsOnHover =
  "[animation-play-state:paused]! group-hover:[animation-play-state:running]! group-focus-visible:[animation-play-state:running]! [@media(hover:none)]:[animation-play-state:running]!";

export function FeaturesStrip() {
  // The photographs lean away from the pointer. The offset is written
  // straight onto the element as a CSS variable so that moving the
  // mouse never re-renders React.
  const reduceMotion = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");

    reduceMotion.current = query.matches;

    const onChange = () => {
      reduceMotion.current = query.matches;
    };

    query.addEventListener("change", onChange);

    return () => query.removeEventListener("change", onChange);
  }, []);

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (reduceMotion.current) {
      return;
    }

    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;

    event.currentTarget.style.setProperty("--plate-x", `${(x * 12).toFixed(2)}px`);
    event.currentTarget.style.setProperty("--plate-y", `${(y * 12).toFixed(2)}px`);
  }

  function handlePointerLeave(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty("--plate-x", "0px");
    event.currentTarget.style.setProperty("--plate-y", "0px");
  }

  return (
    <section
      id="features-strip"
      aria-labelledby="features-heading"
      className="scroll-mt-16 border-t border-border bg-background py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-[96rem] px-6 lg:px-10 xl:px-16 2xl:px-24">
        <h2 id="features-heading" className="section-title text-foreground">
          How CITIA-IS helps
        </h2>
        <p className="mt-5 max-w-[38rem] text-lg leading-relaxed text-foreground/85">
          Learn about Mahogany trees, check a leaf photo, and share sightings
          to help document trees in your community.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {communityFeatures.map((feature) => {
            const Icon = feature.icon;

            const plate = (
              <>
                {/* ── The picture ─────────────────────────────── */}
                {feature.image ? (
                  <div
                    className={feature.photoClass}
                    onPointerMove={handlePointerMove}
                    onPointerLeave={handlePointerLeave}
                  >
                    {/* The photograph leans away from the pointer. */}
                    <div
                      className="absolute inset-0 transition-transform duration-500 ease-out"
                      style={{
                        transform:
                          "translate3d(var(--plate-x, 0px), var(--plate-y, 0px), 0)",
                      }}
                    >
                      <div className="relative h-full w-full">
                        <Image
                          src={feature.image}
                          alt={feature.alt ?? ""}
                          fill
                          sizes={feature.sizes}
                          placeholder="blur"
                          className="scale-[1.05] object-cover transition-transform duration-700 ease-out group-hover:scale-[1.1]"
                        />
                      </div>
                    </div>

                    {/* The grade that ties the plate photographs together
                        and sets them apart from the colour photographs
                        used elsewhere on the page.

                        Both layers use mix-blend-color, which takes the
                        colour of the layer on top and the lightness of
                        what is underneath. A neutral grey on top
                        therefore takes the colour out of the photograph,
                        and the brand green on top of that puts the green
                        back in. Both layers lift on hover, so the
                        photograph comes back to life in full colour. */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-neutral-400/45 mix-blend-color transition-opacity duration-500 group-hover:opacity-0"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-primary/35 mix-blend-color transition-opacity duration-500 group-hover:opacity-0"
                    />

                    {/* The mark that belongs to this feature. */}
                    <div className="text-white">
                      <PlateMarkOverlay mark={feature.mark} onPhoto />
                    </div>

                    {/* Caption. Literal white on a dark fade, because the
                        photograph underneath can be any brightness. */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/80 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    />
                    <p
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-1 px-5 pb-4 text-sm font-medium text-white opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100"
                    >
                      {feature.caption}
                    </p>
                  </div>
                ) : (
                  // A plate that is waiting for its photograph.
                  <div className={`${feature.photoClass} bg-surface-tint`}>
                    <div className="text-primary/70">
                      <PlateMarkOverlay mark={feature.mark} />
                    </div>
                    {/* The label has the panel's own colour behind it,
                        so the lines of the mark never cross the words. */}
                    <p className="absolute bottom-7 left-7 right-7 flex w-fit items-start gap-2 rounded-md bg-surface-tint px-2 py-1.5 text-sm leading-snug text-muted-foreground">
                      <ImagePlus
                        className="mt-0.5 h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Photo to add: {feature.awaiting}</span>
                    </p>
                  </div>
                )}

                {/* ── The words ──────────────────────────────── */}
                {/* On the lead plate the picture takes the spare height,
                    so the words stay compact. On the others the words
                    stretch, which lines the action links up. */}
                <div
                  className={`flex flex-col p-6 ${
                    feature.mark === "scan" ? "shrink-0" : "flex-1"
                  }`}
                >
                  <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 text-xl font-bold leading-snug text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>

                  {feature.action ? (
                    <span className="mt-auto inline-flex min-h-11 items-center pt-5 text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4 group-hover:decoration-primary">
                      {feature.action}
                    </span>
                  ) : (
                    <span className="mt-auto inline-flex min-h-11 items-center gap-2 pt-5 text-sm font-semibold text-foreground">
                      <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                      No account required
                    </span>
                  )}
                </div>
              </>
            );

            const shell =
              "group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors duration-300 hover:border-primary/60";

            return feature.href ? (
              <Link
                key={feature.title}
                href={feature.href}
                className={`focus-ring ${shell} ${feature.span}`}
              >
                {plate}
              </Link>
            ) : (
              <article key={feature.title} className={`${shell} ${feature.span}`}>
                {plate}
              </article>
            );
          })}
        </div>

        {/* ── For CENRO staff ───────────────────────────────── */}
        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
          <div className="flex items-start gap-4">
            <Lock
              className="mt-1 h-5 w-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div>
              <h3 className="text-lg font-bold text-foreground">
                For CENRO staff
              </h3>
              <p className="mt-1 max-w-[38rem] text-base leading-relaxed text-muted-foreground">
                Review submitted sightings and manage environmental monitoring
                records through the staff portal.
              </p>
            </div>
          </div>
          <Link
            href="/admin/login"
            className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-foreground/30 px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            CENRO Staff Access
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Draws the small overlay that belongs to one plate.
 *
 * Every mark is decorative, so it is hidden from assistive technology.
 * It is drawn in the colour of the text around it (white on a
 * photograph, the primary colour on a waiting plate). `onPhoto` adds a
 * soft dark shadow so the white lines stay visible on bright pictures.
 */
function PlateMarkOverlay({
  mark,
  onPhoto = false,
}: {
  mark: PlateMark;
  onPhoto?: boolean;
}) {
  const shadow = onPhoto ? "drop-shadow-[0_0_3px_rgba(0,0,0,0.6)]" : "";

  if (mark === "scan") {
    return (
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${shadow}`}>
        <span className="absolute inset-4 border border-current opacity-30" />
        <span className="absolute left-4 top-4 h-6 w-6 border-l-2 border-t-2 border-current" />
        <span className="absolute right-4 top-4 h-6 w-6 border-r-2 border-t-2 border-current" />
        <span className="absolute bottom-4 left-4 h-6 w-6 border-b-2 border-l-2 border-current" />
        <span className="absolute bottom-4 right-4 h-6 w-6 border-b-2 border-r-2 border-current" />
        <span className={`plate-scan absolute left-4 right-4 h-0.5 bg-current ${runsOnHover}`} />
      </div>
    );
  }

  if (mark === "ping") {
    return (
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 grid place-items-center ${shadow}`}>
        <span className={`plate-ping absolute h-24 w-24 rounded-full border border-current ${runsOnHover}`} />
        <span className={`plate-ping absolute h-24 w-24 rounded-full border border-current [animation-delay:1.1s] ${runsOnHover}`} />
        <span className={`plate-ping absolute h-24 w-24 rounded-full border border-current [animation-delay:2.2s] ${runsOnHover}`} />
        <MapPin className="relative h-7 w-7" />
      </div>
    );
  }

  if (mark === "survey") {
    return (
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${shadow}`}>
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current opacity-40" />
        <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current opacity-40" />
        {/* The measuring ring. The outer box centres it; the inner
            ring is the part that turns. */}
        <span className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2">
          <span
            style={{ animationDuration: "28s" }}
            className={`block h-full w-full animate-spin rounded-full border border-dashed border-current ${runsOnHover}`}
          />
        </span>
        <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-current" />
      </div>
    );
  }

  if (mark === "sheen") {
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className={`plate-sheen absolute -inset-y-1/3 left-0 w-1/3 rotate-12 bg-linear-to-r from-transparent via-white/25 to-transparent ${runsOnHover}`} />
      </div>
    );
  }

  return null;
}
