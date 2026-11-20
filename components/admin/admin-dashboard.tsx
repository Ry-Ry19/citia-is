// components/admin/admin-dashboard.tsx
//
// WHAT: The CENRO Dashboard (/admin): the state of community sighting
//   reports at a glance, and the two things staff come here to do —
//   review pending reports and look at the map.
//
// DATA: `summary` and `pending` come from the CITIA-IS API, loaded on the
//   server by app/admin/page.tsx. Nothing here is example data.
//
// SECTIONS:
//   1. Header with quick actions.
//   2. Four counts (all, pending, verified, rejected), each linking to
//      the Reports Queue already filtered.
//   3. Reports by study area, as stacked bars.
//   4. The latest review decisions and who made them.
//   5. One reports table with two views: "Needs review" (first, because
//      acting on pending reports is the main job) and "Latest".

"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, FileText, MapPin, XCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/common/status-badge";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import type { StaffIdentity } from "@/components/admin/staff-avatar";
import {
  statusVariant,
  type AdminReport,
  type DashboardSummary,
} from "@/lib/admin-reports";
import { cn } from "@/lib/utils";

interface AdminDashboardProps {
  /** The signed-in staff member, from their staff profile. */
  staff: StaffIdentity;
  /** Null when the figures could not be loaded. */
  summary: DashboardSummary | null;
  /** Reports waiting for review, oldest concerns first. */
  pending: AdminReport[];
}

export function AdminDashboard({ staff, summary, pending }: AdminDashboardProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} staff={staff} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader onOpenNav={() => setMobileOpen(true)} staff={staff} />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
            {summary ? (
              <DashboardBody summary={summary} pending={pending} />
            ) : (
              <div
                role="alert"
                className="rounded-lg border border-dashed border-border px-6 py-14 text-center"
              >
                <h1 className="text-lg font-semibold text-foreground">
                  The dashboard could not be loaded
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  The CITIA-IS service did not answer. Check that the backend is running,
                  then refresh the page.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function DashboardBody({
  summary,
  pending,
}: {
  summary: DashboardSummary;
  pending: AdminReport[];
}) {
  const [reportsTab, setReportsTab] = useState<"pending" | "latest">(
    pending.length > 0 ? "pending" : "latest"
  );
  const listed = reportsTab === "pending" ? pending : summary.recentReports;
  const { totals } = summary;

  const cards = [
    {
      label: "All reports",
      value: totals.total,
      href: "/admin/reports",
      icon: FileText,
      accent: "bg-muted text-foreground",
    },
    {
      label: "Pending review",
      value: totals.pending,
      href: "/admin/reports?status=pending_review",
      icon: Clock,
      accent: "bg-warning/15 text-foreground",
    },
    {
      label: "Verified",
      value: totals.verified,
      href: "/admin/reports?status=verified",
      icon: CheckCircle2,
      accent: "bg-success/15 text-success",
    },
    {
      label: "Rejected",
      value: totals.rejected,
      href: "/admin/reports?status=rejected",
      icon: XCircle,
      accent: "bg-destructive/10 text-destructive",
    },
  ];

  return (
    <>
      {/* ── 1. Header and quick actions ─────────────────────── */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="section-title text-foreground">CENRO Dashboard</h1>
          <p className="mt-2 max-w-[44rem] text-base leading-relaxed text-muted-foreground">
            Community Mahogany sightings across Palao Medical, Dalipuga and the NPC area.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/admin/reports?status=pending_review"
            className={cn(buttonVariants(), "h-11 px-4 text-sm font-semibold")}
          >
            <Clock className="mr-2 h-4 w-4" aria-hidden="true" />
            Review pending reports ({totals.pending})
          </Link>
          <Link
            href="/admin/monitoring"
            className={cn(buttonVariants({ variant: "outline" }), "h-11 px-4 text-sm font-semibold")}
          >
            <MapPin className="mr-2 h-4 w-4" aria-hidden="true" />
            Open the map
          </Link>
        </div>
      </header>

      {/* ── 2. Counts ────────────────────────────────────────── */}
      <section aria-label="Report counts" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="focus-ring group flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:border-foreground/30"
          >
            <span>
              <span className="block text-sm font-medium text-muted-foreground group-hover:text-foreground">
                {card.label}
              </span>
              <span className="mt-1 block text-3xl font-bold tabular-nums text-foreground">
                {card.value}
              </span>
            </span>
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", card.accent)}>
              <card.icon className="h-4 w-4" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* ── 3. By study area ───────────────────────────────── */}
        <section
          aria-labelledby="by-area-heading"
          className="rounded-lg border border-border bg-card p-5 lg:col-span-7"
        >
          <h2 id="by-area-heading" className="text-lg font-semibold text-foreground">
            Reports by study area
          </h2>
          <p className="text-sm text-muted-foreground">Split by review status.</p>

          <ul className="mt-5 space-y-5">
            {summary.byArea.map((area) => {
              const share = (n: number) => (area.total ? (n / area.total) * 100 : 0);
              return (
                <li key={area.studyAreaCode}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-semibold text-foreground">{area.studyArea}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {area.total} {area.total === 1 ? "report" : "reports"}
                    </span>
                  </div>
                  <div
                    className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-muted"
                    role="img"
                    aria-label={`${area.studyArea}: ${area.pending} pending, ${area.verified} verified, ${area.rejected} rejected`}
                  >
                    <span className="h-full bg-warning" style={{ width: `${share(area.pending)}%` }} />
                    <span className="h-full bg-success" style={{ width: `${share(area.verified)}%` }} />
                    <span className="h-full bg-destructive" style={{ width: `${share(area.rejected)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>

          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-3 text-sm text-muted-foreground">
            {[
              ["bg-warning", "Pending"],
              ["bg-success", "Verified"],
              ["bg-destructive", "Rejected"],
            ].map(([dot, label]) => (
              <li key={label} className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", dot)} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </section>

        {/* ── 4. Latest decisions ────────────────────────────── */}
        <section
          aria-labelledby="decisions-heading"
          className="rounded-lg border border-border bg-card p-5 lg:col-span-5"
        >
          <h2 id="decisions-heading" className="text-lg font-semibold text-foreground">
            Latest decisions
          </h2>
          <p className="text-sm text-muted-foreground">Review decisions recorded by CENRO staff.</p>

          {summary.recentReviews.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No decisions have been recorded yet.</p>
          ) : (
            <ol className="mt-4 divide-y divide-border">
              {summary.recentReviews.map((review, index) => (
                <li key={`${review.referenceNumber}-${index}`} className="flex items-start gap-3 py-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                      review.decision === "Verified" ? "bg-success" : "bg-destructive"
                    )}
                  />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block text-foreground">
                      <Link
                        href={`/admin/reports/${review.referenceNumber}`}
                        className="focus-ring rounded-sm font-semibold tabular-nums hover:underline"
                      >
                        {review.referenceNumber}
                      </Link>{" "}
                      {review.decision === "Verified" ? "verified" : "rejected"} by {review.reviewerName}
                    </span>
                    <span className="block text-muted-foreground">{review.reviewedAt}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* ── 5. Sighting reports ────────────────────────────────── */}
      <section
        aria-labelledby="recent-reports-heading"
        className="rounded-lg border border-border bg-card p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="recent-reports-heading" className="text-lg font-semibold text-foreground">
            Sighting reports
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <div
              role="group"
              aria-label="Choose which reports to list"
              className="flex gap-1 rounded-md border border-border bg-muted p-1"
            >
              {(
                [
                  { value: "pending", label: `Needs review (${totals.pending})` },
                  { value: "latest", label: "Latest" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  aria-pressed={reportsTab === tab.value}
                  onClick={() => setReportsTab(tab.value)}
                  className={cn(
                    "focus-ring min-h-9 rounded px-3 text-sm font-medium transition-colors",
                    reportsTab === tab.value
                      ? "bg-card font-semibold text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <Link
              href="/admin/reports"
              className="focus-ring rounded-sm text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
            >
              All reports
            </Link>
          </div>
        </div>

        {listed.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {reportsTab === "pending"
              ? "Nothing is waiting for review."
              : "No reports have been sent yet."}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-sm">Reference</TableHead>
                  <TableHead className="hidden text-sm md:table-cell">Submitted</TableHead>
                  <TableHead className="text-sm">Study area</TableHead>
                  <TableHead className="hidden text-sm lg:table-cell">AI suggestion</TableHead>
                  <TableHead className="text-sm">Review status</TableHead>
                  <TableHead className="text-right text-sm">
                    <span className="sr-only">Action</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listed.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="text-sm font-semibold tabular-nums text-foreground">
                      {report.referenceNumber}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {report.displayDate}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="flex items-center gap-1.5 text-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        {report.studyArea}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-sm text-foreground lg:table-cell">
                      {report.aiClassification?.label ?? (
                        <span className="text-muted-foreground">Not classified</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge label={report.reviewStatus} variant={statusVariant(report.reviewStatus)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/reports/${report.id}`}
                        className={cn(
                          buttonVariants({
                            variant: report.reviewStatus === "Pending" ? "default" : "outline",
                            size: "sm",
                          }),
                          "inline-flex h-9 rounded-md px-3 text-sm"
                        )}
                      >
                        {report.reviewStatus === "Pending" ? "Review" : "Open"}
                        <span className="sr-only"> report {report.referenceNumber}</span>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </>
  );
}
