import Link from "next/link";
import { ReportForm } from "@/components/report-form";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

export default function ReportPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="px-4 pb-16 pt-28 sm:px-6 sm:pt-32">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/identify"
            className="inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ← Back to identifier
          </Link>
          <header className="mt-6 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Community Sighting Report
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Report a Sighting
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Share what you observed so CENRO can review and document possible
              Mahogany sightings across Iligan City.
            </p>
            <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs leading-relaxed text-muted-foreground">
              Reports are saved for CENRO staff review. AI results are
              preliminary and do not authorize tree cutting or removal.
            </div>
          </header>
          <div className="mt-8">
            <ReportForm />
          </div>
        </div>
      </main>
      <Toaster />
      <Footer />
    </div>
  );
}
