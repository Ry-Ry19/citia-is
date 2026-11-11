// app/species/page.tsx
//
// WHAT: Species Guide — the CITIA-IS reference page for Mahogany
//   (Swietenia macrophylla): species overview, identifying
//   characteristics, ecological context, and Management
//   Recommendations.
//
// TERMINOLOGY: The canonical label for management guidance is
//   "Management Recommendations" — never "Recommended Actions".
//
// SCOPE NOTE: The guidance on this page is informational and
//   educational. It does not authorize tree removal, and it never
//   asks the community to cut trees on their own. Assessment of any
//   specific tree, and any decision about what may be done with it,
//   belongs to CENRO Iligan City or the relevant environmental
//   authority.
//
// ASSETS: /assets/images/mahogany.jpg and
//   /assets/images/mahogany-forest.jpg are the project's existing
//   Mahogany photographs, reused as-is. Nothing is generated,
//   relabeled, or modified.
//
// SERVER COMPONENT: no "use client" — Navbar and Footer are
//   already client components and are imported unmodified.

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Camera,
  BookOpen,
  Leaf,
  Map,
  MapPin,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { SpeciesReferenceBrowser } from "@/components/species-reference-browser";

// ── Data ────────────────────────────────────────────────────────────────────

const leafCharacteristics = [
  {
    term: "Compound leaves",
    detail:
      "Leaves are pinnately compound — several leaflets arranged in pairs along a single central stalk. This is the most useful character for telling Mahogany apart from most local trees, which carry single, simple leaves.",
  },
  {
    term: "Leaflets",
    detail:
      "Individual leaflets are oblong, glossy and darker green on top with a paler underside. New shoots can carry a reddish tint.",
  },
];

const additionalCharacteristics = [
  {
    term: "Growth habit and form",
    detail:
      "A large semi-deciduous canopy tree, typically 25–35 m tall, with a spreading crown and sometimes buttressed roots.",
  },
  {
    term: "Fruit and seed",
    detail:
      "The fruit is a woody, upright, five-valved capsule approximately 10–15 cm long that releases flat, winged seeds.",
  },
  {
    term: "Bark and form",
    detail:
      "Mature trees develop grey-brown bark that becomes slightly fissured with age, and the trunk is usually straight with buttressed roots at the base.",
  },
];

const ecologicalFactors = [
  {
    term: "Where the tree grows",
    detail:
      "A Mahogany standing in an open urban space behaves differently from one growing inside or at the edge of a native forest patch, riparian strip, or remnant woodland.",
  },
  {
    term: "How it was established",
    detail:
      "A managed plantation with a defined end-use is a different situation from a volunteer or self-seeded tree spreading into natural habitat.",
  },
  {
    term: "What grows alongside it",
    detail:
      "The effect on native understory diversity depends on the density, age, and arrangement of nearby Mahogany compared with the native vegetation.",
  },
];

const managementRecommendations = [
  {
    title: "Monitor what you already see",
    description:
      "Keep an eye on Mahogany trees near you. Note where they stand, roughly how large they are, and whether they appear to be spreading. Regular observations over time help CENRO build a clearer picture of where the species is established and where it is not.",
  },
  {
    title: "Plant with the wider ecosystem in mind",
    description:
      "If you are planning to plant a tree, choose a native or locally appropriate species. Avoid adding Mahogany to land intended for native forest restoration, and consider its long-term effect on the vegetation around it.",
  },
  {
    title: "Report observations through CITIA-IS",
    description:
      "Use Report a Sighting to send a photo and a location. This documents the tree for CENRO's monitoring and review. It is a report of an observation, not a request for a removal action.",
  },
  {
    title: "Consult CENRO or the relevant environmental authority",
    description:
      "For any specific tree — on public land, in a park, or on property you do not own — contact CENRO Iligan City or the appropriate local environmental authority. Their assessment determines what, if anything, should happen.",
  },
];

// ── Page ────────────────────────────────────────────────────────────────────

export default function SpeciesPage() {
  return (
    <div id="top" className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 sm:pt-28">
        {/* ── A. Compact page header ───────────────────────────────────── */}
        <section
          aria-labelledby="species-guide-heading"
          className="border-b border-border px-4 pb-8 sm:px-6"
        >
          <div className="mx-auto max-w-6xl">
            <nav aria-label="Breadcrumb" className="pt-2 text-xs text-muted-foreground">
              <ol className="flex flex-wrap items-center gap-2">
                <li>CITIA-IS</li>
                <li aria-hidden="true">/</li>
                <li>Species Guide</li>
                <li aria-hidden="true">/</li>
                <li className="text-foreground">Mahogany</li>
              </ol>
            </nav>
            <h1
              id="species-guide-heading"
              className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Big-leaf Mahogany
            </h1>
            <p className="mt-2 text-base italic text-muted-foreground">
              Swietenia macrophylla
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              The target species reference for CITIA-IS leaf screening and
              community observation. Use this guide alongside CENRO review;
              the classifier is a screening aid, not definitive botanical
              identification.
            </p>
            <nav
              aria-label="Species profile sections"
              className="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-xs font-medium"
            >
              <a className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="#profile-overview">Overview</a>
              <a className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="#identification">Identification</a>
              <a className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="#ecological-impact-heading">Ecological context</a>
              <a className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="#distribution-heading">Distribution</a>
              <a className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="#management-recommendations-heading">Community guidance</a>
            </nav>
          </div>
        </section>

        {/* ── B. Encyclopedia-style species profile ───────────────────── */}
        <section
          aria-labelledby="featured-species-heading"
          id="profile-overview"
          className="px-4 py-12 sm:px-6"
        >
          <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:gap-12">
            <div className="space-y-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Species overview
                </p>
                <h2
                  id="featured-species-heading"
                  className="mt-3 text-2xl font-bold tracking-tight text-foreground"
                >
                  A Mahogany-focused reference for Iligan City
                </h2>
                <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                  Big-leaf mahogany is a tree of the Meliaceae family, native to
                  tropical Central and South America. It was introduced to the
                  Philippines as a commercial plantation species and is now
                  planted widely across the country. In Iligan City it is
                  familiar in streets, parks, school grounds, homes, and
                  agricultural areas.
                </p>
              </div>

              <div id="identification" className="scroll-mt-24">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Identification
                </p>
                <h3 className="mt-3 text-xl font-bold text-foreground">
                  Leaf characteristics for visual screening
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  These features may be visible in a leaf photograph. They are
                  botanical reference traits, not proof that the trained model
                  explicitly learned or checks each feature.
                </p>
                <ul className="mt-5 space-y-4">
                  {leafCharacteristics.map((item) => (
                    <li key={item.term} className="border-l-2 border-primary/50 pl-4">
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {item.term} —{" "}
                        </span>
                        {item.detail}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs leading-relaxed text-muted-foreground">
                  Leaf shape alone rarely establishes a definitive
                  identification. Use CITIA-IS to check a photo, then confirm
                  records with CENRO or a local forestry expert.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">
                  Additional botanical characteristics
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  These details support human verification and are not directly
                  assessed by a leaf-only scan.
                </p>
                <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                  {additionalCharacteristics.map((item) => (
                    <li key={item.term} className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs font-semibold text-foreground">{item.term}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <aside className="space-y-5 lg:sticky lg:top-24">
              <div className="grid gap-5 sm:grid-cols-2">
                <figure className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
                  <div className="relative aspect-[4/3] shrink-0">
                    <Image
                      src="/assets/images/mahogany.jpg"
                      alt="Mahogany leaves, shown as an illustrative species reference"
                      fill
                      sizes="(max-width: 1024px) 100vw, 45vw"
                      className="object-cover"
                    />
                  </div>
                  <figcaption className="flex min-h-16 flex-1 items-start gap-3 border-t border-border px-4 py-3">
                    <Leaf className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <p className="min-w-0 text-xs leading-relaxed text-muted-foreground">
                      Illustrative reference image; not a verified local sighting.
                    </p>
                  </figcaption>
                </figure>

                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-foreground">At a Glance</h3>
                  </div>
                  <dl className="mt-4 divide-y divide-border text-sm">
                    <div className="flex justify-between gap-4 py-2 first:pt-0">
                      <dt className="text-muted-foreground">Common name</dt>
                      <dd className="text-right font-medium text-foreground">Big-leaf Mahogany</dd>
                    </div>
                    <div className="flex justify-between gap-4 py-2">
                      <dt className="text-muted-foreground">Scientific name</dt>
                      <dd className="text-right italic text-foreground">Swietenia macrophylla</dd>
                    </div>
                    <div className="flex justify-between gap-4 py-2">
                      <dt className="text-muted-foreground">Family</dt>
                      <dd className="text-right text-foreground">Meliaceae</dd>
                    </div>
                    <div className="flex justify-between gap-4 py-2">
                      <dt className="text-muted-foreground">Reference classification</dt>
                      <dd className="text-right font-medium text-primary">Target Species</dd>
                    </div>
                    <div className="flex justify-between gap-4 py-2">
                      <dt className="text-muted-foreground">Native origin</dt>
                      <dd className="text-right text-foreground">Tropical Central and South America</dd>
                    </div>
                    <div className="flex justify-between gap-4 py-2 last:pb-0">
                      <dt className="text-muted-foreground">Leaf type</dt>
                      <dd className="text-right text-foreground">Even-pinnately compound</dd>
                    </div>
                    <div className="flex justify-between gap-4 py-2 last:pb-0">
                      <dt className="text-muted-foreground">CITIA-IS role</dt>
                      <dd className="text-right text-foreground">Primary target for leaf screening</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div
                id="distribution-heading"
                className="scroll-mt-24 rounded-xl border border-border bg-card p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Distribution
                </p>
                <h3 className="mt-2 text-base font-bold text-foreground">
                  Distribution and Local Observations
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Big-leaf Mahogany is native to tropical Central and South
                  America and has been introduced elsewhere, including the
                  Philippines. General geographic origin is different from a
                  confirmed CITIA-IS observation in Iligan City.
                </p>
                <div className="mt-4 flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-5 text-center">
                  <Map className="h-7 w-7 text-primary/80" aria-hidden="true" />
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    Interactive map setup pending.
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    No markers or local records are displayed until valid,
                    source-backed observations are available.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* ── C. Species reference browser ─────────────────────────────── */}
        <SpeciesReferenceBrowser />

        {/* ── C. Ecological Impact ─────────────────────────────────────── */}
        <section
          aria-labelledby="ecological-impact-heading"
          className="border-t border-border bg-card px-4 py-16 sm:px-6"
        >
          <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Ecological Context
              </p>
              <h2
                id="ecological-impact-heading"
                className="section-title mt-3 font-bold text-foreground"
              >
                Ecological Impact
              </h2>

              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                Mahogany is not native to the Philippines. It originates in
                tropical Central and South America and was introduced here as a
                plantation timber species. It is now found planted in urban
                areas, commercial estates, and reforestation sites across the
                country, including in Mindanao.
              </p>

              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Its ecological effects are not the same everywhere. What
                Mahogany does to a particular site depends on the local
                environment and the planting context:
              </p>

              <ul className="mt-6 space-y-4">
                {ecologicalFactors.map((factor) => (
                  <li key={factor.term}>
                    <p className="text-sm font-semibold text-foreground">
                      {factor.term}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {factor.detail}
                    </p>
                  </li>
                ))}
              </ul>

              <p className="mt-6 text-base leading-relaxed text-muted-foreground">
                Where Mahogany is dense and spreading, it can contribute to a
                less diverse native understory and altered canopy structure,
                and it offers fewer food and shelter resources for native
                wildlife than many native trees. A single mature street tree,
                by contrast, is a very different situation from an expanding
                population. Local context matters more than the simple
                presence of a tree.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-border bg-background">
              <div className="relative aspect-[4/3]">
                <Image
                  src="/assets/images/mahogany-forest.jpg"
                  alt="Mahogany trees growing in a dense stand"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />
              </div>
              <div className="border-t border-border px-5 py-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  How densely Mahogany is planted, and where it is planted,
                  shapes its effect on native vegetation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── D. Management Recommendations ────────────────────────────── */}
        <section
          aria-labelledby="management-recommendations-heading"
          className="border-t border-border bg-background px-4 py-16 sm:px-6"
        >
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Guidance for the Community
              </p>
              <h2
                id="management-recommendations-heading"
                className="section-title mt-3 font-bold text-foreground"
              >
                Management Recommendations
              </h2>
            </div>

            {/* Educational-vs-official boundary — stated up front */}
            <div className="mt-8 flex items-start gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
              <ShieldCheck
                className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <p className="text-sm leading-relaxed text-muted-foreground">
                The guidance below is{" "}
                <span className="font-semibold text-foreground">
                  informational and educational only
                </span>
                . It is not an official directive, and CITIA-IS does not
                authorize tree removal or any other intervention. Assessment of
                any specific tree, and any decision about what may be done with
                it, rests with{" "}
                <span className="font-semibold text-foreground">
                  CENRO Iligan City
                </span>{" "}
                or the relevant environmental authority.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {managementRecommendations.map((item, index) => (
                <Card key={item.title} className="h-full p-6">
                  <div className="flex items-start gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-semibold text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-foreground">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Standing caution — never imply CITIA-IS authorizes removal */}
            <div className="mt-4 flex items-start gap-4 rounded-2xl border border-warning/30 bg-warning/10 p-5 sm:p-6">
              <TriangleAlert
                className="mt-0.5 h-5 w-5 shrink-0 text-warning"
                aria-hidden="true"
              />
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Do not cut or remove a tree on your own
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Cutting, felling, or removing trees is regulated and can carry
                  legal consequences. Leave the tree in place and refer the
                  case to CENRO or the relevant environmental authority for an
                  official assessment.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── E. Calls to action ───────────────────────────────────────── */}
        <section
          aria-labelledby="species-cta-heading"
          className="border-t border-border bg-card px-4 py-16 sm:px-6"
        >
          <div className="mx-auto flex max-w-5xl flex-col items-start gap-7 rounded-2xl border border-border bg-background p-6 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Take the next step
              </p>
              <h2
                id="species-cta-heading"
                className="mt-3 text-3xl font-bold tracking-tight text-foreground"
              >
                Ready to check a tree or share what you found?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Check a leaf photo with the CITIA-IS identifier, or report a
                Mahogany sighting from your community. No account is needed for
                these public features.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button
                render={<Link href="/identify" />}
                nativeButton={false}
                className="min-h-11 w-full sm:w-auto"
              >
                <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
                Identify a Tree
              </Button>
              <Button
                render={<Link href="/report" />}
                nativeButton={false}
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
              >
                <MapPin className="mr-2 h-4 w-4" aria-hidden="true" />
                Report a Sighting
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
