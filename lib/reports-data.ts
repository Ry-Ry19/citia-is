// lib/reports-data.ts
//
// WHAT: Data models, sample demonstration datasets, and client persistence
//   helpers for the CENRO Reports Queue and Report Detail workflows.
//
// DATA INTEGRITY: All entries are demonstration records matching the CITIA-IS
//   study areas (Palao Medical, Dalipuga, NPC Area). Real backend database
//   and FastAPI YOLOv8 integration are not yet connected.

export type ReportStatus = "Pending" | "Verified" | "Rejected";

export interface SightingPhoto {
  id: string;
  url: string;
  caption: string;
  takenAt?: string;
}

export interface SightingReport {
  id: string;
  referenceNumber: string;
  submittedAt: string;
  displayDate: string;
  studyArea: "Palao Medical" | "Dalipuga" | "NPC Area";
  specificLocation: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  observationType: string;
  photos: SightingPhoto[];
  communityNotes: string;
  reporterName?: string;
  contactInfo?: string;

  // AI inference classification (YOLOv8n-cls)
  aiClassification: {
    label: "Mahogany" | "Non-Mahogany" | "Non-Tree";
    scientificName: string;
    confidence: number; // 0.00 to 1.00
    modelVersion: string;
    analyzedAt: string;
  };

  // CENRO administrative review status
  reviewStatus: ReportStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  staffNotes?: string;
  rejectionReason?: string;
}

export const INITIAL_SAMPLE_REPORTS: SightingReport[] = [
  {
    id: "CITS-DEMO-1042",
    referenceNumber: "CITS-DEMO-1042",
    submittedAt: "2026-10-19T08:30:00Z",
    displayDate: "19 Oct 2026, 08:30 AM",
    studyArea: "Palao Medical",
    specificLocation: "Andres Bonifacio Ave, near Palao Medical Center",
    coordinates: {
      lat: 8.2215,
      lng: 124.2482,
    },
    observationType: "Single Mature Tree",
    photos: [
      {
        id: "p-1042-1",
        url: "/assets/images/mahogany.jpg",
        caption: "Close-up leaf structure showing even-pinnate leaflets",
      },
      {
        id: "p-1042-2",
        url: "/assets/images/field-documentation.jpg",
        caption: "Field documentation context showing tree trunk and sidewalk",
      },
    ],
    communityNotes:
      "Large tree observed directly along the pedestrian walkway. Noticeable fruit pods visible in upper branches.",
    reporterName: "Resident (Palao)",
    contactInfo: "Submitted via mobile interface",
    aiClassification: {
      label: "Mahogany",
      scientificName: "Swietenia macrophylla",
      confidence: 0.948,
      modelVersion: "YOLOv8n-cls (citia-v1.0.4)",
      analyzedAt: "19 Oct 2026, 08:31 AM",
    },
    reviewStatus: "Pending",
  },
  {
    id: "CITS-DEMO-1041",
    referenceNumber: "CITS-DEMO-1041",
    submittedAt: "2026-10-18T14:15:00Z",
    displayDate: "18 Oct 2026, 02:15 PM",
    studyArea: "Dalipuga",
    specificLocation: "Purok 4, Dalipuga coastal road boundary",
    coordinates: {
      lat: 8.3185,
      lng: 124.2611,
    },
    observationType: "Multiple Mahogany Trees",
    photos: [
      {
        id: "p-1041-1",
        url: "/assets/images/mahogany-forest.jpg",
        caption: "Stand of 4 young trees planted near boundary line",
      },
    ],
    communityNotes:
      "Planted stand near residential perimeter. Leaves were confirmed using camera scanner.",
    reporterName: "Community Patrol Dalipuga",
    contactInfo: "0917-***-4921",
    aiClassification: {
      label: "Mahogany",
      scientificName: "Swietenia macrophylla",
      confidence: 0.912,
      modelVersion: "YOLOv8n-cls (citia-v1.0.4)",
      analyzedAt: "18 Oct 2026, 02:16 PM",
    },
    reviewStatus: "Verified",
    reviewedBy: "Officer M. Santos (CENRO Iligan)",
    reviewedAt: "18 Oct 2026, 03:45 PM",
    staffNotes:
      "Morphology verified in accordance with Swietenia macrophylla profile. Added to active monitoring registry.",
  },
  {
    id: "CITS-DEMO-1040",
    referenceNumber: "CITS-DEMO-1040",
    submittedAt: "2026-10-17T11:00:00Z",
    displayDate: "17 Oct 2026, 11:00 AM",
    studyArea: "NPC Area",
    specificLocation: "Transmission line access trail, Ditucalan boundary",
    coordinates: {
      lat: 8.2095,
      lng: 124.2815,
    },
    observationType: "Single Tree",
    photos: [
      {
        id: "p-1040-1",
        url: "/assets/images/ecological-impact.jpg",
        caption: "Submitted specimen along riverine slope",
      },
    ],
    communityNotes:
      "Found along the dirt road leading to NPC power channel. Suspected to be invasive species.",
    reporterName: "Eco-Volunteer",
    aiClassification: {
      label: "Non-Mahogany",
      scientificName: "Secondary growth specimen",
      confidence: 0.884,
      modelVersion: "YOLOv8n-cls (citia-v1.0.4)",
      analyzedAt: "17 Oct 2026, 11:01 AM",
    },
    reviewStatus: "Rejected",
    reviewedBy: "Officer J. Dela Cruz (CENRO Iligan)",
    reviewedAt: "17 Oct 2026, 04:30 PM",
    rejectionReason:
      "Botanical characteristics match native pioneer species (Trema orientalis), not Swietenia macrophylla.",
    staffNotes:
      "No invasive management action required. Specimen is beneficial native canopy.",
  },
  {
    id: "CITS-DEMO-1039",
    referenceNumber: "CITS-DEMO-1039",
    submittedAt: "2026-10-16T15:45:00Z",
    displayDate: "16 Oct 2026, 03:45 PM",
    studyArea: "Palao Medical",
    specificLocation: "Rotary Park boundary fence, Palao",
    coordinates: {
      lat: 8.223,
      lng: 124.249,
    },
    observationType: "Multiple Mahogany Trees",
    photos: [
      {
        id: "p-1039-1",
        url: "/assets/images/field-documentation.jpg",
        caption: "Canopy and upper branch cluster",
      },
    ],
    communityNotes:
      "Cluster of 3 saplings near public park fence. Roots starting to impact drainage edge.",
    reporterName: "Anonymous Citizen",
    aiClassification: {
      label: "Mahogany",
      scientificName: "Swietenia macrophylla",
      confidence: 0.875,
      modelVersion: "YOLOv8n-cls (citia-v1.0.4)",
      analyzedAt: "16 Oct 2026, 03:47 PM",
    },
    reviewStatus: "Pending",
  },
  {
    id: "CITS-DEMO-1038",
    referenceNumber: "CITS-DEMO-1038",
    submittedAt: "2026-10-15T09:20:00Z",
    displayDate: "15 Oct 2026, 09:20 AM",
    studyArea: "Dalipuga",
    specificLocation: "Dalipuga National High School eastern boundary",
    coordinates: {
      lat: 8.316,
      lng: 124.2595,
    },
    observationType: "Single Tree",
    photos: [
      {
        id: "p-1038-1",
        url: "/assets/images/mahogany.jpg",
        caption: "High-resolution leaf specimen taken in natural light",
      },
    ],
    communityNotes:
      "Planted near boundary fence of the school yard. Clear asymmetrical leaf base.",
    reporterName: "Faculty Member",
    aiClassification: {
      label: "Mahogany",
      scientificName: "Swietenia macrophylla",
      confidence: 0.961,
      modelVersion: "YOLOv8n-cls (citia-v1.0.4)",
      analyzedAt: "15 Oct 2026, 09:22 AM",
    },
    reviewStatus: "Verified",
    reviewedBy: "Officer M. Santos (CENRO Iligan)",
    reviewedAt: "15 Oct 2026, 01:15 PM",
    staffNotes:
      "Excellent leaf specimen clarity. Confirmed Swietenia macrophylla. Recorded for ecological monitoring.",
  },
  {
    id: "CITS-DEMO-1037",
    referenceNumber: "CITS-DEMO-1037",
    submittedAt: "2026-10-14T10:10:00Z",
    displayDate: "14 Oct 2026, 10:10 AM",
    studyArea: "NPC Area",
    specificLocation: "Access road slope, NPC residential sector",
    observationType: "Seedlings / Saplings",
    photos: [], // Deliberately empty photo array to test graceful photo-missing state
    communityNotes:
      "Seedlings observed growing along slope. Camera failed to capture clear leaf shot due to heavy rain.",
    reporterName: "Resident Observer",
    aiClassification: {
      label: "Non-Mahogany",
      scientificName: "Unclassifiable specimen",
      confidence: 0.52,
      modelVersion: "YOLOv8n-cls (citia-v1.0.4)",
      analyzedAt: "14 Oct 2026, 10:12 AM",
    },
    reviewStatus: "Rejected",
    reviewedBy: "Officer R. Ramos (CENRO Iligan)",
    reviewedAt: "14 Oct 2026, 11:20 AM",
    rejectionReason:
      "No legible leaf photography attached to verify identification criteria.",
    staffNotes:
      "Requester advised to resubmit report with a clear leaf-level photograph in dry conditions.",
  },
  {
    id: "CITS-DEMO-1036",
    referenceNumber: "CITS-DEMO-1036",
    submittedAt: "2026-10-13T13:40:00Z",
    displayDate: "13 Oct 2026, 01:40 PM",
    studyArea: "Palao Medical",
    specificLocation: "Vacant residential lot, corner 4th East St.",
    coordinates: {
      lat: 8.2202,
      lng: 124.2465,
    },
    observationType: "Seedlings / Saplings",
    photos: [
      {
        id: "p-1036-1",
        url: "/assets/images/mahogany.jpg",
        caption: "Young seedling leaf sample",
      },
    ],
    communityNotes:
      "Small sapling sprouting near concrete perimeter wall. Foliage looks identical to mature Mahogany.",
    reporterName: "Local Resident",
    aiClassification: {
      label: "Mahogany",
      scientificName: "Swietenia macrophylla",
      confidence: 0.923,
      modelVersion: "YOLOv8n-cls (citia-v1.0.4)",
      analyzedAt: "13 Oct 2026, 01:42 PM",
    },
    reviewStatus: "Pending",
  },
  {
    id: "CITS-DEMO-1035",
    referenceNumber: "CITS-DEMO-1035",
    submittedAt: "2026-10-12T08:05:00Z",
    displayDate: "12 Oct 2026, 08:05 AM",
    studyArea: "Dalipuga",
    specificLocation: "Private agricultural parcel near national highway",
    coordinates: {
      lat: 8.321,
      lng: 124.2635,
    },
    observationType: "Multiple Mahogany Trees",
    photos: [
      {
        id: "p-1035-1",
        url: "/assets/images/mahogany-forest.jpg",
        caption: "Planted line of trees along fence line",
      },
      {
        id: "p-1035-2",
        url: "/assets/images/mahogany.jpg",
        caption: "Collected leaf specimen from lower branch",
      },
    ],
    communityNotes:
      "Planted line of approximately 6 mature Mahogany trees along property boundary.",
    reporterName: "Landholder Representative",
    aiClassification: {
      label: "Mahogany",
      scientificName: "Swietenia macrophylla",
      confidence: 0.954,
      modelVersion: "YOLOv8n-cls (citia-v1.0.4)",
      analyzedAt: "12 Oct 2026, 08:08 AM",
    },
    reviewStatus: "Verified",
    reviewedBy: "Officer J. Dela Cruz (CENRO Iligan)",
    reviewedAt: "12 Oct 2026, 10:00 AM",
    staffNotes:
      "Confirmed Swietenia macrophylla planted boundary stand. Registered in CENRO local flora record.",
  },
];

const STORAGE_KEY = "citia_admin_reports_v1";

/**
 * Retrieves the full list of reports, merging in-memory sample records
 * with any session overrides performed by staff during review.
 */
export function getStoredReports(): SightingReport[] {
  if (typeof window === "undefined") {
    return INITIAL_SAMPLE_REPORTS;
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_SAMPLE_REPORTS;
    const parsed = JSON.parse(raw) as Record<string, Partial<SightingReport>>;
    return INITIAL_SAMPLE_REPORTS.map((report) => {
      const override = parsed[report.id];
      if (override) {
        return { ...report, ...override };
      }
      return report;
    });
  } catch {
    return INITIAL_SAMPLE_REPORTS;
  }
}

/**
 * Retrieves a single report by reference ID.
 */
export function getReportById(id: string): SightingReport | undefined {
  const reports = getStoredReports();
  return reports.find((r) => r.id === id);
}

/**
 * Persists a staff review action into session storage for interactive preview.
 */
export function persistReviewDecision(
  reportId: string,
  update: {
    reviewStatus: ReportStatus;
    reviewedBy: string;
    reviewedAt: string;
    staffNotes?: string;
    rejectionReason?: string;
  }
): SightingReport | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const overrides: Record<string, Partial<SightingReport>> = raw
      ? JSON.parse(raw)
      : {};

    overrides[reportId] = {
      ...overrides[reportId],
      ...update,
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));

    const updated = getReportById(reportId);
    return updated ?? null;
  } catch {
    return null;
  }
}
