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
//
// LAYOUT: the page follows the same system as the landing page —
//   narrow headlines, sections separated by a line instead of boxes,
//   and facts set out as "term / detail" lists. A row of section links
//   under the header stays in view while the visitor scrolls, because
//   the page is long.
//
// ANCHORS: other pages link to the ids on this page (for example the
//   landing page links to #ecological-impact-heading), so the ids must
//   not be renamed.

import Link from "next/link";
import Image from "next/image";
import { Leaf, MapPin, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
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

/** The links in the row under the header, in page order. */
const sectionLinks = [
  { label: "Overview", href: "#profile-overview" },
  { label: "How to recognise it", href: "#identification" },
  { label: "Other species", href: "#other-species" },
  { label: "Ecological impact", href: "#ecological-impact-heading" },
  { label: "Management Recommendations", href: "#management-recommendations-heading" },
];

const atAGlance = [
  { term: "Common name", detail: "Big-leaf Mahogany" },
  { term: "Scientific name", detail: "Swietenia macrophylla", italic: true },
  { term: "Family", detail: "Meliaceae" },
  { term: "Reference classification", detail: "Target Species" },
  { term: "Native origin", detail: "Tropical Central and South America" },
  { term: "Leaf type", detail: "Even-pinnately compound" },
  { term: "CITIA-IS role", detail: "Primary target for leaf screening" },
];

// Shared pieces of the layout.
const container = "mx-auto max-w-[96rem] px-6 lg:px-10 xl:px-16 2xl:px-24";
const sectionSpace = "border-t border-border py-14 sm:py-16 lg:py-20";
// Headings that are link targets stop below the top bar and the row of
// section links, not underneath them.
const anchorOffset = "scroll-mt-32";
const bodyText = "max-w-[44rem] text-base leading-relaxed text-muted-foreground";
const termRow =
  "grid gap-1 border-b border-border py-4 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6";

export default function SpeciesPage() {
  return (
    <div id="top" className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-16">
        {/* ── A. Page header ───────────────────────────────────────────── */}
        <section aria-labelledby="species-guide-heading" className="py-10 sm:py-12">
          <div className={`${container} grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-center lg:gap-14`}>
            <div>
              <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
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
                className="display-title mt-5 text-foreground"
              >
                Big-leaf Mahogany
              </h1>
              <p className="mt-3 text-xl italic text-muted-foreground">
                Swietenia macrophylla
              </p>
              <p className="mt-5 max-w-[40rem] text-lg leading-relaxed text-foreground/85">
                The target species reference for CITIA-IS leaf screening and
                community observation. Use this guide alongside CENRO review;
                the classifier is a screening aid, not definitive botanical
                identification.
              </p>
            </div>

            <figure className="m-0">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
                <Image
                  src="/assets/images/mahogany.jpg"
                  alt="Mahogany leaves, shown as an illustrative species reference"
                  fill
                  priority
                  sizes="(max-width: 1023px) 100vw, 26rem"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Illustrative reference image; not a verified local sighting.
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ── Section links — stay in view while scrolling ─────────────── */}
        <nav
          aria-label="Species profile sections"
          className="sticky top-16 z-30 border-y border-border bg-background/95 backdrop-blur-sm"
        >
          <div className={`${container} scrollbar-hide flex gap-1 overflow-x-auto`}>
            {sectionLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="focus-ring inline-flex min-h-12 shrink-0 items-center whitespace-nowrap rounded-md px-3 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors first:-ml-3 hover:text-foreground hover:underline"
              >
                {link.label}
              </a>
            ))}
          </div>
        </nav>

        {/* ── B. Overview ──────────────────────────────────────────────── */}
        <section
          aria-labelledby="featured-species-heading"
          id="profile-overview"
          className={`${anchorOffset} py-14 sm:py-16 lg:py-20`}
        >
          <div className={`${container} grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16`}>
            <div>
              <h2
                id="featured-species-heading"
                className="section-title max-w-[16em] text-foreground"
              >
                A Mahogany-focused reference for Iligan City
              </h2>
              <p className={`mt-6 ${bodyText}`}>
                Big-leaf mahogany is a tree of the Meliaceae family, native to
                tropical Central and South America. It was introduced to the
                Philippines as a commercial plantation species and is now
                planted widely across the country. In Iligan City it is
                familiar in streets, parks, school grounds, homes, and
                agricultural areas.
              </p>

              <div id="distribution-heading" className={`mt-10 ${anchorOffset}`}>
                <h3 className="text-xl font-bold text-foreground">
                  Distribution and Local Observations
                </h3>
                <p className={`mt-3 ${bodyText}`}>
                  Big-leaf Mahogany is native to tropical Central and South
                  America and has been introduced elsewhere, including the
                  Philippines. General geographic origin is different from a
                  confirmed CITIA-IS observation in Iligan City.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-foreground">At a Glance</h3>
              <dl className="mt-3 border-t border-border">
                {atAGlance.map((item) => (
                  <div
                    key={item.term}
                    className="flex justify-between gap-6 border-b border-border py-3 text-base"
                  >
                    <dt className="text-muted-foreground">{item.term}</dt>
                    <dd
                      className={`m-0 text-right font-medium text-foreground ${
                        item.italic ? "italic" : ""
                      }`}
                    >
                      {item.detail}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* ── C. Identification ────────────────────────────────────────── */}
        <section
          id="identification"
          aria-labelledby="identification-heading"
          className={`${anchorOffset} ${sectionSpace}`}
        >
          <div className={`${container} grid gap-12 lg:grid-cols-2 lg:gap-16`}>
            <div>
              <h2 id="identification-heading" className="section-title text-foreground">
                Leaf characteristics for visual screening
              </h2>
              <p className={`mt-5 ${bodyText}`}>
                These features may be visible in a leaf photograph. They are
                botanical reference traits, not proof that the trained model
                explicitly learned or checks each feature.
              </p>
              <dl className="mt-6 border-t border-border">
                {leafCharacteristics.map((item) => (
                  <div key={item.term} className={termRow}>
                    <dt className="text-base font-semibold text-foreground">{item.term}</dt>
                    <dd className="m-0 text-base leading-relaxed text-muted-foreground">
                      {item.detail}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 max-w-[44rem] border-l-4 border-primary pl-4 text-base leading-relaxed text-foreground">
                Leaf shape alone rarely establishes a definitive
                identification. Use CITIA-IS to check a photo, then confirm
                records with CENRO or a local forestry expert.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-foreground [font-stretch:85%]">
                Additional botanical characteristics
              </h3>
              <p className={`mt-3 ${bodyText}`}>
                These details support human verification and are not directly
                assessed by a leaf-only scan.
              </p>
              <dl className="mt-6 border-t border-border">
                {additionalCharacteristics.map((item) => (
                  <div key={item.term} className={termRow}>
                    <dt className="text-base font-semibold text-foreground">{item.term}</dt>
                    <dd className="m-0 text-base leading-relaxed text-muted-foreground">
                      {item.detail}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* ── D. Species reference browser ─────────────────────────────── */}
        {/* The wrapper is the link target: the browser's own heading has
            no offset, so linking to it would hide it under the bars. */}
        <div id="other-species" className={anchorOffset}>
          <SpeciesReferenceBrowser />
        </div>

        {/* ── E. Ecological Impact ─────────────────────────────────────── */}
        <section aria-labelledby="ecological-impact-heading" className={sectionSpace}>
          <div className={`${container} grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-16`}>
            <div>
              {/* Heartwood, as on the landing page's "Why it matters". */}
              <h2
                id="ecological-impact-heading"
                className={`section-title text-heartwood ${anchorOffset}`}
              >
                Ecological Impact
              </h2>

              <p className={`mt-6 ${bodyText}`}>
                Mahogany is not native to the Philippines. It originates in
                tropical Central and South America and was introduced here as a
                plantation timber species. It is now found planted in urban
                areas, commercial estates, and reforestation sites across the
                country, including in Mindanao.
              </p>

              <p className={`mt-4 ${bodyText}`}>
                Its ecological effects are not the same everywhere. What
                Mahogany does to a particular site depends on the local
                environment and the planting context:
              </p>

              <dl className="mt-6 max-w-[48rem] border-t border-border">
                {ecologicalFactors.map((factor) => (
                  <div key={factor.term} className={termRow}>
                    <dt className="text-base font-semibold text-foreground">{factor.term}</dt>
                    <dd className="m-0 text-base leading-relaxed text-muted-foreground">
                      {factor.detail}
                    </dd>
                  </div>
                ))}
              </dl>

              <p className={`mt-6 ${bodyText}`}>
                Where Mahogany is dense and spreading, it can contribute to a
                less diverse native understory and altered canopy structure,
                and it offers fewer food and shelter resources for native
                wildlife than many native trees. A single mature street tree,
                by contrast, is a very different situation from an expanding
                population. Local context matters more than the simple
                presence of a tree.
              </p>
            </div>

            <figure className="m-0">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
                <Image
                  src="/assets/images/mahogany-forest.jpg"
                  alt="Mahogany trees growing in a dense stand"
                  fill
                  sizes="(max-width: 1023px) 100vw, 30rem"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-3 text-sm leading-relaxed text-muted-foreground">
                How densely Mahogany is planted, and where it is planted,
                shapes its effect on native vegetation.
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ── F. Management Recommendations ────────────────────────────── */}
        <section
          aria-labelledby="management-recommendations-heading"
          className={sectionSpace}
        >
          <div className={container}>
            <h2
              id="management-recommendations-heading"
              className={`section-title text-foreground ${anchorOffset}`}
            >
              Management Recommendations
            </h2>

            {/* Educational-vs-official boundary — stated up front */}
            <p className="mt-6 max-w-[48rem] border-l-4 border-primary pl-4 text-base leading-relaxed text-muted-foreground">
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

            {/* The four recommendations are not steps in order, so they
                carry no numbers. */}
            <ul className="mt-10 grid gap-x-16 sm:grid-cols-2">
              {managementRecommendations.map((item) => (
                <li key={item.title} className="border-t border-border py-6">
                  <h3 className="text-xl font-bold leading-snug text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>

            {/* Standing caution — never imply CITIA-IS authorizes removal */}
            <div className="mt-6 flex items-start gap-4 rounded-lg border-l-4 border-warning bg-warning/10 p-6">
              <TriangleAlert
                className="mt-1 h-6 w-6 shrink-0 text-warning"
                aria-hidden="true"
              />
              <div>
                <h3 className="text-2xl font-bold text-foreground [font-stretch:85%]">
                  Do not cut or remove a tree on your own
                </h3>
                <p className="mt-2 max-w-[48rem] text-base leading-relaxed text-foreground/85">
                  Cutting, felling, or removing trees is regulated and can carry
                  legal consequences. Leave the tree in place and refer the
                  case to CENRO or the relevant environmental authority for an
                  official assessment.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── G. Calls to action ───────────────────────────────────────── */}
        <section
          aria-labelledby="species-cta-heading"
          className="border-t border-border bg-surface-tint py-16 sm:py-20"
        >
          <div className={`${container} grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-20`}>
            <div>
              <h2
                id="species-cta-heading"
                className="section-title max-w-[14em] text-foreground"
              >
                Ready to check a tree or share what you found?
              </h2>
              <p className="mt-5 max-w-[36rem] text-lg leading-relaxed text-foreground/85">
                Check a leaf photo with the CITIA-IS identifier, or report a
                Mahogany sighting from your community. No account is needed for
                these public features.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 lg:w-[19rem]">
              <Button
                render={<Link href="/identify" />}
                nativeButton={false}
                size="lg"
                className="min-h-12 w-full px-5 text-base"
              >
                <Leaf className="mr-2 h-4 w-4" aria-hidden="true" />
                Identify a Tree
              </Button>
              <Button
                render={<Link href="/report" />}
                nativeButton={false}
                size="lg"
                variant="outline"
                className="min-h-12 w-full border-foreground/30 bg-transparent px-5 text-base"
              >
                <MapPin className="mr-2 h-4 w-4" aria-hidden="true" />
                Report a Sighting
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
