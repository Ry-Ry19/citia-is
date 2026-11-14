// components/admin/report-detail.tsx
//
// WHAT: Individual CENRO Sighting Report Detail and verification inspector.
//
// FEATURES:
//   - Responsive 60/40 two-column layout
//   - Interactive photo gallery with accessible lightbox / full-screen inspection
//   - Graceful fallback for missing photos or broken image sources
//   - Clear distinction between AI inference (YOLOv8n-cls) and CENRO staff review
//   - Visual confidence bar and model metadata
//   - Conditional GPS coordinate display (only when present)
//   - Two-step decision confirmation for Verifying or Rejecting
//   - Staff notes and mandatory rejection reasons
//   - Session persistence and toast feedback

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Eye,
  FileText,
  ImageIcon,
  Info,
  Layers,
  MapPin,
  Maximize2,
  Navigation,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/status-badge";
import { Toaster } from "@/components/ui/sonner";
import {
  getReportById,
  persistReviewDecision,
  type ReportStatus,
  type SightingReport,
} from "@/lib/reports-data";
import { cn } from "@/lib/utils";

interface ReportDetailProps {
  reportId: string;
  staffEmail: string;
}

export function ReportDetail({ reportId, staffEmail }: ReportDetailProps) {
  const [report, setReport] = useState<SightingReport | null>(
    () => getReportById(reportId) ?? null
  );
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Decision Modal State
  const [decisionModal, setDecisionModal] = useState<"verify" | "reject" | null>(
    null
  );
  const [staffNotesInput, setStaffNotesInput] = useState(
    () => getReportById(reportId)?.staffNotes ?? ""
  );
  const [rejectionReasonInput, setRejectionReasonInput] = useState(
    () => getReportById(reportId)?.rejectionReason ?? ""
  );
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  if (!report) {
    return (
      <div className="py-16 text-center space-y-4">
        <FileText className="mx-auto h-10 w-10 text-muted-foreground/60" />
        <h2 className="text-lg font-semibold text-foreground">
          Report Not Found
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          The requested report reference ({reportId}) was not found in the
          demonstration dataset.
        </p>
        <Link
          href="/admin/reports"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "text-sm"
          )}
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Reports Queue
        </Link>
      </div>
    );
  }

  const photos = report.photos || [];
  const currentPhoto = photos[selectedPhotoIndex] || null;

  const statusVariant =
    report.reviewStatus === "Verified"
      ? "success"
      : report.reviewStatus === "Rejected"
        ? "destructive"
        : "warning";

  const handleConfirmDecision = () => {
    if (!decisionModal) return;

    if (decisionModal === "reject" && !rejectionReasonInput.trim()) {
      toast.error("Rejection reason required", {
        description: "Please provide a reason before recording a rejection decision.",
      });
      return;
    }

    setIsSubmittingDecision(true);

    const now = new Date();
    const timestampStr = now.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const newStatus: ReportStatus =
      decisionModal === "verify" ? "Verified" : "Rejected";

    const updated = persistReviewDecision(report.id, {
      reviewStatus: newStatus,
      reviewedBy: staffEmail || "CENRO Review Officer",
      reviewedAt: timestampStr,
      staffNotes: staffNotesInput.trim() || undefined,
      rejectionReason:
        decisionModal === "reject"
          ? rejectionReasonInput.trim()
          : undefined,
    });

    setTimeout(() => {
      setIsSubmittingDecision(false);
      setDecisionModal(null);

      if (updated) {
        setReport(updated);
        if (newStatus === "Verified") {
          toast.success("Sighting verified successfully", {
            description: `Report ${report.referenceNumber} has been verified and registered.`,
          });
        } else {
          toast.error("Report rejected", {
            description: `Report ${report.referenceNumber} has been recorded as rejected.`,
          });
        }
      }
    }, 300);
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* ── Top Navigation & Meta Header ───────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/reports"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-8 px-2 text-sm text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Reports Queue
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="tabular-nums text-sm font-bold text-foreground">
            {report.referenceNumber}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Review Status:</span>
          <StatusBadge label={report.reviewStatus} variant={statusVariant} />
        </div>
      </div>

      {/* ── Main Two-Column Layout (60 / 40 on lg) ─────────────────── */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* ── Left Column: Photo Gallery & AI Classification (7 cols) ── */}
        {/* The photo stays in view while the staff member reads the
            details and decides. */}
        <div className="space-y-6 lg:sticky lg:top-20 lg:col-span-7 lg:self-start">
          {/* Sighting Photo Gallery */}
          <Card className="overflow-hidden rounded-lg border border-border bg-card p-0">
            <div className="border-b border-border p-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Submitted Photo Documentation
                </h2>
                <p className="text-sm text-muted-foreground">
                  {photos.length === 0
                    ? "No photographic evidence attached"
                    : `Displaying photo ${selectedPhotoIndex + 1} of ${photos.length}`}
                </p>
              </div>

              {photos.length > 0 && !imageError && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLightboxOpen(true)}
                  className="h-7 px-2 text-sm"
                >
                  <Maximize2 className="mr-1.5 h-3 w-3" />
                  Inspect
                </Button>
              )}
            </div>

            {/* Main Photo View Area */}
            <div className="relative aspect-4/3 w-full bg-neutral-950 flex items-center justify-center overflow-hidden">
              {photos.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <ImageIcon className="h-10 w-10 text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    No image submitted
                  </p>
                  <p className="text-sm text-muted-foreground max-w-xs mt-1">
                    The reporter submitted this observation without attaching
                    photographic evidence.
                  </p>
                </div>
              ) : imageError ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <AlertTriangle className="h-10 w-10 text-warning mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    Image failed to load
                  </p>
                  <p className="text-sm text-muted-foreground max-w-xs mt-1">
                    The requested image file could not be rendered.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="group relative h-full w-full cursor-zoom-in"
                  aria-label="Click to enlarge photo"
                >
                  {currentPhoto && (
                    <Image
                      src={currentPhoto.url}
                      alt={currentPhoto.caption || "Community sighting submission"}
                      fill
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      className="object-contain transition-transform duration-200 group-hover:scale-[1.01]"
                      onError={() => setImageError(true)}
                      priority
                    />
                  )}
                  <div className="absolute inset-0 bg-black/30 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                    <span className="flex items-center gap-1.5 rounded-md bg-black/75 px-3 py-1.5 text-sm text-white">
                      <Eye className="h-3.5 w-3.5" /> Click to enlarge
                    </span>
                  </div>
                </button>
              )}
            </div>

            {/* Photo Caption & Thumbnails */}
            {currentPhoto && (
              <div className="p-4 border-t border-border bg-card">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Caption: </span>
                  {currentPhoto.caption || "Community leaf observation photograph"}
                </p>

                {/* Multiple Photos Thumbnail Strip */}
                {photos.length > 1 && (
                  <div className="mt-3 flex items-center gap-2 pt-2 border-t border-border/60">
                    {photos.map((photo, idx) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => {
                          setSelectedPhotoIndex(idx);
                          setImageError(false);
                        }}
                        className={cn(
                          "relative h-12 w-12 overflow-hidden rounded border transition-all",
                          selectedPhotoIndex === idx
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border opacity-70 hover:opacity-100"
                        )}
                        aria-label={`Select photo ${idx + 1}`}
                      >
                        <Image
                          src={photo.url}
                          alt={photo.caption}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* ── Right Column: Report Metadata & CENRO Decision (5 cols) ─ */}
        <div className="space-y-6 lg:col-span-5">
          {/* The AI's result comes first in the reading order, drawn with a
              dashed outline and neutral colours: it is a suggestion, and
              green is kept for CENRO's own decision. */}
          <Card className="rounded-lg border border-dashed border-foreground/40 bg-transparent p-5 space-y-4 shadow-none ring-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  A suggestion, not a decision
                </p>
                <h3 className="text-base font-semibold text-foreground">
                  AI Classification Assessment
                </h3>
              </div>
              <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-sm tabular-nums text-muted-foreground">
                {report.aiClassification.modelVersion}
              </span>
            </div>

            {/* Classification Result & Confidence Meter */}
            <div className="rounded-lg border border-border bg-background p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Predicted Class</p>
                  <p className="text-base font-bold text-foreground">
                    {report.aiClassification.label}
                  </p>
                  <p className="text-sm italic text-muted-foreground">
                    {report.aiClassification.scientificName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="text-xl font-bold tabular-nums text-foreground">
                    {(report.aiClassification.confidence * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Visual Confidence Bar */}
              <div className="space-y-1">
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-muted border border-border"
                  aria-label={`Classification confidence: ${(report.aiClassification.confidence * 100).toFixed(1)}%`}
                >
                  <div
                    className={cn(
                      "h-full transition-all duration-500",
                      report.aiClassification.label === "Mahogany"
                        ? "bg-foreground/60"
                        : "bg-foreground/60"
                    )}
                    style={{
                      width: `${report.aiClassification.confidence * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>0%</span>
                  <span>Analyzed {report.aiClassification.analyzedAt}</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {/* Mandatory Informational Disclaimer */}
            <div className="flex items-start gap-2.5 rounded-md border border-border/80 bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden="true" />
              <p>
                <strong className="text-foreground">Informational Guidance Only:</strong>{" "}
                AI classifications generated by CITIA-IS assist CENRO officers
                in identification screening. Model predictions do{" "}
                <strong>NOT</strong> authorize tree cutting or removal. All
                management recommendations remain subject to formal on-site
                CENRO assessment.
              </p>
            </div>
          </Card>

          {/* Location & Sighting Information */}
          <Card className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground pb-2 border-b border-border">
              Observation Details
            </h3>

            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  Study Area
                </dt>
                <dd className="mt-0.5 font-semibold text-foreground text-sm">
                  {report.studyArea}
                </dd>
              </div>

              <div>
                <dt className="text-muted-foreground">Specific Location / Landmark</dt>
                <dd className="mt-0.5 text-foreground leading-relaxed">
                  {report.specificLocation}
                </dd>
              </div>

              {/* Coordinates: Rendered ONLY if present in report data */}
              {report.coordinates ? (
                <div>
                  <dt className="text-muted-foreground flex items-center gap-1.5">
                    <Navigation className="h-3.5 w-3.5 text-primary" />
                    GPS Coordinates
                  </dt>
                  <dd className="mt-0.5 tabular-nums text-sm text-foreground bg-muted/60 px-2 py-1 rounded inline-block">
                    {report.coordinates.lat.toFixed(4)}° N,{" "}
                    {report.coordinates.lng.toFixed(4)}° E
                  </dd>
                </div>
              ) : (
                <div>
                  <dt className="text-muted-foreground">GPS Coordinates</dt>
                  <dd className="mt-0.5 text-muted-foreground italic">
                    Coordinates not supplied by reporter
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Observation Type
                </dt>
                <dd className="mt-0.5 text-foreground">
                  {report.observationType}
                </dd>
              </div>

              <div>
                <dt className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  Submission Date &amp; Time
                </dt>
                <dd className="mt-0.5 text-foreground">
                  {report.displayDate}
                </dd>
              </div>

              <div>
                <dt className="text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                  Reporter Information
                </dt>
                <dd className="mt-0.5 text-foreground">
                  {report.reporterName || "Community Member"}
                  {report.contactInfo && (
                    <span className="block text-sm text-muted-foreground">
                      {report.contactInfo}
                    </span>
                  )}
                </dd>
              </div>
            </dl>

            {/* Community Notes */}
            <div className="pt-2 border-t border-border">
              <p className="text-sm font-medium text-foreground mb-1">
                Community Notes
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground bg-background p-3 rounded border border-border">
                {report.communityNotes}
              </p>
            </div>
          </Card>

          {/* CENRO Administrative Decision Panel */}
          <Card className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                CENRO Review Decision
              </h3>
              <StatusBadge label={report.reviewStatus} variant={statusVariant} />
            </div>

            {/* Active Decision Summary */}
            {report.reviewStatus !== "Pending" ? (
              <div className="space-y-3 rounded-lg border border-border bg-background p-3.5 text-sm">
                <div>
                  <span className="text-muted-foreground">Reviewed By: </span>
                  <span className="font-medium text-foreground">
                    {report.reviewedBy || "Authorized Officer"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Decision Timestamp: </span>
                  <span className="text-foreground">{report.reviewedAt}</span>
                </div>
                {report.rejectionReason && (
                  <div>
                    <span className="font-semibold text-destructive block mb-0.5">
                      Rejection Reason:
                    </span>
                    <p className="text-foreground leading-relaxed">
                      {report.rejectionReason}
                    </p>
                  </div>
                )}
                {report.staffNotes && (
                  <div>
                    <span className="text-muted-foreground block mb-0.5">
                      Staff Assessment Notes:
                    </span>
                    <p className="text-foreground leading-relaxed">
                      {report.staffNotes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                This sighting submission is currently pending evaluation. Review
                the photographic specimen and submit an official decision below.
              </p>
            )}

            {/* Decision Controls */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-sm font-semibold"
                onClick={() => setDecisionModal("verify")}
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                {report.reviewStatus === "Verified"
                  ? "Update Verification"
                  : "Verify Sighting"}
              </Button>

              <Button
                type="button"
                variant="destructive"
                className="flex-1 h-11 text-sm font-semibold"
                onClick={() => setDecisionModal("reject")}
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                {report.reviewStatus === "Rejected"
                  ? "Update Rejection"
                  : "Reject Report"}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Accessible Image Lightbox Modal (Full-Scale Inspection) ── */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="sm:max-w-6xl md:max-w-7xl w-[96vw] max-w-[96vw] p-3 sm:p-4 bg-neutral-950/95 border-neutral-800 text-white backdrop-blur-xl">
          <div className="relative h-[78vh] w-full overflow-hidden rounded-lg bg-black flex items-center justify-center">
            {currentPhoto && (
              <Image
                src={currentPhoto.url}
                alt={currentPhoto.caption || "Enlarged observation specimen"}
                fill
                sizes="95vw"
                className="object-contain"
                priority
              />
            )}
          </div>
          <div className="pt-2 px-1 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-neutral-300">
            <span className="font-medium text-white">
              {currentPhoto?.caption || "Submitted leaf specimen"}
            </span>
            <span className="tabular-nums text-sm text-neutral-400">
              {report.referenceNumber} · Specimen {selectedPhotoIndex + 1} of{" "}
              {photos.length}
            </span>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Decision Confirmation Modal (Two-step review) ─────────── */}
      <Dialog
        open={decisionModal !== null}
        onOpenChange={(open) => {
          if (!open) setDecisionModal(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {decisionModal === "verify"
                ? "Confirm Sighting Verification"
                : "Confirm Report Rejection"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {decisionModal === "verify"
                ? "Verifying confirms that this observation represents Swietenia macrophylla and registers it for monitoring."
                : "Rejection excludes this observation from confirmed invasive Mahogany records. A valid reason must be stated."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            {decisionModal === "reject" && (
              <div className="space-y-1.5">
                <label
                  htmlFor="rejection-reason"
                  className="font-medium text-foreground block"
                >
                  Rejection Reason <span className="text-destructive">*</span>
                </label>
                <select
                  id="rejection-reason"
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  className="w-full rounded-md border border-border bg-card p-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-destructive"
                >
                  <option value="">Select a reason…</option>
                  <option value="Specimen does not match Swietenia macrophylla botanical criteria.">
                    Non-Mahogany botanical specimen
                  </option>
                  <option value="Photographic specimen too degraded, blurry, or distant for classification.">
                    Unclassifiable / blurry photography
                  </option>
                  <option value="Duplicate submission of previously documented tree record.">
                    Duplicate sighting record
                  </option>
                  <option value="Non-tree object or non-biological subject.">
                    Non-tree object
                  </option>
                  <option value="Location outside CENRO Iligan City jurisdiction.">
                    Outside focal study boundaries
                  </option>
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="staff-notes"
                className="font-medium text-foreground block"
              >
                Staff Assessment Notes{" "}
                <span className="text-muted-foreground font-normal">
                  (Optional)
                </span>
              </label>
              <Textarea
                id="staff-notes"
                placeholder="Enter notes for CENRO records or field reference…"
                value={staffNotesInput}
                onChange={(e) => setStaffNotesInput(e.target.value)}
                className="h-20 text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDecisionModal(null)}
              disabled={isSubmittingDecision}
              className="text-sm"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={decisionModal === "verify" ? "default" : "destructive"}
              size="sm"
              onClick={handleConfirmDecision}
              disabled={isSubmittingDecision}
              className="text-sm font-semibold"
            >
              {isSubmittingDecision
                ? "Recording Decision…"
                : decisionModal === "verify"
                  ? "Confirm Verification"
                  : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
