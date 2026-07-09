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
    default: "Know Your Vote — Your ballot, laid out fairly",
    template: "%s",
  },
  description:
    "See everyone on your ballot — what they say, what they've done, and what's been verified. Equal space, equal scrutiny, every claim linked to a source.",
  openGraph: {
    title: "Know Your Vote — Your ballot, laid out fairly",
    description:
      "See everyone on your ballot — what they say, what they've done, and what's been verified.",
    type: "website",
    siteName: "Know Your Vote",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KnowYourVote",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

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
