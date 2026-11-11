"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ImageIcon, Search } from "lucide-react";
import { getAllSpecies, type SpeciesRecord } from "@/lib/species-data";
import { cn } from "@/lib/utils";

type ReferenceFilter = "all" | "target" | "comparison";

function getReferenceLabel(species: SpeciesRecord) {
  return species.isConfirmed ? "Target Species" : "Reference Species";
}

export function SpeciesReferenceBrowser() {
  const species = useMemo(() => getAllSpecies(), []);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ReferenceFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredSpecies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return species.filter((entry) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "target" && entry.isConfirmed) ||
        (filter === "comparison" && !entry.isConfirmed);
      const matchesQuery =
        normalizedQuery.length === 0 ||
        entry.commonName.toLowerCase().includes(normalizedQuery) ||
        entry.scientificName.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [filter, query, species]);

  return (
    <section
      aria-labelledby="browse-species-references-heading"
      className="border-t border-border bg-background px-4 py-16 sm:px-6"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Reference Library
          </p>
          <h2
            id="browse-species-references-heading"
            className="section-title mt-3 font-bold text-foreground"
          >
            Browse Species References
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Browse the target species reference and educational reference
            species used to explain the CITIA-IS scope. The model predicts
            Mahogany, Non-Mahogany, or Non-Tree; it does not identify these
            reference species individually.
          </p>
        </div>

        <div className="mt-7 flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-sm">
            <span className="sr-only">Search species references</span>
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search common or scientific name"
              className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>

          <div
            className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1"
            aria-label="Filter species references"
          >
            {([
              ["all", "All References"],
              ["target", "Target Species"],
              ["comparison", "Reference Species"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  filter === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredSpecies.length > 0 ? (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filteredSpecies.map((entry) => {
              const isExpanded = expandedId === entry.id;
              const image = entry.images[0];

              return (
                <article
                  key={entry.id}
                  className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card"
                >
                  <div className="relative aspect-[4/3] bg-muted">
                    {image ? (
                      <Image
                        src={image.url}
                        alt={`${entry.commonName} reference image`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
                        <ImageIcon className="h-7 w-7" aria-hidden="true" />
                        <p className="text-xs">No reference image on file</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          "inline-flex rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
                          entry.isConfirmed
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border bg-muted text-muted-foreground"
                        )}
                      >
                        {getReferenceLabel(entry)}
                      </span>
                      <span className="text-right text-[10px] leading-tight text-muted-foreground">
                        {entry.referenceStatus}
                      </span>
                    </div>

                    <h3 className="mt-4 text-base font-bold text-foreground">
                      {entry.commonName}
                    </h3>
                    <p className="mt-0.5 text-sm italic text-muted-foreground">
                      {entry.scientificName}
                    </p>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {entry.isConfirmed
                        ? "Primary species reference for the Mahogany-focused CITIA-IS identification workflow."
                        : "Educational reference entry representing the broad Non-Mahogany class, not an individual AI prediction."}
                    </p>

                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() =>
                        setExpandedId(isExpanded ? null : entry.id)
                      }
                      className="mt-5 inline-flex min-h-9 items-center justify-center gap-1.5 border-t border-border pt-3 text-left text-xs font-semibold text-primary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {entry.isConfirmed
                        ? "View featured guide"
                        : "View reference details"}
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <ChevronDown
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
                        {entry.isConfirmed ? (
                          <a
                            href="#featured-species-heading"
                            className="font-semibold text-primary underline-offset-4 hover:underline"
                          >
                            Jump to the Big-leaf Mahogany guide above.
                          </a>
                        ) : (
                          <>
                            <p>{entry.shortDescription}</p>
                            <p className="mt-2">
                              This entry is for human comparison and reference
                              only. A Non-Mahogany result does not identify{" "}
                              {entry.commonName} specifically.
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-7 rounded-xl border border-dashed border-border bg-card px-5 py-10 text-center">
            <p className="text-sm font-semibold text-foreground">
              No matching species references
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different name or clear the selected filter.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
