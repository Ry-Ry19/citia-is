// components/admin/load-problem.tsx
//
// WHAT: The message an admin screen shows when its data cannot be loaded
//   (the CITIA-IS API, the database or storage is unreachable). It says
//   what happened and offers a way back, instead of an empty or broken
//   screen.

import Link from "next/link";
import { CloudOff } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LoadProblem({
  what,
  backHref,
  backLabel,
}: {
  /** What could not be loaded, e.g. "the reports". */
  what: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-lg border border-dashed border-border px-6 py-14 text-center"
    >
      <CloudOff className="h-9 w-9 text-muted-foreground" aria-hidden="true" />
      <h1 className="mt-3 text-lg font-semibold text-foreground">
        {what.charAt(0).toUpperCase() + what.slice(1)} could not be loaded
      </h1>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
        The CITIA-IS service did not answer. Check that the backend is running, then
        refresh the page.
      </p>
      {backHref && (
        <Link
          href={backHref}
          className={cn(buttonVariants({ variant: "outline" }), "mt-5 h-10 text-sm")}
        >
          {backLabel ?? "Go back"}
        </Link>
      )}
    </div>
  );
}
