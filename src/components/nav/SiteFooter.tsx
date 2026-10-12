"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/* The site-wide footer (launch handoff §1). Until now nothing on the site
   said in one place that it is independent and endorses no one; the
   methodology and privacy pages were reachable only from a line on the
   landing page and a few brief footers.

   RECOMMENDED (pending founder confirmation), founder decision 1: the
   disclaimer wording and the Methodology, Privacy and Terms links (About
   came later, with the /about page). To change the wording, edit
   FOOTER_DISCLAIMER; to drop or add a link (for example /terms, if the founder
   decides against a terms page), edit FOOTER_LINKS. Nothing else reads them.

   A client component only for usePathname, for the same reason as
   SectionNav: the operator console (/admin) is a fixed full-screen surface of
   its own, and a footer behind it would still sit in the DOM and the tab
   order. */
const FOOTER_DISCLAIMER =
  "Independent and nonpartisan. Not affiliated with any candidate, party or government agency. No endorsements.";

const FOOTER_LINKS: readonly { href: string; label: string }[] = [
  { href: "/about", label: "About" },
  { href: "/methodology", label: "Methodology" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms of use" },
];

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  /* A <footer> that is a direct child of <body> is the page's contentinfo
     landmark by default, so no role is added. It sits in normal flow, after
     the page: on mobile the body's bottom padding (root layout) already keeps
     everything clear of the fixed section nav, footer included. mt-auto keeps
     it at the bottom on a page shorter than the screen. */
  return (
    <footer className="mt-auto">
      {/* The footer strip (design.md "Site illustration layer"): town art
          directly above the border, on every public page and at every width
          (on design.md's closed list of phone art).

          From sm up: street level of footer-town-strip, never a crop that
          cuts people (review of #164, 2026-10-11). The earlier
          footer-thin-strip was the bottom 32% of a generation, so its top
          edge sliced through the walkers' heads, and cover-cropping it on
          wide screens took more. Here the box shows exactly the bottom
          49.5% of the town strip (2400x1018 -> its bottom 504px, ratio
          2400/504): every head clears the top edge with room to spare, and
          only the roofs, sky and the pelican above the post are left out.
          The crop exists for wide screens: held to the content width
          (1120px, about 235px tall there), not full-bleed, since a
          full-bleed band at this ratio would be over 400px tall.

          Below sm the whole town shows, uncropped (2026-10-11): at phone
          width it is small enough that the full strip cuts no heads and
          stays short, 159px at 375px. max-h-[184px] caps it from about
          434px to sm, where object-bottom crops only sky. Each ratio is
          fixed, so nothing shifts on load.

          An <img>, lazy, so pages that never scroll to the footer don't
          fetch it; the -sm file on phones and narrow windows, the full file
          for sharp edges on wide screens. The <source> pins phones to the
          -sm file: with sizes alone, WebKit picked the 2400w file on 402px+
          @3x iPhones. Browsers without range media queries skip it and use
          the <img> as before. Decoration only: aria-hidden, alt="", nothing
          to click. */}
      <div
        aria-hidden="true"
        className="pointer-events-none mx-auto aspect-[1200/509] max-h-[184px] w-full max-w-[1120px] select-none overflow-hidden sm:aspect-[2400/504] sm:max-h-none"
      >
        <picture className="block h-full w-full">
          <source
            media="(width < 40rem)"
            srcSet="/brand/site/illustrations/footer-town-strip-sm.webp"
            width={1200}
            height={509}
          />
          {/* Plain <img> in a <picture> (the lint rule allows it): a
              pre-sized WebP from public/; next/image's resizing adds nothing
              here. */}
          <img
            src="/brand/site/illustrations/footer-town-strip-sm.webp"
            srcSet="/brand/site/illustrations/footer-town-strip-sm.webp 1200w, /brand/site/illustrations/footer-town-strip.webp 2400w"
            sizes="(min-width: 1120px) 1120px, 100vw"
            alt=""
            width={1200}
            height={509}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-bottom"
          />
        </picture>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-2 px-5 py-5 md:flex-row md:items-center md:justify-between md:gap-6">
          {/* No figure lying on this edge any more (lie-footer, #164): over
              the town strip it lands on the cyclist and the man with the
              cane, and the strip is already a street of people. */}
          <p className="text-caption text-on-surface-muted">
            {FOOTER_DISCLAIMER}
          </p>
          <nav aria-label="About this site">
            <ul className="flex flex-wrap gap-x-4">
              {FOOTER_LINKS.map(({ href, label }) => (
                <li key={href}>
                  {/* py-1 gives each link a target of at least 24px
                      (WCAG 2.2, 2.5.8) at caption size. */}
                  <Link
                    href={href}
                    aria-current={pathname === href ? "page" : undefined}
                    className="inline-block py-1 text-caption text-on-surface-muted underline underline-offset-2 hover:text-on-surface"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
