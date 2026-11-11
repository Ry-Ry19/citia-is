import Link from "next/link";
import { ArrowRight, Camera, MapPin } from "lucide-react";

export function CTABanner() {
  return (
    <section
      aria-labelledby="closing-cta-heading"
      className="border-t border-border bg-card px-4 py-12 sm:px-6 sm:py-14"
    >
      <div className="mx-auto grid max-w-6xl gap-8 rounded-xl border border-border bg-background p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Take the next step
          </p>
          <h2
            id="closing-cta-heading"
            className="mt-2 max-w-2xl text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            Ready to learn or share what you found?
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Check a leaf photo or report a Mahogany sighting from your
            community. No account is needed for public features.
          </p>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[18rem] lg:grid-cols-1">
          <Link
            href="/identify"
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            Identify a Tree
          </Link>
          <Link
            href="/report"
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Report a Sighting
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
