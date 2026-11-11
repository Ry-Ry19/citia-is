// components/common/theme-toggle.tsx
//
// WHAT: Icon button that switches between light and dark theme
// CONCEPTS:
//   useTheme  — from next-themes, reads/sets the current theme
//   mounted guard — prevents a hydration mismatch on first render

"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Moon, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Hydration guard: the server can't know the persisted theme, so we
    // wait until we're safely mounted client-side before showing the real icon.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  if (!mounted) {
    return <div className="h-11 w-11" aria-hidden="true" />;
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.98]"
        aria-label="Open display settings"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Settings className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Theme selection"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-36 rounded-xl border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur-xl"
        >
          {[
            { value: "light", label: "Light", icon: Sun },
            { value: "dark", label: "Dark", icon: Moon },
          ].map((option) => {
            const OptionIcon = option.icon;
            const selected = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setTheme(option.value);
                  setIsOpen(false);
                }}
                className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <OptionIcon className="h-4 w-4" />
                <span className="flex-1">{option.label}</span>
                {selected && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
