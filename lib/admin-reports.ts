// lib/admin-reports.ts
//
// WHAT: The shapes the CENRO admin screens use for sighting reports, and
//   the code that turns the CITIA-IS API's replies into them.
//
// WHY A SEPARATE SHAPE: the API speaks in database values
//   ("palao", "pending_review", confidence 94.8). The screens show labels
//   ("Palao Medical", "Pending", 94.8%). Converting in one place keeps
//   every screen consistent.
//
// SAFE IN THE BROWSER: this file holds no token and makes no request. The
//   requests are in lib/staff-reports-api.ts, which runs on the server only.

export type ReportStatus = "Pending" | "Verified" | "Rejected";
export type StatusCode = "pending_review" | "verified" | "rejected";
export type StudyAreaCode = "palao" | "dalipuga" | "npc";

export const STUDY_AREA_LABEL: Record<StudyAreaCode, string> = {
  palao: "Palao Medical",
  dalipuga: "Dalipuga",
  npc: "NPC Area",
};

export const STATUS_LABEL: Record<StatusCode, ReportStatus> = {
  pending_review: "Pending",
  verified: "Verified",
  rejected: "Rejected",
};

export const STATUS_CODE: Record<ReportStatus, StatusCode> = {
  Pending: "pending_review",
  Verified: "verified",
  Rejected: "rejected",
};

const OBSERVATION_LABEL: Record<string, string> = {
  single_tree: "Single tree",
  multiple_trees: "Multiple trees",
  seedlings_saplings: "Seedlings or saplings",
};

/** The colour variant StatusBadge uses for each status. */
export function statusVariant(status: ReportStatus) {
  return status === "Verified"
    ? "success"
    : status === "Rejected"
      ? "destructive"
      : "warning";
}

/** The AI's suggestion for a report. Null when the AI did not classify it. */
export interface AiSuggestion {
  label: string;
  /** From 0 to 1 (0.948 = 94.8%). Null when no confidence was recorded. */
  confidence: number | null;
  lowConfidence: boolean;
}

/** One report as the list, the map and the dashboard show it. */
export interface AdminReport {
  /** The reference number. Also the report's address: /admin/reports/<id>. */
  id: string;
  referenceNumber: string;
  submittedAt: string;
  displayDate: string;
  studyArea: string;
  studyAreaCode: StudyAreaCode;
  /** Landmark and barangay, as the reporter gave them. */
  specificLocation: string;
  coordinates?: { lat: number; lng: number };
  observationType: string;
  hasPhoto: boolean;
  /** Where the browser loads the photo from (a staff-only route). */
  photoUrl: string | null;
  aiClassification: AiSuggestion | null;
  reviewStatus: ReportStatus;
}

export interface ReviewEntry {
  decision: ReportStatus;
  rejectionReason: string | null;
  staffNotes: string | null;
  reviewedAt: string;
  reviewerName: string;
}

/** One report in full, for the review page. */
export interface AdminReportDetail extends AdminReport {
  gpsAccuracyM: number | null;
  communityNotes: string | null;
  reporterName: string | null;
  contactInfo: string | null;
  photoSize: { width: number; height: number } | null;
  ai: {
    /** "succeeded", "unavailable" or "failed". */
    outcome: string;
    modelVersion: string | null;
    analyzedAt: string | null;
  } | null;
  /** Newest first. */
  reviews: ReviewEntry[];
}

export interface AreaCounts {
  studyArea: string;
  studyAreaCode: StudyAreaCode;
  total: number;
  pending: number;
  verified: number;
  rejected: number;
}

export interface RecentReview {
  referenceNumber: string;
  decision: ReportStatus;
  reviewedAt: string;
  reviewerName: string;
}

export interface DashboardSummary {
  totals: { total: number; pending: number; verified: number; rejected: number };
  byArea: AreaCounts[];
  recentReports: AdminReport[];
  recentReviews: RecentReview[];
}

export interface ReportPage {
  items: AdminReport[];
  total: number;
  limit: number;
  offset: number;
}

// ── Converting API replies ─────────────────────────────────────────────────

const DATE_FORMAT = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : DATE_FORMAT.format(date);
}

type Json = Record<string, unknown>;

const str = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;
const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

function areaCode(value: unknown): StudyAreaCode {
  return value === "dalipuga" || value === "npc" ? value : "palao";
}

function statusLabel(value: unknown): ReportStatus {
  return STATUS_LABEL[value as StatusCode] ?? "Pending";
}

function aiSuggestion(ai: unknown): AiSuggestion | null {
  if (typeof ai !== "object" || ai === null) return null;
  const { label, confidence, low_confidence } = ai as Json;
  const name = str(label);
  if (!name) return null;
  const percent = num(confidence);
  return {
    label: name,
    confidence: percent === null ? null : percent / 100,
    lowConfidence: low_confidence === true,
  };
}

export function toAdminReport(raw: unknown): AdminReport {
  const r = (raw ?? {}) as Json;
  const reference = str(r.reference_number) ?? "";
  const code = areaCode(r.study_area);
  const lat = num(r.latitude);
  const lng = num(r.longitude);
  const location = [str(r.landmark), str(r.barangay)].filter(Boolean).join(", ");
  const hasPhoto = r.has_photo === true || (typeof r.photo === "object" && r.photo !== null);

  return {
    id: reference,
    referenceNumber: reference,
    submittedAt: str(r.submitted_at) ?? "",
    displayDate: formatDate(str(r.submitted_at)),
    studyArea: STUDY_AREA_LABEL[code],
    studyAreaCode: code,
    specificLocation: location || "No landmark given",
    coordinates: lat !== null && lng !== null ? { lat, lng } : undefined,
    observationType: OBSERVATION_LABEL[str(r.observation_type) ?? ""] ?? "Not stated",
    hasPhoto,
    photoUrl: hasPhoto ? `/admin/reports/${encodeURIComponent(reference)}/photo` : null,
    aiClassification: aiSuggestion(r.ai),
    reviewStatus: statusLabel(r.review_status),
  };
}

export function toAdminReportDetail(raw: unknown): AdminReportDetail {
  const r = (raw ?? {}) as Json;
  const base = toAdminReport(raw);
  const photo = (r.photo ?? null) as Json | null;
  const ai = (r.ai ?? null) as Json | null;

  return {
    ...base,
    gpsAccuracyM: num(r.gps_accuracy_m),
    communityNotes: str(r.community_notes),
    reporterName: str(r.reporter_name),
    contactInfo: str(r.reporter_contact),
    photoSize:
      photo && num(photo.width_px) !== null && num(photo.height_px) !== null
        ? { width: photo.width_px as number, height: photo.height_px as number }
        : null,
    ai: ai
      ? {
          outcome: str(ai.outcome) ?? "unavailable",
          modelVersion: str(ai.model_version),
          analyzedAt: formatDate(str(ai.classified_at)) || null,
        }
      : null,
    reviews: Array.isArray(r.reviews)
      ? r.reviews.map((entry) => {
          const v = (entry ?? {}) as Json;
          return {
            decision: statusLabel(v.decision),
            rejectionReason: str(v.rejection_reason),
            staffNotes: str(v.staff_notes),
            reviewedAt: formatDate(str(v.reviewed_at)),
            reviewerName: str(v.reviewer_name) ?? "CENRO staff",
          };
        })
      : [],
  };
}

export function toReportPage(raw: unknown): ReportPage {
  const r = (raw ?? {}) as Json;
  return {
    items: Array.isArray(r.items) ? r.items.map(toAdminReport) : [],
    total: num(r.total) ?? 0,
    limit: num(r.limit) ?? 25,
    offset: num(r.offset) ?? 0,
  };
}

export function toDashboardSummary(raw: unknown): DashboardSummary {
  const r = (raw ?? {}) as Json;
  const totals = (r.totals ?? {}) as Json;
  const count = (value: unknown) => num(value) ?? 0;

  return {
    totals: {
      total: count(totals.total),
      pending: count(totals.pending_review),
      verified: count(totals.verified),
      rejected: count(totals.rejected),
    },
    byArea: Array.isArray(r.by_area)
      ? r.by_area.map((entry) => {
          const a = (entry ?? {}) as Json;
          const code = areaCode(a.study_area);
          return {
            studyArea: STUDY_AREA_LABEL[code],
            studyAreaCode: code,
            total: count(a.total),
            pending: count(a.pending_review),
            verified: count(a.verified),
            rejected: count(a.rejected),
          };
        })
      : [],
    recentReports: Array.isArray(r.recent_reports) ? r.recent_reports.map(toAdminReport) : [],
    recentReviews: Array.isArray(r.recent_reviews)
      ? r.recent_reviews.map((entry) => {
          const v = (entry ?? {}) as Json;
          return {
            referenceNumber: str(v.reference_number) ?? "",
            decision: statusLabel(v.decision),
            reviewedAt: formatDate(str(v.reviewed_at)),
            reviewerName: str(v.reviewer_name) ?? "CENRO staff",
          };
        })
      : [],
  };
}
