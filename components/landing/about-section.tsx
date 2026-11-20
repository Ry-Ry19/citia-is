// components/landing/about-section.tsx
//
// WHAT: The "Why it matters" section of the landing page — one plain
//   statement (Mahogany is not native to the Philippines), a short
//   explanation, and the three things its ecological effect depends on.
//
// WHERE THE WORDS COME FROM:
//   The statement, the paragraph and the three factors use the same
//   wording as the "Ecological Impact" section of the Species Guide
//   (app/species/page.tsx), so the two pages always agree. If that
//   wording changes, change it here too.
//
// COLOUR NOTE: the headline is the only place on the landing page that
//   uses the Heartwood colour (the red-brown of Mahogany timber). It is
//   kept for this one message so that it reads as the serious one.
//
// PHOTO NOTE: ecological-impact.jpg is 640 pixels wide, so it is shown
//   no wider than that. Stretching it across the screen would blur it.

import Link from "next/link";
import Image from "next/image";

const factors = [
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

export function AboutSection() {
  return (
    <section
      id="about-section"
      aria-labelledby="about-heading"
      className="scroll-mt-16 border-t border-border bg-background py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto grid max-w-[96rem] gap-10 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:gap-16 lg:px-10 xl:px-16 2xl:px-24">
        {/* ── The statement and the explanation ─────────────── */}
        <div className="lg:row-span-2">
          <h2
            id="about-heading"
            className="section-title max-w-[14em] text-heartwood"
          >
            Mahogany is not native to the Philippines.
          </h2>

          <p className="mt-6 max-w-[38rem] text-lg leading-relaxed text-foreground/85">
            It comes from tropical Central and South America and was
            introduced here as a plantation timber species. It is now planted
            in urban areas, commercial estates and reforestation sites across
            the country, including in Mindanao.
          </p>
        </div>

        {/* ── The photograph ────────────────────────────────── */}
        <figure className="m-0 lg:col-start-2 lg:row-span-3 lg:row-start-1">
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg">
            <Image
              src="/assets/images/ecological-impact.jpg"
              alt="Rows of straight tree trunks in a plantation stand with a cleared forest floor between them."
              fill
              sizes="(max-width: 1023px) 100vw, 34rem"
              className="object-cover"
            />
          </div>
          <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Rows of planted trunks with a cleared floor between them. An
            illustrative photo, not a verified local sighting.
          </figcaption>
        </figure>

        {/* ── The three factors ─────────────────────────────── */}
        <div className="lg:col-start-1">
          <h3 className="text-base font-bold text-foreground">
            What it does to a place depends on three things
          </h3>

          <dl className="mt-4 max-w-[44rem] border-t border-border">
            {factors.map((factor) => (
              <div
                key={factor.term}
                className="grid gap-1 border-b border-border py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6"
              >
                <dt className="text-base font-semibold text-foreground">
                  {factor.term}
                </dt>
                <dd className="m-0 text-base leading-relaxed text-muted-foreground">
                  {factor.detail}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 max-w-[38rem] text-sm leading-relaxed text-muted-foreground">
            Management Recommendations are informational and do not authorize
            tree removal.
          </p>

          <Link
            href="/species#ecological-impact-heading"
            className="focus-ring mt-4 inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
          >
            Read the ecological context in the Species Guide
          </Link>
        </div>
      </div>
    </section>
  );
}
