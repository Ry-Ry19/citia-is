// components/admin/monitoring-workspace.tsx
//
// WHAT: Interactive Environmental Monitoring Workspace for CENRO officers.
//
// FEATURES:
//   - Synchronized split layout: Map view (left) and Report List (right)
//   - Filterable by focal study area (Palao Medical, Dalipuga, NPC Area)
//   - Filterable by review status (All, Pending, Verified, Rejected)
//   - Dynamic client loading of Leaflet map (SSR safe)
//   - Interactive marker and list item synchronization
//   - Honest empty states for unmapped reports and missing coordinates
//   - Deep linking to Report Details (/admin/reports/[id])

"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import {
  AlertCircle,
  ExternalLink,
  ImageIcon,
  Info,
  ListFilter,
  Loader2,
  MapPin,
  Map as MapIcon,
  Navigation,
  RotateCcw,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import {
  getStoredReports,
  type ReportStatus,
  type SightingReport,
} from "@/lib/reports-data";
import { cn } from "@/lib/utils";

// Dynamically load the Leaflet map with SSR disabled to prevent window object errors
const DynamicMonitoringMap = dynamic(
  () =>
    import("@/components/admin/monitoring-map").then((mod) => mod.MonitoringMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[450px] w-full items-center justify-center rounded-lg border border-border bg-neutral-950 text-xs text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
        Loading environmental monitoring map…
      </div>
    ),
  }
);

const STUDY_AREAS = [
  "All Study Areas",
  "Palao Medical",
  "Dalipuga",
  "NPC Area",
] as const;

const STATUS_FILTERS: { label: string; value: ReportStatus | "All" }[] = [
  { label: "All Statuses", value: "All" },
  { label: "Pending", value: "Pending" },
  { label: "Verified", value: "Verified" },
  { label: "Rejected", value: "Rejected" },
];

export function MonitoringWorkspace() {
  const [reports] = useState<SightingReport[]>(() => getStoredReports());
  const [selectedArea, setSelectedArea] = useState<string>("All Study Areas");
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | "All">("All");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(() => {
    const data = getStoredReports();
    return data.find((r) => r.coordinates)?.id ?? null;
  });
  const [mobileView, setMobileView] = useState<"map" | "list">("map");

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (selectedArea !== "All Study Areas" && r.studyArea !== selectedArea) {
        return false;
      }
      if (selectedStatus !== "All" && r.reviewStatus !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [reports, selectedArea, selectedStatus]);

  const reportsWithCoords = useMemo(
    () => filteredReports.filter((r) => r.coordinates),
    [filteredReports]
  );

  const reportsWithoutCoords = useMemo(
    () => filteredReports.filter((r) => !r.coordinates),
    [filteredReports]
  );

  const selectedReport = useMemo(() => {
    return reports.find((r) => r.id === selectedReportId) || null;
  }, [reports, selectedReportId]);

  const resetFilters = () => {
    setSelectedArea("All Study Areas");
    setSelectedStatus("All");
  };

  const isFiltered =
    selectedArea !== "All Study Areas" || selectedStatus !== "All";

  return (
    <div className="space-y-6">
      {/* ── 1. Page Header ────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-primary">
            CENRO Iligan City · Spatial Analysis
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Environmental Monitoring
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Geographic distribution of community Mahogany sightings across focal study areas.
          </p>
        </div>

        {/* Mobile View Toggle */}
        <div className="flex items-center rounded-lg border border-border bg-muted/60 p-1 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileView("map")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
              mobileView === "map"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MapIcon className="h-3.5 w-3.5" /> Map View
          </button>
          <button
            type="button"
            onClick={() => setMobileView("list")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
              mobileView === "list"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ListFilter className="h-3.5 w-3.5" /> Report List ({filteredReports.length})
          </button>
        </div>
      </div>

      {/* ── 2. Data Honesty & Environmental Disclaimer ───────── */}
      <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">
            Demonstration Spatial Workspace.
          </span>{" "}
          Plotted pins reflect simulated community records across Palao Medical,
          Dalipuga, and NPC Area. Only observations with verified GPS
          coordinates are placed on the map. Sighting markers do{" "}
          <strong className="text-foreground">NOT</strong> authorize tree
          cutting or removal; all actions remain subject to CENRO assessment.
        </p>
      </div>

      {/* ── 3. Filter Bar & Location Summary ─────────────────── */}
      <Card className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {/* Study Area Dropdown */}
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <select
                aria-label="Filter by focal study area"
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="h-8 rounded-md border border-border bg-card px-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
              >
                {STUDY_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1 rounded-md border border-border bg-muted/60 p-0.5">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSelectedStatus(s.value)}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    selectedStatus === s.value
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Reset
              </Button>
            )}
          </div>

          {/* Counts metrics */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              Total: <strong className="text-foreground">{filteredReports.length}</strong>
            </span>
            <span>&middot;</span>
            <span>
              Mapped: <strong className="text-primary">{reportsWithCoords.length}</strong>
            </span>
            {reportsWithoutCoords.length > 0 && (
              <>
                <span>&middot;</span>
                <span className="text-amber-400">
                  No GPS: <strong>{reportsWithoutCoords.length}</strong>
                </span>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* ── 4. Split Layout (Map & Synchronized List) ────────── */}
      <div className="grid gap-6 lg:grid-cols-12 min-h-[580px]">
        {/* Map Panel (7 cols on lg, or shown when mobileView === 'map') */}
        <div
          className={cn(
            "lg:col-span-7 flex flex-col min-h-[480px] lg:min-h-[580px]",
            mobileView === "list" && "hidden lg:flex"
          )}
        >
          {reportsWithCoords.length === 0 ? (
            <Card className="flex flex-1 flex-col items-center justify-center p-8 text-center border-dashed">
              <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">
                No Geographic Coordinates Plotted
              </h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                None of the {filteredReports.length} reports in the current filter
                contain verified latitude and longitude values. Unmapped reports
                remain accessible in the list.
              </p>
              {isFiltered && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="mt-3 text-xs h-8"
                >
                  Clear Filters
                </Button>
              )}
            </Card>
          ) : (
            <DynamicMonitoringMap
              reports={filteredReports}
              selectedReportId={selectedReportId}
              onSelectReport={setSelectedReportId}
              selectedArea={selectedArea}
            />
          )}
        </div>

        {/* Synchronized List & Preview Panel (5 cols on lg) */}
        <div
          className={cn(
            "lg:col-span-5 flex flex-col gap-4",
            mobileView === "map" && "hidden lg:flex"
          )}
        >
          {/* Active Sighting Preview Card */}
          {selectedReport && (
            <Card className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-border">
                <div>
                  <span className="font-mono text-xs font-bold text-primary">
                    {selectedReport.referenceNumber}
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">
                    {selectedReport.studyArea}
                  </h3>
                </div>
                <StatusBadge
                  label={selectedReport.reviewStatus}
                  variant={
                    selectedReport.reviewStatus === "Verified"
                      ? "success"
                      : selectedReport.reviewStatus === "Rejected"
                        ? "destructive"
                        : "warning"
                  }
                />
              </div>

              <div className="flex gap-3">
                {/* Thumbnail */}
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded border border-border bg-muted flex items-center justify-center">
                  {selectedReport.photos[0] ? (
                    <Image
                      src={selectedReport.photos[0].url}
                      alt={selectedReport.photos[0].caption}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                  )}
                </div>

                <div className="space-y-1 min-w-0 flex-1 text-xs">
                  <p className="text-muted-foreground truncate" title={selectedReport.specificLocation}>
                    {selectedReport.specificLocation}
                  </p>
                  <p className="text-xs text-foreground">
                    AI: <strong>{selectedReport.aiClassification.label}</strong>{" "}
                    ({Math.round(selectedReport.aiClassification.confidence * 100)}%)
                  </p>
                  {selectedReport.coordinates ? (
                    <p className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                      <Navigation className="h-3 w-3 text-primary" />
                      {selectedReport.coordinates.lat.toFixed(4)}° N,{" "}
                      {selectedReport.coordinates.lng.toFixed(4)}° E
                    </p>
                  ) : (
                    <p className="text-xs text-amber-400 italic">
                      No coordinates supplied
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-border flex justify-end">
                <Link
                  href={`/admin/reports/${selectedReport.id}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "h-8 text-xs font-medium"
                  )}
                >
                  Open Full Report
                  <ExternalLink className="ml-1.5 h-3 w-3" />
                </Link>
              </div>
            </Card>
          )}

          {/* Filtered Reports List */}
          <Card className="rounded-lg border border-border bg-card p-0 flex-1 flex flex-col overflow-hidden max-h-[500px]">
            <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Sighting Submissions ({filteredReports.length})
              </span>
              <span className="text-xs text-muted-foreground">
                Click to inspect &amp; locate
              </span>
            </div>

            <div className="overflow-y-auto divide-y divide-border/60">
              {filteredReports.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No reports match the selected filters.
                </div>
              ) : (
                filteredReports.map((report) => {
                  const isSelected = report.id === selectedReportId;
                  const hasCoords = Boolean(report.coordinates);

                  return (
                    <button
                      key={report.id}
                      type="button"
                      onClick={() => setSelectedReportId(report.id)}
                      className={cn(
                        "w-full text-left p-3 transition-colors flex items-start gap-3",
                        isSelected
                          ? "bg-primary/10 border-l-[3px] border-primary"
                          : "hover:bg-muted/40 border-l-[3px] border-transparent"
                      )}
                    >
                      {/* Status indicator icon */}
                      <span
                        className={cn(
                          "mt-0.5 h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white",
                          report.reviewStatus === "Verified" && "bg-[#1f4d33]",
                          report.reviewStatus === "Rejected" && "bg-red-500",
                          report.reviewStatus === "Pending" && "bg-amber-500 text-black"
                        )}
                        aria-hidden="true"
                      >
                        {report.reviewStatus === "Verified"
                          ? "✓"
                          : report.reviewStatus === "Rejected"
                            ? "✕"
                            : "!"}
                      </span>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {report.referenceNumber}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {report.displayDate}
                          </span>
                        </div>

                        <p className="text-xs text-foreground font-medium truncate">
                          {report.studyArea}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {report.specificLocation}
                        </p>

                        {!hasCoords && (
                          <span className="inline-block mt-1 text-xs text-amber-400/90 font-medium bg-amber-500/10 px-1.5 py-0.2 rounded">
                            No coordinates
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
