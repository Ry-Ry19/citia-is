"use client";

import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  Leaf,
  ShieldCheck,
  Trees,
  Sparkles,
  BrainCircuit,
  Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Vertical Column Data Sets ─────────────────────────────

const column1Badges = [
  { icon: Leaf, label: "YOLOv8 Detection" },
  { icon: ShieldCheck, label: "CENRO Iligan City" },
  { icon: Trees, label: "Native Forests" },
];

const column2Badges = [
  { icon: MapPin, label: "Community Sighting" },
  { icon: Sparkles, label: "Invasive Mahogany" },
  { icon: BrainCircuit, label: "AI Classification" },
];

const column3Badges = [
  { icon: Landmark, label: "LGU Decision Support" },
  { icon: Leaf, label: "Citizen Science" },
  { icon: Trees, label: "Palao & Dalipuga Pilot" },
];

const column4Badges = [
  { icon: ShieldCheck, label: "Verified Sighting Ledger" },
  { icon: MapPin, label: "GIS Geotagging" },
  { icon: Sparkles, label: "Ecology Management" },
];

export function CTABanner() {
  return (
    <section
      aria-label="Call to action – identify plants and report sightings in Iligan City"
      className="relative w-full overflow-hidden py-20 px-4 sm:px-6 lg:px-8 bg-background"
    >
      {/* Ambient Glowing Backdrops */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />

      {/* 4-Column Full-Width Vertical Marquee Background */}
      <div
        className="absolute inset-0 opacity-50 pointer-events-none overflow-hidden 
          grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-6
          [mask-image:radial-gradient(ellipse_at_center,transparent_35%,black_85%)]"
        aria-hidden="true"
      >
        {/* Column 1 — Always Visible (Scrolls UP) */}
        <div className="flex flex-col gap-8 animate-v-up whitespace-nowrap items-center">
          {column1Badges.concat(column1Badges).map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center gap-2 text-muted-foreground"
            >
              <item.icon className="w-7 h-7" />
              <span className="text-[11px] font-semibold tracking-wider uppercase text-center">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Column 2 — Visible on Small Screens & Up (Scrolls DOWN) */}
        <div className="hidden sm:flex flex-col gap-8 animate-v-down whitespace-nowrap items-center">
          {column2Badges.concat(column2Badges).map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center gap-2 text-muted-foreground"
            >
              <item.icon className="w-7 h-7" />
              <span className="text-[11px] font-semibold tracking-wider uppercase text-center">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Column 3 — Visible on Tablets & Up (Scrolls UP) */}
        <div className="hidden md:flex flex-col gap-8 animate-v-up whitespace-nowrap items-center">
          {column3Badges.concat(column3Badges).map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center gap-2 text-muted-foreground"
            >
              <item.icon className="w-7 h-7" />
              <span className="text-[11px] font-semibold tracking-wider uppercase text-center">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Column 4 — Visible on Desktop & Up (Scrolls DOWN) */}
        <div className="hidden lg:flex flex-col gap-8 animate-v-down whitespace-nowrap items-center">
          {column4Badges.concat(column4Badges).map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center gap-2 text-muted-foreground"
            >
              <item.icon className="w-7 h-7" />
              <span className="text-[11px] font-semibold tracking-wider uppercase text-center">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Foreground Center Content */}
      <div className="relative z-10 max-w-3xl mx-auto space-y-6 text-center">
        {/* Context Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-foreground-100/60 border border-foreground-400/30 text-success text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
          <Leaf className="w-3.5 h-3.5 text-success" />
          <span>🌱 JOIN CITIZEN SCIENCE</span>
        </div>

        {/* Headline */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight  text-foreground leading-tight">
          Help Protect Iligan City&apos;s Ecosystem
        </h2>

        {/* Subtext */}
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground-100/80 leading-relaxed max-w-2xl mx-auto">
          Scan leaves, identify species with AI, and report sightings instantly
          to give CENRO direct decision support.
        </p>

        {/* Dual CTA Actions */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Primary CTA – Bright Solid Green */}
          <Button
            render={
              <Link
                href="/#identify"
                className="flex items-center justify-center gap-2"
              >
                <span>Start Identifying</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            }
            nativeButton={false}
            size="lg"
            className="w-full sm:w-auto bg-[#10B981] hover:bg-emerald-400 text-[#0F382C] font-bold px-8 py-6 rounded-xl shadow-lg shadow-emerald-950/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          />

          {/* Secondary CTA – Glassmorphic Outline */}
          <Button
            render={
              <Link
                href="/#report"
                className="flex items-center justify-center gap-2"
              >
                <MapPin
                  className="w-4 h-4 
                text-foreground"
                />
                <span>Report a Sighting</span>
              </Link>
            }
            nativeButton={false}
            variant="outline"
            size="lg"
            className="w-full sm:w-auto border-muted-foreground bg-white/10 hover:bg-white/10 font-medium px-8 py-6 rounded-xl backdrop-blur-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          />
        </div>

        {/* Trust Indicator */}
        <p className="text-xs text-success-300/60 pt-2">
          No account required for community features &bull; Free browser access
        </p>
      </div>
    </section>
  );
}
