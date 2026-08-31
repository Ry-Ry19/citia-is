// components/landing/about-section.tsx
//
// WHAT: Split layout — text left, auto-advancing photo carousel right
// CONCEPTS:
//   useState + useEffect — drive the auto-advance timer
//   next/image           — optimized, responsive image loading
//   CSS keyframe restart via `key` — remounting an element to replay
//                            its animation from the start
//   overflow-hidden gotcha — why the caption card lives OUTSIDE the
//                            image's clipping container
//
// TOKEN NOTE: the carousel's arrow buttons and slide-info panel used
//   to be a fixed bg-black/50 — a literal dark color assumed to
//   always contrast against the photo. That assumption breaks on
//   dark photo content (e.g. tree trunks), where a dark circle just
//   disappears into the background. bg-background/80 backdrop-blur-md
//   fixes this differently: it blurs and lightens whatever sits
//   behind it rather than relying on out-contrasting it by color, so
//   it stays legible regardless of what's in that part of the image.

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Named constant instead of a "magic number" repeated in two places —
// change the slide speed once, here, and both the timer and the
// progress-bar animation duration stay in sync automatically.
const SLIDE_DURATION_MS = 4000;

interface Slide {
  image: string;
  label: string;
  // Only set this when the label is genuinely a taxonomic binomial —
  // it's the one thing on this page that MUST render in italics by
  // scientific convention. Not every slide has one.
  scientificName?: string;
  // Short contextual line shown in the bottom overlay — this is what
  // turns a generic forest photo into localized thesis evidence.
  caption: string;
}

// Real photos go here — see the STEP 2 folder structure above.
const slides: Slide[] = [
  {
    image: "/assets/images/mahogany-forest.jpg",
    label: "Mahogany",
    scientificName: "Swietenia macrophylla",
    caption: "Pilot Zone: Dalipuga Forest, Iligan City",
  },
  {
    image: "/assets/images/field-documentation.jpg",
    label: "Field Documentation",
    caption: "Community Volunteers Logging GPS-Tagged Sightings",
  },
  {
    image: "/assets/images/mahogany.jpg",
    label: "Leaf Identification",
    caption: "Pinnate Compound Leaves Used for AI Classification",
  },
  {
    image: "/assets/images/ecological-impact.jpg",
    label: "Ecological Impact",
    caption: "Dense Canopy Shade Suppressing Native Understory",
  },
];

export function AboutSection() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, SLIDE_DURATION_MS);

    return () => clearInterval(timer);
  }, [current, isPaused]);

  const goToPrevious = () => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrent((prev) => (prev + 1) % slides.length);
  };

  return (
    <section id="about-section" className="bg-background py-20 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-12 md:flex-row md:items-center">
          {/* LEFT: Text — max-w-xl keeps lines from stretching too
              wide on large desktop screens, per readability guidance */}
          <div className="flex-1 max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              About CITIA-IS
            </p>

            <h2 className="mt-3 text-3xl font-bold leading-snug tracking-tight text-foreground">
              Protecting Iligan City&apos;s Native Ecosystem
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              CITIA-IS was developed to bridge the gap between scientific
              ecological knowledge and community-level action. Mahogany (
              <em>Swietenia macrophylla</em>) is one of the most prevalent
              invasive trees in Iligan City and it is widely planted but
              ecologically harmful to native biodiversity.
            </p>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Through AI-powered identification and community reporting,
              CITIA-IS empowers residents to participate in invasive tree
              monitoring and supports CENRO Iligan City in evidence-based
              environmental management with no technical knowledge required.
            </p>

            {/* Key thesis pillars — scannable at a glance instead of
                buried in paragraph text */}
            <div className="grid grid-cols-3 gap-4 pt-2 pb-4">
              <div className="border-l-2 border-primary pl-3">
                <p className="text-xl font-bold text-foreground">YOLOv8</p>
                <p className="text-xs text-muted-foreground">
                  Leaf Classification
                </p>
              </div>
              <div className="border-l-2 border-primary pl-3">
                <p className="text-xl font-bold text-foreground">3 Zones</p>
                <p className="text-xs text-muted-foreground">
                  Iligan Pilot Testing
                </p>
              </div>
              <div className="border-l-2 border-primary pl-3">
                <p className="text-xl font-bold text-foreground">CENRO</p>
                <p className="text-xs text-muted-foreground">
                  Direct Decision Support
                </p>
              </div>
            </div>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <Button render={<Link href="/identify" />} nativeButton={false}>
                Start Identifying
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                render={<Link href="/species" />}
                nativeButton={false}
                variant="outline"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Learn About Mahogany
              </Button>
            </div>
          </div>

          {/* RIGHT: Photo carousel */}
          <div
            className="flex-1"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
          >
            {/* Outer wrapper — deliberately NOT overflow-hidden, so the
                caption card below is free to overlap the image's edge */}
            <div className="relative mb-9">
              {/* Decorative glow — purely visual, hidden from screen readers */}
              <div
                className="absolute -top-6 -right-6 h-40 w-40 rounded-full bg-primary/20 blur-3xl"
                aria-hidden="true"
              />

              {/* Image clipping box — overflow-hidden lives ONLY here */}
              <div className="relative aspect-[5/3] overflow-hidden rounded-3xl shadow-xl">
                {slides.map((slide, index) => (
                  <div
                    key={slide.image}
                    className={`absolute inset-0 transition-opacity duration-700 ${
                      index === current
                        ? "opacity-100"
                        : "opacity-0 pointer-events-none"
                    }`}
                  >
                    <Image
                      src={slide.image}
                      alt={slide.label}
                      fill
                      sizes="(max-width: 768px) 100vw, 40vw"
                      className="object-cover"
                      priority={index === 0}
                    />
                  </div>
                ))}

                {/* Slide counter — glassmorphism, matches the arrows
                    below so the whole overlay set reads as one system */}
                <div className="absolute right-3 top-3 rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-xs text-foreground backdrop-blur-md">
                  {current + 1} / {slides.length}
                </div>

                {/* Bottom overlay — contextual caption per slide.
                    Only the scientificName span is italicized; the
                    label and caption are ordinary text. */}
                <div className="absolute inset-x-3 bottom-3 rounded-xl border border-border/50 bg-background/90 px-3.5 py-2.5 backdrop-blur-md">
                  <p className="text-xs font-semibold text-foreground">
                    {slides[current].label}
                    {slides[current].scientificName && (
                      <span className="ml-1.5 text-[11px] font-normal italic text-muted-foreground">
                        {slides[current].scientificName}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {slides[current].caption}
                  </p>
                </div>

                {/* Previous arrow — glassmorphism: blurs/lightens
                    whatever's behind it instead of relying on a fixed
                    dark color to out-contrast the photo. */}
                <button
                  type="button"
                  onClick={goToPrevious}
                  aria-label="Previous slide"
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-background/80 text-foreground backdrop-blur-md transition-colors hover:bg-background"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Next arrow */}
                <button
                  type="button"
                  onClick={goToNext}
                  aria-label="Next slide"
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-background/80 text-foreground backdrop-blur-md transition-colors hover:bg-background"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Segmented, animated progress bar — replaces plain dots */}
            <div className="flex gap-1.5">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrent(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  className="h-1 flex-1 overflow-hidden rounded-full bg-muted-foreground"
                >
                  {index < current && (
                    <div className="h-full w-full bg-primary" />
                  )}
                  {index === current && (
                    <div
                      key={current}
                      className="h-full bg-primary"
                      style={{
                        width: 0,
                        animationName: "progress-fill",
                        animationDuration: `${SLIDE_DURATION_MS}ms`,
                        animationTimingFunction: "linear",
                        animationFillMode: "forwards",
                        animationPlayState: isPaused ? "paused" : "running",
                      }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}