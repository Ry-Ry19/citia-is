// components/species-reference-browser.tsx
//
// WHAT: The "Browse Species References" part of the Species Guide — a
//   searchable comparison list of the species described in
//   lib/species-data.ts.
//
// WHY A LIST: each species is one row (photo, names, description), so a
//   visitor can read the trees against each other. The description is
//   always visible; only the "how to read this entry" note is tucked
//   behind a button.
//
// PHOTOS: a species with a photo shows it. A species without one shows
//   a small "photo to add" square. When a photo is added to the
//   species data, it appears here with no change to this file.
//
// IMPORTANT: the classifier predicts Mahogany, Non-Mahogany or
//   Non-Tree. It does not identify the reference species one by one;
//   the note above the list and the note in each entry say so.

"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronDown, ImagePlus, Search } from "lucide-react";
import { getAllSpecies, type SpeciesRecord } from "@/lib/species-data";
import { cn } from "@/lib/utils";

type ReferenceFilter = "all" | "target" | "comparison";

const filters: { value: ReferenceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "target", label: "Target species" },
  { value: "comparison", label: "Reference species" },
];

function getReferenceLabel(species: SpeciesRecord) {
  return species.isConfirmed ? "Target species" : "Reference species";
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
      className="border-t border-border bg-background py-14 sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-[96rem] px-6 lg:px-10 xl:px-16 2xl:px-24">
        <h2
          id="browse-species-references-heading"
          className="section-title text-foreground"
        >
          Browse Species References
        </h2>
        <p className="mt-5 max-w-[44rem] text-base leading-relaxed text-muted-foreground">
          Browse the target species reference and educational reference
          species used to explain the CITIA-IS scope. The model predicts
          Mahogany, Non-Mahogany, or Non-Tree; it does not identify these
          reference species individually.
        </p>

        {/* ── Search and filters ────────────────────────────── */}
        <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="relative block w-full md:max-w-md">
            <span className="sr-only">Search species references</span>
            <Search
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search common or scientific name"
              className="h-12 w-full rounded-lg border border-input bg-card pl-10 pr-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <div
            role="group"
            aria-label="Filter species references"
            className="flex flex-wrap gap-2"
          >
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={filter === item.value}
                onClick={() => setFilter(item.value)}
                className={cn(
                  "focus-ring min-h-11 rounded-lg border px-4 text-sm font-medium transition-colors",
                  filter === item.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-card text-foreground hover:border-primary"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── The list ──────────────────────────────────────── */}
        {filteredSpecies.length > 0 ? (
          <ul className="mt-6 border-t border-border">
            {filteredSpecies.map((entry) => {
              const isExpanded = expandedId === entry.id;
              const image = entry.images[0];
              const noteId = `species-note-${entry.id}`;

              return (
                <li
                  key={entry.id}
                  className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-5 gap-y-3 border-b border-border py-6 sm:grid-cols-[7rem_minmax(0,1fr)] lg:grid-cols-[7rem_minmax(0,18rem)_minmax(0,1fr)] lg:gap-x-10"
                >
                  {/* Photo, or a slot waiting for one */}
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-tint lg:row-span-2">
                    {image ? (
                      <Image
                        src={image.url}
                        alt={`${entry.commonName} reference image`}
                        fill
                        sizes="7rem"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-1 px-1 text-center text-muted-foreground">
                        <ImagePlus className="h-5 w-5" aria-hidden="true" />
                        <p className="text-xs leading-tight">Photo to add</p>
                      </div>
                    )}
                  </div>

                  {/* Names and what kind of entry this is */}
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold leading-snug text-foreground">
                      {entry.commonName}
                    </h3>
                    <p className="mt-0.5 text-base italic text-muted-foreground">
                      {entry.scientificName}
                    </p>
                    <p className="mt-2 text-sm">
                      <span
                        className={cn(
                          "font-semibold",
                          entry.isConfirmed ? "text-primary" : "text-foreground"
                        )}
                      >
                        {getReferenceLabel(entry)}
                      </span>
                      <span className="block text-muted-foreground">
                        {entry.referenceStatus}
                      </span>
                    </p>
                  </div>

                  {/* Description, always visible */}
                  <div className="col-span-2 min-w-0 lg:col-span-1">
                    <p className="max-w-[44rem] text-base leading-relaxed text-muted-foreground">
                      {entry.shortDescription}
                    </p>

                    {entry.isConfirmed ? (
                      // Links to the Overview section, not to its heading:
                      // the section stops below the page's two fixed bars,
                      // so the heading is not hidden under them.
                      <a
                        href="#profile-overview"
                        className="focus-ring mt-2 inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
                      >
                        Go to the Mahogany guide
                      </a>
                    ) : (
                      <>
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-controls={noteId}
                          onClick={() =>
                            setExpandedId(isExpanded ? null : entry.id)
                          }
                          className="focus-ring mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-semibold text-primary"
                        >
                          About this entry
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform duration-200 motion-reduce:transition-none",
                              isExpanded && "rotate-180"
                            )}
                            aria-hidden="true"
                          />
                        </button>

                        {isExpanded && (
                          <p
                            id={noteId}
                            className="mt-1 max-w-[44rem] border-l-4 border-border pl-4 text-base leading-relaxed text-muted-foreground"
                          >
                            This entry is for human comparison and reference
                            only. A Non-Mahogany result does not identify{" "}
                            {entry.commonName} specifically.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-6 border-y border-border py-10">
            <p className="text-lg font-semibold text-foreground">
              No matching species references
            </p>
            <p className="mt-1 text-base text-muted-foreground">
              Try a different name or clear the selected filter.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
