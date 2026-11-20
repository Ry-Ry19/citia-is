// components/admin/report-detail.tsx
//
// WHAT: The CENRO review page for one sighting report (/admin/reports/<ref>).
//
// LAYOUT:
//   - Left: the photo, which stays in view while the officer reads and
//     decides. Selecting it opens a larger view.
//   - Right, in reading order:
//       1. The AI's suggestion, in a dashed, neutral panel. It is a
//          suggestion, not a decision; green is kept for CENRO's own.
//       2. Where and what: location, observation, reporter's notes.
//       3. The reporter (seen by staff only).
//       4. The decision: Verify or Reject, with notes. The form opens in
//          place, so the photo stays visible.
//       5. The review history, newest first. A new decision is added on
//          top; earlier ones are never changed or removed.
//
// DATA: `report` comes from the CITIA-IS API, loaded on the server by
//   app/admin/reports/[id]/page.tsx. The decision is sent by the
//   recordReview server action; the reviewer is taken from the signed-in
//   staff member's token, never from this form.

"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ImageIcon,
  Loader2,
  Maximize2,
  Navigation,
  XCircle,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/status-badge";
import { recordReview, type ReviewState } from "@/app/admin/actions";
import { statusVariant, type AdminReportDetail } from "@/lib/admin-reports";
import { cn } from "@/lib/utils";

/** The reasons offered for a rejection. The text is what gets saved. */
const REJECTION_REASONS = [
  "Specimen does not match Swietenia macrophylla botanical criteria.",
  "Photo too blurry, dark or distant to assess.",
  "Duplicate of an earlier report of the same tree.",
  "Not a tree or leaf.",
  "Location outside CENRO Iligan City's jurisdiction.",
  "Test submission made during system testing.",
];

const panel = "rounded-lg border border-border bg-card p-5";
const term = "text-sm text-muted-foreground";
const value = "text-base text-foreground";

export function ReportDetail({ report }: { report: AdminReportDetail }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [decision, setDecision] = useState<"verified" | "rejected" | null>(null);
  const [state, formAction, pending] = useActionState<ReviewState, FormData>(
    recordReview,
    {}
  );

  // The form stays open until a decision from THIS opening is saved. A
  // failed save keeps it open so the officer can try again.
  const [openedWith, setOpenedWith] = useState<ReviewState>(state);
  const formOpen = decision !== null && (state === openedWith || !state.saved);
  function openForm(choice: "verified" | "rejected") {
    setDecision(choice);
    setOpenedWith(state);
  }

  const ai = report.aiClassification;
  const confidence =
    ai?.confidence != null ? `${(ai.confidence * 100).toFixed(1)}%` : null;

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb and status ───────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/reports"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-9 px-2 text-sm text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Reports Queue
          </Link>
          <span className="text-muted-foreground" aria-hidden="true">/</span>
          <h1 className="text-xl font-bold tabular-nums text-foreground">
            {report.referenceNumber}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Review status</span>
          <StatusBadge label={report.reviewStatus} variant={statusVariant(report.reviewStatus)} />
        </div>
      </div>

      {state.saved && state !== openedWith && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm text-foreground"
        >
          <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
          {state.saved === "verified" ? "Sighting verified." : "Report rejected."} The decision
          was added to the history below.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* ── Photo ──────────────────────────────────────────── */}
        <section
          aria-label="Photo"
          className="overflow-hidden rounded-lg border border-border bg-card lg:sticky lg:top-20 lg:col-span-7 lg:self-start"
        >
          <div className="relative flex aspect-4/3 w-full items-center justify-center bg-black">
            {!report.photoUrl ? (
              <div className="p-8 text-center text-white/80">
                <ImageIcon className="mx-auto mb-2 h-10 w-10" aria-hidden="true" />
                <p className="text-sm">No photo was submitted with this report.</p>
              </div>
            ) : imageError ? (
              <div className="p-8 text-center text-white/80">
                <AlertTriangle className="mx-auto mb-2 h-10 w-10" aria-hidden="true" />
                <p className="text-sm">The photo could not be loaded. Refresh the page to try again.</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="group relative h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                aria-label="Open the photo larger"
              >
                {/* A plain <img>: the photo comes from a private, staff-only
                    route, so it must not go through the image optimizer. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={report.photoUrl}
                  alt={`Leaf photo submitted with report ${report.referenceNumber}`}
                  className="h-full w-full object-contain"
                  onError={() => setImageError(true)}
                />
                <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-black/70 px-2.5 py-1.5 text-sm text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Enlarge
                </span>
              </button>
            )}
          </div>
          {report.photoSize && (
            <p className="border-t border-border px-4 py-2.5 text-sm text-muted-foreground">
              {report.photoSize.width} × {report.photoSize.height} pixels
            </p>
          )}
        </section>

        {/* ── Details and decision ───────────────────────────── */}
        <div className="space-y-6 lg:col-span-5">
          {/* 1. The AI's suggestion */}
          <section
            aria-labelledby="ai-heading"
            className="rounded-lg border border-dashed border-foreground/40 p-5"
          >
            <p className="text-sm text-muted-foreground">A suggestion, not a decision</p>
            <h2 id="ai-heading" className="text-lg font-semibold text-foreground">
              AI classification
            </h2>
            {ai ? (
              <div className="mt-3 space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <p className="text-xl font-bold text-foreground">{ai.label}</p>
                  {confidence && (
                    <p className="text-lg font-semibold tabular-nums text-foreground">
                      {confidence}
                    </p>
                  )}
                </div>
                {ai.confidence != null && (
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-muted"
                    role="img"
                    aria-label={`Confidence ${confidence}`}
                  >
                    <div
                      className="h-full bg-foreground/60"
                      style={{ width: `${Math.min(100, ai.confidence * 100)}%` }}
                    />
                  </div>
                )}
                {ai.lowConfidence && (
                  <p className="flex items-start gap-2 text-sm text-foreground">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                    The AI was not confident about this photo. Check it carefully.
                  </p>
                )}
                {report.ai && (
                  <p className="text-sm text-muted-foreground">
                    {[report.ai.modelVersion && `Model ${report.ai.modelVersion}`, report.ai.analyzedAt]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-base text-foreground">
                Not classified.{" "}
                <span className="text-muted-foreground">
                  {report.ai?.outcome === "failed"
                    ? "The AI could not read this photo."
                    : "The AI service was unavailable when this report was sent."}{" "}
                  Review the photo yourself.
                </span>
              </p>
            )}
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              AI results are preliminary. They do not authorize tree cutting or removal.
            </p>
          </section>

          {/* 2. Where and what */}
          <section aria-labelledby="observation-heading" className={panel}>
            <h2 id="observation-heading" className="text-lg font-semibold text-foreground">
              Observation
            </h2>
            <dl className="mt-3 space-y-3">
              <div>
                <dt className={term}>Study area</dt>
                <dd className={cn(value, "font-semibold")}>{report.studyArea}</dd>
              </div>
              <div>
                <dt className={term}>Landmark and barangay</dt>
                <dd className={value}>{report.specificLocation}</dd>
              </div>
              <div>
                <dt className={term}>Tree location</dt>
                <dd className={value}>
                  {report.coordinates ? (
                    <span className="inline-flex flex-wrap items-center gap-x-2 tabular-nums">
                      <Navigation className="h-4 w-4 text-primary" aria-hidden="true" />
                      {report.coordinates.lat.toFixed(6)}, {report.coordinates.lng.toFixed(6)}
                      {report.gpsAccuracyM != null && (
                        <span className="text-sm text-muted-foreground">
                          (±{Math.round(report.gpsAccuracyM)} m)
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not given by the reporter</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className={term}>What was seen</dt>
                <dd className={value}>{report.observationType}</dd>
              </div>
              <div>
                <dt className={term}>Submitted</dt>
                <dd className={value}>{report.displayDate}</dd>
              </div>
              <div>
                <dt className={term}>Reporter&apos;s notes</dt>
                <dd className={value}>
                  {report.communityNotes ?? <span className="text-muted-foreground">None</span>}
                </dd>
              </div>
            </dl>
          </section>

          {/* 3. The reporter */}
          <section aria-labelledby="reporter-heading" className={panel}>
            <h2 id="reporter-heading" className="text-lg font-semibold text-foreground">
              Reporter
            </h2>
            <p className="text-sm text-muted-foreground">Seen by CENRO staff only.</p>
            <dl className="mt-3 space-y-3">
              <div>
                <dt className={term}>Name</dt>
                <dd className={value}>
                  {report.reporterName ?? <span className="text-muted-foreground">Not given</span>}
                </dd>
              </div>
              <div>
                <dt className={term}>Email or phone</dt>
                <dd className={cn(value, "break-words")}>
                  {report.contactInfo ?? <span className="text-muted-foreground">Not given</span>}
                </dd>
              </div>
            </dl>
          </section>

          {/* 4. The decision */}
          <section aria-labelledby="decision-heading" className={panel}>
            <h2 id="decision-heading" className="text-lg font-semibold text-foreground">
              CENRO review decision
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {report.reviewStatus === "Pending"
                ? "Look at the photo and the details, then record a decision."
                : "A new decision is added to the history; the earlier one is kept."}
            </p>

            {!formOpen || decision === null ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  onClick={() => openForm("verified")}
                  className="h-11 text-sm font-semibold"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Verify sighting
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openForm("rejected")}
                  className="h-11 border-destructive/50 text-sm font-semibold text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                  Reject report
                </Button>
              </div>
            ) : (
              <form action={formAction} className="mt-4 space-y-4">
                <input type="hidden" name="reference" value={report.referenceNumber} />
                <input type="hidden" name="decision" value={decision} />
                <p className="text-base font-semibold text-foreground">
                  {decision === "verified"
                    ? "Verify: this sighting is Swietenia macrophylla."
                    : "Reject: this report is not a confirmed Mahogany sighting."}
                </p>

                {decision === "rejected" && (
                  <label className="block space-y-1.5 text-sm font-semibold text-foreground">
                    Reason
                    <select
                      name="rejectionReason"
                      required
                      defaultValue=""
                      className="focus-ring block h-11 w-full rounded-md border border-input bg-card px-3 text-base font-normal text-foreground"
                    >
                      <option value="" disabled>
                        Choose a reason
                      </option>
                      {REJECTION_REASONS.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="block space-y-1.5 text-sm font-semibold text-foreground">
                  Notes <span className="font-normal text-muted-foreground">(Optional)</span>
                  <Textarea
                    name="staffNotes"
                    maxLength={2000}
                    placeholder="What you checked, for the record."
                    className="min-h-24 text-base font-normal"
                  />
                </label>

                {state.error && (
                  <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {state.error}
                  </p>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="submit"
                    disabled={pending}
                    variant={decision === "verified" ? "default" : "destructive"}
                    className="h-11 flex-1 text-sm font-semibold"
                  >
                    {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                    {pending
                      ? "Saving…"
                      : decision === "verified"
                        ? "Confirm verification"
                        : "Confirm rejection"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => setDecision(null)}
                    className="h-11 text-sm"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </section>

          {/* 5. History */}
          <section aria-labelledby="history-heading" className={panel}>
            <h2 id="history-heading" className="text-lg font-semibold text-foreground">
              Review history
            </h2>
            {report.reviews.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No decision has been recorded yet.</p>
            ) : (
              <ol className="mt-3 space-y-4 border-l-2 border-border pl-4">
                {report.reviews.map((review, index) => (
                  <li key={`${review.reviewedAt}-${index}`} className="relative">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute -left-[1.4rem] top-1.5 h-3 w-3 rounded-full border-2 border-card",
                        review.decision === "Verified" ? "bg-success" : "bg-destructive"
                      )}
                    />
                    <p className="text-base font-semibold text-foreground">
                      {review.decision}
                      {index === 0 && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          (current)
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {review.reviewerName} · {review.reviewedAt}
                    </p>
                    {review.rejectionReason && (
                      <p className="mt-1 text-sm text-foreground">
                        <span className="font-semibold">Reason:</span> {review.rejectionReason}
                      </p>
                    )}
                    {review.staffNotes && (
                      <p className="mt-1 text-sm text-foreground">
                        <span className="font-semibold">Notes:</span> {review.staffNotes}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      {/* ── Larger photo ────────────────────────────────────── */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="w-[96vw] max-w-[96vw] bg-black p-3 sm:max-w-6xl">
          <DialogTitle className="sr-only">Photo for report {report.referenceNumber}</DialogTitle>
          {report.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={report.photoUrl}
              alt={`Leaf photo submitted with report ${report.referenceNumber}`}
              className="max-h-[80vh] w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
