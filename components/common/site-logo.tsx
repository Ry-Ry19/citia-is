// components/common/site-logo.tsx
//
// WHAT: The CITIA-IS icon mark — a magnifying glass (community
//   inspection) over a tree with a GIS location pin, built as an
//   inline SVG so its colors can respond to the site's theme.
// CONCEPTS:
//   Adaptive dual-tone SVG — structural lines (magnifying glass rim,
//     handle, tree trunk) use className="fill-foreground", which
//     resolves through Tailwind to your --foreground CSS variable:
//     Deep Forest in light mode, near-white in dark mode. The brand
//     accents (leaves, GIS pin) use a hardcoded #10B981 instead of a
//     token — logo marks conventionally stay pixel-identical across
//     every context, unlike ordinary UI elements.
//   Why inline, not a file — an SVG loaded via next/image or an
//     <img> tag is opaque to CSS; Tailwind classes can't reach its
//     internal <path> elements. Inlining the SVG directly in JSX
//     makes those paths real DOM nodes your classes can style.

interface SiteLogoProps {
  className?: string;
}

export function SiteLogo({ className = "h-10 w-10" }: SiteLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      // Decorative — the adjacent "CITIA-IS" text already carries
      // the accessible name, so screen readers should skip this.
      aria-hidden="true"
    >
      {/* Magnifying glass rim & handle — community inspection.
          Deep Forest in light mode, white in dark mode. */}
      <path
        d="M32 10C21 10 12 19 12 30C12 36.2 14.8 41.7 19.3 45.4L8 56.7C7.1 57.6 7.1 59 8 59.9C8.9 60.8 10.3 60.8 11.2 59.9L22.5 48.6C25.2 50.1 28.5 51 32 51C43 51 52 42 52 30C52 18 43 10 32 10ZM32 46C23.2 46 16 38.8 16 30C16 21.2 23.2 14 32 14C40.8 14 48 21.2 48 30C48 38.8 40.8 46 32 46Z"
        className="fill-foreground transition-colors duration-200"
      />

      {/* Tree trunk — same adaptive color as the rim */}
      <path
        d="M31 38V44H33V38C33 38 36 36 36 33H28C28 36 31 38 31 38Z"
        className="fill-foreground transition-colors duration-200"
      />

      {/* Leaves — fixed brand green, stays vivid in both modes */}
      <path d="M32 16C26 21 26 27 32 30C38 27 38 21 32 16Z" fill="#10B981" />
      <path d="M24 22C20 26 21 31 26 33C29 29 27 24 24 22Z" fill="#10B981" />
      <path d="M40 22C44 26 43 31 38 33C35 29 37 24 40 22Z" fill="#10B981" />

      {/* GIS location pin — fixed brand green */}
      <path
        d="M44 38C40.7 38 38 40.7 38 44C38 48.5 44 54 44 54C44 54 50 48.5 50 44C50 40.7 47.3 38 44 38ZM44 46C42.9 46 42 45.1 42 44C42 42.9 42.9 42 44 42C45.1 42 46 42.9 46 44C46 45.1 45.1 46 44 46Z"
        fill="#10B981"
      />
    </svg>
  );
}
