// components/landing/navbar.tsx
//
// Floating glassmorphic pill header with strict dark tokens
// (#09090b base, #27272a borders, #10b981 emerald accents).

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
  Lock,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { SiteLogo } from "@/components/common/site-logo";

const navLinks = [
  { label: "Home", href: "/#hero-section", icon: Home },
  { label: "Report a Sighting", href: "/report", icon: MapPin },
  { label: "Species Guide", href: "/species", icon: BookOpen },
];

const homeLinks = [
  { label: "Home", href: "/#hero-section" },
  { label: "About CITIA-IS", href: "/#about-section" },
  { label: "How it Works", href: "/#how-it-works" },
  { label: "How CITIA-IS Helps", href: "/#features-strip" },
];

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHomeMenuOpen, setIsHomeMenuOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="fixed top-3 left-0 right-0 z-50 px-4">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between rounded-full border border-border/70 bg-background/70 px-4 shadow-lg backdrop-blur-xl sm:px-6">
        {/* Logo & Civic Status Badge */}
        <Link href="/#hero-section" className="group flex items-center gap-2.5">
          <SiteLogo className="h-10 w-10 transition-transform duration-200 group-hover:scale-105" />
          <span className="flex items-baseline text-base font-extrabold tracking-tight">
            <span className="text-foreground">CITIA</span>
            <span className="text-primary">-IS</span>
          </span>
          <Badge
            variant="outline"
            className="hidden sm:inline-flex border-border bg-card text-[10px] font-mono uppercase tracking-widest text-muted-foreground ml-1"
          >
            Iligan Pilot
          </Badge>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            if (link.label === "Home") {
              return (
                <div key={link.href} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsHomeMenuOpen(!isHomeMenuOpen)}
                    aria-expanded={isHomeMenuOpen}
                    aria-haspopup="menu"
                    aria-controls="home-navigation-menu"
                    className={`relative rounded-md border px-3 py-1.5 text-sm transition-all duration-200 ${
                      active
                        ? "font-semibold text-foreground bg-card/60 border-border"
                        : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {link.label}
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${
                          isHomeMenuOpen ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </span>
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-1.5 left-1/2 h-0.5 w-4 -translate-x-1/2 bg-primary rounded-full"
                      />
                    )}
                  </button>
                  {isHomeMenuOpen && (
                    <div
                      id="home-navigation-menu"
                      role="menu"
                      className="absolute left-1/2 top-full z-10 mt-3 w-52 -translate-x-1/2 rounded-xl border border-border bg-card p-2 text-card-foreground shadow-lg backdrop-blur-xl"
                    >
                      {homeLinks.map((homeLink) => (
                        <Link
                          key={homeLink.href}
                          href={homeLink.href}
                          role="menuitem"
                          onClick={() => setIsHomeMenuOpen(false)}
                          className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          {homeLink.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative rounded-md px-3 py-1.5 text-sm transition-all duration-200 border ${
                  active
                    ? "font-semibold text-foreground bg-card/60 border-border"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1.5 left-1/2 h-0.5 w-4 -translate-x-1/2 bg-primary rounded-full"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop right actions */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            render={<Link href="/identify" />}
            nativeButton={false}
            size="sm"
            aria-label="Open tree identification scanner"
            className="min-h-11 min-w-[44px]"
          >
            <Leaf className="mr-1.5 h-4 w-4" />
            Identify a Tree
          </Button>

          <div className="h-5 w-px bg-border" />

          <ThemeToggle />
        </div>

        {/* Mobile — hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer — floating rounded card aligned under the pill */}
      {isMenuOpen && (
        <div id="mobile-navigation" className="md:hidden mx-auto mt-2 max-w-6xl rounded-3xl border border-border/70 bg-background/90 px-4 pb-4 pt-2 shadow-lg backdrop-blur-xl">
          {/* Primary quick action */}
          <div className="py-4">
            <Button
              render={<Link href="/identify" />}
              nativeButton={false}
              onClick={closeMenu}
              className="w-full justify-center min-h-11"
              aria-label="Open tree identification scanner"
            >
              <Leaf className="mr-1.5 h-4 w-4" />
              Identify a Tree
            </Button>
            <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
              Guest Access &middot; No account needed
            </p>
          </div>

          {/* Nav links */}
          <nav className="flex flex-col gap-1 pt-1">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <div key={link.href}>
                  <Link
                    href={link.href}
                    onClick={closeMenu}
                    className={`flex items-center gap-3 rounded-lg p-3 text-sm transition-colors duration-200 min-h-11 ${
                      active
                        ? "bg-[#10b981] font-semibold text-[#09090b]"
                        : "text-muted-foreground hover:text-foreground hover:bg-card"
                    }`}
                  >
                    <link.icon className="h-4 w-4 shrink-0" />
                    {link.label}
                    {link.label === "Home" && (
                      <ChevronDown
                        className="ml-auto h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                  {link.label === "Home" && (
                    <div className="pl-6 space-y-2 py-2">
                      {homeLinks.map((homeLink) => (
                        <Link
                          key={homeLink.href}
                          href={homeLink.href}
                          onClick={closeMenu}
                          className="block text-zinc-400 text-xs font-medium hover:text-[#10b981]"
                        >
                          {homeLink.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Staff access — bottom of drawer */}
          <div className="mt-3 border-t border-border pt-3">
            <Link
              href="/admin/login"
              onClick={closeMenu}
              className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground min-h-11"
              aria-label="CENRO staff login portal"
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
