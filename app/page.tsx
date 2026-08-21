// app/page.tsx
//
// WHAT: Landing page — composes all section components
// RULE: This file only imports and arranges.
//       All logic lives inside each component file.

import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
    </div>
  );
}
