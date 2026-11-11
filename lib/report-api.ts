// lib/report-api.ts
//
// WHAT: Sends a community Report a Sighting submission to the CITIA-IS
//   FastAPI service (POST /reports) and returns either the saved
//   report's reference or a failure with messages the form can show.
//
// WHERE THE API IS: NEXT_PUBLIC_API_URL, for example
//   http://localhost:8000. It is copied into the JavaScript sent to the
//   browser, so it must only ever hold the API's public address.
//
// SAFE RETRIES: every submission carries a client_submission_id that the
//   form creates once and reuses on every retry. If a response is lost
//   and the reporter tries again, the backend returns the report it
//   already saved instead of creating a duplicate.
//
// NEVER TRUSTED BLINDLY: every field of the response is checked before
//   it is shown, so a broken response can never look like a saved report.

import type { ClassificationLabel } from "@/lib/classify-api";

export type StudyArea = "palao" | "dalipuga" | "npc";

export type ObservationType = "single_tree" | "multiple_trees" | "seedlings_saplings";

export interface ReportLocation {
  latitude: number;
  longitude: number;
  /** Only when the coordinates are an unmoved GPS fix. */
  accuracyM: number | null;
}

export interface ReportSubmission {
  clientSubmissionId: string;
  studyArea: StudyArea;
  observationType: ObservationType;
  barangay: string;
  landmark: string;
  communityNotes: string;
  reporterName: string;
  reporterContact: string;
  location: ReportLocation | null;
  photo: File;
}

export type ReportClassification =
  | { outcome: "unavailable" | "failed" }
  | {
      outcome: "succeeded";
      label: ClassificationLabel;
      confidence: number;
      lowConfidence: boolean;
    };

export interface SavedReport {
  referenceNumber: string;
  status: "pending_review" | "verified" | "rejected";
  classification: ReportClassification;
  /** True when this submission had already been saved (a retry). */
  alreadySaved: boolean;
}

export type SubmitFailure =
  | "not_configured"
  | "offline"
  | "timeout"
  | "invalid_fields"
  | "invalid_photo"
  | "unavailable"
  | "server_error";

export type SubmitOutcome =
  | { ok: true; report: SavedReport }
  | {
      ok: false;
      failure: SubmitFailure;
      message: string;
      /** Problems with individual fields, keyed by the API's field name. */
      fieldErrors: Record<string, string>;
    };

// Uploading a photo and re-checking it with the AI can take a while on a
// slow connection.
const REQUEST_TIMEOUT_MS = 60_000;

const LABELS: readonly string[] = ["Mahogany", "Non-Mahogany", "Non-Tree"];
const STATUSES: readonly string[] = ["pending_review", "verified", "rejected"];
const REFERENCE_PATTERN = /^CITS-\d{6,}$/;

const MESSAGES: Record<SubmitFailure, string> = {
  not_configured: "The reporting service is not configured.",
  offline:
    "Cannot reach the CITIA-IS reporting service. Check your connection and try again — your details are kept.",
  timeout: "Sending the report took too long. Please try again — your details are kept.",
  invalid_fields: "Please check the highlighted fields.",
  invalid_photo: "This photo could not be accepted. Please choose a clear JPEG or PNG photo.",
  unavailable: "Reports cannot be saved right now. Please try again later — your details are kept.",
  server_error: "Something went wrong while saving your report. Please try again.",
};

// Error codes the backend uses for a problem with the photo itself.
const PHOTO_ERROR_CODES = new Set([
  "photo_required",
  "one_photo_only",
  "empty_file",
  "invalid_image",
  "unsupported_media_type",
  "image_too_large",
  "file_too_large",
  "payload_too_large",
]);

function failure(
  kind: SubmitFailure,
  message = MESSAGES[kind],
  fieldErrors: Record<string, string> = {}
): SubmitOutcome {
  return { ok: false, failure: kind, message, fieldErrors };
}

function toClassification(value: unknown): ReportClassification | null {
  if (typeof value !== "object" || value === null) return null;
  const { outcome, label, confidence, low_confidence } = value as Record<string, unknown>;

  if (outcome === "unavailable" || outcome === "failed") return { outcome };
  if (outcome !== "succeeded") return null;

  if (typeof label !== "string" || !LABELS.includes(label)) return null;
  if (typeof confidence !== "number" || !Number.isFinite(confidence)) return null;
  if (confidence < 0 || confidence > 100) return null;
  if (typeof low_confidence !== "boolean") return null;

  return {
    outcome,
    label: label as ClassificationLabel,
    confidence,
    lowConfidence: low_confidence,
  };
}

/** Checks the success body field by field. */
function toSavedReport(body: unknown, alreadySaved: boolean): SavedReport | null {
  if (typeof body !== "object" || body === null) return null;
  const { reference_number, status, classification } = body as Record<string, unknown>;

  if (typeof reference_number !== "string" || !REFERENCE_PATTERN.test(reference_number)) return null;
  if (typeof status !== "string" || !STATUSES.includes(status)) return null;

  const checked = toClassification(classification);
  if (!checked) return null;

  return {
    referenceNumber: reference_number,
    status: status as SavedReport["status"],
    classification: checked,
    alreadySaved,
  };
}

interface ErrorBody {
  code: string | null;
  message: string | null;
  details: { field: string; message: string }[];
}

/** Reads the backend's error shape: {"error": {"code", "message", "details"?}}. */
function readError(body: unknown): ErrorBody {
  const empty: ErrorBody = { code: null, message: null, details: [] };
  if (typeof body !== "object" || body === null) return empty;
  const error = (body as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) return empty;

  const { code, message, details } = error as Record<string, unknown>;
  return {
    code: typeof code === "string" ? code : null,
    message: typeof message === "string" && message.trim() ? message : null,
    details: Array.isArray(details)
      ? details.flatMap((item) => {
          if (typeof item !== "object" || item === null) return [];
          const { field, message: text } = item as Record<string, unknown>;
          return typeof field === "string" && typeof text === "string"
            ? [{ field, message: text }]
            : [];
        })
      : [],
  };
}

/** "Value error, Consent is required…" → "Consent is required…" */
function cleanFieldMessage(text: string): string {
  return text.replace(/^Value error,\s*/i, "");
}

function buildForm(submission: ReportSubmission): FormData {
  const form = new FormData();
  form.append("client_submission_id", submission.clientSubmissionId);
  form.append("study_area", submission.studyArea);
  form.append("observation_type", submission.observationType);
  form.append("consent_confirmed", "true");

  // Optional text is sent only when filled in.
  const optional: [string, string][] = [
    ["barangay", submission.barangay],
    ["landmark", submission.landmark],
    ["community_notes", submission.communityNotes],
    ["reporter_name", submission.reporterName],
    ["reporter_contact", submission.reporterContact],
  ];
  for (const [name, value] of optional) {
    if (value.trim()) form.append(name, value.trim());
  }

  // Coordinates only when the reporter chose a location.
  if (submission.location) {
    form.append("latitude", submission.location.latitude.toFixed(6));
    form.append("longitude", submission.location.longitude.toFixed(6));
    if (submission.location.accuracyM !== null) {
      form.append("gps_accuracy_m", submission.location.accuracyM.toFixed(1));
    }
  }

  // The original File. No Content-Type header is set: the browser adds
  // the multipart boundary itself.
  form.append("photo", submission.photo, submission.photo.name);
  return form;
}

export async function submitReport(
  submission: ReportSubmission,
  signal: AbortSignal
): Promise<SubmitOutcome> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) return failure("not_configured");

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const cancel = () => controller.abort();

  if (signal.aborted) {
    controller.abort();
  } else {
    signal.addEventListener("abort", cancel);
  }

  try {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/reports`, {
        method: "POST",
        body: buildForm(submission),
        signal: controller.signal,
      });
    } catch {
      if (timedOut) return failure("timeout");
      // Stopped backend, wrong address, network down or CORS refusal —
      // browsers report all of these the same way.
      return failure("offline");
    }

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (timedOut) return failure("timeout");

    if (response.status === 201 || response.status === 200) {
      const report = toSavedReport(body, response.status === 200);
      return report ? { ok: true, report } : failure("server_error");
    }

    const error = readError(body);

    if (response.status === 503) return failure("unavailable");

    if (error.code && PHOTO_ERROR_CODES.has(error.code)) {
      return failure("invalid_photo", error.message ?? MESSAGES.invalid_photo);
    }

    if (response.status === 422 && error.details.length > 0) {
      const fieldErrors: Record<string, string> = {};
      for (const detail of error.details) {
        fieldErrors[detail.field] ??= cleanFieldMessage(detail.message);
      }
      return failure("invalid_fields", MESSAGES.invalid_fields, fieldErrors);
    }

    if ([400, 413, 415, 422].includes(response.status)) {
      return failure("invalid_photo", error.message ?? MESSAGES.invalid_photo);
    }

    return failure("server_error");
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
  }
}

/** A random ID for one report, created once per form and kept across retries. */
export function newSubmissionId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  // randomUUID needs a secure context (https or localhost). On a phone
  // testing over a LAN address, build the same version-4 UUID by hand.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
