"use client";

import React, { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  UploadCloud,
  BrainCircuit,
  FileText,
  ClipboardCheck,
  ChevronDown,
} from "lucide-react";
import Image from "next/image";

// ── Types ──────────────────────────────────────────────────

interface Step {
  id: number;
  icon: LucideIcon;
  label: string;
  micro: string;
  description: string;
  mockupPath: string;
  imgSrc: string;
  badge?: string | null;
}

// ── Data ───────────────────────────────────────────────────

const steps: Step[] = [
  {
    id: 1,
    icon: UploadCloud,
    label: "Take a Photo",
    micro: "Capture or upload leaf image",
    description:
      "Snap a clear close-up photo of a tree leaf, or upload one already saved on your phone. No special equipment needed.",
    mockupPath: "/identify/uploadPhoto",
    imgSrc: "/assets/images/field-documentation.jpg",
    badge: null,
  },
  {
    id: 2,
    icon: BrainCircuit,
    label: "AI Identifies It",
    micro: "YOLOv8 runs background inference",
    description:
      "YOLOv8 scans the photo in real time, detecting leaf morphology and matching it against known invasive species.",
    mockupPath: "/identify/inference",
    imgSrc: "/assets/images/mahogany.jpg",
    badge: "YOLOv8n-cls · 94.8% Confidence",
  },
  {
    id: 3,
    icon: FileText,
    label: "View Results",
    micro: "Ecological impact & recommendation",
    description:
      "Get a plain-language breakdown: species identification, ecological threat levels, and official CENRO mitigation guidance.",
    mockupPath: "/identify/result",
    imgSrc: "/assets/images/eocological-impact.jpg",
    badge: "Invasive Impact Analysis",
  },
  {
    id: 4,
    icon: ClipboardCheck,
    label: "Report to CENRO",
    micro: "Submit sighting data to authorities",
    description:
      "Submit geotagged sighting records directly into CENRO's central ledger to support local environmental decision-making.",
    mockupPath: "/report/submit",
    imgSrc: "/assets/images/mahogany-forest.jpg",
    badge: "GIS Sighting Ledger",
  },
];

// ── Shared Mockup Window ──────────────────────────────────
// Renders the browser frame with dynamic address bar and stacked
// cross-fading picture containers.

function MockupWindow({
  activeStep,
  compact = false,
  singleStep = null,
}: {
  activeStep: number;
  compact?: boolean;
  singleStep?: Step | null;
}) {
  // If singleStep is provided (mobile accordion view), render only that step's asset
  const displayedSteps = singleStep ? [singleStep] : steps;
  const currentPath = singleStep
    ? singleStep.mockupPath
    : (steps.find((s) => s.id === activeStep)?.mockupPath ??
      "/identify/uploadPhoto");

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xl transition-all">
      {/* Top Browser Chrome */}
      <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
        </div>

        {/* Dynamic URL Bar */}
        <div className="flex-1 max-w-md mx-auto">
          <div className="rounded-full bg-background/80 px-3 py-1 text-center font-mono text-xs text-muted-foreground border border-border/60 truncate">
            https://www.citia-is.app{currentPath}
          </div>
        </div>
      </div>

      {/* Picture Container Body */}
      <div
        className={`relative bg-muted/20 overflow-hidden ${
          compact
            ? "aspect-[16/10] min-h-[220px]"
            : "aspect-[16/10] min-h-[360px]"
        }`}
      >
        {displayedSteps.map((step) => {
          const isCurrent = singleStep ? true : activeStep === step.id;

          return (
            <div
              key={step.id}
              className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                isCurrent
                  ? "opacity-100 scale-100 z-10 pointer-events-auto"
                  : "opacity-0 scale-95 z-0 pointer-events-none"
              }`}
            >
              {/* Image Asset */}
              <Image
                src={step.imgSrc}
                alt={step.label}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-center"
                priority={step.id === 1}
              />

              {/* Gradient Overlay for Readable Badges */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Floating Badge Overlay */}
              {step.badge && (
                <div className="absolute top-4 left-4 rounded-md bg-emerald-600/90 text-white px-3 py-1 text-xs font-medium backdrop-blur-sm shadow-md border border-white/20 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  {step.badge}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main HowItWorks Component ─────────────────────────────

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const current = steps.find((s) => s.id === activeStep) ?? steps[0];

  return (
    <section
      id="how-it-works"
      className="bg-background px-6 py-20 text-foreground md:px-12"
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Simple Process
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            How It Works
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            No account required for community features — CENRO staff sign in
            separately.
          </p>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_1.5fr] md:gap-12 lg:gap-16 items-start">
          {/* LEFT: Stepper Column (Desktop) / Accordion (Mobile) */}
          <div className="relative flex flex-col gap-6 md:pt-2">
            {/* Desktop Vertical Timeline Thread */}
            <div className="hidden md:block absolute left-8 top-6 bottom-6 w-0.5 bg-border -z-10" />

            {steps.map((step) => {
              const isActive = step.id === activeStep;
              const isExpanded = step.id === expandedStep;

              return (
                <div key={step.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStep(step.id);
                      setExpandedStep((prev) =>
                        prev === step.id ? null : step.id,
                      );
                    }}
                    className={`group flex w-full items-center gap-4 text-left p-3 rounded-2xl transition-all duration-200 border ${
                      isActive
                        ? "bg-card border-border shadow-sm"
                        : "bg-transparent border-transparent hover:bg-muted/40"
                    }`}
                  >
                    {/* Circle Node */}
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105"
                          : "bg-muted text-muted-foreground group-hover:bg-accent group-hover:text-foreground"
                      }`}
                    >
                      {step.id}
                    </span>

                    {/* Step Titles */}
                    <span className="flex-1">
                      <span
                        className={`block text-sm font-medium ${
                          isActive
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        {step.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {step.micro}
                      </span>
                    </span>

                    {/* Accordion Arrow (Mobile Only) */}
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 md:hidden ${
                        isExpanded ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </button>

                  {/* Accordion Panel (Mobile Only) */}
                  <div
                    className={`grid transition-all duration-300 ease-in-out md:hidden ${
                      isExpanded
                        ? "grid-rows-[1fr] opacity-100 mt-2"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="ml-4 space-y-3 pl-10 pr-2 pb-2">
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {step.description}
                        </p>

                        {/* Inline Mobile Picture Preview */}
                        {isExpanded && (
                          <MockupWindow
                            activeStep={step.id}
                            compact
                            singleStep={step}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT: Desktop Mockup Window (Hidden on Mobile) */}
          <div className="hidden flex-col gap-6 md:flex">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <current.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                  {current.label}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {current.description}
                </p>
              </div>
            </div>

            {/* Shared Picture Container Mockup */}
            <MockupWindow activeStep={activeStep} />
          </div>
        </div>
      </div>
    </section>
  );
}
