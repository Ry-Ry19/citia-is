// lib/classify-api.ts
//
// WHAT: Sends a leaf photo to the CITIA-IS FastAPI service
//   (POST /classify) and returns either a checked classification result
//   or a failure with a message the scanner can show.
//
// WHERE THE API IS: NEXT_PUBLIC_API_URL, for example
//   http://localhost:8000. Next.js copies NEXT_PUBLIC_ values into the
//   JavaScript sent to the browser, so this must only ever hold the
//   API's public address — never a key, password or secret.
//
// NEVER TRUSTED BLINDLY: every field of the response is checked before
//   it is used, so a broken or unexpected response can never be shown
//   as an AI result. The low-confidence decision comes from the backend,
//   where the provisional threshold is configured.

export type ClassificationLabel = "Mahogany" | "Non-Mahogany" | "Non-Tree";

export interface ClassificationResult {
  label: ClassificationLabel;
  /** Classification Confidence, 0–100, one decimal place. */
  confidence: number;
  /** True when the backend judged the confidence too low to rely on. */
  lowConfidence: boolean;
}

export type ClassifyFailure =
  | "not_configured"
  | "offline"
  | "timeout"
  | "cancelled"
  | "invalid_image"
  | "unavailable"
  | "server_error";

export type ClassifyOutcome =
  | { ok: true; result: ClassificationResult }
  | { ok: false; failure: ClassifyFailure; message: string };

const LABELS: readonly string[] = ["Mahogany", "Non-Mahogany", "Non-Tree"];

const REQUEST_TIMEOUT_MS = 30_000;

const MESSAGES: Record<ClassifyFailure, string> = {
  not_configured: "The classification service is not configured.",
  offline:
    "Cannot reach the CITIA-IS classification service. Check your connection and try again.",
  timeout: "The analysis took too long. Please try again.",
  cancelled: "The analysis was cancelled.",
  invalid_image: "This photo could not be analyzed. Please choose a clear JPEG or PNG photo.",
  unavailable: "AI classification is temporarily unavailable. Please try again later.",
  server_error: "Something went wrong while analyzing the photo. Please try again.",
};

// Statuses for which the backend explains a problem with the photo itself.
const IMAGE_PROBLEM_STATUSES = new Set([400, 413, 415, 422]);

function failure(kind: ClassifyFailure, message = MESSAGES[kind]): ClassifyOutcome {
  return { ok: false, failure: kind, message };
}

/** Checks the success body field by field and converts it to the frontend shape. */
function toResult(body: unknown): ClassificationResult | null {
  if (typeof body !== "object" || body === null) return null;
  const { label, confidence, low_confidence } = body as Record<string, unknown>;

  if (typeof label !== "string" || !LABELS.includes(label)) return null;
  if (typeof confidence !== "number" || !Number.isFinite(confidence)) return null;
  if (confidence < 0 || confidence > 100) return null;
  if (typeof low_confidence !== "boolean") return null;

  return {
    label: label as ClassificationLabel,
    confidence,
    lowConfidence: low_confidence,
  };
}

/** Reads the backend's public error message: {"error": {"message": "..."}}. */
function errorMessage(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const error = (body as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) return null;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.trim() ? message : null;
}

export async function classifyLeaf(
  file: File,
  signal: AbortSignal
): Promise<ClassifyOutcome> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) return failure("not_configured");

  const form = new FormData();
  // The original File, exactly as the user chose it. No Content-Type
  // header is set: the browser adds the multipart boundary itself.
  form.append("image", file, file.name);

  // One controller stops the request on either a timeout or the
  // caller's signal (a reset or a new photo in the scanner).
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
      response = await fetch(`${baseUrl}/classify`, {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
    } catch {
      if (timedOut) return failure("timeout");
      if (signal.aborted) return failure("cancelled");
      // The backend is stopped, the address is wrong, the network is
      // down, or CORS refused the request — browsers report all of these
      // the same way.
      return failure("offline");
    }

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (timedOut) return failure("timeout");
    if (signal.aborted) return failure("cancelled");

    if (response.ok) {
      const result = toResult(body);
      return result ? { ok: true, result } : failure("server_error");
    }

    if (response.status === 503) return failure("unavailable");

    if (IMAGE_PROBLEM_STATUSES.has(response.status)) {
      return failure("invalid_image", errorMessage(body) ?? MESSAGES.invalid_image);
    }

    return failure("server_error");
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
  }
}
