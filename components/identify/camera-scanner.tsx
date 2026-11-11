"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Camera,
  Upload,
  Leaf,
  TriangleAlert,
  CheckCircle2,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { classifyLeaf, type ClassificationResult } from "@/lib/classify-api";
import { saveSightingPhoto } from "@/lib/sighting-photo-store";

type ScanStatus = "empty" | "ready" | "scanning" | "done";

// The backend accepts only these; checking here too gives a faster,
// clearer message. The backend still checks the actual file content.
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

// Same 10 MB limit as the backend (MAX_UPLOAD_BYTES in backend/config.py).
// Checking here avoids uploading a file the backend would reject anyway;
// the backend still enforces its own limit. Keep the two values in sync.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const RESULT_INFO: Record<
  ClassificationResult["label"],
  {
    headline: string;
    scientificName?: string;
    imagePath?: string;
    impact?: string;
    recommendations?: string[];
    showReportButton: boolean;
    isInvasive: boolean;
  }
> = {
  Mahogany: {
    headline: "Possible Mahogany Detected",
    scientificName: "Swietenia macrophylla",
    imagePath: "/assets/images/mahogany.jpg",
    impact:
      "Mahogany suppresses native understory vegetation and offers little value to local wildlife, allowing it to spread readily into surrounding forest areas.",
    recommendations: [
      "Do not replant Mahogany in areas intended for native restoration.",
      "Monitor existing occurrences and spread.",
      "Coordinate with CENRO for assessment and management action.",
    ],
    showReportButton: true,
    isInvasive: true,
  },
  "Non-Mahogany": {
    headline: "Non-Target Species",
    impact:
      "This leaf was not classified as Mahogany (Swietenia macrophylla). CITIA-IS does not identify other species, and this result does not mean the tree is native or non-invasive.",
    showReportButton: false,
    isInvasive: false,
  },
  "Non-Tree": {
    headline: "No Tree Detected",
    impact:
      "The AI could not identify a tree in this image. Please ensure the leaf is clearly visible and well-lit.",
    showReportButton: false,
    isInvasive: false,
  },
};

export function CameraScanner() {
  const router = useRouter();
  const [status, setStatus] = useState<ScanStatus>("empty");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // True only after an analysis of the photo currently selected has
  // actually failed. A file rejected in the browser never sets this, so
  // it does not change the button from "Analyze Leaf" to "Retry Analysis".
  const [analysisFailed, setAnalysisFailed] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  // The classification request in progress, if any. Kept in a ref so a
  // second click is blocked before React has re-rendered, and so an
  // answer for an old photo can be recognised and ignored.
  const requestRef = useRef<AbortController | null>(null);

  const info = result ? RESULT_INFO[result.label] : null;
  // Applies to every label: a low-confidence result is only a best guess.
  const isUncertain = result?.lowConfidence === true;

  async function handleReportSighting() {
    // The original File goes to the report form through IndexedDB, so
    // large photos are not lost to localStorage's size limit.
    if (imageFile) {
      await saveSightingPhoto(imageFile);
    }
    router.push("/report");
  }

  // Trigger progress bar animation after render
  useEffect(() => {
    if (status === "done") {
      const timer = setTimeout(() => setShowBar(true), 50);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Memory cleanup for object URLs
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  // Stop any classification request still running when the scanner is closed.
  useEffect(() => {
    const pendingRequest = requestRef;
    return () => pendingRequest.current?.abort();
  }, []);

  function cancelPendingRequest() {
    requestRef.current?.abort();
    requestRef.current = null;
  }

  function handleIncomingFile(file: File | undefined) {
    if (!file) return;
    // A rejected file changes only the message: the current photo, any
    // analysis in progress and any result stay as they are.
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Please choose a JPEG or PNG image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("The image must be 10 MB or smaller. Please choose another photo.");
      return;
    }
    // A new photo makes any analysis still running for the old one irrelevant.
    cancelPendingRequest();
    setError(null);
    setAnalysisFailed(false);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    setImageFile(file);
    setStatus("ready");
    setResult(null);
    setShowBar(false);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleIncomingFile(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    handleIncomingFile(file);
    e.target.value = ""; // Reset input so same file can be selected again
  }

  async function handleScan() {
    if (status !== "ready" || !imageFile || requestRef.current) return;

    const request = new AbortController();
    requestRef.current = request;
    setError(null);
    setShowBar(false);
    setStatus("scanning");

    // The original File is uploaded, not the preview URL.
    const outcome = await classifyLeaf(imageFile, request.signal);

    // A reset or a new photo replaced this request while it was running:
    // its answer belongs to an old photo and must not reach the screen.
    if (requestRef.current !== request) return;
    requestRef.current = null;

    if (outcome.ok) {
      // Clears a message left by a file that was rejected while this
      // analysis was running.
      setError(null);
      setAnalysisFailed(false);
      setResult(outcome.result);
      setStatus("done");
    } else {
      // Keep the photo so the user can retry the same image.
      setError(outcome.message);
      setAnalysisFailed(true);
      setStatus("ready");
    }
  }

  function handleReset() {
    cancelPendingRequest();
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setImageFile(null);
    setResult(null);
    setStatus("empty");
    setError(null);
    setAnalysisFailed(false);
    setShowBar(false);
  }

  return (
    <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-6 md:p-8 w-full flex flex-col h-full relative group">
      {/* ── Main Scanner Viewfinder ─────────────────────────────────────────── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex-1 min-h-80 sm:min-h-96 w-full overflow-hidden transition-colors duration-300 flex flex-col justify-center rounded-t-xl ${
          isDragging ? "bg-primary/5" : "bg-background"
        }`}
      >
        {/* Viewfinder Dashed Overlay */}
        <div
          className={`absolute inset-0 border-2 border-dashed rounded-xl m-2 pointer-events-none transition-colors duration-300 z-10 ${
            isDragging
              ? "border-primary/50"
              : "border-border/40 group-hover:border-primary/30"
          }`}
        />

        {/* Top Status Overlay */}
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-2.5 py-1 text-[10px] font-medium text-primary backdrop-blur-md shadow-sm">
            <Leaf className="w-3 h-3 text-primary" />
            <span>AI Leaf Scan</span>
          </div>
          {(status === "ready" || status === "scanning") && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-2.5 py-1 text-[10px] font-medium text-primary backdrop-blur-md shadow-sm">
              <span
                className={`w-2 h-2 rounded-full bg-primary ${status === "scanning" ? "animate-ping" : ""}`}
              />
              <span>YOLOv8n-cls</span>
            </div>
          )}
        </div>

        {/* Empty State */}
        {status === "empty" && (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center z-10">
            <div className="h-16 w-16 rounded-2xl bg-card border border-border flex items-center justify-center mb-2 shadow-sm transition-transform duration-300 group-hover:scale-105">
              <Camera className="h-8 w-8 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground tracking-tight">
                AI Leaf Identification
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-55 mx-auto leading-relaxed">
                Snap a photo or upload a clear image of a leaf for instant
                species classification.
              </p>
            </div>
          </div>
        )}

        {/* Photo Preview & Laser Animation */}
        {imageUrl && status !== "empty" && (
          <div className="absolute inset-0 z-0 m-2 rounded-xl overflow-hidden bg-[#09090b]">
            {/* Blurred background filler (prevents ugly empty black bars) */}
            <Image
              src={imageUrl}
              alt=""
              fill
              unoptimized
              className="object-cover opacity-25 blur-xl scale-110 pointer-events-none"
            />

            {/* Actual contained photo (uncropped) */}
            <Image
              src={imageUrl}
              alt="Selected leaf photo"
              fill
              unoptimized
              className="object-contain"
            />

            {/* Top dark gradient to keep status badges readable */}
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />

            {/* The Scanning Laser Effect */}
            {status === "scanning" && (
              <div className="absolute inset-x-0 h-0.5 bg-primary shadow-[0_0_20px_#10B981] animate-[bounce_2s_ease-in-out_infinite] top-1/2 z-10" />
            )}

            {/* Target Reticle (Only when ready) */}
            {status === "ready" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="w-32 h-32 sm:w-48 sm:h-48 border-2 border-dashed border-primary/80 rounded-xl bg-primary/10" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-y border-destructive/20 text-destructive text-xs font-semibold text-center z-10">
          {error}
        </div>
      )}

      {/* Hidden Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* ── Action Controls (Pinned to Bottom) ─────────────────────── */}
      {status !== "done" && (
        <div className="p-4 flex flex-col gap-3 w-full shrink-0 z-10 bg-background/80 backdrop-blur-sm border-t border-border">
          {status === "empty" && (
            <div className="grid grid-cols-2 gap-3 w-full">
              <Button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full bg-primary hover:bg-emerald-600 text-primary-foreground text-xs font-semibold h-11 border border-primary transition-transform active:scale-[0.98]"
              >
                <Camera className="mr-2 h-4 w-4" /> Open Camera
              </Button>
              <Button
                variant="outline"
                onClick={() => uploadInputRef.current?.click()}
                className="w-full border border-primary/40 bg-card hover:border-primary hover:bg-primary/10 text-foreground text-xs font-medium h-11 transition-transform active:scale-[0.98]"
              >
                <Upload className="mr-2 h-4 w-4" /> Upload File
              </Button>
            </div>
          )}

          {status === "ready" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-3">
              <Button
                onClick={handleScan}
                className="w-full bg-primary hover:bg-emerald-600 text-primary-foreground text-xs font-bold h-11 shadow-lg shadow-primary/20 transition-transform active:scale-[0.98]"
              >
                <Search className="mr-2 h-4 w-4" />{" "}
                {analysisFailed ? "Retry Analysis" : "Analyze Leaf"}
              </Button>
              {error && (
                <Button
                  variant="outline"
                  onClick={() => uploadInputRef.current?.click()}
                  className="w-full border border-primary/40 bg-card hover:border-primary hover:bg-primary/10 text-foreground text-xs font-medium h-11 transition-transform active:scale-[0.98]"
                >
                  <Upload className="mr-2 h-4 w-4" /> Choose another photo
                </Button>
              )}
            </div>
          )}

          {status === "scanning" && (
            <>
              <Button
                disabled
                className="w-full bg-muted text-muted-foreground border-border text-xs font-semibold h-11 cursor-not-allowed"
              >
                <RefreshCw className="mr-2 h-4 w-4 animate-spin text-primary" />{" "}
                Processing via YOLOv8n-cls...
              </Button>
              {/* Choosing a valid file cancels this analysis (handleIncomingFile). */}
              <Button
                variant="outline"
                onClick={() => uploadInputRef.current?.click()}
                className="w-full border border-primary/40 bg-card hover:border-primary hover:bg-primary/10 text-foreground text-xs font-medium h-11 transition-transform active:scale-[0.98]"
              >
                <Upload className="mr-2 h-4 w-4" /> Choose another photo
              </Button>
            </>
          )}
        </div>
      )}

      {/* ── Result Card (Replaces Controls When Done) ─────────────────────── */}
      {status === "done" && result && info && (
        <div className="shrink-0 bg-card border-t border-border p-4 sm:p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto max-h-[50vh] scrollbar-hide rounded-b-xl">
          {/* Header Row */}
          <div className="flex items-start justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  isUncertain
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-500"
                    : info.isInvasive
                      ? "bg-red-500/10 border border-red-500/20 text-red-500"
                      : "bg-primary/10 border border-primary/20 text-primary"
                }`}
              >
                {isUncertain || info.isInvasive ? (
                  <TriangleAlert className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                  {isUncertain ? "Result Uncertain" : info.headline}
                </h3>
                {isUncertain ? (
                  <p className="text-xs font-medium text-muted-foreground">
                    Best guess: {result.label}
                  </p>
                ) : (
                  info.scientificName && (
                    <p className="text-xs font-medium italic text-muted-foreground">
                      {info.scientificName}
                    </p>
                  )
                )}
              </div>
            </div>

            {/* Confidence Score */}
            <div className="text-right">
              <span
                className={`text-lg sm:text-xl font-black ${
                  isUncertain
                    ? "text-amber-500"
                    : info.isInvasive
                      ? "text-red-500"
                      : "text-primary"
                }`}
              >
                {result.confidence}%
              </span>
              <p className="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground">
                Confidence
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-background border border-border">
            <div
              className={`h-full transition-[width] duration-1000 ease-out rounded-full ${
                isUncertain
                  ? "bg-amber-500"
                  : info.isInvasive
                    ? "bg-red-500"
                    : "bg-primary"
              }`}
              style={{ width: showBar ? `${result.confidence}%` : "0%" }}
            />
          </div>

          {/* Preliminary-result notice (every result) */}
          <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
            This is a preliminary AI result and is subject to CENRO
            verification. It is not a definitive identification.
          </p>

          {/* Impact & Recommendations */}
          <div className="space-y-2.5">
            {isUncertain && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block mb-1">
                  Low Classification Confidence
                </span>
                <p className="text-xs text-foreground leading-relaxed">
                  The AI is not confident about this photo. Please retake a
                  clear, well-lit photo of a single leaf.
                </p>
              </div>
            )}

            {!isUncertain && info.impact && (
              <div className="p-3 rounded-lg bg-background border border-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Ecological Impact
                </span>
                <p className="text-xs text-foreground leading-relaxed">
                  {info.impact}
                </p>
              </div>
            )}

            {!isUncertain && info.recommendations && (
              <div className="p-3 rounded-lg bg-background border border-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Management Recommendations
                </span>
                <ul className="list-disc pl-4 space-y-1 text-xs text-foreground marker:text-primary">
                  {info.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="mt-4 pt-3 border-t border-border flex flex-col sm:flex-row items-center gap-2">
            {isUncertain ? (
              <Button
                type="button"
                onClick={handleReset}
                className="w-full bg-primary hover:bg-emerald-600 text-primary-foreground text-xs font-bold h-10 px-4 rounded-lg shadow-md transition-transform active:scale-[0.98]"
              >
                <Camera className="mr-2 h-4 w-4" /> Retake Photo
              </Button>
            ) : (
              <>
                {info.showReportButton && (
                  <Button
                    type="button"
                    onClick={handleReportSighting}
                    className="w-full bg-primary hover:bg-emerald-600 text-primary-foreground text-xs font-bold h-10 px-4 rounded-lg shadow-md transition-transform active:scale-[0.98]"
                  >
                    Report Sighting to CENRO
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="w-full sm:w-auto h-10 px-4 rounded-lg text-xs font-semibold border-border hover:bg-border transition-transform active:scale-[0.98]"
                >
                  Scan Another Photo
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 
