// components/admin/admin-dashboard.tsx
//
// WHAT: The CENRO administrative dashboard body.
//
// ALIGNMENT: Conforms to CITIA-IS Admin UI/UX Design Plan v2.0 (Phase 2).
//   - Section 1: Summary Statistics (4 consistent stat cards)
//   - Section 2: Reports Visualization Switcher (By Study Area vs Over Time)
//   - Section 3: Recent Activity Feed (8 scan-friendly, chronological events)
//   - Section 4: Recent Sighting Reports Table & Pending Queue
//
// DATA INTEGRITY & HONESTY: No live backend, database, or report API is
//   currently connected. All figures, locations, and activity events below
//   represent clearly identified SAMPLE DATA for interface demonstration.

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  Leaf,
  MapPin,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/status-badge";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import type { StaffIdentity } from "@/components/admin/staff-avatar";
import { cn } from "@/lib/utils";

// ── Demonstration Data ──────────────────────────────────────────────────────

type ReportStatus = "Pending" | "Verified" | "Rejected";

interface SampleReport {
  id: string;
  submittedOn: string;
  location: string;
  result: "Mahogany" | "Non-Mahogany";
  species: string;
  status: ReportStatus;
  note: string;
}

// Demo records aligned with CITIA-IS Thesis Study Areas in Iligan City:
// Palao Medical, Dalipuga, and NPC Area.
const SAMPLE_REPORTS: SampleReport[] = [
  {
    id: "CITS-DEMO-1042",
    submittedOn: "19 Oct 2026",
    location: "Palao Medical",
    result: "Mahogany",
    species: "Swietenia macrophylla",
    status: "Pending",
    note: "Sample record. Leaf photograph submitted from an open roadside area.",
  },
  {
    id: "CITS-DEMO-1041",
    submittedOn: "18 Oct 2026",
    location: "Dalipuga",
    result: "Mahogany",
    species: "Swietenia macrophylla",
    status: "Verified",
    note: "Sample record. Leaf photograph submitted near residential cluster.",
  },
  {
    id: "CITS-DEMO-1040",
    submittedOn: "17 Oct 2026",
    location: "NPC Area",
    result: "Non-Mahogany",
    species: "Not confirmed",
    status: "Rejected",
    note: "Sample record. Leaf structure did not match Mahogany botanical criteria.",
  },
  {
    id: "CITS-DEMO-1039",
    submittedOn: "16 Oct 2026",
    location: "Palao Medical",
    result: "Mahogany",
    species: "Swietenia macrophylla",
    status: "Pending",
    note: "Sample record. Canopy and leaf photograph submitted from public grounds.",
  },
  {
    id: "CITS-DEMO-1038",
    submittedOn: "15 Oct 2026",
    location: "Dalipuga",
    result: "Mahogany",
    species: "Swietenia macrophylla",
    status: "Verified",
    note: "Sample record. Leaf specimen verified by reviewing officer.",
  },
  {
    id: "CITS-DEMO-1037",
    submittedOn: "14 Oct 2026",
    location: "NPC Area",
    result: "Non-Mahogany",
    species: "Not confirmed",
    status: "Rejected",
    note: "Sample record. Image too degraded or blurred for reliable classification.",
  },
  {
    id: "CITS-DEMO-1036",
    submittedOn: "13 Oct 2026",
    location: "Palao Medical",
    result: "Mahogany",
    species: "Swietenia macrophylla",
    status: "Pending",
    note: "Sample record. Leaf specimen submitted from an open lot.",
  },
  {
    id: "CITS-DEMO-1035",
    submittedOn: "12 Oct 2026",
    location: "Dalipuga",
    result: "Mahogany",
    species: "Swietenia macrophylla",
    status: "Verified",
    note: "Sample record. Mature leaf specimen confirmed as Swietenia macrophylla.",
  },
];

const STATUS_STYLES: Record<
  ReportStatus,
  { variant: "destructive" | "success" | "warning"; dot: string; bar: string }
> = {
  Pending: { variant: "warning", dot: "bg-warning", bar: "bg-warning" },
  Verified: { variant: "success", dot: "bg-success", bar: "bg-success" },
  Rejected: {
    variant: "destructive",
    dot: "bg-destructive",
    bar: "bg-destructive",
  },
};

const TOTAL_REPORTS = SAMPLE_REPORTS.length;
const PENDING_REPORTS = SAMPLE_REPORTS.filter((r) => r.status === "Pending");
const VERIFIED_COUNT = SAMPLE_REPORTS.filter((r) => r.status === "Verified").length;
const REJECTED_COUNT = SAMPLE_REPORTS.filter((r) => r.status === "Rejected").length;

// Four core summary cards per Plan Section 5.2 (links directly to Reports Queue)
const SUMMARY_CARDS = [
  {
    label: "Total Sightings",
    value: TOTAL_REPORTS,
    description: "All study locations",
    icon: FileText,
    accent: "bg-primary/10 text-primary",
    href: "/admin/reports",
  },
  {
    label: "Pending Reviews",
    value: PENDING_REPORTS.length,
    description: "Awaiting CENRO action",
    icon: Clock,
    accent: "bg-warning/10 text-warning",
    href: "/admin/reports",
  },
  {
    label: "Verified Sightings",
    value: VERIFIED_COUNT,
    description: "Confirmed Mahogany",
    icon: CheckCircle2,
    accent: "bg-success/10 text-success",
    href: "/admin/reports",
  },
  {
    label: "Rejected Reports",
    value: REJECTED_COUNT,
    description: "Non-Mahogany / Unclear",
    icon: XCircle,
    accent: "bg-destructive/10 text-destructive",
    href: "/admin/reports",
  },
];

// Location distribution data aggregated from demo records
const LOCATION_DATA = [
  {
    name: "Palao Medical",
    count: 3,
    verified: 0,
    pending: 3,
    rejected: 0,
  },
  {
    name: "Dalipuga",
    count: 3,
    verified: 3,
    pending: 0,
    rejected: 0,
  },
  {
    name: "NPC Area",
    count: 2,
    verified: 0,
    pending: 0,
    rejected: 2,
  },
];

// Timeline distribution data across submission date brackets
const TIMELINE_DATA = [
  {
    period: "Oct 12 – 13",
    count: 2,
    verified: 1,
    pending: 1,
    rejected: 0,
  },
  {
    period: "Oct 14 – 15",
    count: 2,
    verified: 1,
    pending: 0,
    rejected: 1,
  },
  {
    period: "Oct 16 – 17",
    count: 2,
    verified: 0,
    pending: 1,
    rejected: 1,
  },
  {
    period: "Oct 18 – 19",
    count: 2,
    verified: 1,
    pending: 1,
    rejected: 0,
  },
];

// Recent events (up to eight) representing sample actions
interface ActivityEvent {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
  status: ReportStatus | "Submitted";
}

const SAMPLE_ACTIVITY: ActivityEvent[] = [
  {
    id: "EVT-1008",
    action: "Community Submission",
    detail: "New sighting submitted for Palao Medical (CITS-DEMO-1042)",
    timestamp: "2 hours ago",
    status: "Submitted",
  },
  {
    id: "EVT-1007",
    action: "Report Verified",
    detail: "CENRO staff confirmed Swietenia macrophylla for CITS-DEMO-1041",
    timestamp: "6 hours ago",
    status: "Verified",
  },
  {
    id: "EVT-1006",
    action: "Report Rejected",
    detail: "CENRO staff rejected CITS-DEMO-1040 (Non-Mahogany specimen)",
    timestamp: "17 Oct 2026",
    status: "Rejected",
  },
  {
    id: "EVT-1005",
    action: "Community Submission",
    detail: "Canopy photo submitted for Palao Medical (CITS-DEMO-1039)",
    timestamp: "16 Oct 2026",
    status: "Submitted",
  },
  {
    id: "EVT-1004",
    action: "Report Verified",
    detail: "Leaf photograph confirmed for Dalipuga (CITS-DEMO-1038)",
    timestamp: "15 Oct 2026",
    status: "Verified",
  },
  {
    id: "EVT-1003",
    action: "Report Rejected",
    detail: "CITS-DEMO-1037 rejected due to unclassifiable image quality",
    timestamp: "14 Oct 2026",
    status: "Rejected",
  },
  {
    id: "EVT-1002",
    action: "Community Submission",
    detail: "Open-lot specimen submitted for Palao Medical (CITS-DEMO-1036)",
    timestamp: "13 Oct 2026",
    status: "Submitted",
  },
  {
    id: "EVT-1001",
    action: "Report Verified",
    detail: "Mature leaf specimen confirmed for Dalipuga (CITS-DEMO-1035)",
    timestamp: "12 Oct 2026",
    status: "Verified",
  },
];

// ── Component ───────────────────────────────────────────────────────────────

interface AdminDashboardProps {
  /** The signed-in staff member, from their staff profile. */
  staff: StaffIdentity;
}

export function AdminDashboard({ staff }: AdminDashboardProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<SampleReport | null>(null);
  const [visualizationTab, setVisualizationTab] = useState<"location" | "timeline">(
    "location"
  );

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
        staff={staff}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader
          onOpenNav={() => setMobileOpen(true)}
          staff={staff}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6">
            {/* ── 1. Page Header ────────────────────────────────────── */}
            <header>
              <p className="text-sm font-semibold text-primary">
                CENRO Iligan City · Staff Workspace
              </p>
              <h1 className="mt-2 section-title text-foreground">
                CENRO Dashboard
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-sm">
                Executive overview of community Mahogany sightings across the
                focal study areas (Palao Medical, Dalipuga, and NPC area).
              </p>
            </header>

            {/* Sample data transparency notice */}
            <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3.5">
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">
                  Demonstration Data Mode.
                </span>{" "}
                Figures, geographic distributions, and recent activity below are
                demonstration records for previewing the administrative UI. No
                database or live inference backend is currently connected.
              </p>
            </div>

            {/* ── 2. Summary Statistics (4 Cards) ──────────────────── */}
            <section aria-labelledby="summary-heading">
              <h2 id="summary-heading" className="sr-only">
                Reporting Statistics
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {SUMMARY_CARDS.map((card) => {
                  const Icon = card.icon;

                  return (
                    <Link
                      key={card.label}
                      href={card.href}
                      className="group block rounded-lg focus-ring transition-transform"
                    >
                      <Card className="rounded-lg border border-border bg-card p-5 transition-all group-hover:border-primary/50 group-hover:bg-muted/20">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                              {card.label}
                            </p>
                            <p className="text-3xl font-bold tracking-tight text-foreground">
                              {card.value}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {card.description}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105",
                              card.accent
                            )}
                          >
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* ── 3. Visualizations & Activity Feed ─────────────────── */}
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Reports Visualization Switcher (7 cols on lg) */}
              <section
                aria-labelledby="reports-visualization-heading"
                className="lg:col-span-7"
              >
                <Card className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2
                        id="reports-visualization-heading"
                        className="text-base font-semibold text-foreground"
                      >
                        Reports Visualization
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Aggregate breakdown of submitted sample records.
                      </p>
                    </div>

                    {/* Accessible Switcher Tabs */}
                    <div
                      role="tablist"
                      aria-label="Reports visualization view"
                      className="inline-flex rounded-md border border-border bg-muted/60 p-0.5"
                    >
                      <button
                        type="button"
                        role="tab"
                        id="tab-location"
                        aria-selected={visualizationTab === "location"}
                        aria-controls="panel-location"
                        onClick={() => setVisualizationTab("location")}
                        className={cn(
                          "focus-ring inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-sm font-medium transition-colors",
                          visualizationTab === "location"
                            ? "bg-card text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        By Location
                      </button>
                      <button
                        type="button"
                        role="tab"
                        id="tab-timeline"
                        aria-selected={visualizationTab === "timeline"}
                        aria-controls="panel-timeline"
                        onClick={() => setVisualizationTab("timeline")}
                        className={cn(
                          "focus-ring inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-sm font-medium transition-colors",
                          visualizationTab === "timeline"
                            ? "bg-card text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                        Over Time
                      </button>
                    </div>
                  </div>

                  {/* Panel Content: By Location */}
                  {visualizationTab === "location" && (
                    <div
                      id="panel-location"
                      role="tabpanel"
                      aria-labelledby="tab-location"
                      className="mt-5 flex-1 space-y-4"
                    >
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Study Area</span>
                        <span>Sample Distribution</span>
                      </div>

                      <div className="space-y-3.5">
                        {LOCATION_DATA.map((loc) => {
                          const percent = Math.round(
                            (loc.count / TOTAL_REPORTS) * 100
                          );
                          return (
                            <div key={loc.name} className="space-y-1.5">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-foreground">
                                  {loc.name}
                                </span>
                                <span className="text-muted-foreground">
                                  {loc.count} reports ({percent}%)
                                </span>
                              </div>
                              {/* Stacked bar visualization */}
                              <div
                                className="flex h-2.5 w-full overflow-hidden rounded-full border border-border bg-muted/60"
                                aria-label={`${loc.name} distribution: ${loc.count} of ${TOTAL_REPORTS}`}
                              >
                                {loc.verified > 0 && (
                                  <div
                                    style={{
                                      width: `${(loc.verified / loc.count) * 100}%`,
                                    }}
                                    className="bg-success"
                                    title={`Verified: ${loc.verified}`}
                                  />
                                )}
                                {loc.pending > 0 && (
                                  <div
                                    style={{
                                      width: `${(loc.pending / loc.count) * 100}%`,
                                    }}
                                    className="bg-warning"
                                    title={`Pending: ${loc.pending}`}
                                  />
                                )}
                                {loc.rejected > 0 && (
                                  <div
                                    style={{
                                      width: `${(loc.rejected / loc.count) * 100}%`,
                                    }}
                                    className="bg-destructive"
                                    title={`Rejected: ${loc.rejected}`}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Legend */}
                      <div className="mt-4 flex flex-wrap items-center gap-4 pt-3 border-t border-border/60 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-success" />
                          Verified
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-warning" />
                          Pending Review
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-destructive" />
                          Rejected
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Panel Content: Over Time */}
                  {visualizationTab === "timeline" && (
                    <div
                      id="panel-timeline"
                      role="tabpanel"
                      aria-labelledby="tab-timeline"
                      className="mt-5 flex-1 space-y-4"
                    >
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Reporting Period (Oct 2026)</span>
                        <span>Volume</span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 pt-2">
                        {TIMELINE_DATA.map((t) => (
                          <div
                            key={t.period}
                            className="flex flex-col items-center justify-end rounded-lg border border-border bg-background p-2.5 text-center"
                          >
                            <div className="mb-2 flex h-24 w-full flex-col justify-end items-center">
                              <div
                                className="w-8 rounded-t bg-primary/25 border-t border-x border-primary flex items-center justify-center text-sm font-bold text-primary transition-all"
                                style={{ height: `${(t.count / 3) * 100}%` }}
                              >
                                {t.count}
                              </div>
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {t.period}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {t.verified} ver · {t.pending} pend
                            </span>
                          </div>
                        ))}
                      </div>

                      <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
                        Reflects demonstration submission clusters. Once live
                        records are connected, period intervals will reflect
                        actual database timestamps.
                      </p>
                    </div>
                  )}
                </Card>
              </section>

              {/* Recent Activity Feed (5 cols on lg) */}
              <section
                aria-labelledby="recent-activity-heading"
                className="lg:col-span-5"
              >
                <Card className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div>
                      <h2
                        id="recent-activity-heading"
                        className="text-base font-semibold text-foreground"
                      >
                        Recent Activity
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Latest staff reviews and submissions.
                      </p>
                    </div>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Activity className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>

                  {SAMPLE_ACTIVITY.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                      <Activity className="h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        No activity records
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Administrative activity will appear here as reviews occur.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/60 overflow-y-auto max-h-[320px]">
                      {SAMPLE_ACTIVITY.map((event) => {
                        const isVerified = event.status === "Verified";
                        const isRejected = event.status === "Rejected";
                        const isPending =
                          event.status === "Pending" ||
                          event.status === "Submitted";

                        return (
                          <li
                            key={event.id}
                            className="flex items-start gap-3 py-2.5 first:pt-3 last:pb-0"
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm",
                                isVerified && "bg-success/15 text-success",
                                isRejected && "bg-destructive/15 text-destructive",
                                isPending && "bg-warning/15 text-warning"
                              )}
                              aria-hidden="true"
                            >
                              {isVerified && <CheckCircle2 className="h-3.5 w-3.5" />}
                              {isRejected && <XCircle className="h-3.5 w-3.5" />}
                              {isPending && <Clock className="h-3.5 w-3.5" />}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {event.action}
                                </p>
                                <span className="text-sm whitespace-nowrap text-muted-foreground">
                                  {event.timestamp}
                                </span>
                              </div>
                              <p className="line-clamp-1 text-sm text-muted-foreground">
                                {event.detail}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>
              </section>
            </div>

            {/* ── 4. Recent Sighting Reports Table ───────────────────── */}
            <section aria-labelledby="recent-reports-heading">
              <Card className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2
                      id="recent-reports-heading"
                      className="text-base font-semibold text-foreground"
                    >
                      Recent Sighting Submissions
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Sample community observations from target study areas.
                    </p>
                  </div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-sm">Reference</TableHead>
                        <TableHead className="hidden text-sm md:table-cell">
                          Date Submitted
                        </TableHead>
                        <TableHead className="text-sm">Study Area</TableHead>
                        <TableHead className="hidden text-sm lg:table-cell">
                          AI Result
                        </TableHead>
                        <TableHead className="text-sm">Review Status</TableHead>
                        <TableHead className="text-right text-sm">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {SAMPLE_REPORTS.slice(0, 6).map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="tabular-nums text-sm text-foreground">
                            {report.id}
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                            {report.submittedOn}
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <MapPin
                                className="h-3.5 w-3.5 shrink-0 text-primary/70"
                                aria-hidden="true"
                              />
                              {report.location}
                            </span>
                          </TableCell>
                          <TableCell className="hidden text-sm lg:table-cell">
                            <span className="flex items-center gap-1.5">
                              <Leaf
                                className="h-3.5 w-3.5 shrink-0 text-primary"
                                aria-hidden="true"
                              />
                              <span className="text-foreground">
                                {report.result}
                              </span>
                            </span>
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              label={report.status}
                              variant={STATUS_STYLES[report.status].variant}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              href={`/admin/reports/${report.id}`}
                              className={cn(
                                buttonVariants({ variant: "outline", size: "sm" }),
                                "h-8 rounded-md px-2.5 text-sm inline-flex"
                              )}
                            >
                              Review
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </section>

            {/* ── 5. Pending Review Queue Preview ───────────────────── */}
            <section aria-labelledby="pending-queue-heading">
              <Card className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2
                      id="pending-queue-heading"
                      className="text-base font-semibold text-foreground"
                    >
                      Pending Review Queue
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Submissions awaiting review by authorized CENRO officers.
                    </p>
                  </div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-warning/10 text-warning">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {PENDING_REPORTS.map((report) => (
                    <div
                      key={report.id}
                      className="flex flex-col gap-2.5 rounded-lg border border-border bg-background p-3.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="tabular-nums text-sm font-semibold text-foreground">
                          {report.id}
                        </span>
                        <StatusBadge
                          label={report.status}
                          variant={STATUS_STYLES[report.status].variant}
                        />
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p className="flex items-center gap-1.5">
                          <MapPin
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          {report.location}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Calendar
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          {report.submittedOn}
                        </p>
                      </div>
                      <Link
                        href={`/admin/reports/${report.id}`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "mt-2 h-8 w-full rounded-md text-sm inline-flex justify-center"
                        )}
                      >
                        Review Sighting
                      </Link>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          </div>
        </main>
      </div>

      {/* ── Report detail Dialog (Read-only demo inspector) ───────── */}
      <Dialog
        open={selectedReport !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedReport(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {selectedReport?.id}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Demonstration submission record for previewing the CENRO review
              inspector.
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
              <dt className="text-muted-foreground">Date submitted</dt>
              <dd className="font-medium text-foreground">
                {selectedReport.submittedOn}
              </dd>

              <dt className="text-muted-foreground">Study Location</dt>
              <dd className="font-medium text-foreground">
                {selectedReport.location}
              </dd>

              <dt className="text-muted-foreground">AI Classification</dt>
              <dd className="font-medium text-foreground">
                {selectedReport.result}
              </dd>

              <dt className="text-muted-foreground">Target Species</dt>
              <dd className="font-medium text-foreground">
                {selectedReport.species}
              </dd>

              <dt className="text-muted-foreground">Review Status</dt>
              <dd>
                <StatusBadge
                  label={selectedReport.status}
                  variant={STATUS_STYLES[selectedReport.status].variant}
                />
              </dd>

              <dt className="text-muted-foreground">Community Notes</dt>
              <dd className="text-muted-foreground">{selectedReport.note}</dd>
            </dl>
          )}

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  );
}
