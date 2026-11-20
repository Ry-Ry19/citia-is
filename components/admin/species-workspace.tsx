// components/admin/species-workspace.tsx
//
// WHAT: The Species & Management Recommendations page for CENRO staff
//   (/admin/species) — a searchable list of the reference species, each
//   opening to its Management Recommendations and botanical details.
//
// HOW IT IS LAID OUT:
//   - Each species is one row. Selecting the row opens it in place.
//   - Inside an open species, Management Recommendations come first, as
//     a two-column grid. Each recommendation shows its title and purpose;
//     the guidance and on-site verification open on request.
//   - The longer reference text (leaf characteristics, other botanical
//     characteristics, source and scope) sits in sections that open on
//     request, so an officer can scan the titles first.
//   The sections that open and close are native <details> elements, so
//   they work with a keyboard and a screen reader without extra code.
//
// WHAT THE AI DOES AND DOES NOT DO:
//   The model predicts three classes: Mahogany, Non-Mahogany, Non-Tree.
//   "Non-Mahogany" is one broad class; the model never names Molave,
//   Narra or Yemane. Nothing on this page authorizes tree cutting.
//
// DATA: everything shown comes from lib/species-data.ts, unchanged. Two
//   labels are reworded for display only (see REFERENCE_LABEL below).

"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  ExternalLink,
  ImagePlus,
  MapPin,
  RotateCcw,
  Search,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getAllSpecies,
  type ReferenceStatus,
  type SpeciesClassification,
  type SpeciesRecord,
} from "@/lib/species-data";
import { cn } from "@/lib/utils";

/**
 * How a species' reference status is worded on this page. The values in
 * the data file are unchanged; only the label shown to staff differs.
 */
const REFERENCE_LABEL: Record<ReferenceStatus, string> = {
  "Confirmed thesis reference": "Target species",
  Demonstration: "Comparison species",
};

/** The "source and scope" text without its leading status sentence. */
function scopeText(text: string) {
  return text.replace(/^(Confirmed thesis reference|Demonstration baseline)\.\s*/, "");
}

const selectClass =
  "focus-ring h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground";

/** A section that opens and closes. Closed unless `defaultOpen` is set. */
function Disclosure({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group/d border-t border-border">
      <summary className="focus-ring flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-sm py-3 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-base font-semibold text-foreground">
            {title}
          </span>
          {hint && (
            <span className="block text-sm text-muted-foreground">{hint}</span>
          )}
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open/d:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </summary>
      <div className="pb-5">{children}</div>
    </details>
  );
}

/** A "term / detail" list, the same pattern as the public Species Guide. */
function FactList({ items }: { items: [string, string | undefined][] }) {
  return (
    <dl className="border-t border-border">
      {items.map(([term, detail]) => (
        <div
          key={term}
          className="grid gap-1 border-b border-border py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6"
        >
          <dt className="text-sm font-semibold text-foreground">{term}</dt>
          <dd className="m-0 text-sm leading-relaxed text-muted-foreground">
            {detail ?? "Not recorded."}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SpeciesWorkspace() {
  const allSpecies = useMemo(() => getAllSpecies(), []);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassification, setSelectedClassification] = useState<
    SpeciesClassification | "All"
  >("All");
  const [selectedStatus, setSelectedStatus] = useState<ReferenceStatus | "All">("All");

  // Which species are open. Mahogany starts open: it is the one staff
  // need most often.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(["sp-mahogany"])
  );
  // Which photo is showing for a species that has several.
  const [activeImageMap, setActiveImageMap] = useState<Record<string, number>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredSpecies = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return allSpecies.filter((sp) => {
      if (selectedClassification !== "All" && sp.classification !== selectedClassification) {
        return false;
      }
      if (selectedStatus !== "All" && sp.referenceStatus !== selectedStatus) {
        return false;
      }
      if (!query) return true;
      return (
        sp.commonName.toLowerCase().includes(query) ||
        sp.scientificName.toLowerCase().includes(query) ||
        sp.family.toLowerCase().includes(query) ||
        sp.shortDescription.toLowerCase().includes(query) ||
        sp.managementRecommendations.some(
          (r) =>
            r.title.toLowerCase().includes(query) ||
            r.purpose.toLowerCase().includes(query) ||
            r.guidance.toLowerCase().includes(query)
        )
      );
    });
  }, [allSpecies, selectedClassification, selectedStatus, searchQuery]);

  const isFiltered =
    searchQuery.trim() !== "" ||
    selectedClassification !== "All" ||
    selectedStatus !== "All";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedClassification("All");
    setSelectedStatus("All");
  };

  const allOpen =
    filteredSpecies.length > 0 &&
    filteredSpecies.every((sp) => expandedIds.has(sp.id));

  return (
    <div className="space-y-6">
      {/* ── Page header ───────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="section-title text-foreground">
            Species &amp; Management Recommendations
          </h1>
          <p className="mt-2 max-w-[44rem] text-base leading-relaxed text-muted-foreground">
            Reference profiles and Management Recommendations for screening
            and field review. They are informational: AI results do not
            authorize tree cutting, pruning or removal, which need a CENRO
            assessment and DENR permits under Presidential Decree No. 705.
          </p>
        </div>

        <Link
          href="/species"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-10 shrink-0 px-4 text-sm"
          )}
        >
          Public Species Guide
          <ExternalLink className="ml-2 h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab)</span>
        </Link>
      </div>

      {/* ── Search and filters ────────────────────────────────── */}
      <div className="flex flex-col gap-3 border-y border-border py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <label className="relative block w-full sm:w-80">
            <span className="sr-only">Search species or guidance</span>
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Search species or guidance"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full border-input bg-card pl-9 text-sm"
            />
          </label>

          <select
            aria-label="Filter by AI class"
            value={selectedClassification}
            onChange={(e) =>
              setSelectedClassification(e.target.value as SpeciesClassification | "All")
            }
            className={selectClass}
          >
            <option value="All">All AI classes</option>
            <option value="Mahogany">Mahogany</option>
            <option value="Non-Mahogany">Non-Mahogany</option>
          </select>

          <select
            aria-label="Filter by reference type"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ReferenceStatus | "All")}
            className={selectClass}
          >
            <option value="All">All reference types</option>
            {(Object.keys(REFERENCE_LABEL) as ReferenceStatus[]).map((status) => (
              <option key={status} value={status}>
                {REFERENCE_LABEL[status]}
              </option>
            ))}
          </select>

          {isFiltered && (
            <Button
              variant="ghost"
              onClick={resetFilters}
              className="h-10 px-3 text-sm text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Reset
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span aria-live="polite">
            <strong className="font-semibold text-foreground">
              {filteredSpecies.length}
            </strong>{" "}
            of {allSpecies.length} species
          </span>
          {filteredSpecies.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setExpandedIds(
                  allOpen ? new Set() : new Set(filteredSpecies.map((s) => s.id))
                )
              }
              className="focus-ring min-h-10 rounded-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
            >
              {allOpen ? "Close all" : "Open all"}
            </button>
          )}
        </div>
      </div>

      {/* ── Species list ──────────────────────────────────────── */}
      {filteredSpecies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
          <p className="text-base font-semibold text-foreground">
            No species match
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different name, or clear the filters.
          </p>
          <Button variant="outline" onClick={resetFilters} className="mt-4 h-10 text-sm">
            Clear filters
          </Button>
        </div>
      ) : (
        <ul className="m-0 list-none space-y-3 p-0">
          {filteredSpecies.map((sp) => (
            <SpeciesEntry
              key={sp.id}
              species={sp}
              isOpen={expandedIds.has(sp.id)}
              onToggle={() => toggleExpand(sp.id)}
              activeImage={activeImageMap[sp.id] ?? 0}
              onPickImage={(index) =>
                setActiveImageMap((prev) => ({ ...prev, [sp.id]: index }))
              }
            />
          ))}
        </ul>
      )}

      {/* ── What the AI classifies ────────────────────────────── */}
      <section className="rounded-lg border border-border bg-card px-5">
        <Disclosure
          title="How the AI classifies a leaf photo"
          hint="Three broad classes. It does not name individual species."
        >
          <FactList
            items={[
              [
                "Mahogany",
                "Swietenia macrophylla. The target species. A report of it goes to CENRO for review.",
              ],
              [
                "Non-Mahogany",
                "Any other tree or plant, native or introduced. The model does not say which species it is, so Molave, Narra and Yemane all fall here.",
              ],
              [
                "Non-Tree",
                "A photo with no clear leaf in it. The reporter is asked for a clearer, well-lit leaf photo.",
              ],
            ]}
          />
        </Disclosure>
      </section>
    </div>
  );
}

function SpeciesEntry({
  species: sp,
  isOpen,
  onToggle,
  activeImage,
  onPickImage,
}: {
  species: SpeciesRecord;
  isOpen: boolean;
  onToggle: () => void;
  activeImage: number;
  onPickImage: (index: number) => void;
}) {
  const panelId = `species-panel-${sp.id}`;
  const image = sp.images[activeImage] ?? sp.images[0] ?? null;
  const isTarget = sp.classification === "Mahogany";

  return (
    <li
      className={cn(
        "overflow-hidden rounded-lg border bg-card transition-colors",
        isOpen ? "border-foreground/30" : "border-border"
      )}
    >
      {/* ── Row: the whole row opens and closes the species ──── */}
      <h2 className="m-0">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-[minmax(0,1fr)_11rem_11rem_auto]"
        >
          <span className="min-w-0">
            <span className="block text-lg font-bold leading-snug text-foreground">
              {sp.commonName}
            </span>
            <span className="block text-sm text-muted-foreground">
              <em>{sp.scientificName}</em>, {sp.family}
            </span>
          </span>

          {/* The AI class. Heartwood marks the target species, as on
              the public pages. */}
          <span className="col-start-1 row-start-2 text-sm md:col-start-2 md:row-start-1">
            <span className="block text-xs text-muted-foreground">AI class</span>
            <span
              className={cn(
                "font-semibold",
                isTarget ? "text-heartwood" : "text-foreground"
              )}
            >
              {sp.classification}
            </span>
          </span>

          <span className="hidden text-sm md:block">
            <span className="block text-xs text-muted-foreground">Reference type</span>
            <span className="font-semibold text-foreground">
              {REFERENCE_LABEL[sp.referenceStatus]}
            </span>
          </span>

          <ChevronDown
            className={cn(
              "col-start-2 row-span-2 row-start-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none md:col-start-4 md:row-span-1",
              isOpen && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>
      </h2>

      {/* ── Details ──────────────────────────────────────────── */}
      {isOpen && (
        <div id={panelId} className="border-t border-border px-5 pb-2 pt-5">
          {/* Summary: description, study areas and the photo */}
          <div className="grid gap-6 pb-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div>
              <p className="max-w-[44rem] text-base leading-relaxed text-foreground">
                {sp.shortDescription}
              </p>
              {sp.studyLocations && sp.studyLocations.length > 0 && (
                <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Study areas</span>
                  {sp.studyLocations.map((loc) => (
                    <span key={loc} className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {loc}
                    </span>
                  ))}
                </p>
              )}
              {isTarget && (
                <Link
                  href="/admin/reports"
                  className={cn(buttonVariants(), "mt-5 h-10 px-4 text-sm font-semibold")}
                >
                  Review sighting reports
                </Link>
              )}
            </div>

            <figure className="m-0">
              {image ? (
                <>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-surface-tint">
                    <Image
                      src={image.url}
                      alt={image.caption}
                      fill
                      sizes="(max-width: 1023px) 100vw, 20rem"
                      className="object-cover"
                    />
                  </div>
                  <figcaption className="mt-2 text-sm leading-snug text-muted-foreground">
                    {image.caption}
                  </figcaption>
                  {sp.images.length > 1 && (
                    <div className="mt-2 flex gap-2">
                      {sp.images.map((img, index) => (
                        <button
                          key={img.id}
                          type="button"
                          aria-label={`Show photo ${index + 1} of ${sp.images.length}`}
                          aria-pressed={activeImage === index}
                          onClick={() => onPickImage(index)}
                          className={cn(
                            "focus-ring relative h-12 w-16 shrink-0 overflow-hidden rounded border-2 transition-opacity",
                            activeImage === index
                              ? "border-primary"
                              : "border-transparent opacity-70 hover:opacity-100"
                          )}
                        >
                          <Image
                            src={img.url}
                            alt=""
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-md bg-surface-tint text-center text-sm text-muted-foreground">
                  <ImagePlus className="h-5 w-5" aria-hidden="true" />
                  No photo on file
                </div>
              )}
            </figure>
          </div>

          {/* Management Recommendations: open first, two columns */}
          <Disclosure
            title={`Management Recommendations (${sp.managementRecommendations.length})`}
            hint="Open a recommendation for its guidance and on-site checks."
            defaultOpen
          >
            {sp.managementRecommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No Management Recommendations are recorded for this species.
              </p>
            ) : (
              <ol className="m-0 grid list-none grid-cols-1 items-start gap-4 p-0 md:grid-cols-2">
                {sp.managementRecommendations.map((rec, index) => (
                  <li key={rec.id}>
                    <details className="group/r rounded-lg border border-border bg-background open:border-foreground/30">
                      <summary className="focus-ring flex cursor-pointer list-none items-start gap-3 rounded-lg p-4 [&::-webkit-details-marker]:hidden">
                        <span
                          aria-hidden="true"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
                        >
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-semibold leading-snug text-foreground">
                            {rec.title}
                          </span>
                          <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                            {rec.purpose}
                          </span>
                        </span>
                        <ChevronDown
                          className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open/r:rotate-180 motion-reduce:transition-none"
                          aria-hidden="true"
                        />
                      </summary>
                      <dl className="m-0 space-y-3 border-t border-border px-4 py-4 text-sm leading-relaxed">
                        <div>
                          <dt className="font-semibold text-foreground">Guidance</dt>
                          <dd className="m-0 mt-0.5 text-muted-foreground">
                            {rec.guidance}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-foreground">
                            On-site verification
                          </dt>
                          <dd className="m-0 mt-0.5 text-muted-foreground">
                            {rec.verificationRequirements}
                          </dd>
                        </div>
                      </dl>
                    </details>
                  </li>
                ))}
              </ol>
            )}
          </Disclosure>

          <Disclosure
            title="Leaf characteristics"
            hint="Reference traits a leaf photo may show. Not proof of what the model checks."
          >
            <FactList
              items={[
                [
                  "Leaf structure",
                  sp.botanicalFeatures.leafStructure ?? sp.botanicalFeatures.leaves,
                ],
                ["Leaflet shape", sp.botanicalFeatures.leafletShape],
                ["Leaf colour and surface", sp.botanicalFeatures.leafColorSurface],
              ]}
            />
          </Disclosure>

          <Disclosure
            title="Other botanical characteristics"
            hint="For field verification. A leaf photo cannot show these."
          >
            <FactList
              items={[
                ["Growth habit and form", sp.botanicalFeatures.habit],
                ["Fruit and seed", sp.botanicalFeatures.fruitAndSeed],
                ["Bark and trunk", sp.botanicalFeatures.barkAndForm],
              ]}
            />
          </Disclosure>

          <Disclosure title="Source and scope">
            <p className="max-w-[44rem] text-sm leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">
                {REFERENCE_LABEL[sp.referenceStatus]}.
              </span>{" "}
              {scopeText(sp.sourceAndScope)}
            </p>
          </Disclosure>
        </div>
      )}
    </li>
  );
}
