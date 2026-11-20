import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// Archivo is the one typeface of the site. Next.js downloads it when
// the site is built and serves it from our own address, so a visitor's
// browser never contacts Google. The "wdth" axis lets headlines be set
// narrow (see .display-title in globals.css). The font is exposed to
// the stylesheet as the CSS variable --font-archivo.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  style: ["normal", "italic"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CITIA-IS | Invasive Tree Identification & Action System",
  description:
    "Identify invasive trees, report sightings, and support CENRO's environmental management efforts in Iligan City.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
