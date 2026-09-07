import type { Metadata, Viewport } from "next";
import { Figtree, Inter, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import { SectionNav } from "@/components/nav/SectionNav";
import "./globals.css";

const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://know-your-vote-chazak.vercel.app"
  ),
  /* Every public page sets its own title, so `default` is in practice the
     landing page's — and since TASK-067 that page no longer claims to show
     "your ballot" without a ZIP. The shared link is the landing page, so the
     title and the OG card have to make the same honest claim it does. */
  title: {
    default: "Know Your Vote — everything on every Florida ballot",
    template: "%s",
  },
  description:
    "See everyone you can vote for — what they say, what they've done, and what's been verified. Equal space, equal scrutiny, every claim linked to a source. No ZIP needed.",
  openGraph: {
    title: "Know Your Vote — everything on every Florida ballot",
    description:
      "See everyone you can vote for — what they say, what they've done, and what's been verified. No ZIP needed.",
    type: "website",
    siteName: "Know Your Vote",
    images: [
      {
        url: "/brand/site/og-card.png",
        width: 1200,
        height: 630,
        alt: "Know Your Vote see who's on your local ballot.",
      },
    ],
  },
  // Branded icons (Site + Mobile surfaces). SVG favicon preferred by modern browsers;
  // .ico fallback; apple-touch uses the iOS app icon (Reversed colorway).
  icons: {
    icon: [
      { url: "/brand/site/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/site/favicon.ico", sizes: "any" },
      { url: "/brand/site/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/site/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/brand/mobile/app-icon-ios-180.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Know Your Vote",
    statusBarStyle: "default",
  },
};

// theme_color for the browser UI / PWA chrome — KYV Green (design.md `primary`).
// viewportFit: cover — PWA shell edge-to-edge on notched devices (notifications Phase A).
export const viewport: Viewport = {
  themeColor: "#2F6B4F",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${inter.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      {/* Bottom padding clears the fixed nav plus the home-indicator inset in
          standalone PWA mode; top inset keeps content out of the status bar. */}
      <body className="flex min-h-full flex-col pt-[env(safe-area-inset-top)] pb-[calc(88px+env(safe-area-inset-bottom))] md:pt-[72px] md:pb-0">
        {plausibleDomain && (
          <Script
            src="https://plausible.io/js/script.js"
            data-domain={plausibleDomain}
            strategy="afterInteractive"
          />
        )}
        <SectionNav />
        {children}
      </body>
    </html>
  );
}
