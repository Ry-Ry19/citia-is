"use client";

// components/report-form.tsx
//
// WHAT: The community Report a Sighting form. It sends the report and
//   its photo to the CITIA-IS API (POST /reports) and shows the saved
//   report's reference number.
//
// LOCATION IS OPTIONAL AND ON REQUEST: the device's location is asked for
//   only when the reporter presses "Use my current location". What the
//   report sends is the TREE location — the green pin — which the
//   reporter can move, because they may not be standing at the tree.
//
// SAFE RETRIES: one client_submission_id is created per report and
//   reused on every retry, so a double-click or a lost response can
//   never create a duplicate report. Entered details are kept after any
//   failure.

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ImagePlus,
  Loader2,
  LocateFixed,
  MapPin,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DeviceFix, FocusRequest, MapPoint } from "@/components/report-location-map";
import {
  newSubmissionId,
  submitReport,
  type ObservationType,
  type SavedReport,
  type StudyArea,
} from "@/lib/report-api";
import { searchPlaces, type PlaceResult } from "@/lib/place-search";
import { clearSightingPhoto, loadSightingPhoto } from "@/lib/sighting-photo-store";

// Leaflet needs the browser's window, so the map is loaded only there.
const ReportLocationMap = dynamic(
  () => import("@/components/report-location-map").then((mod) => mod.ReportLocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 w-full items-center justify-center rounded-lg border border-border bg-background text-xs text-muted-foreground sm:h-80">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" aria-hidden="true" />
        Loading map…
      </div>
    ),
  }
);

const sectors: { value: StudyArea; label: string }[] = [
  { value: "palao", label: "Palao Medical" },
  { value: "dalipuga", label: "Dalipuga" },
  { value: "npc", label: "NPC Area" },
];

const observationTypes: { value: ObservationType; label: string }[] = [
  { value: "single_tree", label: "Single Mahogany Tree" },
  { value: "multiple_trees", label: "Multiple Mahogany Trees" },
  { value: "seedlings_saplings", label: "Mahogany Seedlings/Saplings" },
];

const ACCEPTED_TYPES = ["image/jpeg", "image/png"];
// Same 10 MB limit as the backend (MAX_UPLOAD_BYTES in backend/config.py).
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// Above this, the reporter is asked to check the pin.
const LOW_ACCURACY_M = 50;
// The database accepts accuracy up to 10 km; a worse reading is not sent.
const MAX_SENT_ACCURACY_M = 10_000;

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 0,
};

const LABEL_TEXT: Record<string, string> = {
  Mahogany: "Possible Mahogany",
  "Non-Mahogany": "Non-Mahogany (not classified as Mahogany)",
  "Non-Tree": "Non-Tree (no tree leaf recognised)",
};

const inputClass =
  "h-11 bg-background border border-zinc-300 dark:border-zinc-800 text-foreground focus-visible:ring-2 focus-visible:ring-[#10b981]";

interface TreeLocation extends MapPoint {
  /** True while the pin is still exactly on the device's GPS fix. */
  fromGps: boolean;
}

function zoomForAccuracy(accuracyM: number): number {
  if (accuracyM <= 50) return 18;
  if (accuracyM <= 200) return 17;
  if (accuracyM <= 1000) return 16;
  return 14;
}

function formatCoordinate(value: number): string {
  return value.toFixed(6);
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-xs font-medium text-destructive" role="alert">
      {message}
    </p>
  );
}

export function ReportForm() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const userChosePhotoRef = useRef(false);

  const [sector, setSector] = useState<StudyArea>("palao");
  const [observationType, setObservationType] = useState<ObservationType>("single_tree");
  const [consent, setConsent] = useState(false);
  const [barangay, setBarangay] = useState("");
  const [landmark, setLandmark] = useState("");
  const [observations, setObservations] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [contactInfo, setContactInfo] = useState("");

  const [tree, setTree] = useState<TreeLocation | null>(null);
  const [device, setDevice] = useState<DeviceFix | null>(null);
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const focusIdRef = useRef(0);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  const [clientSubmissionId, setClientSubmissionId] = useState(newSubmissionId);
  const [submitting, setSubmitting] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [savedReport, setSavedReport] = useState<SavedReport | null>(null);

  // The scanner's photo, handed over through IndexedDB.
  useEffect(() => {
    let active = true;
    loadSightingPhoto().then((file) => {
      if (!active || !file || userChosePhotoRef.current) return;
      if (!ACCEPTED_TYPES.includes(file.type) || file.size > MAX_UPLOAD_BYTES) return;
      setPhoto(file);
      setPhotoUrl(URL.createObjectURL(file));
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!photoUrl) return;
    return () => URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  // A report still being sent is cancelled if the page is left.
  useEffect(() => () => requestRef.current?.abort(), []);

  function clearFieldError(name: string) {
    setFieldErrors((current) => {
      if (!(name in current)) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function focusOn(point: MapPoint, zoom: number) {
    focusIdRef.current += 1;
    setFocus({ latitude: point.latitude, longitude: point.longitude, zoom, id: focusIdRef.current });
  }

  const handlePhotoChange = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFieldErrors((current) => ({ ...current, photo: "Please choose a JPEG or PNG photo." }));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setFieldErrors((current) => ({ ...current, photo: "The photo must be 10 MB or smaller." }));
      return;
    }
    userChosePhotoRef.current = true;
    clearFieldError("photo");
    setPhoto(file);
    setPhotoUrl(URL.createObjectURL(file));
    // A replaced photo must not come back from the scanner hand-off.
    void clearSightingPhoto();
  };

  const handleUseCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationMessage("This browser cannot share its location. Tap the map to mark the tree instead.");
      return;
    }
    if (!window.isSecureContext) {
      setLocationMessage(
        "Location needs a secure (https) connection. Tap the map to mark the tree instead."
      );
      return;
    }

    setLocating(true);
    setLocationMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const fix: DeviceFix = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyM: position.coords.accuracy,
        };
        setLocating(false);
        setDevice(fix);
        setTree({ latitude: fix.latitude, longitude: fix.longitude, fromGps: true });
        clearFieldError("coordinates");
        focusOn(fix, zoomForAccuracy(fix.accuracyM));
        setLocationMessage(
          fix.accuracyM > LOW_ACCURACY_M
            ? `Low GPS accuracy (about ±${Math.round(fix.accuracyM)} m). Check the pin and move it to the tree if needed.`
            : null
        );
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationMessage(
            "Location permission was denied. You can tap the map to mark the tree, or send the report without a location."
          );
        } else if (error.code === error.TIMEOUT) {
          setLocationMessage(
            "Finding your location took too long. Try again outdoors, or tap the map to mark the tree."
          );
        } else {
          setLocationMessage(
            "Your location could not be determined. Tap the map to mark the tree, or send the report without a location."
          );
        }
      },
      GEOLOCATION_OPTIONS
    );
  };

  const handlePick = (point: MapPoint) => {
    setTree({ ...point, fromGps: false });
    clearFieldError("coordinates");
  };

  const handleRemoveLocation = () => {
    setTree(null);
    setDevice(null);
    setLocationMessage(null);
  };

  const runSearch = async () => {
    if (searching) return;
    setSearching(true);
    setSearchMessage(null);
    const outcome = await searchPlaces(searchQuery);
    setSearching(false);
    if (!outcome.ok) {
      setSearchResults([]);
      setSearchMessage(outcome.message);
      return;
    }
    setSearchResults(outcome.places);
    if (outcome.places.length === 0) {
      setSearchMessage("No places found in Iligan City. Try another name, or pan the map.");
    }
  };

  const handleSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    // Enter searches; it must not submit the report.
    if (event.key === "Enter") {
      event.preventDefault();
      void runSearch();
    }
  };

  const handleChoosePlace = (place: PlaceResult) => {
    focusOn(place, 17);
    setSearchResults([]);
    setSearchMessage("Map moved. Now tap the map where the tree is.");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requestRef.current) return;

    const missing: Record<string, string> = {};
    if (!photo) missing.photo = "Please add a photo of the sighting.";
    if (!consent) missing.consent_confirmed = "Please confirm this before submitting.";
    if (!photo || !consent) {
      setFieldErrors(missing);
      setFormError("Please check the highlighted fields.");
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    const accuracyM =
      tree?.fromGps && device && device.accuracyM <= MAX_SENT_ACCURACY_M ? device.accuracyM : null;

    const outcome = await submitReport(
      {
        clientSubmissionId,
        studyArea: sector,
        observationType,
        barangay,
        landmark,
        communityNotes: observations,
        reporterName,
        reporterContact: contactInfo,
        location: tree ? { latitude: tree.latitude, longitude: tree.longitude, accuracyM } : null,
        photo,
      },
      controller.signal
    );

    requestRef.current = null;
    setSubmitting(false);

    if (outcome.ok) {
      setSavedReport(outcome.report);
      void clearSightingPhoto();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setFormError(outcome.message);
    setFieldErrors(outcome.failure === "invalid_photo" ? { photo: outcome.message } : outcome.fieldErrors);
  };

  const handleStartAnother = () => {
    setSavedReport(null);
    setClientSubmissionId(newSubmissionId());
    userChosePhotoRef.current = false;
    setPhoto(null);
    setPhotoUrl(null);
    setObservationType("single_tree");
    setConsent(false);
    setBarangay("");
    setLandmark("");
    setObservations("");
    setReporterName("");
    setContactInfo("");
    setTree(null);
    setDevice(null);
    setLocationMessage(null);
    setSearchQuery("");
    setSearchResults([]);
    setSearchMessage(null);
    setFormError(null);
    setFieldErrors({});
  };

  if (savedReport) {
    const classification = savedReport.classification;
    return (
      <section
        className="rounded-xl border border-primary/40 bg-card p-6 shadow-sm md:p-8"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-card-foreground">
              {savedReport.alreadySaved ? "This report was already received" : "Report received"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep this reference number for any follow-up with CENRO.
            </p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-background p-4">
            <dt className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Reference number
            </dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-foreground" data-testid="reference-number">
              {savedReport.referenceNumber}
            </dd>
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <dt className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Status
            </dt>
            <dd className="mt-1 text-base font-semibold text-foreground">
              {savedReport.status === "pending_review"
                ? "Pending CENRO review"
                : savedReport.status === "verified"
                  ? "Verified by CENRO"
                  : "Reviewed by CENRO"}
            </dd>
          </div>
        </dl>

        <div className="mt-4 rounded-lg border border-border bg-background p-4 text-sm leading-relaxed">
          {classification.outcome === "succeeded" ? (
            <>
              <p className="font-semibold text-foreground">
                Preliminary AI result: {LABEL_TEXT[classification.label]}
              </p>
              {classification.lowConfidence && (
                <p className="mt-1 text-amber-700 dark:text-amber-400">
                  The AI was not confident about this photo. CENRO staff will check it.
                </p>
              )}
            </>
          ) : (
            <p className="text-foreground">
              Report received. The AI could not analyse your photo at this time, so it is marked
              Not classified. CENRO staff will review your report.
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            AI results are preliminary and are verified by CENRO. CITIA-IS does not authorize tree
            cutting or removal.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleStartAnother}
          className="mt-6 min-h-11 bg-primary font-semibold text-primary-foreground hover:bg-emerald-600"
        >
          Submit another report
        </Button>
      </section>
    );
  }

  return (
    <form className="space-y-8" onSubmit={handleSubmit} noValidate>
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
        <div className="mb-5 flex items-center gap-3">
          <ImagePlus className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Section 1
            </p>
            <h2 className="text-xl font-bold text-card-foreground">
              Sighting Photo
            </h2>
          </div>
        </div>
        <div className="relative flex min-h-56 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt="Selected tree sighting"
              width={640}
              height={320}
              unoptimized
              className="h-full max-h-80 w-full object-contain"
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <ImagePlus className="mx-auto mb-2 h-8 w-8 text-primary" />
              <p className="text-sm">No sighting photo selected</p>
            </div>
          )}
        </div>
        <label
          htmlFor="sighting-image"
          className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-primary/40 px-4 text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/10"
        >
          <Upload className="h-4 w-4 text-primary" />
          {photo ? "Change Photo" : "Add Photo"}
          <input
            id="sighting-image"
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            className="sr-only"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              handlePhotoChange(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        <p className="mt-2 text-xs text-muted-foreground">JPEG or PNG, up to 10 MB. Required.</p>
        <FieldError message={fieldErrors.photo} />
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
        <div className="mb-5 flex items-center gap-3">
          <MapPin className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Section 2
            </p>
            <h2 className="text-xl font-bold text-card-foreground">
              Geospatial Location
            </h2>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            Area Selection
            <Select
              value={sector}
              // Lets the closed select show "Palao Medical", not "palao".
              items={sectors}
              onValueChange={(value) => setSector((value as StudyArea | null) ?? "palao")}
            >
              <SelectTrigger className={`w-full ${inputClass}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sectors.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={fieldErrors.study_area} />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Barangay <span className="text-muted-foreground">(Optional)</span>
            <Input
              id="barangay"
              value={barangay}
              maxLength={100}
              onChange={(event) => setBarangay(event.target.value)}
              className={inputClass}
              placeholder="Enter barangay"
            />
            <FieldError message={fieldErrors.barangay} />
          </label>
        </div>
        <label className="mt-4 block space-y-2 text-sm font-medium">
          Specific Landmark <span className="text-muted-foreground">(Optional)</span>
          <Input
            id="landmark"
            value={landmark}
            maxLength={200}
            onChange={(event) => setLandmark(event.target.value)}
            className={inputClass}
            placeholder="Near the roadside beside..."
          />
          <FieldError message={fieldErrors.landmark} />
        </label>

        <div className="mt-6">
          <p className="text-sm font-semibold text-foreground">
            Tree location on the map <span className="font-medium text-muted-foreground">(Optional)</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Tap the map or drag the green pin to where the tree is. If you are near the tree, you
            can start from your current location. Your location is only requested when you press
            the button, and only the green pin&apos;s position is sent with this report.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              className="min-h-11"
            >
              {locating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <LocateFixed className="mr-2 h-4 w-4 text-primary" aria-hidden="true" />
              )}
              {locating ? "Finding your location…" : "Use my current location"}
            </Button>
            {device && (
              <Button
                type="button"
                variant="outline"
                onClick={() => focusOn(device, zoomForAccuracy(device.accuracyM))}
                className="min-h-11"
              >
                Back to my location
              </Button>
            )}
            {tree && (
              <Button type="button" variant="outline" onClick={handleRemoveLocation} className="min-h-11">
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Remove location
              </Button>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <label htmlFor="place-search" className="sr-only">
              Search for a barangay, street or landmark in Iligan City
            </label>
            <Input
              id="place-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={handleSearchKey}
              className={inputClass}
              placeholder="Search a barangay, street or landmark"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void runSearch()}
              disabled={searching}
              className="min-h-11 shrink-0"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="ml-2 hidden sm:inline">Search</span>
              <span className="sr-only sm:hidden">Search</span>
            </Button>
          </div>
          {searchResults.length > 0 && (
            <ul className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
              {searchResults.map((place) => (
                <li key={`${place.latitude},${place.longitude},${place.name}`}>
                  <button
                    type="button"
                    onClick={() => handleChoosePlace(place)}
                    className="w-full px-3 py-2.5 text-left text-xs text-foreground transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981]"
                  >
                    {place.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searchMessage && (
            <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
              {searchMessage}
            </p>
          )}

          <div className="mt-3">
            <ReportLocationMap tree={tree} device={device} focus={focus} onPick={handlePick} />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Place search by OpenStreetMap Nominatim. Map data © OpenStreetMap contributors.
          </p>

          <div className="mt-3 space-y-1 text-xs" aria-live="polite">
            {tree ? (
              <p className="text-foreground" data-testid="tree-location">
                <span className="font-semibold">Tree location:</span>{" "}
                {formatCoordinate(tree.latitude)}, {formatCoordinate(tree.longitude)}{" "}
                <span className="text-muted-foreground">
                  {tree.fromGps && device
                    ? `(from your device, ±${Math.round(device.accuracyM)} m)`
                    : "(set on the map)"}
                </span>
              </p>
            ) : (
              <p className="text-muted-foreground" data-testid="tree-location">
                No tree location set. The report can be sent without one.
              </p>
            )}
            {device && (
              <p className="text-muted-foreground" data-testid="device-location">
                <span className="font-semibold">Your device:</span>{" "}
                {formatCoordinate(device.latitude)}, {formatCoordinate(device.longitude)} (±
                {Math.round(device.accuracyM)} m)
              </p>
            )}
            {locationMessage && (
              <p className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400" role="status">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {locationMessage}
              </p>
            )}
            <FieldError
              message={fieldErrors.coordinates ?? fieldErrors.latitude ?? fieldErrors.longitude ?? fieldErrors.gps_accuracy_m}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Section 3
        </p>
        <h2 className="mt-1 text-xl font-bold text-card-foreground">
          Observation Details
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Observation type">
          {observationTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              role="radio"
              aria-checked={observationType === type.value}
              onClick={() => setObservationType(type.value)}
              className={`min-h-11 rounded-lg border px-3 text-left text-sm font-medium transition-colors ${
                observationType === type.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
        <FieldError message={fieldErrors.observation_type} />
        <label htmlFor="observations" className="mt-5 block space-y-2 text-sm font-medium">
          Additional Observations <span className="text-muted-foreground">(Optional)</span>
          <textarea
            id="observations"
            value={observations}
            maxLength={2000}
            onChange={(event) => setObservations(event.target.value)}
            className="min-h-28 w-full rounded-lg bg-background border border-zinc-300 dark:border-zinc-800 text-foreground px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[#10b981]"
            placeholder="Add any details that may help CENRO review this sighting."
          />
          <FieldError message={fieldErrors.community_notes} />
        </label>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
        <div className="mb-5 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Section 4
            </p>
            <h2 className="text-xl font-bold text-card-foreground">
              Reporter Privacy Shield
            </h2>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            Reporter Name (Optional)
            <Input
              id="reporter-name"
              value={reporterName}
              maxLength={100}
              onChange={(event) => setReporterName(event.target.value)}
              className={inputClass}
              placeholder="Your name"
            />
            <FieldError message={fieldErrors.reporter_name} />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Contact Info (Optional)
            <Input
              id="contact-info"
              value={contactInfo}
              maxLength={150}
              onChange={(event) => setContactInfo(event.target.value)}
              className={inputClass}
              placeholder="Email or phone number"
            />
            <FieldError message={fieldErrors.reporter_contact} />
          </label>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Your name and contact details are seen only by CENRO staff and are never shown publicly.
        </p>
      </section>

      <section className="space-y-5">
        <label className="flex items-start gap-3 text-sm text-foreground">
          <input
            id="reporter-consent"
            type="checkbox"
            checked={consent}
            onChange={(event) => {
              setConsent(event.target.checked);
              clearFieldError("consent_confirmed");
            }}
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <span>
            I confirm that the information provided is based on my observation
            and may be used for environmental monitoring purposes.
          </span>
        </label>
        <FieldError message={fieldErrors.consent_confirmed} />

        {formError && (
          <div
            className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
            data-testid="form-error"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {formError}
          </div>
        )}

        <Button
          type="submit"
          disabled={!consent || submitting}
          className="min-h-12 w-full bg-primary text-base font-bold text-primary-foreground hover:bg-emerald-600"
        >
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          {submitting ? "Sending report…" : "Submit Sighting Report"}
        </Button>
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Your report will be reviewed by CENRO. CITIA-IS acts solely as an
          information and decision-support system; it does NOT authorize tree
          cutting, removal, or alternative autonomous environmental
          interventions.
        </p>
      </section>
    </form>
  );
}
