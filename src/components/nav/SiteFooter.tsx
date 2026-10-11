"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LedgeArt } from "@/components/brand/Ledge";

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
      {/* The footer strip (design.md "Site illustration layer"): a full-bleed
          band of town art directly above the border, on every public page and
          at every width (one of the three pieces allowed on a phone). A CSS
          background, not an <img>, so it can crop: cover, anchored at the
          bottom so the ground line meets the border, never tiled. The -sm
          file is 1200x163 (about 7.4:1); the band's height follows the window
          width at that ratio (13.5vw, 56px to 200px), so the whole street
          shows instead of a crop of legs on a wide screen. From xl it uses
          the full 2400px file, which stays sharp at that size. The height
          comes from the width alone, so nothing shifts when the image
          arrives. Decoration only: aria-hidden, nothing to click. */}
      <div
        aria-hidden="true"
        className="pointer-events-none h-[clamp(56px,13.5vw,200px)] w-full select-none bg-[url(/brand/site/illustrations/footer-thin-strip-sm.webp)] bg-cover bg-bottom bg-no-repeat xl:bg-[url(/brand/site/illustrations/footer-thin-strip.webp)]"
      />
      <div className="border-t border-border">
        {/* relative: the lying figure below measures its ledge from this
            box's top edge, just under the border. */}
        <div className="relative mx-auto flex w-full max-w-[1120px] flex-col gap-2 px-5 py-5 md:flex-row md:items-center md:justify-between md:gap-6">
          {/* lie-footer lies on the footer's top edge at the right end of the
              content width (its recorded ledge is 1.006 of its height, so the
              figure's bottom rests on the border). It sits entirely above the
              edge, over the strip, so it never covers the disclaimer or the
              links below. 110px tall is about 283px wide. lg and up only. */}
          <LedgeArt
            name="lie-footer"
            height={110}
            edge="top"
            className="right-5 hidden lg:block"
          />
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
