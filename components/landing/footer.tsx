// components/landing/footer.tsx
//
// WHAT: Site footer — theme-aware, two-tier layout (flips with
//   light/dark mode like the rest of the app)
// REFERENCE: Left brand block + right nav columns, bottom utility strip
//
// NOTE: No "use client" needed — all hover/focus effects are plain
//   Tailwind pseudo-classes now, not JS event handlers. This also
//   means keyboard users get a visible focus ring for free via the
//   global :focus-visible rule in globals.css.
//
// SCROLL NOTE: "Back to top" is a plain <a href="#top">, not a JS
//   onClick handler — that would require "use client" for no real
//   benefit. For SMOOTH scrolling (rather than an instant jump), add
//   className="scroll-smooth" to the <html> tag in app/layout.tsx —
//   that's a one-line, CSS-only fix that applies site-wide, keeping
//   this file free of unnecessary client-side JS.

import Link from "next/link";
import { ArrowUp, MapPin, Building2, Mail, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import { SiteLogo } from "@/components/common/site-logo";

// ── TypeScript Interfaces ──────────────────────────────────────────────────

interface FooterLink {
  label: string;
  href: string;
  external?: boolean; // opens in new tab if true
}

interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

interface ContactItem {
  label: string;
  value: string;
  href?: string; // optional — makes value a clickable link
  icon: LucideIcon;
}

interface SocialLink {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}
// ── Custom brand icons ──────────────────────────────────────
// lucide-react deliberately excludes brand/social logos — these
// are small local SVGs instead of pulling in an extra package
// for just two icons.

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 12.06C22 6.48 17.52 2 11.94 2S1.88 6.48 1.88 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.42V9.91c0-2.39 1.42-3.71 3.6-3.71 1.04 0 2.13.19 2.13.19v2.34h-1.2c-1.18 0-1.55.73-1.55 1.48v1.78h2.64l-.42 2.91h-2.22V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" />
    </svg>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────

const contactItems: ContactItem[] = [
  {
    label: "Address",
    value: "MSU-IIT, Andres Bonifacio Avenue, Tibanga, Iligan City 9200",
    icon: MapPin,
  },
  {
    label: "Office",
    value: "CENRO Iligan City",
    icon: Building2,
  },
  {
    label: "Email Us",
    value: "cenro.iligan@denr.gov.ph",
    href: "mailto:cenro.iligan@denr.gov.ph",
    icon: Mail,
  },
];

const navColumns: FooterColumn[] = [
  {
    heading: "Community",
    links: [
      { label: "Identify a Tree", href: "/identify" },
      { label: "Report a Sighting", href: "/report" },
      { label: "Species Guide", href: "/species" },
    ],
  },
  {
    heading: "Information",
    links: [
      { label: "About CITIA-IS", href: "#about-section" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Ecological Impact", href: "/species" },
    ],
  },
  {
    heading: "Institution",
    links: [
      {
        label: "CENRO Iligan City",
        href: "https://denr.gov.ph",
        external: true,
      },
      { label: "MSU-IIT", href: "https://msuiit.edu.ph", external: true },
      { label: "Department of IS", href: "/" },
      { label: "RA 9147 — Wildlife Act", href: "/species" },
    ],
  },
];

const socialLinks: SocialLink[] = [
  {
    label: "Facebook",
    href: "/",
    icon: FacebookIcon,
  },
  {
    label: "LinkedIn",
    href: "/",
    icon: LinkedinIcon,
  },
];

// ── Component ─────────────────────────────────────────────────────────────

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-muted">
      {/* Top brand accent line — token-based, correct in both themes */}
      <div className="h-[2px] bg-linear-to-r from-primary to-transparent" />

      {/* ── UPPER GRID ─────────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[280px_1fr]">
          {/* LEFT — Brand block (matches reference left column weight) */}
          <div className="flex flex-col gap-6">
            {/* Logo */}
            <Link href="/#top" className="group flex items-center gap-2.5">
              <SiteLogo className="h-16 w-18 transition-transform duration-200 group-hover:scale-105" />
              <span className="flex items-baseline text-base font-extrabold tracking-tight">
                <span className="text-foreground">CITIA</span>
                <span className="text-primary">-IS</span>
              </span>
            </Link>

            {/* System full name */}
            <p className="max-w-[240px] text-xs leading-relaxed text-muted-foreground">
              Community-Driven Invasive Tree Identification and Recommendation
              Management Information System.
            </p>

            {/* Contact items — maps ContactItem[]. Each label now has a
                small icon anchor (MapPin/Building2/Mail) so the block
                is scannable at a glance rather than three identical-
                looking text rows. */}
            <div className="flex flex-col gap-4">
              {contactItems.map((item) => (
                <div key={item.label} className="flex gap-2.5">
                  <item.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                      {item.label}
                    </span>
                    {item.href ? (
                      <a
                        href={item.href}
                        className="text-xs leading-relaxed text-muted-foreground transition-colors duration-200 hover:text-primary"
                      >
                        {item.value}
                      </a>
                    ) : (
                      <span className="text-xs leading-relaxed text-muted-foreground">
                        {item.value}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Navigation columns grid */}
          {/*
            grid-cols-2 on mobile — Community/Information sit side by
              side, only Institution wraps to its own row, roughly
              halving the vertical scroll versus a full 1-column stack.
            sm:grid-cols-3 — all three get their own column from
              tablet width up.
          */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {navColumns.map((column) => (
              <div key={column.heading}>
                {/* Column header — uppercase white bold */}
                <h4 className="mb-5 text-xs font-bold uppercase tracking-widest text-foreground">
                  {column.heading}
                </h4>

                {/* Links — maps FooterLink[]. block + py-1.5 enlarges
                    the tappable area (not just the visible text) so
                    mobile taps land reliably, per WCAG's ~44px touch
                    target guidance for the full row including gap-3. */}
                <ul className="flex flex-col gap-1">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        target={link.external ? "_blank" : undefined}
                        rel={link.external ? "noopener noreferrer" : undefined}
                        className="block py-1.5 text-xs leading-relaxed text-muted-foreground transition-colors duration-200 hover:text-primary"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/*
        Separated by a thin border line — matches reference bottom strip.
        Left: copyright + CENRO Staff Access + Privacy Policy
        Right: social icons + back to top
      */}
      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            {/* Left — copyright + legal links */}
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <p className="text-[11px] text-muted-foreground">
                © 2026 CITIA-IS &middot; CENRO Iligan City &middot; MSU-IIT
                Department of Information Systems &middot; All rights reserved.
              </p>

              {/* Legal links row — Lock icon + "CENRO Staff Access"
                  (renamed to match the wording standardized in the
                  navbar's mobile drawer) makes the staff entry point
                  instantly recognizable to CENRO personnel scanning
                  the footer, without competing with public links. */}
              <div className="flex items-center gap-3">
                <Link
                  href="/admin/login"
                  className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors duration-200 hover:text-primary"
                >
                  <Lock className="h-3 w-3" />
                  CENRO Staff Access
                </Link>

                <span className="text-border">|</span>

                <Link
                  href="/privacy"
                  className="text-[11px] text-muted-foreground transition-colors duration-200 hover:text-primary"
                >
                  Privacy Policy
                </Link>
              </div>
            </div>

            {/* Right — social icons + back to top */}
            <div className="flex items-center gap-4">
              {/* Social icons — maps SocialLink[] */}
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors duration-200 hover:border-primary hover:text-primary"
                >
                  <social.icon className="h-3.5 w-3.5" />
                </a>
              ))}

              {/* Divider */}
              <div className="h-4 w-px bg-border" />

              {/* Back to top — plain anchor. See SCROLL NOTE at the
                  top of this file for how to make this animate
                  smoothly without adding client-side JS. */}
              <a
                href="#top"
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors duration-200 hover:text-primary"
              >
                Back to top
                <ArrowUp className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
