// components/identify/camera-scanner.tsx
//
// WHAT: The interactive photo-capture-and-classify widget for the
//   Identify Tree page. Handles camera capture / file upload, shows
//   a scanning animation, and displays a class-specific result card.
// CONCEPTS:
//   Hidden <input type="file"> triggered by a styled button — real
//     file inputs are unstylable across browsers, so the common
//     pattern is to visually hide the input and trigger it via a
//     ref from a normal <button>.
//   capture="environment" — a mobile-only HTML attribute hinting
//     the browser to open the REAR camera directly. Desktop browsers
//     ignore it and just show a normal file picker, so this same
//     input works correctly on both platforms without extra code.
//   URL.createObjectURL — turns a selected File into a temporary
//     local URL the browser can display in an <img>, without
//     uploading anything anywhere. Must be revoked when no longer
//     needed (see the cleanup notes below) or the browser keeps the
//     underlying data in memory.
//
// BACKEND NOTE: mockClassify() below is a SIMULATED YOLOv8n-cls call
//   — a 2.2s delay, then a randomly chosen result from the 3 real
//   output classes. Once Stage 13 (YOLOv8n-cls integration) is
//   built, replace the call to mockClassify() inside handleScan()
//   with a real fetch() to your FastAPI inference endpoint, sending
//   the captured File and awaiting { label, confidence } back in the
//   same shape as ClassificationResult. Nothing else in this file
//   needs to change.

"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

type ScanStatus = "empty" | "ready" | "scanning" | "done";

interface ClassificationResult {
  label: "Mahogany" | "Non-Mahogany" | "Non-Tree";
  confidence: number;
}

function mockClassify(): ClassificationResult {
  const labels: ClassificationResult["label"][] = [
    "Mahogany",
    "Non-Mahogany",
    "Non-Tree",
  ];
  const confidence = Math.floor(Math.random() * 100);
  const label = labels[Math.floor(Math.random() * labels.length)];
  return { label, confidence };
}

const RESULT_INFO: Record<
  ClassificationResult["label"],
  {
    headline: string;
    scientificName?: string;
    imagePath?: string;
    impact?: string;
    recommendations?: string[];
    showReportButton: boolean;
  }
> = {
  Mahogany: {
    headline: "Mahogany Detected",
    scientificName: "Swietenia macrophylla",
    imagePath: "/assets/images/mahogany.jpg",
    impact:
      "Mahogany suppresses native understory vegetation and offers little value to local wildlife, allowing it to spread readily into surrounding forest areas.",
    recommendations: [
      "Do not replant Mahogany in areas intended for native restoration.",
      "Monitor existing occurrences and spread.",
      "Avoid unauthorized removal or intervention.",
      "Coordinate with CENRO or the appropriate environmental authority for assessment and management action.",
    ],
    showReportButton: true,
  },
  "Non-Mahogany": {
    headline: "Mahogany Not Identified",
    showReportButton: false,
  },
  "Non-Tree": {
    headline: "Couldn't Identify a Leaf",
    showReportButton: false,
  },
};

// ── Component ─────────────────────────────────────────────

// Refs let us trigger the hidden native file inputs from our own
// styled buttons — see file header note.
export function CameraScanner() {
  const [status, setStatus] = useState<ScanStatus>("empty");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ClassificationResult | null>(null);

  // Two separate refs — one per hidden input below. Each button
  // triggers its own input, but both inputs share the same
  // handleFileSelect handler, since "a file was picked" means the
  // same thing regardless of which button opened the picker.
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [showBar, setShowBar] = useState(false);

  const info = result ? RESULT_INFO[result.label] : null;

  useEffect(() => {
    if (status === "done") {
      const timer = setTimeout(() => setShowBar(true), 50);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUrl(URL.createObjectURL(file));
    setStatus("ready");
  }

  function handleScan() {
    setShowBar(false);
    if (status === "ready") {
      setStatus("scanning");

      setTimeout(() => {
        setResult(mockClassify());
        setStatus("done");
      }, 2000);
    }
  }

  function handleReset() {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setResult(null);
    setStatus("empty");
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* ── Stage ─────────────────────────────────────────── */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border bg-card shadow-lg">
        {/* Empty state — no photo yet */}
        {status === "empty" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Camera className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Take a photo or upload a leaf image to get started
            </p>
            <p className="text-xs text-muted-foreground">
              Works with your phone&apos;s camera or existing photos
            </p>
          </div>
        )}

        {/* Photo preview — shown while ready, scanning, or done */}
        {imageUrl && status !== "empty" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Selected leaf photo"
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {/* ── Controls (vary by status) ─────────────────────── */}
      {status === "empty" && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <div className="relative">
            <Button>
              <Camera className="mr-2 h-4 w-4" />
              Take Photo
            </Button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="absolute inset-0 z-10 opacity-0 cursor-pointer"
              onChange={handleFileSelect}
            />
          </div>
          <div className="relative">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Upload Photo
            </Button>
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              className="absolute inset-0 z-10 opacity-0 cursor-pointer"
              onChange={handleFileSelect}
            />
          </div>
        </div>
      )}

      {status === "ready" && (
        <div className="mt-6 flex justify-center">
          <Button onClick={handleScan}>Scan for Mahogany</Button>
        </div>
      )}

      {status === "scanning" && (
        <div className="mt-6 flex justify-center">
          <Button disabled>Analyzing...</Button>
        </div>
      )}

      {status === "done" && result && info && (
        <div className="mt-3">
          {info.imagePath && (
            <div className="mb-4 rounded-xl border border-border bg-muted/30 p-3 flex flex-col items-center gap-1.5">
              <Image
                src={info.imagePath}
                alt={`${result.label} reference photo`}
                width={225}
                height={300}
                className="rounded-xl object-cover"
              />
              <p className="text-xs text-muted-foreground">
                Reference photo: {info.scientificName ?? result.label}
              </p>
            </div>
          )}

          <p className="text-center font-semibold text-foreground">
            {info.headline}
          </p>

          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Confidence
            </span>
            <span className="text-sm font-semibold text-foreground">
              {result.confidence}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden bg-muted">
            <div
              className="h-full bg-primary duration-700 transition:width ease-in-out"
              style={{ width: showBar ? `${result.confidence}%` : "0%" }}
            />
          </div>

          {info.impact && (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">
                Ecological Impact:{" "}
              </span>
              {info.impact}
            </p>
          )}

          {info.recommendations && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-foreground">
                Management Recommendations
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {info.recommendations.map((rec) => (
                  <li key={rec}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {info.showReportButton && <Button>Report a Sighting</Button>}
            <Button variant="outline" onClick={handleReset}>
              Scan Another Photo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
