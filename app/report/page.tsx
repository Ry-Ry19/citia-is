// app/report/page.tsx
//
// WHAT: The "Report a Sighting" page — a short introduction, what
//   happens after a report is sent, and the report form.
//
// This page only arranges. The fields, the map, the photo and the
// request to the API all live in components/report-form.tsx.
//
// LAYOUT: on large screens the introduction sits in a narrow column on
//   the left and stays in view while the visitor scrolls the form on
//   the right. On phones the introduction comes first, then the form.

import Link from "next/link";
import { ReportForm } from "@/components/report-form";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

const whatHappensNext = [
  "You get a reference number as soon as the report is sent.",
  "CENRO staff review every report.",
  "AI results are preliminary and do not authorize tree cutting or removal.",
];

export default function ReportPage() {
  return (
    <div id="top" className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-[96rem] px-4 pb-16 pt-24 sm:px-6 sm:pt-28 lg:px-10 xl:px-16 2xl:px-24">
        <div className="grid gap-10 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-14 xl:grid-cols-[22rem_minmax(0,1fr)]">
          {/* ── Introduction ──────────────────────────────────── */}
          <header className="lg:sticky lg:top-24 lg:self-start">
            <h1 className="section-title text-foreground">
              Report a Sighting
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-foreground/85">
              Share what you observed so CENRO can review and document
              possible Mahogany sightings across Iligan City.
            </p>

            <h2 className="mt-8 text-base font-bold text-foreground">
              What happens next
            </h2>
            <ul className="mt-3 border-t border-border">
              {whatHappensNext.map((line) => (
                <li
                  key={line}
                  className="border-b border-border py-3 text-base leading-relaxed text-muted-foreground"
                >
                  {line}
                </li>
              ))}
            </ul>

            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              Not sure it is Mahogany?{" "}
              <Link
                href="/identify"
                className="focus-ring rounded-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
              >
                Check a leaf photo first
              </Link>
            </p>
          </header>

          {/* ── The form ──────────────────────────────────────── */}
          <div className="min-w-0">
            <ReportForm />
          </div>
        </div>
      </main>

      <Toaster />
      <Footer />
    </div>
  );
}
