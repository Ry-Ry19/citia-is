// components/admin/species-workspace.tsx
//
// WHAT: Compact, practical Species Reference Table and Management Guidance
//   tool for authenticated CENRO officers (/admin/species).
//
// THESIS RESEARCH ALIGNMENT:
//   - Aligned with CITIA-IS YOLOv8n-cls classification architecture (3 classes:
//     Mahogany, Non-Mahogany, Non-Tree).
//   - The table accurately reflects that the model predicts "Non-Mahogany" as a
//     broad negative class and does not classify Molave, Narra, or Yemane individually.
//   - Distinguishes confirmed thesis reference (Mahogany) from demonstration baselines.
//   - Informational guidance only: never presents AI results as tree-cutting authorization.
//
// DESIGN & RESPONSIVENESS:
//   - Aligned with CITIA-IS design system in app/globals.css.
//   - Compact 4-column table: Species | Classification | Reference status | Action.
//   - Expandable inline details without horizontal scroll or text container collisions.

"use client";

import { useState, useMemo, Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  ImageIcon,
  Info,
  Layers,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAllSpecies,
  type ReferenceStatus,
  type SpeciesClassification,
} from "@/lib/species-data";
import { cn } from "@/lib/utils";

export function SpeciesWorkspace() {
  const allSpecies = useMemo(() => getAllSpecies(), []);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassification, setSelectedClassification] = useState<SpeciesClassification | "All">("All");
  const [selectedStatus, setSelectedStatus] = useState<ReferenceStatus | "All">("All");

  // Inline expansion state: Default to Mahogany expanded for immediate reference
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(["sp-mahogany"])
  );

  // Active image map for multi-image records
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

  const expandAll = () => {
    setExpandedIds(new Set(allSpecies.map((s) => s.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Filtered list
  const filteredSpecies = useMemo(() => {
    return allSpecies.filter((sp) => {
      if (selectedClassification !== "All" && sp.classification !== selectedClassification) {
        return false;
      }
      if (selectedStatus !== "All" && sp.referenceStatus !== selectedStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName =
          sp.commonName.toLowerCase().includes(query) ||
          sp.scientificName.toLowerCase().includes(query);
        const matchesFamily = sp.family.toLowerCase().includes(query);
        const matchesDesc = sp.shortDescription.toLowerCase().includes(query);
        const matchesRec = sp.managementRecommendations.some(
          (r) =>
            r.title.toLowerCase().includes(query) ||
            r.purpose.toLowerCase().includes(query) ||
            r.guidance.toLowerCase().includes(query)
        );

        if (!matchesName && !matchesFamily && !matchesDesc && !matchesRec) {
          return false;
        }
      }
      return true;
    });
  }, [allSpecies, selectedClassification, selectedStatus, searchQuery]);

  const isFiltered =
    searchQuery.trim() !== "" ||
    selectedClassification !== "All" ||
    selectedStatus !== "All";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedClassification("All");
    setSelectedStatus("All");
  };

  return (
    <div className="w-full max-w-full space-y-6 overflow-hidden">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            CENRO Reference Information System
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Species &amp; Management Recommendations
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Compact botanical reference and informational management guidance for CITIA-IS study areas in Iligan City.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/species"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "text-xs text-muted-foreground hover:text-foreground"
            )}
          >
            Public Species Guide
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* ── Grounded Legal & Regulatory Disclaimer ──────────────────── */}
      <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3.5 w-full max-w-full">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="space-y-1 text-xs leading-relaxed text-muted-foreground min-w-0 flex-1">
          <p className="whitespace-normal break-words">
            <strong className="text-foreground font-semibold">
              Informational Decision-Support Tool.
            </strong>{" "}
            Species reference profiles and Management Recommendations assist CENRO officers during
            preliminary screening and field review. AI classifications (Mahogany, Non-Mahogany, Non-Tree)
            do <strong>NOT</strong> authorize tree cutting, pruning, or removal. All physical actions
            remain subject to on-site CENRO evaluation and official DENR permits under Presidential Decree No. 705.
          </p>
          <p className="text-[11px] text-muted-foreground/80 whitespace-normal break-words">
            The YOLOv8n-cls model classifies leaf images into three broad classes. Non-Mahogany entries
            illustrate negative-sample baselines and are not individually predicted by the AI model.
          </p>
        </div>
      </div>

      {/* ── Search & Filter Bar ────────────────────────────────────── */}
      <Card className="rounded-lg border border-border bg-card p-3.5 sm:p-4 w-full max-w-full">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search box */}
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search species name, family, or guidance…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs rounded-md w-full"
            />
          </div>

          {/* Filters & Expand toggles */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Classification select */}
            <select
              aria-label="Filter by Classification"
              value={selectedClassification}
              onChange={(e) =>
                setSelectedClassification(e.target.value as SpeciesClassification | "All")
              }
              className="h-8 rounded-md border border-border bg-card px-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="All">All Classifications</option>
              <option value="Mahogany">Mahogany</option>
              <option value="Non-Mahogany">Non-Mahogany</option>
            </select>

            {/* Status select */}
            <select
              aria-label="Filter by Reference Status"
              value={selectedStatus}
              onChange={(e) =>
                setSelectedStatus(e.target.value as ReferenceStatus | "All")
              }
              className="h-8 rounded-md border border-border bg-card px-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="All">All Reference Statuses</option>
              <option value="Confirmed thesis reference">Confirmed thesis reference</option>
              <option value="Demonstration">Demonstration</option>
            </select>

            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Reset
              </Button>
            )}

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border/60">
              <button
                type="button"
                onClick={expandAll}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              >
                Expand all
              </button>
              <span className="text-border">|</span>
              <button
                type="button"
                onClick={collapseAll}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              >
                Collapse all
              </button>
            </div>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/60">
          <span>
            Showing <strong className="text-foreground">{filteredSpecies.length}</strong> of{" "}
            <strong className="text-foreground">{allSpecies.length}</strong> reference entries
          </span>
          <span className="text-[11px] text-muted-foreground">
            Select &ldquo;View details&rdquo; to expand characteristics and recommendations
          </span>
        </div>
      </Card>

      {/* ── 4-Column Practical Reference Table ──────────────────────── */}
      <Card className="rounded-lg border border-border bg-card p-0 overflow-hidden w-full max-w-full">
        <div className="border-b border-border bg-muted/20 px-4 py-3">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            These are reference entries, not additional AI species classes.
            Molave, Narra, and Yemane are examples within the broad{" "}
            <strong className="font-semibold text-foreground">Non-Mahogany</strong>{" "}
            class; <strong className="font-semibold text-foreground">Non-Tree</strong>{" "}
            is not a species entry.
          </p>
        </div>
        <Table className="w-full">
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs pl-4 min-w-[200px]">Species</TableHead>
              <TableHead className="text-xs min-w-[140px]">Classification</TableHead>
              <TableHead className="text-xs min-w-[160px]">Reference status</TableHead>
              <TableHead className="text-right text-xs pr-4 w-28">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSpecies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-muted-foreground whitespace-normal">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Search className="h-6 w-6 text-muted-foreground/60" />
                    <p className="text-sm font-semibold text-foreground">
                      No matching species found
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      No reference entry matches &ldquo;{searchQuery}&rdquo; and active filters.
                    </p>
                    {isFiltered && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetFilters}
                        className="mt-2 text-xs h-8"
                      >
                        Reset filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredSpecies.map((sp) => {
                const isExpanded = expandedIds.has(sp.id);
                const hasImages = sp.images.length > 0;
                const activeImgIndex = activeImageMap[sp.id] ?? 0;
                const currentImage = hasImages
                  ? sp.images[activeImgIndex] ?? sp.images[0]
                  : null;

                return (
                  <Fragment key={sp.id}>
                    {/* Main Row */}
                    <TableRow
                      onClick={() => toggleExpand(sp.id)}
                      className={cn(
                        "cursor-pointer border-border transition-colors hover:bg-muted/40",
                        isExpanded && "bg-muted/20"
                      )}
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleExpand(sp.id);
                        }
                      }}
                    >
                      {/* Column 1: Species (Common name + Scientific name) */}
                      <TableCell className="pl-4 py-3.5 align-middle whitespace-normal">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground text-xs sm:text-sm leading-tight">
                            {sp.commonName}{" "}
                            <span className="font-normal italic text-muted-foreground">
                              ({sp.scientificName})
                            </span>
                          </p>
                          <p className="text-[11px] font-mono text-muted-foreground/80">
                            Family: {sp.family}
                          </p>
                        </div>
                      </TableCell>

                      {/* Column 2: Broad model-aligned classification */}
                      <TableCell className="py-3.5 align-middle whitespace-nowrap">
                        <div className="space-y-1">
                          <span
                            className={cn(
                              "inline-flex items-center rounded px-2.5 py-0.5 text-xs font-semibold border",
                              sp.classification === "Mahogany"
                                ? "bg-destructive/10 text-destructive border-destructive/30"
                                : "bg-primary/10 text-primary border-primary/30"
                            )}
                          >
                            {sp.classification}
                          </span>
                          {sp.classification === "Non-Mahogany" && (
                            <span className="block text-[10px] text-muted-foreground">
                              Broad model class
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Column 3: Reference status */}
                      <TableCell className="py-3.5 align-middle whitespace-nowrap">
                        {sp.isConfirmed ? (
                          <span className="inline-flex items-center gap-1.5 rounded bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            {sp.referenceStatus}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded bg-muted border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            {sp.referenceStatus}
                          </span>
                        )}
                      </TableCell>

                      {/* Column 4: Action */}
                      <TableCell className="pr-4 py-3.5 align-middle text-right whitespace-nowrap w-28">
                        <button
                          type="button"
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(sp.id);
                          }}
                        >
                          {isExpanded ? "Hide details" : "View details"}
                          {isExpanded ? (
                            <ChevronUp className="ml-1 h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0" />
                          )}
                        </button>
                      </TableCell>
                    </TableRow>

                    {/* Inline Expanded Detail Section */}
                    {isExpanded && (
                      <TableRow className="border-b border-border bg-card/90 hover:bg-card/90">
                        <TableCell colSpan={4} className="p-3 sm:p-5 whitespace-normal break-words max-w-full">
                          <div className="w-full max-w-full overflow-hidden space-y-5 rounded-lg border border-border bg-background/70 p-4 sm:p-5 whitespace-normal break-words">
                            {/* Overview & Source / Scope Status Card */}
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between border-b border-border pb-4 w-full min-w-0">
                              <div className="space-y-1 flex-1 min-w-0">
                                <h2 className="text-sm font-bold text-foreground">
                                  {sp.commonName} <em>({sp.scientificName})</em>
                                </h2>
                                <p className="text-xs leading-relaxed text-muted-foreground whitespace-normal break-words">
                                  {sp.shortDescription}
                                </p>
                                {sp.studyLocations && sp.studyLocations.length > 0 && (
                                  <div className="pt-1 flex flex-wrap items-center gap-1.5 text-xs">
                                    <span className="text-[11px] font-medium text-muted-foreground">
                                      Study Areas:
                                    </span>
                                    {sp.studyLocations.map((loc) => (
                                      <span
                                        key={loc}
                                        className="inline-flex items-center gap-1 rounded bg-muted/70 px-2 py-0.5 text-[10px] text-muted-foreground"
                                      >
                                        <MapPin className="h-2.5 w-2.5 text-primary shrink-0" />
                                        {loc}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="w-full lg:w-80 shrink-0 rounded-lg border border-border/80 bg-muted/40 p-3 space-y-1">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                                  Source &amp; Scope Verification
                                </span>
                                <span
                                  className={cn(
                                    "inline-block rounded px-2 py-0.5 text-[11px] font-medium border",
                                    sp.isConfirmed
                                      ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-400"
                                      : "border-border bg-muted text-muted-foreground"
                                  )}
                                >
                                  {sp.referenceStatus}
                                </span>
                                <p className="text-[11px] leading-relaxed text-muted-foreground whitespace-normal break-words mt-1">
                                  {sp.sourceAndScope}
                                </p>
                              </div>
                            </div>

                            {/* Identification Characteristics & Reference Imagery Split */}
                            <div className="grid gap-5 lg:grid-cols-12 w-full min-w-0">
                              {/* Left: Available Identification Characteristics (8 cols on lg) */}
                              <div className="space-y-3 lg:col-span-8 min-w-0">
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                    Leaf Characteristics
                                  </span>
                                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                                    Relevant to the scanner. These are botanical reference traits, not proof that the trained model explicitly learned or checks each feature.
                                  </p>
                                </div>

                                <dl className="grid gap-3 text-xs w-full min-w-0">
                                  <div className="rounded border border-primary/30 bg-primary/5 p-3 space-y-1 min-w-0">
                                    <dt className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                      Leaf Structure
                                    </dt>
                                    <dd className="text-foreground leading-relaxed whitespace-normal break-words">
                                      {sp.botanicalFeatures.leafStructure ?? sp.botanicalFeatures.leaves}
                                    </dd>
                                  </div>

                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="rounded border border-primary/30 bg-primary/5 p-3 space-y-1 min-w-0">
                                      <dt className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                        Leaflet Shape
                                      </dt>
                                      <dd className="text-foreground leading-relaxed whitespace-normal break-words">
                                        {sp.botanicalFeatures.leafletShape ?? (
                                          <span className="italic text-muted-foreground">
                                            Not separately recorded in the current dataset.
                                          </span>
                                        )}
                                      </dd>
                                    </div>

                                    <div className="rounded border border-primary/30 bg-primary/5 p-3 space-y-1 min-w-0">
                                      <dt className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                        Leaf Color &amp; Surface
                                      </dt>
                                      <dd className="text-foreground leading-relaxed whitespace-normal break-words">
                                        {sp.botanicalFeatures.leafColorSurface ?? (
                                          <span className="italic text-muted-foreground">
                                            Not separately recorded in the current dataset.
                                          </span>
                                        )}
                                      </dd>
                                    </div>
                                  </div>
                                </dl>

                                <div className="space-y-3 pt-2">
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                      Additional Botanical Characteristics
                                    </span>
                                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                                      Reference only for human verification; these characteristics are not directly assessed by a leaf-only scan.
                                    </p>
                                  </div>

                                  <dl className="grid gap-3 sm:grid-cols-3 text-xs w-full min-w-0">
                                    {[
                                      ["Growth Habit & Form", sp.botanicalFeatures.habit],
                                      ["Fruit & Seed", sp.botanicalFeatures.fruitAndSeed],
                                      ["Bark & Trunk", sp.botanicalFeatures.barkAndForm],
                                    ].map(([label, value]) => (
                                      <div key={label} className="rounded border border-border bg-card p-3 space-y-1 min-w-0">
                                        <dt className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                          {label}
                                        </dt>
                                        <dd className="text-foreground leading-relaxed whitespace-normal break-words">
                                          {value ?? (
                                            <span className="italic text-muted-foreground">
                                              Unrecorded in current dataset.
                                            </span>
                                          )}
                                        </dd>
                                      </div>
                                    ))}
                                  </dl>
                                </div>
                              </div>

                              {/* Right: Reference Imagery (4 cols on lg) */}
                              <div className="space-y-2.5 lg:col-span-4 min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                  Reference Imagery
                                </span>

                                {hasImages && currentImage ? (
                                  <div className="space-y-2">
                                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-border bg-card">
                                      <Image
                                        src={currentImage.url}
                                        alt={currentImage.caption}
                                        fill
                                        sizes="(max-width: 1024px) 100vw, 320px"
                                        className="object-cover"
                                      />
                                      <div className="absolute inset-x-0 bottom-0 bg-black/80 p-2 text-[10px] text-white">
                                        <p className="line-clamp-2 leading-tight">
                                          {currentImage.caption}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Thumbnail picker if multiple images */}
                                    {sp.images.length > 1 && (
                                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                                        {sp.images.map((img, idx) => (
                                          <button
                                            key={img.id}
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveImageMap((prev) => ({
                                                ...prev,
                                                [sp.id]: idx,
                                              }));
                                            }}
                                            className={cn(
                                              "relative h-12 w-16 shrink-0 overflow-hidden rounded border text-left transition-all",
                                              activeImgIndex === idx
                                                ? "border-primary ring-1 ring-primary"
                                                : "border-border opacity-70 hover:opacity-100"
                                            )}
                                            aria-label={`View photo ${idx + 1}`}
                                          >
                                            <Image
                                              src={img.url}
                                              alt={img.caption}
                                              fill
                                              sizes="64px"
                                              className="object-cover"
                                            />
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/30 p-6 text-center">
                                    <ImageIcon className="h-6 w-6 text-muted-foreground/60 mb-1.5" />
                                    <p className="text-xs font-semibold text-foreground">
                                      No Image on File
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed whitespace-normal break-words">
                                      Representative entry for the Non-Mahogany negative training class.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Supported Management Guidance */}
                            <div className="space-y-3 pt-3 border-t border-border w-full min-w-0">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                                    Operational Guidance
                                  </span>
                                  <h3 className="text-sm font-bold text-foreground">
                                    Supported Management Recommendations ({sp.managementRecommendations.length})
                                  </h3>
                                </div>

                                {sp.isConfirmed && (
                                  <Link
                                    href="/admin/reports"
                                    className={cn(
                                      buttonVariants({ variant: "outline", size: "sm" }),
                                      "h-8 text-xs text-muted-foreground hover:text-foreground shrink-0 w-fit"
                                    )}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <FileText className="mr-1.5 h-3.5 w-3.5 text-primary shrink-0" />
                                    Review Sighting Reports
                                  </Link>
                                )}
                              </div>

                              <div className="space-y-3 w-full min-w-0">
                                {sp.managementRecommendations.map((rec, rIdx) => (
                                  <div
                                    key={rec.id}
                                    className="rounded-lg border border-border bg-card p-4 space-y-2.5 text-xs w-full min-w-0"
                                  >
                                    <div className="flex items-start gap-2 border-b border-border pb-2">
                                      <span className="font-mono text-xs font-bold text-primary shrink-0 mt-0.5">
                                        [{rIdx + 1}]
                                      </span>
                                      <h4 className="font-semibold text-foreground text-xs sm:text-sm leading-snug break-words">
                                        {rec.title}
                                      </h4>
                                    </div>

                                    <div className="space-y-1.5 leading-relaxed">
                                      <p className="whitespace-normal break-words">
                                        <strong className="text-foreground font-semibold">Purpose: </strong>
                                        <span className="text-muted-foreground">{rec.purpose}</span>
                                      </p>
                                      <p className="whitespace-normal break-words">
                                        <strong className="text-foreground font-semibold">Guidance: </strong>
                                        <span className="text-muted-foreground">{rec.guidance}</span>
                                      </p>
                                    </div>

                                    <div className="rounded bg-muted/40 p-2.5 border border-border/60">
                                      <span className="font-semibold text-foreground block text-[11px]">
                                        On-Site Verification Requirements:
                                      </span>
                                      <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-normal break-words mt-0.5">
                                        {rec.verificationRequirements}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ── Thesis AI Architecture Scope Reference Card ──────────────── */}
      <Card className="rounded-lg border border-border bg-card p-4 space-y-3 w-full max-w-full">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Layers className="h-4 w-4 text-primary shrink-0" />
          <h2 className="text-sm font-bold text-foreground">
            CITIA-IS Classification Scope Note (YOLOv8n-cls)
          </h2>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed whitespace-normal break-words">
          The CITIA-IS model operates exclusively in <strong className="text-foreground">image classification mode</strong> using
          a lightweight YOLOv8n-cls model trained on three classes. Understanding this boundary ensures CENRO officers correctly interpret predictions:
        </p>

        <div className="grid gap-3 sm:grid-cols-3 text-xs w-full min-w-0">
          <div className="rounded-md border border-destructive/30 bg-muted/20 p-3 space-y-1 min-w-0">
            <span className="font-mono text-xs font-bold text-destructive block">
              Class 0: Mahogany
            </span>
            <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-normal break-words">
              <em>Swietenia macrophylla</em>. Primary research target. Sighting report workflow active for community documentation.
            </p>
          </div>

          <div className="rounded-md border border-primary/30 bg-muted/20 p-3 space-y-1 min-w-0">
            <span className="font-mono text-xs font-bold text-primary block">
              Class 1: Non-Mahogany
            </span>
            <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-normal break-words">
              Broad negative flora class (native/introduced trees and plants). The model does not predict individual non-target species names.
            </p>
          </div>

          <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1 min-w-0">
            <span className="font-mono text-xs font-bold text-muted-foreground block">
              Class 2: Non-Tree
            </span>
            <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-normal break-words">
              Broad negative non-leaf/background class. Prompts the user to capture a clear, well-lit leaf photograph.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
