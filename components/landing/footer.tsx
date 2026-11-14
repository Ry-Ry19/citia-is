// components/landing/footer.tsx
//
// WHAT: The footer of the public pages (/, /report, /species) — what
//   CITIA-IS is, how to reach CENRO Iligan City, two short columns of
//   links, and a bottom row with the staff entry point.
//
// COLOUR NOTE: the <footer> carries the class "dark". That makes every
//   colour inside it use the dark theme's values, so the footer is the
//   same deep green-black band in both themes. On the light page it
//   closes the page; on the dark page a thin line separates it.
//
// LINK NOTE: the two links that point at sections of the landing page
//   start with "/#" (not just "#"), so they also work from /report and
//   /species.
//
// NOTE: No "use client" needed — there is no state here, and
//   "Back to top" is a plain link to #top.

import Link from "next/link";
import { ArrowUp, Lock } from "lucide-react";

interface FooterLink {
  label: string;
  href: string;
  /** Opens in a new tab if true. */
  external?: boolean;
}

interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

const navColumns: FooterColumn[] = [
  {
    heading: "Take part",
    links: [
      { label: "Identify a Tree", href: "/identify" },
      { label: "Report a Sighting", href: "/report" },
      { label: "Species Guide", href: "/species" },
    ],
  },
  {
    heading: "About",
    links: [
      { label: "Why it matters", href: "/#about-section" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "DENR", href: "https://denr.gov.ph", external: true },
      { label: "MSU-IIT", href: "https://msuiit.edu.ph", external: true },
    ],
  },
];

const footerLink =
  "focus-ring inline-flex min-h-11 items-center rounded-md text-sm text-muted-foreground underline-offset-4 transition-colors duration-200 hover:text-foreground hover:underline";

export function Footer() {
  return (
    <footer className="dark border-t border-border bg-background text-foreground">
      <div className="mx-auto grid max-w-[96rem] gap-12 px-6 py-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-24 lg:px-10 xl:px-16 2xl:px-24">
        {/* ── What this is, and how to reach CENRO ──────────── */}
        <div className="max-w-[26rem]">
          <Link
            href="/#top"
            className="focus-ring inline-flex min-h-11 items-center rounded-md text-xl font-extrabold tracking-tight text-foreground"
          >
            CITIA-IS
          </Link>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            A community guide for learning about Mahogany and documenting
            sightings in Iligan City.
          </p>

          <address className="mt-8 text-sm not-italic leading-relaxed text-muted-foreground">
            <span className="block font-semibold text-foreground">
              CENRO Iligan City
            </span>
            <span className="mt-1 block">
              4th East St., Cenro Compound, Rosary Heights, Tubod, Iligan
              City, Lanao del Norte, 9200
            </span>
            <a
              href="mailto:cenro.iligan@denr.gov.ph"
              className={`${footerLink} mt-1`}
            >
              cenro.iligan@denr.gov.ph
            </a>
          </address>
        </div>

        {/* ── Links ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-x-12 gap-y-10 sm:gap-x-20">
          {navColumns.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 className="text-sm font-bold text-foreground">
                {column.heading}
              </h2>
              <ul className="mt-2 flex flex-col">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      className={footerLink}
                    >
                      {link.label}
                      {link.external && (
                        <span className="sr-only"> (opens in a new tab)</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* ── Bottom row ──────────────────────────────────────── */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[96rem] flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-10 xl:px-16 2xl:px-24">
          <p className="text-sm text-muted-foreground">
            © 2026 CITIA-IS, CENRO Iligan City and MSU-IIT
          </p>

          <div className="flex items-center gap-6">
            <Link href="/admin/login" className={`${footerLink} gap-1.5`}>
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              CENRO Staff Access
            </Link>
            <a href="#top" className={`${footerLink} gap-1.5`}>
              Back to top
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
