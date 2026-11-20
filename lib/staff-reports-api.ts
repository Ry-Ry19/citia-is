// lib/staff-reports-api.ts
//
// WHAT: The requests the Next.js server makes to the CITIA-IS API for the
//   CENRO admin screens: the dashboard, the reports list, one report, a
//   report's photo, and recording a review.
//
// SERVER ONLY: every function takes the staff member's access token,
//   which exists only on the server (see getCurrentStaffSession). Import
//   this file from server components, server actions and route handlers
//   only — never from a "use client" file.
//
// RESULTS: each function returns { ok: true, data } or { ok: false,
//   problem }, so a page can show a clear message instead of crashing
//   when the API is down.

import {
  toAdminReportDetail,
  toDashboardSummary,
  toReportPage,
  type AdminReportDetail,
  type DashboardSummary,
  type ReportPage,
  type StatusCode,
  type StudyAreaCode,
} from "@/lib/admin-reports";

const REQUEST_TIMEOUT_MS = 10_000;

export type ApiProblem =
  /** Signed out, or no longer an active staff member. */
  | "refused"
  | "not_found"
  /** The request itself was refused (e.g. a rejection without a reason). */
  | "invalid"
  /** The API, database or storage could not be reached. */
  | "unavailable";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; problem: ApiProblem; message?: string };

function apiBase(): string | null {
  return process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") || null;
}

function problemFor(status: number): ApiProblem {
  if (status === 401 || status === 403) return "refused";
  if (status === 404) return "not_found";
  if (status === 400 || status === 422) return "invalid";
  return "unavailable";
}

/** The API's own short message for an error, when it sent one. */
async function apiMessage(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { error?: { message?: unknown } };
    return typeof body.error?.message === "string" ? body.error.message : undefined;
  } catch {
    return undefined;
  }
}

async function request(
  accessToken: string,
  path: string,
  init: RequestInit = {}
): Promise<Response | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    return await fetch(`${base}${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
}

async function getJson<T>(
  accessToken: string,
  path: string,
  convert: (raw: unknown) => T
): Promise<ApiResult<T>> {
  const response = await request(accessToken, path);
  if (!response) return { ok: false, problem: "unavailable" };
  if (!response.ok) {
    return { ok: false, problem: problemFor(response.status), message: await apiMessage(response) };
  }
  try {
    return { ok: true, data: convert(await response.json()) };
  } catch {
    return { ok: false, problem: "unavailable" };
  }
}

export interface ReportQuery {
  status?: StatusCode;
  studyArea?: StudyAreaCode;
  search?: string;
  hasLocation?: boolean;
  limit?: number;
  offset?: number;
}

export function getDashboard(accessToken: string): Promise<ApiResult<DashboardSummary>> {
  return getJson(accessToken, "/staff/dashboard", toDashboardSummary);
}

export function listReports(
  accessToken: string,
  query: ReportQuery = {}
): Promise<ApiResult<ReportPage>> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.studyArea) params.set("study_area", query.studyArea);
  if (query.search?.trim()) params.set("q", query.search.trim().slice(0, 100));
  if (query.hasLocation) params.set("has_location", "true");
  params.set("limit", String(query.limit ?? 25));
  params.set("offset", String(query.offset ?? 0));
  return getJson(accessToken, `/staff/reports?${params}`, toReportPage);
}

/** A reference number as the database writes it, e.g. CITS-000021. */
export const REFERENCE_PATTERN = /^CITS-\d{6,12}$/;

export function getReport(
  accessToken: string,
  reference: string
): Promise<ApiResult<AdminReportDetail>> {
  if (!REFERENCE_PATTERN.test(reference)) {
    return Promise.resolve({ ok: false, problem: "not_found" });
  }
  return getJson(accessToken, `/staff/reports/${reference}`, toAdminReportDetail);
}

export interface ReviewInput {
  decision: "verified" | "rejected";
  rejectionReason: string | null;
  staffNotes: string | null;
}

export async function addReview(
  accessToken: string,
  reference: string,
  review: ReviewInput
): Promise<ApiResult<AdminReportDetail | null>> {
  if (!REFERENCE_PATTERN.test(reference)) return { ok: false, problem: "not_found" };
  const response = await request(accessToken, `/staff/reports/${reference}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      decision: review.decision,
      rejection_reason: review.rejectionReason,
      staff_notes: review.staffNotes,
    }),
  });
  if (!response) return { ok: false, problem: "unavailable" };
  if (!response.ok) {
    return { ok: false, problem: problemFor(response.status), message: await apiMessage(response) };
  }
  try {
    return { ok: true, data: toAdminReportDetail(await response.json()) };
  } catch {
    // The decision was saved; only the reply could not be read.
    return { ok: true, data: null };
  }
}

/** The raw photo reply, passed straight through to the browser. */
export async function getReportPhoto(
  accessToken: string,
  reference: string
): Promise<Response | null> {
  if (!REFERENCE_PATTERN.test(reference)) return null;
  return request(accessToken, `/staff/reports/${reference}/photo`);
}
