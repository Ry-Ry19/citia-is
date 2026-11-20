// components/landing/cta-banner.tsx
//
// WHAT: The closing band of the landing page — one question and the
//   two community actions, so the page ends by asking the visitor to
//   do something.
//
// The two buttons use the same icons, labels and links as the buttons
// in the hero and the top bar (leaf = identify, map pin = report), so
// an action looks the same wherever it appears.
//
// There is no movement here on purpose: two sections above already
// move, and the page should end still.

import Link from "next/link";
import { Leaf, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTABanner() {
  return (
    <section
      id="get-started"
      aria-labelledby="closing-cta-heading"
      className="scroll-mt-16 border-t border-border bg-surface-tint py-16 sm:py-20"
    >
      <div className="mx-auto grid max-w-[96rem] gap-10 px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-20 lg:px-10 xl:px-16 2xl:px-24">
        <div>
          <h2
            id="closing-cta-heading"
            className="section-title max-w-[12em] text-foreground"
          >
            Seen a tree you are not sure about?
          </h2>
          <p className="mt-5 max-w-[34rem] text-lg leading-relaxed text-foreground/85">
            Check a leaf photo or report a Mahogany sighting from your
            community. No account is needed.
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

          <Link
            href="/species"
            className="focus-ring mt-1 inline-flex min-h-11 items-center self-start rounded-md text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
          >
            Or read the Species Guide first
          </Link>
        </div>
      </div>
    </section>
  );
}
