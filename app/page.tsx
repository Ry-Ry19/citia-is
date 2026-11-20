// app/page.tsx
//
// Landing page — the "Learn the leaf" design. From top to bottom:
//
//   HeroSection    the annotated Mahogany leaf and the two actions
//   MarqueeStrip   a moving line of short facts about the service
//   AboutSection   why Mahogany matters ("Why it matters")
//   FeaturesStrip  the four photo plates ("How CITIA-IS helps")
//   HowItWorks     the four steps from a leaf photo to CENRO's decision
//   CTABanner      the closing invitation to identify or report
//
// This file only imports and arranges.
// All logic lives inside each component file.

import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { MarqueeStrip } from "@/components/landing/marquee-strip";
import { AboutSection } from "@/components/landing/about-section";
import { FeaturesStrip } from "@/components/landing/features-strip";
import { HowItWorks } from "@/components/landing/how-it-works";
import { CTABanner } from "@/components/landing/cta-banner";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <div id="top" className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <MarqueeStrip />
        <AboutSection />
        <FeaturesStrip />
        <HowItWorks />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
}
