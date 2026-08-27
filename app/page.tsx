// app/page.tsx
//
// WHAT: Landing page — composes all section components
// RULE: This file only imports and arranges.
//       All logic lives inside each component file.

import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { MarqueeStrip } from "@/components/landing/marquee-strip";
import { FeaturesStrip } from "@/components/landing/features-strip";
import { AboutSection } from "@/components/landing/about-section";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
      <MarqueeStrip />
      <FeaturesStrip />
      <AboutSection />
    </div>
  );
}
