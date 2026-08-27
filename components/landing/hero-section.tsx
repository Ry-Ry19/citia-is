// components/landing/hero-section.tsx
//
// WHAT: Fullscreen video hero with headline and CTA buttons
// CONCEPTS:
//   relative/absolute — video fills parent, content sits above
//   z-index layering  — video → overlay → content
//   animate-bounce    — CSS animation from Tailwind

import Link from "next/link";
import { Leaf, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
      {/* Video background */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/assets/videos/citia-intro.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay — makes text readable. Fixed black regardless of
          theme, since the video is always dark, unlike theme-following
          surfaces like cards or the navbar. */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Content — above overlay */}
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white">
          CENRO Iligan City &middot; Community Tool
        </p>

        {/* text-4xl(mobile screen approach),sm:text-5xl(target tablets), lg:text-6xl(target desktops) */}
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          Identify and Report{" "}
          <span className="text-green-400">Invasive Trees</span> in Iligan City
        </h1>

        <p className="mt-5 text-base font-medium leading-snug tracking-tight text-white/90 sm:text-lg">
          CITIA-IS helps communities detect Mahogany Invasive Tree species,
          understand their ecological impact, and report sightings directly to
          CENRO.
        </p>

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button
            render={<Link href="/identify" />}
            nativeButton={false}
            size="lg"
            className="w-full sm:w-auto"
          >
            <Leaf className="mr-2 h-4 w-4" />
            Identify a Tree
          </Button>

          <Button
            render={<Link href="/report" />}
            nativeButton={false}
            size="lg"
            variant="outline"
            className="w-full border-white/40 bg-white/10 text-white hover:bg-white/20 sm:w-auto"
          >
            <MapPin className="mr-2 h-4 w-4" />
            Report a Sighting
          </Button>
        </div>
      </div>

      {/* Scroll bounce indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white/40">
          <div className="h-1.5 w-1.5 rounded-full bg-white/60" />
        </div>
      </div>
    </section>
  );
}
