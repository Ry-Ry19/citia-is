// components/landing/footer.tsx
//
// WHAT: Site footer with link groups and copyright
// CONCEPT: Responsive grid — 1 col mobile, 2 col tablet, 4 col desktop
// DESIGN NOTE: Deliberately kept to the "multi-column grid +
//   minimalist bottom bar" pattern rather than heavier trends
//   (3D models, physics-based elements, giant typography) — those
//   suit creative/portfolio sites, but conflict with this project's
//   own accessibility-first, low-friction goals for community and
//   elderly users. Micro-animations (link underline slide) are the
//   one trend adopted, since they're cheap, unobtrusive, and add
//   polish without any accessibility or performance cost.

import Link from "next/link";
import { TreePine, ArrowUp } from "lucide-react";

const footerLinks = [
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
      { label: "CITIA-IS Offers", href: "#features-strip" },
      { label: "About CITIA-IS", href: "#about-section" },
      { label: "How It Works", href: "#how-it-works" },
    ],
  },
  {
    heading: "Administration",
    links: [
      { label: "CENRO Staff Login", href: "/admin/login" },
      { label: "CENRO Iligan City", href: "/" },
      { label: "MSU-IIT IS Department", href: "/" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-muted px-6 py-12">
      {/* Thin brand accent line — token-based, so it's correct in
          both themes without a separate dark-mode override */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary via-primary/40 to-transparent" />

      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                <TreePine className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-bold text-foreground">
                CITIA-IS
              </span>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Community-Driven Invasive Tree Identification and
              Recommendation Management Information System.
            </p>

            <p className="mt-3 text-xs font-medium text-muted-foreground">
              CENRO Iligan City &middot; MSU-IIT
            </p>
          </div>

          {/* Link groups */}
          {footerLinks.map((group) => (
            <div key={group.heading}>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-foreground">
                {group.heading}
              </h4>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {/* Micro-animation: underline slides in from the
                        left on hover, rather than just a color change.
                        `group` + `group-hover` lets the span (the
                        underline) react to hovering the PARENT link,
                        without needing separate JS or state. */}
                    <Link
                      href={link.href}
                      className="group relative inline-block text-xs text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                      <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-primary transition-all duration-300 group-hover:w-full" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center gap-4 border-t border-border pt-6 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © 2026 CITIA-IS &middot; CENRO Iligan City &middot; MSU-IIT
            Department of Information Systems &middot; All rights reserved.
          </p>

          
            <a href="#top"
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            Back to top
            <ArrowUp className="h-3 w-3" />
          </a>
        </div>
      </div>
    </footer>
  );
}