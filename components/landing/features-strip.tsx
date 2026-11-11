// components/landing/features-strip.tsx
//
// WHAT: The "How CITIA-IS Helps" section of the landing page — four
//   feature plates, each built around a real photograph taken for this
//   project.
//
// WHY IT IS BUILT THIS WAY:
//   The four features are the heart of the landing page, so they are
//   presented as field-guide "plates" instead of four identical icon
//   tiles. Every plate leads with a photograph, and every photograph
//   reacts to the visitor in a way that matches what the feature
//   actually does:
//
//     01 IDENTIFY — a scanning frame with a sweep line, the same idea
//                   as the camera scanner on /identify.
//     02 REPORT   — a location ping that expands out of a pin, the way
//                   a sighting travels out into the community.
//     03 SPECIES  — a survey crosshair, the way a field team measures.
//     04 ACCESS   — a band of light that glides across the picture, so
//                   the photograph simply breathes.
//
//   The grid is deliberately uneven (5 / 7 / 4 / 3 of twelve columns)
//   so the section does not read as a template.
//
// TEXT ON PHOTOGRAPHS: the captions sit on top of images whose
//   brightness cannot be predicted, so they use literal white rather
//   than a theme token — the same rule the hero section follows.

"use client";

import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import type { StaticImageData } from "next/image";
import { ArrowRight, Check, Lock, MapPin } from "lucide-react";

// The four photographs are imported rather than written as string
// paths so that Next.js can work out their size and build a small
// blurred preview for each one. The preview is what the visitor sees
// for the moment it takes the real picture to arrive, instead of an
// empty panel.
import leafPhoto from "@/public/assets/images/mahogany.jpg";
import fieldPhoto from "@/public/assets/images/field-documentation.jpg";
import understoryPhoto from "@/public/assets/images/ecological-impact.jpg";
import canopyPhoto from "@/public/assets/images/mahogany-forest.jpg";

/**
 * The overlay drawn on top of a plate's photograph.
 *
 * - "scan"   a targeting frame with a line that sweeps down it
 * - "ping"   concentric rings expanding out of a location pin
 * - "survey" a crosshair with a measurement circle
 * - "sheen"  a band of soft light that glides across the picture
 */
type PlateMark = "scan" | "ping" | "survey" | "sheen";

interface CommunityFeature {
  /** Plate number shown in the caption line under the picture. */
  index: string;
  /** Short mono label shown next to the plate number. */
  kicker: string;
  title: string;
  description: string;
  /** Where the plate leads. Omitted for the "no account" note. */
  href?: string;
  action?: string;
  image: StaticImageData;
  alt: string;
  /** Caption that slides up over the photograph on hover. */
  caption: string;
  mark: PlateMark;
  /** Grid placement on large screens. */
  span: string;
  /** How the photograph is sized inside the plate. */
  photoClass: string;
  /** How the text block is sized inside the plate. */
  bodyClass: string;
  /** The `sizes` hint for the Next.js image loader. */
  sizes: string;
}

const communityFeatures: CommunityFeature[] = [
  {
    index: "01",
    kicker: "Identify",
    title: "Identify a Tree",
    description:
      "Take or upload a leaf photo to check whether it may be Mahogany.",
    href: "/identify",
    action: "Identify a Tree",
    image: leafPhoto,
    alt: "Mahogany leaves on a plain background, shown as an illustration of the leaf shape.",
    caption: "Pinnate compound leaf",
    mark: "scan",
    span: "lg:col-span-5 lg:row-span-2",
    // The lead plate fills the two rows it spans, so its photograph
    // takes the leftover height and the words stay compact.
    photoClass: "relative isolate flex-1 min-h-[420px] overflow-hidden",
    bodyClass: "flex shrink-0 flex-col p-6",
    sizes: "(max-width: 1023px) 100vw, 42vw",
  },
  {
    index: "02",
    kicker: "Report",
    title: "Report a Sighting",
    description:
      "Share a photo and location to help document Mahogany sightings in your community.",
    href: "/report",
    action: "Report a Sighting",
    image: fieldPhoto,
    alt: "Two people measuring and documenting a large tree in a forest.",
    caption: "On-site documentation",
    mark: "ping",
    span: "lg:col-span-7",
    photoClass: "relative isolate h-[280px] overflow-hidden",
    bodyClass: "flex flex-1 flex-col p-6",
    sizes: "(max-width: 1023px) 100vw, 58vw",
  },
  {
    index: "03",
    kicker: "Species",
    title: "Learn About Mahogany",
    description:
      "Explore how to recognize Mahogany, learn about its ecological impact, and read Management Recommendations.",
    href: "/species",
    action: "Explore Species Guide",
    image: understoryPhoto,
    alt: "Rows of straight tree trunks in a plantation stand with a cleared forest floor between them.",
    caption: "Cleared forest floor",
    mark: "survey",
    span: "lg:col-span-4",
    photoClass: "relative isolate h-[230px] overflow-hidden",
    bodyClass: "flex flex-1 flex-col p-6",
    sizes: "(max-width: 1023px) 100vw, 34vw",
  },
  {
    index: "04",
    kicker: "Access",
    title: "Free and Easy to Use",
    description:
      "Explore CITIA-IS community features without creating an account.",
    image: canopyPhoto,
    alt: "A dense stand of Mahogany trees with a bright green canopy.",
    caption: "Mahogany canopy",
    mark: "sheen",
    span: "lg:col-span-3",
    photoClass: "relative isolate h-[230px] overflow-hidden",
    bodyClass: "flex flex-1 flex-col p-6",
    sizes: "(max-width: 1023px) 100vw, 25vw",
  },
];

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
    <section id="features-strip" aria-labelledby="features-heading" className="scroll-mt-24 bg-background px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">How CITIA-IS Helps</p>
            <h2 id="features-heading" className="section-title mt-3 font-bold text-foreground">
              Helping Our Community Understand and Protect Nature
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Learn about Mahogany trees, check a leaf photo, and share sightings to help document trees in your community.
            </p>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Four ways to take part
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {communityFeatures.map((feature) => {
            const plate = (
              <>
                {/* ── The picture ─────────────────────────────── */}
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
                        alt={feature.alt}
                        fill
                        sizes={feature.sizes}
                        placeholder="blur"
                        className="scale-[1.05] object-cover transition-transform duration-700 ease-out group-hover:scale-[1.12]"
                      />
                    </div>
                  </div>

                  {/* The grade that ties the four photographs together
                      and sets them apart from the colour photographs
                      used elsewhere on the page.

                      Both layers use mix-blend-color, which takes the
                      colour of the layer on top and the lightness of
                      what is underneath. A neutral grey on top
                      therefore takes the colour out of the
                      photograph, and the brand green on top of that
                      puts the green back in. Keeping the grade on
                      separate layers (rather than on the image
                      itself) means the picture can still be zoomed
                      by the GPU without being redrawn every frame.

                      Both layers lift on hover, so the photograph
                      comes back to life in full colour. */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-neutral-400/45 mix-blend-color transition-opacity duration-500 group-hover:opacity-0"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-primary/35 mix-blend-color transition-opacity duration-500 group-hover:opacity-0"
                  />

                  {/* The mark that belongs to this feature. */}
                  <PlateMarkOverlay mark={feature.mark} />

                  {/* Caption strip. Literal white, because the
                      photograph underneath can be any brightness. */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-black/90 via-black/45 to-transparent"
                  />
                  <p
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-1 px-5 pb-4 font-mono text-[10px] uppercase tracking-[0.28em] text-white opacity-0 transition-all duration-500 [text-shadow:0_1px_8px_rgba(0,0,0,0.9)] group-hover:translate-y-0 group-hover:opacity-100"
                  >
                    {feature.caption}
                  </p>
                </div>

                {/* ── The words ──────────────────────────────── */}
                <div className={feature.bodyClass}>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold tracking-[0.2em] text-primary">
                      {feature.index}
                    </span>
                    <span aria-hidden="true" className="h-px flex-1 bg-border" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      {feature.kicker}
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>

                  {feature.action ? (
                    <span className="mt-auto inline-flex min-h-11 items-center gap-2 pt-6 text-sm font-semibold text-primary">
                      {feature.action}
                      <ArrowRight
                        className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  ) : (
                    <span className="mt-auto inline-flex min-h-11 items-center gap-2 pt-6 text-sm font-semibold text-muted-foreground">
                      <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                      No account required
                    </span>
                  )}
                </div>
              </>
            );

            const shell =
              "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors duration-300 hover:border-primary/40";

            return feature.href ? (
              <Link
                key={feature.index}
                href={feature.href}
                className={`focus-ring ${shell} ${feature.span}`}
              >
                {plate}
              </Link>
            ) : (
              <article key={feature.index} className={`${shell} ${feature.span}`}>
                {plate}
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">For CENRO Staff</h3>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Review submitted sightings and manage environmental monitoring records through the staff portal.
              </p>
            </div>
          </div>
          <Link href="/admin/login" className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary">
            Staff Login<ArrowRight className="h-4 w-4" aria-hidden="true" />
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
 */
function PlateMarkOverlay({ mark }: { mark: PlateMark }) {
  if (mark === "scan") {
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 drop-shadow-[0_0_3px_rgba(0,0,0,0.55)]">
        <span className="absolute inset-[14px] border border-primary/25" />
        <span className="absolute left-[14px] top-[14px] h-6 w-6 border-l-2 border-t-2 border-primary" />
        <span className="absolute right-[14px] top-[14px] h-6 w-6 border-r-2 border-t-2 border-primary" />
        <span className="absolute bottom-[14px] left-[14px] h-6 w-6 border-b-2 border-l-2 border-primary" />
        <span className="absolute bottom-[14px] right-[14px] h-6 w-6 border-b-2 border-r-2 border-primary" />
        <span className="plate-scan absolute left-[14px] right-[14px] h-px bg-primary shadow-[0_0_16px_3px_rgba(16,185,129,0.45)]" />
      </div>
    );
  }

  if (mark === "ping") {
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center drop-shadow-[0_0_3px_rgba(0,0,0,0.6)]">
        <span className="plate-ping absolute h-24 w-24 rounded-full border border-primary/70" />
        <span className="plate-ping absolute h-24 w-24 rounded-full border border-primary/40 [animation-delay:1.1s]" />
        <span className="plate-ping absolute h-24 w-24 rounded-full border border-primary/25 [animation-delay:2.2s]" />
        <MapPin className="relative h-7 w-7 text-primary drop-shadow-[0_2px_6px_rgba(0,0,0,0.75)]" />
      </div>
    );
  }

  if (mark === "survey") {
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 drop-shadow-[0_0_3px_rgba(0,0,0,0.6)]">
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-primary/40" />
        <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-primary/40" />
        <span className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/60" />
        <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-primary" />
      </div>
    );
  }

  if (mark === "sheen") {
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="plate-sheen absolute -inset-y-1/3 left-0 w-1/3 rotate-12 bg-linear-to-r from-transparent via-white/20 to-transparent" />
      </div>
    );
  }

  return null;
}
