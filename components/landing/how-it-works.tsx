"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Camera, CheckCircle2, MapPin } from "lucide-react";

const steps = [
  {
    title: "Take a Leaf Photo",
    description:
      "Photograph a clear view of the leaf or upload an existing image.",
    image: "/assets/images/mahogany.jpg",
    alt: "Mahogany leaves used as an illustrative example",
    href: "/identify",
    action: "Identify a Tree",
    icon: Camera,
  },
  {
    title: "Check the Result",
    description:
      "See whether the system classifies the image as Mahogany, Non-Mahogany, or Non-Tree.",
    image: "/assets/images/mahogany-forest.jpg",
    alt: "Mahogany trees in a forest setting",
    href: "/identify",
    action: "Check a Photo",
    icon: CheckCircle2,
  },
  {
    title: "Report a Sighting",
    description:
      "Submit a photo and observation details to help document a sighting.",
    image: "/assets/images/field-documentation.jpg",
    alt: "Illustrative environmental documentation photograph",
    href: "/report",
    action: "Report a Sighting",
    icon: MapPin,
  },
];

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const step = steps[activeStep];

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="border-t border-border bg-background px-4 py-20 sm:px-6"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            How It Works
          </p>
          <h2
            id="how-it-works-heading"
            className="section-title mt-3 font-bold text-foreground"
          >
            A Simple Way to Take Part
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Follow three short steps to learn, check a leaf photo, and share an
            observation.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div
            role="tablist"
            aria-label="CITIA-IS community workflow"
            className="flex flex-col gap-2"
          >
            {steps.map((item, index) => {
              const Icon = item.icon;
              const isActive = index === activeStep;
              return (
                <button
                  key={item.title}
                  id={`step-tab-${index}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="step-panel"
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveStep(index)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                      event.preventDefault();
                      setActiveStep((index + 1) % steps.length);
                    }
                    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                      event.preventDefault();
                      setActiveStep((index - 1 + steps.length) % steps.length);
                    }
                  }}
                  className={`focus-ring flex min-h-20 items-center gap-4 rounded-xl border p-4 text-left transition-colors duration-200 motion-reduce:transition-none ${
                    isActive
                      ? "border-primary/60 bg-primary/10"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-primary"
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Step {index + 1}
                    </span>
                    <span className="mt-1 block font-bold text-foreground">
                      {item.title}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div
            id="step-panel"
            role="tabpanel"
            aria-labelledby={`step-tab-${activeStep}`}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <div className="relative aspect-[16/9] w-full">
              <Image
                key={step.image}
                src={step.image}
                alt={step.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover transition-opacity duration-300 motion-reduce:transition-none"
              />
            </div>
            <div className="p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Step {activeStep + 1}
              </p>
              <h3 className="mt-2 text-2xl font-bold text-foreground">
                {step.title}
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
              <Link
                href={step.href}
                className="focus-ring mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {step.action}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
