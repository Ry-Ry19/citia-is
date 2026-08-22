import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminLoginForm } from "@/components/auth/admin-login-form";

export default function AdminLoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-muted px-4 pt-20 pb-12 md:pt-12">
      {/* Back to home */}
      <Link
        href="/"
        className="absolute left-6 top-8 z-10 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>

      {/* Single unified card — Increased max-w to 4xl to accommodate two columns side-by-side */}
      <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-card shadow-2xl md:flex-row">
        {/* Left Side: Dark media panel (Desktop: Left/order-1, Mobile: Bottom/order-2) */}
        <div className="order-2 flex flex-col bg-neutral-950 md:order-1 md:w-3/5">
          {/* Media header strip */}
          <div className="flex items-center gap-2 px-6 py-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              C
            </div>
            <span className="text-xs font-medium tracking-wide text-white/80">
              CENRO &middot; CITIA-IS
            </span>
          </div>

          {/* Media content */}
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-black md:aspect-auto md:h-full">
            <video
              className="h-full w-full object-cover opacity-90"
              autoPlay
              loop
              muted
              playsInline
            >
              <source src="/assets/videos/citia-intro.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>

        {/* Right Side: Login fields (Desktop: Right/order-2, Mobile: Top/order-1) */}
        <div className="order-1 flex flex-col justify-center items-stretch p-8 sm:p-5 md:order-2 md:w-2/5 bg-card">
          <AdminLoginForm />
        </div>
      </div>

      {/* Copyright — outside the card */}
      <p className="mt-6 max-w-md text-center text-xs text-muted-foreground">
        Copyright © 2026 onwards, CENRO &amp; CITIA-IS Development Team.
        Community-Driven Invasive Tree Identification and Action Information
        System.
      </p>
    </main>
  );
}
