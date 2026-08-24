// components/landing/navbar.tsx
//
// WHAT: Fixed navigation bar for community-facing pages
// CONCEPTS:
//   usePathname — reads the current URL path
//   useState    — tracks mobile menu open/close
//   backdrop-blur — frosted glass effect on scroll

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, TreePine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/common/theme-toggle";

// Navigation links for community users
// No login required for any of these
const navLinks = [
  { label: "Home", href: "/" },
  { label: "Identify a Tree", href: "/identify" },
  { label: "Report a Sighting", href: "/report" },
  { label: "Species Guide", href: "/species" },
];

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // usePathname returns the current URL path
  // e.g. "/identify" or "/" or "/species"
  const pathname = usePathname();

  // Helper function — returns true if this link is the current page
  const isActive = (href: string) => pathname === href;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <TreePine className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">
            CITIA-IS
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`
                rounded-md px-3 py-1.5 text-sm transition-colors
                ${
                  isActive(link.href)
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }
              `}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Theme toggle + Admin login — desktop */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <div className="h-5 w-px bg-border" />
          <Button
            render={<Link href="/admin/login" />}
            nativeButton={false}
            variant="outline"
            size="sm"
          >
            Admin Login
          </Button>
        </div>

        {/* Mobile — ThemeToggle always visible + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          {/* ThemeToggle visible on mobile and tablet */}
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

      {/* Mobile dropdown */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 pb-4 pt-2">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={`
                  rounded-md px-3 py-2 text-sm transition-colors
                  ${
                    isActive(link.href)
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }
                `}
              >
                {link.label}
              </Link>
            ))}

            <div className="my-2 border-t border-border" />

            <Link
              href="/admin/login"
              onClick={() => setIsMenuOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Admin Login
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
