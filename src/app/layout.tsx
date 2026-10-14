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

/* Not preloaded (a11y and performance audit 2026-10-04, P2). Every page
   preloaded all three fonts, 79 KB and about a quarter of the page weight,
   and Lighthouse counts each preload against LCP. The mono face only sets
   source lines, dates and metadata, which sit below the fold, so it can load
   when first used. Inter and Figtree set the first screen and stay
   preloaded. */
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: "400",
  preload: false,
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
    /* The default share card, inherited by every page that doesn't set its
       own: the wordmark and the landing page's words, with no people
       (og-card-text.png). Race, candidate and measure pages inherit it,
       and a card of illustrated people under "<Office> — Know Your Vote"
       or beside a candidate's link could be read as the race's candidates
       (review of #164, 2026-10-11; brand-assets-roadmap: the share card
       carries no candidate imagery). The walkers card
       (og-card-walkers.png) is the home page's own, set in
       src/app/(public)/page.tsx. og-card-text.png is og-card-walkers.png
       with the walkers and sunburst painted out, so the words, type and
       wordmark are identical. The alt text is the words on the card, word
       for word. The pre-2026-10-11 card (og-card.png, "See who's on your
       Florida ballot") stays retired: it reads as a complete ballot. */
    images: [
      {
        url: "/brand/site/og-card-text.png",
        width: 1200,
        height: 630,
        alt: "Know Your Vote. Florida candidates, in their own words. Every quote linked to its source. No ZIP needed.",
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
      /* Next 16 switches smooth scrolling off for a route change's scroll
         to the top only when this is set. globals.css turns it on for the
         race page's "Jump to" links alone (lg and up, motion-safe). */
      data-scroll-behavior="smooth"
    >
      {/* Bottom padding clears the fixed nav plus the home-indicator inset in
          standalone PWA mode; top inset keeps content out of the status bar.

          It also grows by --kyv-overlay-bottom, the open cookie banner's
          height plus a gap, which ConsentBanner in SitePrompts publishes on
          <html> (a11y audit 2026-10-04, fix 1; WCAG 2.4.11 Focus Not
          Obscured). The root scroll-padding in globals.css makes Tab stop
          above the banner, but only where there is room to scroll: without
          this, the last stops on a page (the footer's links) stay under the
          banner at phone width with the page already scrolled to its end.
          It is unset once the banner is answered, which puts the padding
          back to what it was. It has to be these classes: a base-layer rule
          in globals.css would lose to them.

          The minimum height grows by the same amount, so on a page shorter
          than the window the extra room goes below the footer instead of
          moving it up when the banner appears: a harness measured that move
          as a layout shift of 0.09 at 390px, and 0 with this.
          Recommended (pending founder confirmation), with the scroll padding.
          To flip: drop the var() term from the min-h- and the three pb-
          classes here, from scroll-padding-bottom in globals.css, and the
          effect in ConsentBanner that sets it.

          The phone top padding is the header's height: 45px, measured at
          375px on 2026-10-13 (8px of padding above and below the 28px
          Donate pill and chip, and a 1px border). At 40px the header hid
          the top 5px of the home masthead's dateline strip.

          On a short screen (500px tall or less; founder decision 4 (a),
          2026-10-13) both bars are in the page flow (SectionNav), so the
          top padding goes: below md the header in the flow carries the
          status-bar inset itself. The bottom keeps the home-indicator inset
          and the banner's term, since the banner stays fixed. short: comes
          after md: in the stylesheet, so it wins on a landscape phone. */}
      <body className="flex min-h-[calc(100%+var(--kyv-overlay-bottom,0px))] flex-col pt-[calc(45px+env(safe-area-inset-top))] pb-[calc(88px+env(safe-area-inset-bottom)+var(--kyv-overlay-bottom,0px))] md:pt-[72px] md:pb-[var(--kyv-overlay-bottom,0px)] short:pt-0 short:pb-[calc(env(safe-area-inset-bottom)+var(--kyv-overlay-bottom,0px))]">
        {/* Skip link (a11y audit 2026-10-04, fix 4; WCAG 2.4.1 Bypass
            Blocks). Every page put 4 or 5 nav stops, and 3 more while the
            cookie banner is open, before its content; this is the first Tab
            stop instead. Hidden until focused, then pinned top-left above
            every fixed bar, the cookie banner and the /admin shell (all
            z-50 or lower), so focus on it is never covered. A plain <a>, so
            the browser handles the jump itself. */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-[calc(8px+env(safe-area-inset-top))] focus:left-3 focus:z-60 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-label focus:text-primary focus:underline focus:underline-offset-2 focus:shadow-elevation-2"
        >
          Skip to content
        </a>
        {plausibleDomain && (
          <Script
            src="https://plausible.io/js/script.js"
            data-domain={plausibleDomain}
            strategy="afterInteractive"
          />
        )}
        <SectionNav />
        <SitePrompts />
        {/* The skip link's target. tabIndex={-1} lets the jump move focus
            here, so the next Tab is the first stop in the page; it takes no
            Tab stop of its own, and shows no ring because it is not a
            control. flex-1 and flex-col keep each page's main.flex-1
            filling the height, as it did as a direct child of <body>. */}
        <div
          id="content"
          tabIndex={-1}
          className="flex flex-1 flex-col focus:outline-none"
        >
          {children}
        </div>
        {/* After the page, inside the body padding above, so the fixed
            mobile nav never covers it. */}
        <SiteFooter />
      </body>
    </html>
  );
}
