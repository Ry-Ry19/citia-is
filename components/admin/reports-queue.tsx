// components/admin/reports-queue.tsx
//
// WHAT: Interactive CENRO Reports Queue for reviewing community submissions.
//
// FEATURES:
//   - Search by reference, location, and notes
//   - Filter by review status (All, Pending, Verified, Rejected)
//   - Filter by study area (Palao Medical, Dalipuga, NPC Area)
//   - Image thumbnail preview with graceful fallback
//   - Row navigation to individual Report Detail view
//   - Empty states and live demo state synchronization

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Filter,
  ImageIcon,
  Info,
  MapPin,
  RotateCcw,
  Search,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/common/status-badge";
import {
  getStoredReports,
  type ReportStatus,
  type SightingReport,
} from "@/lib/reports-data";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { label: string; value: ReportStatus | "All" }[] = [
  { label: "All Statuses", value: "All" },
  { label: "Pending", value: "Pending" },
  { label: "Verified", value: "Verified" },
  { label: "Rejected", value: "Rejected" },
];

const STUDY_AREAS = [
  "All Study Areas",
  "Palao Medical",
  "Dalipuga",
  "NPC Area",
] as const;

export function ReportsQueue() {
  const [reports] = useState<SightingReport[]>(() => getStoredReports());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | "All">("All");
  const [selectedArea, setSelectedArea] = useState<string>("All Study Areas");

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // Status filter
      if (selectedStatus !== "All" && report.reviewStatus !== selectedStatus) {
        return false;
      }

      // Study Area filter
      if (
        selectedArea !== "All Study Areas" &&
        report.studyArea !== selectedArea
      ) {
        return false;
      }

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesRef = report.referenceNumber.toLowerCase().includes(query);
        const matchesLoc =
          report.studyArea.toLowerCase().includes(query) ||
          report.specificLocation.toLowerCase().includes(query);
        const matchesNotes = report.communityNotes.toLowerCase().includes(query);
        const matchesAi = report.aiClassification.label.toLowerCase().includes(query);

        if (!matchesRef && !matchesLoc && !matchesNotes && !matchesAi) {
          return false;
        }
      }

      return true;
    });
  }, [reports, selectedStatus, selectedArea, searchQuery]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedStatus("All");
    setSelectedArea("All Study Areas");
  };

  const isFiltered =
    searchQuery !== "" ||
    selectedStatus !== "All" ||
    selectedArea !== "All Study Areas";

  return (
    <div className="space-y-6">
      {/* ── Page Header & Notice ───────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          CENRO Environmental Monitoring
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Reports Queue
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Review, verify, and document community-submitted tree observations
          across Iligan City study areas.
        </p>
      </div>

      {/* Demo Mode Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">
            Demonstration Mode.
          </span>{" "}
          Review decisions made during this session are stored locally in your
          browser session for preview testing. Live PostgreSQL database
          synchronization will connect in subsequent backend phases.
        </p>
      </div>

      {/* ── Search & Filter Bar ────────────────────────────────────── */}
      <Card className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search reference, location, or notes…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs rounded-md"
            />
          </div>

          {/* Filter dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status pills */}
            <div className="flex items-center gap-1 rounded-md border border-border bg-muted/60 p-0.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedStatus(opt.value)}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    selectedStatus === opt.value
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Study Area Select */}
            <div className="relative">
              <select
                aria-label="Filter by study area"
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

            {/* Reset button if filtered */}
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
        </div>
      </Card>

      {/* ── Reports Table ─────────────────────────────────────────── */}
      <Card className="rounded-lg border border-border bg-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-16 text-xs pl-4">Photo</TableHead>
                <TableHead className="text-xs">Reference</TableHead>
                <TableHead className="hidden text-xs md:table-cell">
                  Date Submitted
                </TableHead>
                <TableHead className="text-xs">Study Area &amp; Location</TableHead>
                <TableHead className="hidden text-xs sm:table-cell">
                  AI Classification
                </TableHead>
                <TableHead className="text-xs">Review Status</TableHead>
                <TableHead className="text-right text-xs pr-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Filter className="h-6 w-6 text-muted-foreground/60" />
                      <p className="text-sm font-semibold text-foreground">
                        No reports match these filters
                      </p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        Try clearing your search query or adjusting status and
                        study area selections.
                      </p>
                      {isFiltered && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetFilters}
                          className="mt-2 text-xs h-8"
                        >
                          Clear all filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((report) => {
                  const hasPhoto = report.photos.length > 0;
                  const firstPhoto = hasPhoto ? report.photos[0] : null;

                  const statusVariant =
                    report.reviewStatus === "Verified"
                      ? "success"
                      : report.reviewStatus === "Rejected"
                        ? "destructive"
                        : "warning";

                  return (
                    <TableRow
                      key={report.id}
                      className="border-border hover:bg-muted/40 transition-colors"
                    >
                      {/* Photo Thumbnail */}
                      <TableCell className="pl-4 py-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border border-border bg-muted flex items-center justify-center">
                          {firstPhoto ? (
                            <Image
                              src={firstPhoto.url}
                              alt={firstPhoto.caption || "Report thumbnail"}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : (
                            <ImageIcon
                              className="h-4 w-4 text-muted-foreground/50"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      </TableCell>

                      {/* Reference Number */}
                      <TableCell className="font-mono text-xs font-semibold text-foreground py-3">
                        <Link
                          href={`/admin/reports/${report.id}`}
                          className="hover:text-primary transition-colors hover:underline focus-ring rounded"
                        >
                          {report.referenceNumber}
                        </Link>
                      </TableCell>

                      {/* Date Submitted */}
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground py-3 whitespace-nowrap">
                        {report.displayDate}
                      </TableCell>

                      {/* Study Area & Location */}
                      <TableCell className="text-xs py-3 max-w-[220px]">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-primary shrink-0" />
                            {report.studyArea}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate" title={report.specificLocation}>
                            {report.specificLocation}
                          </span>
                        </div>
                      </TableCell>

                      {/* AI Classification */}
                      <TableCell className="hidden sm:table-cell text-xs py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {report.aiClassification.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {(report.aiClassification.confidence * 100).toFixed(1)}% confidence
                          </span>
                        </div>
                      </TableCell>

                      {/* CENRO Review Status */}
                      <TableCell className="py-3">
                        <StatusBadge
                          label={report.reviewStatus}
                          variant={statusVariant}
                        />
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right pr-4 py-3">
                        <Link
                          href={`/admin/reports/${report.id}`}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "h-8 rounded-md px-3 text-xs"
                          )}
                        >
                          Review
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>
            Showing {filteredReports.length} of {reports.length} demonstration reports
          </span>
          <span className="text-[11px]">
            {filteredReports.filter((r) => r.reviewStatus === "Pending").length} pending review
          </span>
        </div>
      </Card>
    </div>
  );
}
