// components/admin/reports-queue.tsx
//
// WHAT: The CENRO Reports Queue (/admin/reports): every sighting report,
//   newest first, with filters, search and pages.
//
// HOW FILTERING WORKS: the filters live in the page address
//   (?status=pending_review&area=palao&q=purok&page=2). Changing one
//   loads that address, and the server asks the CITIA-IS API for exactly
//   that page. So the list is always the database's answer, a filtered
//   view can be bookmarked or shared with a colleague, and the Back button
//   works.
//
// The list holds no reporter names or contacts; those are only on the
// review page of each report.

"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ImageIcon, Loader2, MapPin, RotateCcw, Search } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  STUDY_AREA_LABEL,
  statusVariant,
  type ReportPage,
  type StatusCode,
  type StudyAreaCode,
} from "@/lib/admin-reports";
import { cn } from "@/lib/utils";

export interface QueueFilters {
  status: StatusCode | null;
  area: StudyAreaCode | null;
  q: string;
  page: number;
}

const STATUS_OPTIONS: { label: string; value: StatusCode | null }[] = [
  { label: "All", value: null },
  { label: "Pending", value: "pending_review" },
  { label: "Verified", value: "verified" },
  { label: "Rejected", value: "rejected" },
];

export function ReportsQueue({
  page,
  filters,
}: {
  page: ReportPage;
  filters: QueueFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.q);

  // Loads the queue for a new set of filters. Any change other than the
  // page number starts again from page 1.
  function go(changes: Partial<QueueFilters>) {
    const next = { ...filters, page: 1, ...changes };
    const params = new URLSearchParams();
    if (next.status) params.set("status", next.status);
    if (next.area) params.set("area", next.area);
    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.page > 1) params.set("page", String(next.page));
    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    go({ q: search });
  }

  const isFiltered = Boolean(filters.status || filters.area || filters.q);
  const first = page.total === 0 ? 0 : page.offset + 1;
  const last = page.offset + page.items.length;
  const pages = Math.max(1, Math.ceil(page.total / page.limit));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title text-foreground">Reports Queue</h1>
        <p className="mt-2 max-w-[44rem] text-base leading-relaxed text-muted-foreground">
          Every community sighting report, newest first. Open a report to look at the
          photo and record a decision.
        </p>
      </div>

      {/* ── Filters ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 border-y border-border py-3 lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={submitSearch} role="search" className="flex w-full gap-2 lg:max-w-md">
          <label className="relative block flex-1">
            <span className="sr-only">Search by reference, barangay or landmark</span>
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={search}
              maxLength={100}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Reference, barangay or landmark"
              className="h-10 border-input bg-card pl-9 text-sm"
            />
          </label>
          <Button type="submit" variant="outline" className="h-10 px-4 text-sm">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Filter by review status"
            className="flex gap-1 rounded-md border border-border bg-muted p-1"
          >
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                aria-pressed={filters.status === option.value}
                onClick={() => go({ status: option.value })}
                className={cn(
                  "focus-ring min-h-8 rounded px-3 text-sm font-medium transition-colors",
                  filters.status === option.value
                    ? "bg-card font-semibold text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter by study area"
            value={filters.area ?? ""}
            onChange={(event) => go({ area: (event.target.value || null) as StudyAreaCode | null })}
            className="focus-ring h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground"
          >
            <option value="">All study areas</option>
            {(Object.keys(STUDY_AREA_LABEL) as StudyAreaCode[]).map((code) => (
              <option key={code} value={code}>
                {STUDY_AREA_LABEL[code]}
              </option>
            ))}
          </select>

          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                go({ status: null, area: null, q: "" });
              }}
              className="h-10 px-3 text-sm text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* ── The list ──────────────────────────────────────────── */}
      <div
        className={cn(
          "overflow-hidden rounded-lg border border-border bg-card transition-opacity",
          isPending && "opacity-60"
        )}
        aria-busy={isPending}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16 pl-4 text-sm">
                  <span className="sr-only">Photo</span>
                </TableHead>
                <TableHead className="text-sm">Reference</TableHead>
                <TableHead className="hidden text-sm md:table-cell">Submitted</TableHead>
                <TableHead className="text-sm">Study area and location</TableHead>
                <TableHead className="hidden text-sm sm:table-cell">AI suggestion</TableHead>
                <TableHead className="text-sm">Review status</TableHead>
                <TableHead className="pr-4 text-right text-sm">
                  <span className="sr-only">Action</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.items.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-14 text-center">
                    <p className="text-base font-semibold text-foreground">
                      {isFiltered ? "No reports match these filters" : "No reports yet"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {isFiltered
                        ? "Try another search, or reset the filters."
                        : "Reports sent from the Report a Sighting page will appear here."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                page.items.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="py-3 pl-4">
                      <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-md bg-surface-tint">
                        {report.photoUrl ? (
                          // A plain <img>: the photo comes from a private, staff-only route.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={report.photoUrl}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-sm font-semibold tabular-nums text-foreground">
                      <Link
                        href={`/admin/reports/${report.id}`}
                        className="focus-ring rounded-sm hover:underline"
                      >
                        {report.referenceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap py-3 text-sm text-muted-foreground md:table-cell">
                      {report.displayDate}
                    </TableCell>
                    <TableCell className="max-w-[16rem] py-3 text-sm">
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        {report.studyArea}
                      </span>
                      <span className="block truncate text-muted-foreground" title={report.specificLocation}>
                        {report.specificLocation}
                      </span>
                    </TableCell>
                    <TableCell className="hidden py-3 text-sm sm:table-cell">
                      {report.aiClassification ? (
                        <>
                          <span className="block font-medium text-foreground">
                            {report.aiClassification.label}
                          </span>
                          {report.aiClassification.confidence != null && (
                            <span className="text-muted-foreground">
                              {(report.aiClassification.confidence * 100).toFixed(1)}% confidence
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Not classified</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <StatusBadge label={report.reviewStatus} variant={statusVariant(report.reviewStatus)} />
                    </TableCell>
                    <TableCell className="py-3 pr-4 text-right">
                      <Link
                        href={`/admin/reports/${report.id}`}
                        className={cn(
                          buttonVariants({
                            variant: report.reviewStatus === "Pending" ? "default" : "outline",
                            size: "sm",
                          }),
                          "h-9 px-3 text-sm"
                        )}
                      >
                        {report.reviewStatus === "Pending" ? "Review" : "Open"}
                        <span className="sr-only"> report {report.referenceNumber}</span>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Paging ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span aria-live="polite" className="flex items-center gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Showing {first}–{last} of {page.total} {page.total === 1 ? "report" : "reports"}
          </span>
          {pages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={filters.page <= 1 || isPending}
                onClick={() => go({ page: filters.page - 1 })}
                className="h-9 px-3 text-sm"
              >
                Previous
              </Button>
              <span>
                Page {filters.page} of {pages}
              </span>
              <Button
                variant="outline"
                disabled={filters.page >= pages || isPending}
                onClick={() => go({ page: filters.page + 1 })}
                className="h-9 px-3 text-sm"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
