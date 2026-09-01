// components/landing/navbar.tsx
//
// WHAT: Fixed navigation bar for community-facing pages
// CONCEPTS:
//   usePathname — reads the current URL path
//   useState    — tracks mobile menu open/close
//   backdrop-blur — frosted glass effect on scroll
//
// TOKEN NOTE: "Identify a Tree" is promoted to a primary <Button>
//   (not a plain link) because it's the single entry point of the
//   guest flow (Identify → Learn → Report). Every other nav item
//   stays a text link so the one CTA that matters doesn't get lost
//   in a row of buttons.
//
// LOGO NOTE: the logo is <SiteLogo />, an inline SVG component
//   (components/common/site-logo.tsx) whose structural lines use
//   fill-foreground so they track the --foreground token and stay
//   visible in both light and dark mode — a static image file can't
//   do this, since Tailwind classes can't reach inside it.
//
// ADMIN ACCESS NOTE: "Admin Login" used to sit as a bordered button
//   right next to the public CTAs in the desktop nav. That's a real
//   UX problem, separate from security: a community member — often
//   older or less technical, per this project's accessibility goals —
//   sees a login button before anything else and assumes an account
//   is required, when the entire point of the guest flow is that it
//   isn't. The fix here is NOT security-related (hiding a route
//   doesn't protect it — see prior conversation) — it's pure
//   information hierarchy: staff access is removed from the desktop
//   button row entirely, and reduced to a small, clearly-separated
//   link at the very bottom of the mobile drawer, well below every
//   public action. The actual security hardening (rate limiting,
//   password hashing, etc.) happens later, in the real FastAPI auth
//   build — not in how visible this link is.

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Leaf,
  Home,
  MapPin,
  BookOpen,
  Sprout,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { SiteLogo } from "@/components/common/site-logo";

// Informational / exploration links — plain text, equal weight.
// icon is only used in the mobile drawer (desktop nav stays text-only).
const navLinks = [
  { label: "Home", href: "/#top", icon: Home },
  { label: "Report a Sighting", href: "/report", icon: MapPin },
  { label: "Species Guide", href: "/species", icon: BookOpen },
];

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // usePathname returns the current URL path
  // e.g. "/identify" or "/" or "/species"
  const pathname = usePathname();

  // Helper function — returns true if this link is the current page
  const isActive = (href: string) => pathname === href;

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/#top" className="group flex items-center gap-2.5">
          <SiteLogo className="h-10 w-10 transition-transform duration-200 group-hover:scale-105" />
          <span className="flex items-baseline text-base font-extrabold tracking-tight">
            <span className="text-foreground">CITIA</span>
            <span className="text-primary">-IS</span>
          </span>
        </Link>

        {/* Desktop nav links — equal peer weight. Active state is a
            small dot underneath, not a filled pill, so it reads as
            "you are here" rather than "this is a button." */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative rounded-md px-3 py-1.5 text-sm transition-colors duration-200 ${
                  active
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {link.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Identify CTA + Theme toggle — desktop. No admin link here
            at all — see ADMIN ACCESS NOTE at the top of this file. */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            render={<Link href="/identify" />}
            nativeButton={false}
            size="sm"
          >
            <Leaf className="mr-1.5 h-4 w-4" />
            Identify a Tree
          </Button>

          <div className="h-5 w-px bg-border" />

          <ThemeToggle />
        </div>

        {/* Mobile — ThemeToggle always visible + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer — restructured into four clear sections:
          1. Header (brand + close)
          2. Primary quick action (Identify, with a Guest Access note)
          3. Nav links, each paired with an icon, 44px+ touch target
          4. Reassurance note, then Staff Access separated at the very
             bottom in its own small, muted container */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 pb-4">
          

          {/* 2. Primary quick action */}
          <div className="py-4">
            <Button
              render={<Link href="/identify" />}
              nativeButton={false}
              onClick={closeMenu}
              className="w-full justify-center"
            >
              <Leaf className="mr-1.5 h-4 w-4" />
              Identify a Tree
            </Button>
            <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
              Guest Access &middot; No account needed
            </p>
          </div>

          {/* 3. Nav links — icon + label, p-3 gives a 44px+ touch target */}
          <nav className="flex flex-col gap-1 pt-1">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className={`flex items-center gap-3 rounded-xl p-3 text-sm transition-colors duration-200 ${
                    active
                      ? "bg-accent/50 font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <link.icon className="h-4 w-4 shrink-0" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* 4. Staff access — separated, small, lock icon. Bottom of
              the drawer, below every public action. */}
          <div className="mt-3 border-t border-border pt-3">
            <Link
              href="/admin/login"
              onClick={closeMenu}
              className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              <Lock className="h-3 w-3" />
              CENRO Staff Access
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
