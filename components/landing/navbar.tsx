// components/landing/navbar.tsx
//
// WHAT: The navigation for the public pages (/, /identify, /report,
//   /species).
//
//   1. A plain bar fixed to the top of the screen: logo, a "Home"
//      dropdown that lists the sections of the landing page, the page
//      links, the "Identify a Tree" button and the theme toggle.
//   2. On phones, a menu button that opens the same links in a panel,
//      with "CENRO Staff Access" at the bottom.
//   3. On phones, an action bar fixed to the bottom of the screen with
//      the two community actions, within reach of a thumb.
//
// THE "HOME" DROPDOWN:
//   - Every item starts with "/#", so it scrolls to its section on the
//     landing page and also works from the other pages.
//   - It opens on click. It closes when an item is chosen, when the
//     visitor clicks anywhere else, or when Escape is pressed.
//   - With the keyboard: Enter or Space opens it, the arrow keys move
//     between items, and Escape puts focus back on the button.
//
// THE BOTTOM ACTION BAR:
//   - It is shown only on the landing page and the Species Guide. On
//     /report it would cover the form's own button, so it is left out.
//   - It appears once the visitor has scrolled past the top of the
//     page (where the hero already shows the same two buttons) and
//     hides again near the end of the page so it never covers the
//     footer.

"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Leaf, Lock, MapPin, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { SiteLogo } from "@/components/common/site-logo";

interface NavLink {
  label: string;
  href: string;
}

/** The sections of the landing page, in the order they appear on it. */
const homeSections: NavLink[] = [
  { label: "Top of page", href: "/#hero-section" },
  { label: "Why it matters", href: "/#about-section" },
  { label: "How CITIA-IS helps", href: "/#features-strip" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Get started", href: "/#get-started" },
];

const navLinks: NavLink[] = [
  { label: "Species Guide", href: "/species" },
  { label: "Report a Sighting", href: "/report" },
];

/** Pages where the phone action bar is shown. */
const ACTION_BAR_PATHS = ["/", "/species"];

/**
 * The closing section of the landing page and of the Species Guide.
 * Both end with their own "Identify a Tree" and "Report a Sighting"
 * buttons, found here by the id of their heading.
 */
const CLOSING_SECTION =
  '[aria-labelledby="closing-cta-heading"], [aria-labelledby="species-cta-heading"]';

const barLink =
  "focus-ring relative inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-3 text-sm transition-colors duration-200";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHomeOpen, setIsHomeOpen] = useState(false);
  const [isPastTop, setIsPastTop] = useState(false);
  const homeRef = useRef<HTMLDivElement>(null);
  const homeButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;
  const closeMenu = () => setIsMenuOpen(false);

  const hasActionBar = ACTION_BAR_PATHS.includes(pathname);
  const showActionBar = hasActionBar && isPastTop && !isMenuOpen;

  // Decide whether the phone action bar should be showing: only after
  // the visitor scrolls past the top, and not right at the end.
  useEffect(() => {
    if (!hasActionBar) return;
    const update = () => {
      const scrolled = window.scrollY;
      const nearEnd =
        window.innerHeight + scrolled >=
        document.documentElement.scrollHeight - 200;
      // The closing section of a page already shows the same two
      // buttons. Once it comes into view the bar steps aside, so the
      // actions are never on screen twice.
      const closing = document.querySelector(CLOSING_SECTION);
      const closingInView =
        closing !== null &&
        closing.getBoundingClientRect().top < window.innerHeight - 96;
      setIsPastTop(scrolled > 420 && !nearEnd && !closingInView);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [hasActionBar]);

  // The Escape key closes the phone menu.
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMenuOpen]);

  // While the "Home" dropdown is open: a click anywhere outside it
  // closes it, and Escape closes it and returns focus to its button.
  useEffect(() => {
    if (!isHomeOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!homeRef.current?.contains(event.target as Node)) {
        setIsHomeOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsHomeOpen(false);
        homeButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isHomeOpen]);

  // Arrow keys move between the items of the open dropdown.
  function handleHomeMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLAnchorElement>("a")
    );
    const current = items.indexOf(document.activeElement as HTMLAnchorElement);
    let next = -1;
    if (event.key === "ArrowDown") next = (current + 1) % items.length;
    if (event.key === "ArrowUp")
      next = (current - 1 + items.length) % items.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = items.length - 1;
    if (next >= 0) {
      event.preventDefault();
      items[next].focus();
    }
  }

  // Opening the dropdown with the down arrow moves focus to its first item.
  function handleHomeButtonKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>
  ) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsHomeOpen(true);
      requestAnimationFrame(() =>
        homeRef.current?.querySelector<HTMLAnchorElement>("a")?.focus()
      );
    }
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[96rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24">
          {/* Logo — always leads back to the landing page */}
          <Link
            href="/#hero-section"
            className="focus-ring flex shrink-0 items-center gap-2.5 rounded-md"
          >
            <SiteLogo className="h-9 w-9" />
            <span className="text-base font-extrabold tracking-tight text-foreground">
              CITIA-IS
            </span>
          </Link>

          {/* Links — tablets and wider */}
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {/* "Home" dropdown: the sections of the landing page */}
            <div ref={homeRef} className="relative">
              <button
                ref={homeButtonRef}
                type="button"
                onClick={() => setIsHomeOpen(!isHomeOpen)}
                onKeyDown={handleHomeButtonKeyDown}
                aria-expanded={isHomeOpen}
                aria-haspopup="true"
                aria-controls="home-sections-menu"
                className={`${barLink} gap-1.5 ${
                  pathname === "/"
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Home
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${
                    isHomeOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
                {pathname === "/" && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 bottom-1.5 h-0.5 rounded-full bg-primary"
                  />
                )}
              </button>

              {isHomeOpen && (
                <div
                  id="home-sections-menu"
                  aria-label="Sections of the home page"
                  onKeyDown={handleHomeMenuKeyDown}
                  className="absolute left-0 top-full mt-2 w-60 rounded-lg border border-border bg-card p-1.5 shadow-lg animate-in fade-in-0 duration-150"
                >
                  <ul className="m-0 list-none p-0">
                    {homeSections.map((section) => (
                      <li key={section.href}>
                        <Link
                          href={section.href}
                          onClick={() => setIsHomeOpen(false)}
                          className="focus-ring flex min-h-11 items-center rounded-md px-3 text-sm text-foreground transition-colors hover:bg-muted"
                        >
                          {section.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`${barLink} ${
                    active
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-3 bottom-1.5 h-0.5 rounded-full bg-primary"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Actions — tablets and wider */}
          <div className="hidden items-center gap-3 md:flex">
            <Button
              render={<Link href="/identify" />}
              nativeButton={false}
              size="sm"
              className="min-h-11 px-4"
            >
              <Leaf className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Identify a Tree
            </Button>
            <ThemeToggle />
          </div>

          {/* Phones — theme toggle and menu button */}
          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation"
              className="focus-ring flex h-11 w-11 items-center justify-center rounded-md text-foreground"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Phone menu panel. It scrolls if it is taller than the screen. */}
        {isMenuOpen && (
          <div
            id="mobile-navigation"
            className="max-h-[calc(100svh-4rem)] overflow-y-auto border-t border-border bg-background px-4 pb-4 pt-2 md:hidden"
          >
            <nav aria-label="Main" className="flex flex-col">
              <Link
                href="/identify"
                onClick={closeMenu}
                className="focus-ring flex min-h-12 items-center gap-3 rounded-md px-2 text-base font-semibold text-primary"
              >
                <Leaf className="h-4 w-4 shrink-0" aria-hidden="true" />
                Identify a Tree
              </Link>

              {/* The sections of the landing page */}
              <p
                id="mobile-home-heading"
                className="mt-2 px-2 text-sm font-semibold text-muted-foreground"
              >
                Home
              </p>
              <ul
                aria-labelledby="mobile-home-heading"
                className="m-0 ml-2 list-none border-l border-border p-0 pl-2"
              >
                {homeSections.map((section) => (
                  <li key={section.href}>
                    <Link
                      href={section.href}
                      onClick={closeMenu}
                      className="focus-ring flex min-h-11 items-center rounded-md px-2 text-base text-foreground"
                    >
                      {section.label}
                    </Link>
                  </li>
                ))}
              </ul>

              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    aria-current={active ? "page" : undefined}
                    className={`focus-ring mt-1 flex min-h-12 items-center rounded-md px-2 text-base ${
                      active
                        ? "font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-8"
                        : "text-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-2 border-t border-border pt-2">
              <Link
                href="/admin/login"
                onClick={closeMenu}
                className="focus-ring flex min-h-12 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                CENRO Staff Access
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Phone action bar — the two community actions within thumb reach */}
      {hasActionBar && (
        <div
          aria-hidden={!showActionBar}
          className={`safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm transition-transform duration-200 motion-reduce:transition-none md:hidden ${
            showActionBar ? "translate-y-0" : "invisible translate-y-full"
          }`}
        >
          <div className="grid grid-cols-2 gap-2 px-4 py-2.5">
            <Button
              render={<Link href="/identify" />}
              nativeButton={false}
              className="min-h-12 w-full text-sm"
            >
              <Leaf className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Identify a Tree
            </Button>
            <Button
              render={<Link href="/report" />}
              nativeButton={false}
              variant="outline"
              className="min-h-12 w-full border-foreground/30 bg-transparent text-sm"
            >
              <MapPin className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Report a Sighting
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
