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

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Named constant instead of a "magic number" repeated in two places —
// change the slide speed once, here, and both the timer and the
// progress-bar animation duration stay in sync automatically.
const SLIDE_DURATION_MS = 4000;

// Real photos go here — see the STEP 2 folder structure above.
const slides = [
  {
    image: "/assets/images/mahogany-forest.jpg",
    label: "Mahogany",
    sublabel: "Swietenia macrophylla",
  },
  {
    image: "/assets/images/field-documentation.jpg",
    label: "Field Documentation",
    sublabel: "Community monitoring sites",
  },
  {
    image: "/assets/images/mahogany.jpg",
    label: "Leaf Identification",
    sublabel: "Pinnate compound leaves",
  },
  {
    image: "/assets/images/ecological-impact.jpg",
    label: "Ecological Impact",
    sublabel: "Suppressed understory vegetation",
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
          {/* LEFT: Text */}
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              About CITIA-IS
            </p>

            <h2 className="mt-3 text-3xl font-bold leading-snug tracking-tight text-foreground">
              Protecting Iligan City&apos;s Native Ecosystem
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              CITIA-IS was developed to bridge the gap between scientific
              ecological knowledge and community-level action. Mahogany
              (Swietenia macrophylla) is one of the most prevalent invasive
              trees in Iligan City and it is widely planted but ecologically
              harmful to native biodiversity.
            </p>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Through AI-powered identification and community reporting,
              CITIA-IS empowers residents to participate in invasive tree
              monitoring and supports CENRO Iligan City in evidence-based
              environmental management with no technical knowledge required.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button render={<Link href="/identify" />} nativeButton={false}>
                Start Identifying
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                render={<Link href="/species" />}
                nativeButton={false}
                variant="outline"
              >
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

                {/* Slide counter — fixed dark overlay. Same rule as the
                    hero video overlay: this sits directly on unpredictable
                    photo content, not a themed surface, so it stays a
                    literal color in both light and dark mode. */}
                {/* Slide counter */}
                <div className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
                  {current + 1} / {slides.length}
                </div>

                {/* Previous arrow */}
                <button
                  type="button"
                  onClick={goToPrevious}
                  aria-label="Previous slide"
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Next arrow */}
                <button
                  type="button"
                  onClick={goToNext}
                  aria-label="Next slide"
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
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
