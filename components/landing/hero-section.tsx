// components/landing/hero-section.tsx
//
// WHAT: The opening of the landing page — a question ("Is that tree a
//   Mahogany?"), the two community actions, and the project's own
//   Mahogany leaf photograph with three numbered pointers that show
//   how to recognise the leaf.
//
// WHY IT IS BUILT THIS WAY:
//   A visitor should learn something useful before pressing anything.
//   The three leaf facts come from lib/species-data.ts, so the hero
//   and the Species Guide always agree.
//
// HOW THE POINTERS ARE PLACED:
//   Each pointer has an x and y position measured on the photograph
//   (0 = left/top edge, 1 = right/bottom edge). The photograph's box
//   always keeps the picture's own 3:4 shape, so a pointer stays on the
//   same part of the leaf at every screen size.
//
//   On large screens there is an empty strip (the "gutter") to the left
//   of the photograph. Each explanation sits in that strip, level with
//   its pointer, and a thin line joins the two. On smaller screens the
//   strip and the lines are hidden and the same explanations appear as
//   a numbered list beside or below the photograph.
//
// COLOUR NOTE: the pointer dots and lines use literal ink and white,
//   not theme tokens, because they sit on a photograph that looks the
//   same in the light and the dark theme.
//
// MOTION: the lines draw once when the page loads, one after another.
//   MotionConfig reducedMotion="user" skips that movement for visitors
//   who have asked their device to reduce motion.

"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { MotionConfig, motion } from "framer-motion";
import { Leaf, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeafPointer {
  /** Horizontal position on the photograph, from 0 (left) to 1 (right). */
  x: number;
  /** Vertical position on the photograph, from 0 (top) to 1 (bottom). */
  y: number;
  text: string;
}

// Listed from the top of the photograph to the bottom, so the numbers
// read in order down the page.
const pointers: LeafPointer[] = [
  {
    x: 0.6,
    y: 0.25,
    text: "Each leaflet is lance-shaped and 7 to 15 cm long.",
  },
  {
    x: 0.2,
    y: 0.56,
    text: "The top is glossy dark green. The underside is paler.",
  },
  {
    x: 0.585,
    y: 0.875,
    text: "Leaflets grow in pairs along one stalk, 3 to 6 pairs on each leaf.",
  },
];

const numberBadge =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-[#14201a] shadow-sm ring-1 ring-[#14201a]/35";

export function HeroSection() {
  return (
    <MotionConfig reducedMotion="user">
      <section
        id="hero-section"
        aria-labelledby="hero-heading"
        className="overflow-hidden pb-12 pt-24 lg:pb-8 lg:pt-20"
      >
        <div className="mx-auto grid max-w-[96rem] gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-4">
          {/* ── Words and actions ─────────────────────────────── */}
          <div className="px-6 lg:py-16 lg:pl-10 lg:pr-0 xl:pl-16 2xl:pl-24">
            <h1
              id="hero-heading"
              className="display-title max-w-[9em] text-foreground"
            >
              Is that tree a Mahogany?
            </h1>

            <p className="mt-6 max-w-[32rem] text-lg leading-relaxed text-foreground/80">
              Check a leaf photo, learn why Mahogany matters in Iligan City,
              and report what you find to CENRO. No account needed.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                render={<Link href="/identify" />}
                nativeButton={false}
                size="lg"
                className="min-h-12 w-full px-5 text-base sm:w-auto"
              >
                <Leaf className="mr-2 h-4 w-4" aria-hidden="true" />
                Identify a Tree
              </Button>

              <Button
                render={<Link href="/report" />}
                nativeButton={false}
                size="lg"
                variant="outline"
                className="min-h-12 w-full border-foreground/30 bg-transparent px-5 text-base sm:w-auto"
              >
                <MapPin className="mr-2 h-4 w-4" aria-hidden="true" />
                Report a Sighting
              </Button>
            </div>

            <p className="mt-5 max-w-[32rem] text-sm leading-relaxed text-muted-foreground">
              The result is a suggestion from the AI. CENRO staff review
              every report.
            </p>

            <Link
              href="/species"
              className="focus-ring mt-6 inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
            >
              See the full Species Guide
            </Link>
          </div>

          {/* ── The annotated leaf ────────────────────────────── */}
          <div className="grid gap-6 px-6 md:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] md:items-center md:gap-10 lg:block lg:px-0">
            <figure className="m-0">
              <div className="relative [--gutter:0px] lg:pl-[15rem] lg:[--gutter:15rem]">
                {/* The photograph. Its box keeps the picture's 3:4 shape. */}
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg lg:h-[min(44rem,calc(100svh-7rem))] lg:w-auto lg:rounded-none dark:lg:rounded-l-lg">
                  <Image
                    src="/assets/images/mahogany.jpg"
                    alt="Mahogany leaflets on a plain white background: one seen from above, dark and glossy, and one seen from below, pale green."
                    fill
                    priority
                    sizes="(max-width: 767px) 100vw, (max-width: 1023px) 24rem, 33rem"
                    className="object-cover"
                  />
                </div>

                {/* The three pointers, drawn over the photograph. */}
                {pointers.map((pointer, index) => (
                  <div
                    key={pointer.text}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-0 flex -translate-y-1/2 items-center justify-end"
                    style={
                      {
                        top: `${pointer.y * 100}%`,
                        width: `calc(var(--gutter) + (100% - var(--gutter)) * ${pointer.x})`,
                      } as CSSProperties
                    }
                  >
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.3 + index * 0.4 }}
                      className="hidden w-[13.5rem] shrink-0 pr-3 text-sm font-medium leading-snug text-foreground lg:block"
                    >
                      {pointer.text}
                    </motion.p>

                    {/* The line: an ink stroke on a white casing, so it
                        stays visible on the page and on the leaf. */}
                    <motion.span
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{
                        duration: 0.5,
                        delay: 0.45 + index * 0.4,
                        ease: [0.22, 0.61, 0.36, 1],
                      }}
                      className="hidden h-[3px] min-w-0 flex-1 origin-left items-center bg-white/75 lg:flex"
                    >
                      <span className="h-px w-full bg-[#14201a]" />
                    </motion.span>

                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        duration: 0.3,
                        delay: 0.9 + index * 0.4,
                        ease: [0.22, 0.61, 0.36, 1],
                      }}
                      className="-mr-3.5"
                    >
                      <span className={numberBadge}>{index + 1}</span>
                    </motion.span>
                  </div>
                ))}
              </div>

              <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground lg:pl-[15rem] lg:pr-6">
                Mahogany (<em>Swietenia macrophylla</em>) leaflets. A reference
                photo, not a reported sighting.
              </figcaption>
            </figure>

            {/* The same three explanations as a list. Shown on phones and
                tablets; on large screens it is kept for screen readers
                only, because the pointers above already show the text. */}
            <div className="lg:sr-only">
              <h2 className="text-base font-bold text-foreground">
                How to recognise the leaf
              </h2>
              <ol className="mt-4 space-y-4">
                {pointers.map((pointer, index) => (
                  <li key={pointer.text} className="flex items-start gap-3">
                    <span className={numberBadge} aria-hidden="true">
                      {index + 1}
                    </span>
                    <span className="pt-0.5 text-base leading-snug text-foreground">
                      {pointer.text}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
