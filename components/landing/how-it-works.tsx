// components/landing/how-it-works.tsx
//
// WHAT: The "How taking part works" section of the landing page — the
//   four steps from a leaf photo to CENRO's decision, followed by a
//   short reminder not to confuse Mahogany with the native Narra.
//
// HOW THE STEPS ARE DRAWN:
//   The steps are numbered because the order is real: each one follows
//   the one before. Every step also says who acts in it.
//
//     Steps 1 and 3 (you)   a solid line above the step.
//     Step 2 (the AI)       a dashed line. Dashed means "a suggestion,
//                           not a decision".
//     Step 4 (CENRO)        a filled panel, set apart from the others,
//                           because CENRO has the final say.
//
// WHERE THE WORDS COME FROM:
//   The three class names (Mahogany, Non-Mahogany, Non-Tree) are the
//   classifier's own. The Narra and Mahogany leaf facts come from
//   lib/species-data.ts.

import Link from "next/link";

interface Step {
  /** Who acts in this step. */
  who: string;
  title: string;
  description: string;
  link?: { label: string; href: string };
  /** How the step is drawn. See the note at the top of this file. */
  kind: "you" | "ai" | "cenro";
}

const steps: Step[] = [
  {
    who: "You",
    title: "Take a leaf photo",
    description:
      "Photograph one clear leaf, or upload a photo you already have.",
    link: { label: "Identify a Tree", href: "/identify" },
    kind: "you",
  },
  {
    who: "The AI",
    title: "See the AI's suggestion",
    description:
      "The system suggests Mahogany, Non-Mahogany or Non-Tree, and shows how confident it is. This is a suggestion, not a decision.",
    kind: "ai",
  },
  {
    who: "You",
    title: "Report a Sighting",
    description:
      "Send the photo with the location and what you saw. You get a reference number.",
    link: { label: "Report a Sighting", href: "/report" },
    kind: "you",
  },
  {
    who: "CENRO",
    title: "CENRO reviews and decides",
    description:
      "CENRO staff look at every report and record the official decision. Nothing is cut or removed because of an AI result.",
    link: { label: "CENRO Staff Access", href: "/admin/login" },
    kind: "cenro",
  },
];

const lookAlikes = [
  {
    name: "Mahogany",
    detail: "Leaflets in pairs, with no single leaflet at the tip.",
  },
  {
    name: "Narra",
    detail: "7 to 11 leaflets, with one leaflet at the tip.",
  },
];

const textLink =
  "focus-ring inline-flex min-h-11 items-center rounded-md text-sm font-semibold underline underline-offset-4";

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="scroll-mt-16 border-t border-border bg-background py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-[96rem] px-6 lg:px-10 xl:px-16 2xl:px-24">
        <h2
          id="how-it-works-heading"
          className="section-title text-foreground"
        >
          How taking part works
        </h2>

        {/* ── The four steps ────────────────────────────────── */}
        <ol className="mt-10 grid gap-8 md:grid-cols-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.15fr)] lg:gap-8">
          {steps.map((step, index) => {
            const isCenro = step.kind === "cenro";
            return (
              <li
                key={step.title}
                className={
                  isCenro
                    ? "rounded-lg bg-primary p-6 text-primary-foreground md:col-span-3 lg:col-span-1"
                    : `border-t-2 pt-5 ${
                        step.kind === "ai"
                          ? "border-dashed border-foreground/60"
                          : "border-foreground"
                      }`
                }
              >
                <p
                  className={`text-sm font-medium ${
                    isCenro
                      ? "text-primary-foreground/85"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.who}
                </p>
                <p
                  aria-hidden="true"
                  className="mt-1 text-6xl font-extrabold leading-none [font-stretch:75%]"
                >
                  {index + 1}
                </p>
                <h3 className="mt-4 text-xl font-bold leading-snug">
                  {step.title}
                </h3>
                <p
                  className={`mt-2 text-base leading-relaxed ${
                    isCenro
                      ? "text-primary-foreground/90"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.description}
                </p>
                {step.link && (
                  <Link
                    href={step.link.href}
                    className={`${textLink} mt-3 ${
                      isCenro
                        ? "text-primary-foreground decoration-primary-foreground/50 hover:decoration-primary-foreground focus-visible:ring-offset-primary"
                        : "text-primary decoration-primary/40 hover:decoration-primary"
                    }`}
                  >
                    {step.link.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>

        {/* ── Mahogany or Narra ─────────────────────────────── */}
        <div className="mt-16 max-w-[46rem] lg:mt-20">
          <h3 className="text-2xl font-bold [font-stretch:85%] text-foreground">
            Check it is not Narra
          </h3>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Narra is the Philippine national tree and it is native. Its
            leaves can look similar.
          </p>

          <dl className="mt-5 border-t border-border">
            {lookAlikes.map((tree) => (
              <div
                key={tree.name}
                className="grid gap-1 border-b border-border py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6"
              >
                <dt className="text-base font-semibold text-foreground">
                  {tree.name}
                </dt>
                <dd className="m-0 text-base leading-relaxed text-muted-foreground">
                  {tree.detail}
                </dd>
              </div>
            ))}
          </dl>

          <Link
            href="/species"
            className={`${textLink} mt-4 text-primary decoration-primary/40 hover:decoration-primary`}
          >
            Compare species in the Species Guide
          </Link>
        </div>
      </div>
    </section>
  );
}
