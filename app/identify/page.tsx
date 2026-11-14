// app/identify/page.tsx
//
// WHAT: The "Identify a Tree" page — the leaf scanner, with short
//   guidance on taking a photo the classifier can read.
//
// This page only arranges. The camera, the upload, the request to the
// API and the hand-off to the report form all live in
// components/identify/camera-scanner.tsx.
//
// LAYOUT: on large screens the scanner sits on the left and the
//   guidance on the right. On phones the guidance comes after the
//   scanner, so the camera is reachable without scrolling.

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { CameraScanner } from "@/components/identify/camera-scanner";

const photoTips = [
  "One leaf, lying flat and filling most of the frame.",
  "Daylight, without flash glare.",
  "A plain background if you can.",
];

export default function IdentifyPage() {
  return (
    <div id="top" className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-[96rem] px-4 pb-16 pt-24 sm:px-6 sm:pt-28 lg:px-10 xl:px-16 2xl:px-24">
        <h1 className="section-title text-foreground">Identify a Tree</h1>
        <p className="mt-4 max-w-[38rem] text-lg leading-relaxed text-foreground/85">
          Take a clear photo of one leaf, or upload one. The AI will suggest
          whether it may be Mahogany (<em>Swietenia macrophylla</em>).
        </p>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
          <CameraScanner />

          <aside aria-labelledby="photo-tips-heading">
            <h2
              id="photo-tips-heading"
              className="text-base font-bold text-foreground"
            >
              For a good photo
            </h2>
            <ul className="mt-3 border-t border-border">
              {photoTips.map((tip) => (
                <li
                  key={tip}
                  className="border-b border-border py-3 text-base leading-relaxed text-muted-foreground"
                >
                  {tip}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              The result is a suggestion from the AI. CENRO staff review
              every report.
            </p>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
