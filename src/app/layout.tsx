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
  title: {
    default: "Know Your Vote, Know Your Ballot, Know Your Options",
    template: "%s",
  },
  description:
    "See everyone on your ballot, what they say, what they've done, and all facts no cap. Every claim linked to a source.",
  openGraph: {
    title: "Know Your Vote — Your Ballot, Your Options",
    description:
      "See everyone on your ballot what they say, what they've done, and all facts no cap.",
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
export const viewport: Viewport = {
  themeColor: "#2F6B4F",
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
      <body className="flex min-h-full flex-col pb-[88px] md:pt-[72px] md:pb-0">
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
