// components/landing/how-it-works.tsx
//
// WHAT: Interactive 4-step process.
//   Desktop (md+): a vertical stepper on the left drives ONE shared
//     mockup window on the right — unchanged from before.
//   Mobile/tablet (<md): each step is its own accordion row — tapping
//     it expands a description AND its own compact mockup window
//     inline, right under that step. The desktop's shared window is
//     hidden at this width, since the accordion IS the preview here.
// CONCEPTS:
//   Extracted <MockupWindow> component — the frame + four content
//     branches used to exist only once, driven by activeStep. Now
//     it's a component parameterized by `step`, so it can render
//     ANY step on demand — used once for the desktop's single big
//     window, and once per accordion row for mobile.
//   Conditional MOUNTING vs CSS-hiding — the accordion panel is
//     CSS-collapsed via grid-rows when closed, but <MockupWindow>
//     itself is only added to the DOM when `isExpanded` is true.
//     Otherwise all 4 steps' images/tables would load immediately
//     on page load — invisible, but still fetched over the network.

"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  UploadCloud,
  BrainCircuit,
  FileText,
  ClipboardCheck,
  Leaf,
  ChevronDown,
} from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import Image from "next/image";

// ── Types ──────────────────────────────────────────────────

interface Step {
  id: number;
  icon: LucideIcon;
  label: string;
  micro: string;
  description: string;
  mockupPath: string;
}

interface SightingRow {
  id: string;
  species: string;
  isInvasive: boolean;
  location: string;
  date: string;
  status: "Pending Review" | "Verified";
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
    mockupPath: "/identify/upload",
  },
  {
    id: 2,
    icon: BrainCircuit,
    label: "AI Identifies It",
    micro: "YOLOv8 runs background inference",
    description:
      "YOLOv8 scans the photo in real time, drawing a detection box around the leaf and matching it against known invasive species.",
    mockupPath: "/identify/scanning",
  },
  {
    id: 3,
    icon: FileText,
    label: "View Results",
    micro: "Ecological impact & recommendation",
    description:
      "Get a plain-language breakdown: what species was detected, how serious the ecological threat is, and what CENRO recommends doing about it.",
    mockupPath: "/identify/results",
  },
  {
    id: 4,
    icon: ClipboardCheck,
    label: "Report to CENRO",
    micro: "Submit sighting data to authorities",
    description:
      "Submit the sighting directly into CENRO's monitoring ledger, alongside reports from other community members across Iligan City.",
    mockupPath: "/report/new",
  },
];

const sightingRows: SightingRow[] = [
  {
    id: "SGT-0231",
    species: "Mahogany",
    isInvasive: true,
    location: "Brgy. Dalipuga",
    date: "Aug 24, 2026",
    status: "Pending Review",
  },
  {
    id: "SGT-0229",
    species: "Narra",
    isInvasive: false,
    location: "Brgy. Palao",
    date: "Aug 23, 2026",
    status: "Verified",
  },
  {
    id: "SGT-0225",
    species: "Mahogany",
    isInvasive: true,
    location: "Brgy. Del Carmen",
    date: "Aug 21, 2026",
    status: "Verified",
  },
];

// ── Shared mockup window ──────────────────────────────────
// Renders the browser-window frame + the correct body content for
// WHICHEVER step is passed in. `compact` shrinks it slightly for
// the narrower space inside a mobile accordion row.

function MockupWindow({
  step,
  compact = false,
}: {
  step: Step;
  compact?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xl">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-foreground" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground" />
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          citia-is.app{step.mockupPath}
        </span>
      </div>

      {/* Body */}
      <div
        className={`flex flex-col justify-between ${
          compact ? "min-h-[240px] p-2" : "min-h-[380px] p-4"
        }`}
      >
        {step.id === 1 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-8 text-center">
            <Leaf className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Drag &amp; drop a leaf photo, or tap to upload
            </p>
            <p className="text-xs text-muted-foreground">
              Supports JPG, PNG &middot; up to 10MB
            </p>
            <span className="mt-2 cursor-default rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">
              Select File
            </span>
          </div>
        )}

        {step.id === 2 && (
          <div className="relative h-full min-h-[220px] overflow-hidden rounded-lg bg-muted">
            <Image
              src="/assets/images/mahogany.jpg"
              alt="Uploaded leaf photo being analyzed by CITIA-IS"
              fill
              sizes="(max-width: 768px) 100vw, 60vw"
              className="object-cover"
            />
            <div className="absolute inset-x-10 inset-y-8 rounded-md border-2 border-primary">
              <span className="absolute -top-3 left-2 rounded bg-destructive px-2 py-0.5 text-[10px] font-semibold text-white">
                Invasive Mahogany: 94%
              </span>
            </div>
          </div>
        )}

        {step.id === 3 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-muted/40 p-4 text-center">
                <StatusBadge label="Invasive" variant="destructive" />
                <p className="mt-2 text-xs text-muted-foreground">
                  Classification
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-4 text-center">
                <StatusBadge label="High" variant="warning" />
                <p className="mt-2 text-xs text-muted-foreground">
                  Hazard Index
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-4 text-center">
                <p className="text-sm font-semibold text-foreground">
                  Eradication / Cut
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Recommended Action
                </p>
              </div>
            </div>

            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>Suppresses native understory vegetation growth</li>
              <li>Provides little to no value to local wildlife</li>
              <li>Spreads readily into surrounding forest areas</li>
            </ul>
          </div>
        )}

        {step.id === 4 && (
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">
              Community Sighting Ledger
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-muted text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Sighting ID</th>
                    <th className="px-3 py-2 font-medium">Species</th>
                    <th className="px-3 py-2 font-medium">Location</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sightingRows.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-muted-foreground">
                        {row.id}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge
                          label={row.species}
                          variant={row.isInvasive ? "destructive" : "success"}
                        />
                      </td>
                      <td className="px-3 py-2 text-foreground">
                        {row.location}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.date}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge
                          label={row.status}
                          variant={
                            row.status === "Verified" ? "success" : "warning"
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(1);
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const current = steps.find((s) => s.id === activeStep) ?? steps[0];

  return (
    <section
      id="how-it-works"
      className="bg-background px-6 py-20 text-foreground md:px-12"
    >
      <div className="mx-auto max-w-6xl">
        {/* Heading */}
        <div className="mb-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Simple Process
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            How It Works
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_2.5fr] md:gap-16">
          {/* LEFT: vertical stepper / mobile accordion */}
          <div className="flex flex-col gap-8 md:pt-4">
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
                    className="group flex w-full items-center gap-4 text-left"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm transition-all duration-200 ${
                        isActive
                          ? "border-primary bg-primary font-semibold text-primary-foreground shadow-md shadow-primary/20"
                          : "border-border bg-muted text-muted-foreground group-hover:border-muted-foreground/50 group-hover:text-foreground"
                      }`}
                    >
                      {step.id}
                    </span>

                    <span className="flex-1">
                      <span
                        className={`block text-sm ${
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

                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 md:hidden ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Accordion panel — mobile/tablet only. Now includes
                      the step's own compact MockupWindow, not just text. */}
                  <div
                    className={`grid transition-all duration-300 ease-in-out md:hidden ${
                      isExpanded
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="ml-12 mt-2 space-y-3 pr-2">
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {step.description}
                        </p>

                        {/* Only mounted while actually expanded — see
                            file header note on why this matters */}
                        {isExpanded && <MockupWindow step={step} compact />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT: desktop-only shared header + mockup window.
              Hidden below md — the accordion covers this job on mobile. */}
          <div className="hidden flex-col gap-6 md:flex">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                <current.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-3xl font-semibold tracking-tight text-foreground">
                  {current.label}
                </h3>
                <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
                  {current.description}
                </p>
              </div>
            </div>

            <MockupWindow step={current} />
          </div>
        </div>
      </div>
    </section>
  );
}
