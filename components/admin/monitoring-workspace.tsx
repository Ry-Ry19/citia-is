// components/admin/monitoring-workspace.tsx
//
// WHAT: The Environmental Monitoring page for CENRO staff — a map of
//   sighting reports beside the list of the same reports.
//
// ONE SELECTION, SHARED BY EVERYTHING:
//   `selectedReportId` is the single source of truth.
//   - Clicking a pin on the map sets it. The list highlights that report
//     and scrolls it into view, and the preview panel shows it.
//   - Clicking a report in the list sets it. The map flies to its pin and
//     pulses it.
//
// ONE FILTERED LIST, SHARED BY EVERYTHING:
//   The study-area and status filters produce `filteredReports`. The map
//   and the list are both given that same list, so a filter always
//   changes the pins and the rows together. If a filter hides the
//   selected report, the selection moves to the first report still
//   shown.
//
// DATA: the reports come from the CITIA-IS API, loaded on the server by
//   app/admin/monitoring/page.tsx. Reports without coordinates stay in
//   the list and are marked; they are never given an invented position
//   on the map.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ImageIcon,
  ListFilter,
  Loader2,
  MapPin,
  MapPinOff,
  Map as MapIcon,
  Navigation,
  RotateCcw,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { statusVariant, type AdminReport, type ReportStatus } from "@/lib/admin-reports";
import { cn } from "@/lib/utils";

// Leaflet needs the browser's `window`, so the map is loaded only in the
// browser (ssr: false).
const DynamicMonitoringMap = dynamic(
  () =>
    import("@/components/admin/monitoring-map").then((mod) => mod.MonitoringMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[inherit] w-full items-center justify-center rounded-lg border border-border bg-surface-tint text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" aria-hidden="true" />
        Loading the map…
      </div>
    ),
  }
);

const ALL_AREAS = "All Study Areas";
const STUDY_AREAS = [ALL_AREAS, "Palao Medical", "Dalipuga", "NPC Area"] as const;

const STATUS_FILTERS: { label: string; value: ReportStatus | "All" }[] = [
  { label: "All", value: "All" },
  { label: "Pending", value: "Pending" },
  { label: "Verified", value: "Verified" },
  { label: "Rejected", value: "Rejected" },
];

/** The dot colour and symbol for each review status (theme colours). */
const STATUS_DOT: Record<ReportStatus, { className: string; symbol: string }> = {
  Verified: { className: "bg-success text-background", symbol: "✓" },
  Pending: { className: "bg-warning text-black", symbol: "!" },
  Rejected: { className: "bg-destructive text-white", symbol: "✕" },
};

function applyFilters(
  reports: AdminReport[],
  area: string,
  status: ReportStatus | "All"
) {
  return reports.filter(
    (r) =>
      (area === ALL_AREAS || r.studyArea === area) &&
      (status === "All" || r.reviewStatus === status)
  );
}

export function MonitoringWorkspace({ reports }: { reports: AdminReport[] }) {
  const [selectedArea, setSelectedArea] = useState<string>(ALL_AREAS);
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | "All">("All");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    () => reports.find((r) => r.coordinates)?.id ?? reports[0]?.id ?? null
  );
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const listRef = useRef<HTMLDivElement>(null);

  const filteredReports = useMemo(
    () => applyFilters(reports, selectedArea, selectedStatus),
    [reports, selectedArea, selectedStatus]
  );
  const mappedCount = filteredReports.filter((r) => r.coordinates).length;
  const unmappedCount = filteredReports.length - mappedCount;
  const selectedReport =
    filteredReports.find((r) => r.id === selectedReportId) ?? null;
  const isFiltered = selectedArea !== ALL_AREAS || selectedStatus !== "All";

  // Changing a filter keeps the selection if that report is still shown;
  // otherwise it moves to the first report that is (a mapped one first).
  function changeFilters(area: string, status: ReportStatus | "All") {
    setSelectedArea(area);
    setSelectedStatus(status);
    const next = applyFilters(reports, area, status);
    if (!next.some((r) => r.id === selectedReportId)) {
      setSelectedReportId(
        (next.find((r) => r.coordinates) ?? next[0])?.id ?? null
      );
    }
  }

  // Keep the selected row visible inside the scrolling list. Only the
  // list scrolls, never the page.
  useEffect(() => {
    const list = listRef.current;
    if (!list || !selectedReportId) return;
    const row = list.querySelector<HTMLElement>(
      `[data-report-id="${CSS.escape(selectedReportId)}"]`
    );
    if (!row) return;
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < list.scrollTop) {
      list.scrollTo({ top, behavior: "smooth" });
    } else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTo({ top: bottom - list.clientHeight, behavior: "smooth" });
    }
  }, [selectedReportId]);

  return (
    <div className="space-y-6">
      {/* ── Page header ───────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="section-title text-foreground">
            Environmental Monitoring
          </h1>
          <p className="mt-2 max-w-[44rem] text-base leading-relaxed text-muted-foreground">
            Where community Mahogany sightings have been reported across the
            study areas. A pin marks a report; it does not authorize tree
            cutting or removal.
          </p>
        </div>

        {/* Phones show the map or the list, one at a time. */}
        <div
          role="group"
          aria-label="Choose map or list"
          className="flex shrink-0 gap-1 rounded-lg border border-border bg-muted p-1 lg:hidden"
        >
          {(
            [
              { value: "map", label: "Map", icon: MapIcon },
              { value: "list", label: `List (${filteredReports.length})`, icon: ListFilter },
            ] as const
          ).map((view) => (
            <button
              key={view.value}
              type="button"
              aria-pressed={mobileView === view.value}
              onClick={() => setMobileView(view.value)}
              className={cn(
                "focus-ring flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
                mobileView === view.value
                  ? "bg-card font-semibold text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <view.icon className="h-4 w-4" aria-hidden="true" />
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filters and counts ────────────────────────────────── */}
      <div className="flex flex-col gap-3 border-y border-border py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="sr-only">Study area</span>
            <select
              value={selectedArea}
              onChange={(e) => changeFilters(e.target.value, selectedStatus)}
              className="focus-ring h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground"
            >
              {STUDY_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </label>

          <div
            role="group"
            aria-label="Filter by review status"
            className="flex gap-1 rounded-md border border-border bg-muted p-1"
          >
            {STATUS_FILTERS.map((s) => (
              <button
                key={s.value}
                type="button"
                aria-pressed={selectedStatus === s.value}
                onClick={() => changeFilters(selectedArea, s.value)}
                className={cn(
                  "focus-ring min-h-8 rounded px-3 text-sm font-medium transition-colors",
                  selectedStatus === s.value
                    ? "bg-card font-semibold text-foreground shadow-xs"
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
              onClick={() => changeFilters(ALL_AREAS, "All")}
              className="h-10 px-3 text-sm text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Reset
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground" aria-live="polite">
          <strong className="font-semibold text-foreground">{filteredReports.length}</strong>{" "}
          {filteredReports.length === 1 ? "report" : "reports"},{" "}
          <strong className="font-semibold text-foreground">{mappedCount}</strong> on the map
          {unmappedCount > 0 && (
            <>
              , <strong className="font-semibold text-foreground">{unmappedCount}</strong>{" "}
              without coordinates
            </>
          )}
        </p>
      </div>

      {/* ── Map and list ──────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Map */}
        <div
          className={cn(
            "min-h-[26rem] lg:col-span-7 lg:min-h-[40rem] xl:col-span-8",
            mobileView === "list" && "hidden lg:block"
          )}
        >
          {mappedCount === 0 ? (
            <div className="flex h-full min-h-[inherit] flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
              <MapPinOff className="mb-3 h-9 w-9 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-base font-semibold text-foreground">
                Nothing to show on the map
              </h2>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {filteredReports.length === 0
                  ? "No reports match these filters."
                  : "The reports that match these filters have no coordinates. They are still in the list."}
              </p>
              {isFiltered && (
                <Button
                  variant="outline"
                  onClick={() => changeFilters(ALL_AREAS, "All")}
                  className="mt-4 h-10 text-sm"
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <DynamicMonitoringMap
              reports={filteredReports}
              selectedReportId={selectedReport?.id ?? null}
              onSelectReport={setSelectedReportId}
              selectedArea={selectedArea}
            />
          )}
        </div>

        {/* Preview and list */}
        <div
          className={cn(
            "flex flex-col gap-4 lg:col-span-5 xl:col-span-4",
            mobileView === "map" && "hidden lg:flex"
          )}
        >
          {/* The selected report */}
          {selectedReport ? (
            <section
              aria-label="Selected report"
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-bold tabular-nums text-foreground">
                    {selectedReport.referenceNumber}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedReport.studyArea} · {selectedReport.displayDate}
                  </p>
                </div>
                <StatusBadge
                  label={selectedReport.reviewStatus}
                  variant={statusVariant(selectedReport.reviewStatus)}
                />
              </div>

              <div className="mt-3 flex gap-3">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-tint">
                  {selectedReport.photoUrl ? (
                    // A plain <img>: the photo comes from a private, staff-only route.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedReport.photoUrl}
                      alt={`Leaf photo for report ${selectedReport.referenceNumber}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1 text-sm">
                  <p className="leading-snug text-foreground">
                    {selectedReport.specificLocation}
                  </p>
                  <p className="text-muted-foreground">
                    AI suggestion:{" "}
                    {selectedReport.aiClassification ? (
                      <>
                        <strong className="font-semibold text-foreground">
                          {selectedReport.aiClassification.label}
                        </strong>
                        {selectedReport.aiClassification.confidence != null &&
                          ` (${Math.round(selectedReport.aiClassification.confidence * 100)}%)`}
                      </>
                    ) : (
                      "not classified"
                    )}
                  </p>
                  {selectedReport.coordinates ? (
                    <p className="flex items-center gap-1.5 tabular-nums text-muted-foreground">
                      <Navigation className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                      {selectedReport.coordinates.lat.toFixed(4)}° N,{" "}
                      {selectedReport.coordinates.lng.toFixed(4)}° E
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPinOff className="h-3.5 w-3.5" aria-hidden="true" />
                      No coordinates supplied
                    </p>
                  )}
                </div>
              </div>

              <Link
                href={`/admin/reports/${selectedReport.id}`}
                className={cn(buttonVariants(), "mt-4 h-10 w-full text-sm font-semibold")}
              >
                Open report
              </Link>
            </section>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Select a pin or a report to see its details.
            </p>
          )}

          {/* The list */}
          <section
            aria-label="Sighting reports"
            className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card"
          >
            <h2 className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
              Sighting reports ({filteredReports.length})
            </h2>

            <div
              ref={listRef}
              className="relative max-h-[26rem] divide-y divide-border overflow-y-auto"
            >
              {filteredReports.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <p>No reports match these filters.</p>
                  <Button
                    variant="outline"
                    onClick={() => changeFilters(ALL_AREAS, "All")}
                    className="mt-3 h-10 text-sm"
                  >
                    Clear filters
                  </Button>
                </div>
              ) : (
                filteredReports.map((report) => {
                  const isSelected = report.id === selectedReport?.id;
                  const dot = STATUS_DOT[report.reviewStatus];

                  return (
                    <button
                      key={report.id}
                      type="button"
                      data-report-id={report.id}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedReportId(report.id)}
                      className={cn(
                        "flex w-full items-start gap-3 border-l-4 px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-transparent hover:bg-muted"
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          dot.className
                        )}
                      >
                        {dot.symbol}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold tabular-nums text-foreground">
                            {report.referenceNumber}
                          </span>
                          <span className="whitespace-nowrap text-xs text-muted-foreground">
                            {report.displayDate}
                          </span>
                        </span>
                        <span className="block truncate text-sm text-foreground">
                          {report.studyArea}
                          <span className="sr-only">, {report.reviewStatus}</span>
                        </span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {report.specificLocation}
                        </span>
                        {!report.coordinates && (
                          <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPinOff className="h-3 w-3" aria-hidden="true" />
                            Not on the map: no coordinates
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
