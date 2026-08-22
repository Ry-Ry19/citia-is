// components/theme-provider.tsx
//
// WHAT: Thin wrapper around next-themes' provider
// WHY: next-themes needs to be a Client Component, but your
//      layout.tsx is a Server Component by default. This file
//      is the small bridge between the two.

"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
