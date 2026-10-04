import type { Metadata, Viewport } from "next";
import { Figtree, Inter, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import { SectionNav } from "@/components/nav/SectionNav";
import { SiteFooter } from "@/components/nav/SiteFooter";
import { SitePrompts } from "@/components/features/SitePrompts";
import { COVERED_COUNTIES } from "@/lib/counties";
import "./globals.css";

const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

/* The shared-link description, rewritten 2026-10-04 (launch handoff §1,
   trust copy). It used to promise "what they've done, and what's been
   verified": records and fact-checks that no published brief carries —
   every published profile has verifiable_fact_count = 0 and
   fact_checks_performed = 0. What ships is stated positions, quoted verbatim
   from each candidate's own site with a link to the source, on shared issues
   fixed by office (/methodology). "Equal space" went too: the Balance Audit's
   word_count gate runs at 150, so space is deliberately not equalized.

   "See everyone you can vote for" went too: it reads as a complete ballot,
   and what ships is the statewide races and amendments plus the U.S. House,
   county commission, school board, Orange mayor and Orange clerk races in
   the four covered counties — no Florida House or Senate, no judges, no city
   races (/methodology, "What we don't cover"). So the description names the
   area instead, with the county names read from COVERED_COUNTIES.

   RECOMMENDED wording (pending founder confirmation). To change it, edit
   SITE_TITLE, SITE_DESCRIPTION and SHARE_DESCRIPTION; nothing else reads
   them. docs/voice-and-tone.md's "canonical lines" still carry the old
   promise and need the same change. */
const COVERED_COUNTY_LIST = new Intl.ListFormat("en-US", {
  style: "long",
  type: "conjunction",
}).format(COVERED_COUNTIES.map((c) => c.name));
const SITE_DESCRIPTION = `See what Florida candidates say, quoted word for word from their own campaign sites, with a link to every source. Statewide races and amendments, plus U.S. House, county commission and school board races in ${COVERED_COUNTY_LIST} counties. No ZIP needed.`;
const SHARE_DESCRIPTION =
  "See what Florida candidates say, in their own words, with a link to every source. No ZIP needed.";

/* The default page title and the share-card headline, which is the landing
   page's: the shared link is the landing page. It used to read
   "Know Your Vote — everything on every Florida ballot", which overclaims
   for the reasons above: most Floridians' ballots carry races this site
   doesn't cover.

   RECOMMENDED (pending founder confirmation). TO FLIP BACK: set this to
   "Know Your Vote — everything on every Florida ballot". The landing page's
   h1 ("Everything on every Florida ballot." in src/app/(public)/page.tsx)
   makes the same claim and should change with it, to keep the two in sync. */
const SITE_TITLE = "Know Your Vote — Florida candidates, in their own words";

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
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://knowyour.vote"
  ),
  /* Every public page sets its own title, so `default` is in practice the
     landing page's — and since TASK-067 that page no longer claims to show
     "your ballot" without a ZIP. The shared link is the landing page, so the
     title and the OG card have to make the same honest claim it does
     (SITE_TITLE, above). */
  title: {
    default: SITE_TITLE,
    template: "%s",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SHARE_DESCRIPTION,
    type: "website",
    siteName: "Know Your Vote",
    images: [
      {
        url: "/brand/site/og-card.png",
        width: 1200,
        height: 630,
        alt: "Know Your Vote: see who's on your local ballot.",
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
    apple: [
      {
        url: "/brand/mobile/app-icon-ios-180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
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
      <body className="flex min-h-full flex-col pt-[calc(40px+env(safe-area-inset-top))] pb-[calc(88px+env(safe-area-inset-bottom))] md:pt-[72px] md:pb-0">
        {plausibleDomain && (
          <Script
            src="https://plausible.io/js/script.js"
            data-domain={plausibleDomain}
            strategy="afterInteractive"
          />
        )}
        <SectionNav />
        <SitePrompts />
        {children}
        {/* After the page, inside the body padding above, so the fixed
            mobile nav never covers it. */}
        <SiteFooter />
      </body>
    </html>
  );
}
