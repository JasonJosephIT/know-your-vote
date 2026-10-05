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
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-2 px-5 py-5 md:flex-row md:items-center md:justify-between md:gap-6">
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
    </footer>
  );
}
