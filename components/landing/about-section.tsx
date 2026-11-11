import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, Leaf } from "lucide-react";

export function AboutSection() {
  return (
    <section
      id="about-section"
      aria-labelledby="about-heading"
      className="border-t border-border bg-background px-4 py-20 sm:px-6"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card">
          <div className="relative aspect-[4/3]">
            <Image
              src="/assets/images/mahogany.jpg"
              alt="Mahogany leaves, shown as an illustrative species reference"
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
          </div>
          <div className="flex items-center gap-3 border-t border-border px-5 py-4">
            <Leaf className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Look for the tree&apos;s pinnate, compound leaves.
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Species Guide Preview
          </p>
          <h2
            id="about-heading"
            className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Get to Know Mahogany
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Learn about Mahogany&apos;s identifying features, its potential
            ecological effects, and guidance for responsible observation.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Mahogany (<em>Swietenia macrophylla</em>) is the species at the
            center of CITIA-IS. Understanding its leaves and ecological context
            can help people make more informed observations. Management
            Recommendations are informational and do not authorize tree
            removal.
          </p>

          <div className="mt-7 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="font-semibold text-foreground">
                A quick leaf reference
              </h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Mahogany leaves are compound, with several smaller leaflets
              arranged along a central stem. Use the guide to explore more
              identifying details and ecological information.
            </p>
          </div>

          <Link
            href="/species"
            className="focus-ring mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Explore Species Guide
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
