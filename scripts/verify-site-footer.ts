/* Guardrail for the footer's corrections route (Mobbin catalog 2026-10-12,
   HM7; Top 12 #2).

   From the content freeze (2026-10-18 04:00 UTC) a correction is the only
   way a ballot page can change, and until this the only route to report one
   was the address on /about. The footer is on every public page (the root
   layout renders it), so that is where the route lives. Pinned:

   1. The root layout still renders SiteFooter, so the route is on every
      page.
   2. "Report a mistake" is a plain <a> mailto to CONTACT_EMAIL with the
      fixed subject "Correction", and nothing else in it: no page path, no
      reader data.
   3. "Contact" goes to /about's "Get in touch" section, and that id exists.
   4. One line under the disclaimer names the address for anyone who can't
      use the site with a screen reader or keyboard, read from the constant.
   5. The address is never typed into the footer: src/lib/contact.ts is
      frozen and is the one place it lives.
   6. Every footer word is at least body-sm (14px, design.md's floor), each
      link is a 24px target, and the links stay quiet: muted, nothing filled.

   Source checks read the file with comments stripped, so a comment quoting
   a class or a string cannot pass or fail them. SiteFooter is a client
   component that imports next/link, so it is checked by source, as
   verify-home-coverage.ts does.

   Pure and offline: no DB, no network.

   Run: node scripts/verify-site-footer.ts */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { CONTACT_EMAIL } from "../src/lib/contact.ts";

const ROOT = resolve(import.meta.dirname, "..");
const FOOTER = "src/components/nav/SiteFooter.tsx";
const ABOUT = "src/app/(public)/about/page.tsx";
const LAYOUT = "src/app/layout.tsx";

const source = (file: string) => readFileSync(join(ROOT, file), "utf8");
const stripComments = (src: string) =>
  src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/[^\n]*/g, "$1");
/* Comment-free and on one line, with JSX's {" "} read as the space a
   reader sees, so markup split across lines still matches. */
const rendered = (file: string) =>
  stripComments(source(file))
    .replace(/\{" "\}/g, " ")
    .replace(/\s+/g, " ");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const footer = rendered(FOOTER);

/* ---- 1. On every page ---------------------------------------------------- */

const layout = rendered(LAYOUT);
check(
  "the root layout imports and renders SiteFooter",
  layout.includes('import { SiteFooter } from "@/components/nav/SiteFooter"') &&
    layout.includes("<SiteFooter />")
);
check(
  "the footer hides only on /admin",
  /if \(pathname\.startsWith\("\/admin"\)\) return null;/.test(footer) &&
    (footer.match(/return null/g) ?? []).length === 1
);

/* ---- 2. Report a mistake ------------------------------------------------- */

check(
  "CONTACT_EMAIL is an email address",
  /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(CONTACT_EMAIL),
  CONTACT_EMAIL
);
check(
  "SiteFooter imports CONTACT_EMAIL from src/lib/contact.ts",
  footer.includes('import { CONTACT_EMAIL } from "@/lib/contact";')
);

/* Each FOOTER_LINKS entry as { href, label, external }. Every href is a
   string or a template literal on one line, so a flat match reads them. */
const linksBlock =
  footer.match(/const FOOTER_LINKS[^=]*= \[(.*?)\];/)?.[1] ?? "";
const entries = [
  ...linksBlock.matchAll(
    /\{ href: ("[^"]*"|`[^`]*`), label: "([^"]*)",?(?: external: (true|false),?)? \}/g
  ),
].map((m) => ({ href: m[1], label: m[2], external: m[3] === "true" }));
check(
  "FOOTER_LINKS parses into entries",
  entries.length >= 6,
  JSON.stringify(entries)
);
check(
  "the earlier links stay: About, Methodology, Privacy, Terms of use",
  ["About", "Methodology", "Privacy", "Terms of use"].every((label) =>
    entries.some((e) => e.label === label)
  ),
  entries.map((e) => e.label).join(", ")
);

const report = entries.find((e) => e.label === "Report a mistake");
check(
  "'Report a mistake' mails CONTACT_EMAIL with the fixed subject 'Correction'",
  report?.href === "`mailto:${CONTACT_EMAIL}?subject=Correction`",
  report?.href ?? "no 'Report a mistake' entry"
);
check(
  "'Report a mistake' is external, so it renders as a plain <a>",
  report?.external === true
);
check(
  "external entries render as a plain <a href={href}>, never next/link",
  /\{external \? \( <a href=\{href\} className=\{FOOTER_LINK_CLASS\}>/.test(
    footer
  )
);
check(
  "only the mailto is external; every page link uses next/link",
  entries
    .filter((e) => e.external)
    .every((e) => e.href.startsWith("`mailto:")) &&
    entries.filter((e) => !e.external).every((e) => e.href.startsWith('"/')),
  JSON.stringify(entries)
);

/* Every mailto in the footer is the constant, with at most a fixed subject:
   no ${pathname}, no ${...} beyond CONTACT_EMAIL, nothing the reader typed. */
const mailtos = [...footer.matchAll(/`mailto:([^`]*)`/g)].map((m) => m[1]);
check(
  "every footer mailto is CONTACT_EMAIL with at most a fixed subject",
  mailtos.length >= 2 &&
    mailtos.every((m) =>
      /^\$\{CONTACT_EMAIL\}(\?subject=[A-Za-z0-9%]+)?$/.test(m)
    ),
  mailtos.join(" | ")
);

/* ---- 3. Contact ---------------------------------------------------------- */

const contact = entries.find((e) => e.label === "Contact");
check(
  "'Contact' goes to /about#get-in-touch",
  contact?.href === '"/about#get-in-touch"' && contact.external === false,
  contact?.href ?? "no 'Contact' entry"
);
const about = rendered(ABOUT);
check(
  "/about has the get-in-touch id, on the 'Get in touch' section",
  /<section id="get-in-touch"[^>]*>.*?<h2 className="text-h2">Get in touch<\/h2>/.test(
    about
  )
);
check(
  "/about's 'Get in touch' still mails CONTACT_EMAIL",
  about.includes("href={`mailto:${CONTACT_EMAIL}`}")
);

/* ---- 4. The accessibility line ------------------------------------------- */

check(
  "one line asks screen-reader and keyboard users to email CONTACT_EMAIL",
  /<p className="text-body-sm text-on-surface-muted"> Trouble using this site with a screen reader or keyboard\? Email <a href=\{`mailto:\$\{CONTACT_EMAIL\}`\}[^>]*> \{CONTACT_EMAIL\} <\/a> \. <\/p>/.test(
    footer
  )
);
check(
  "the line sits under the disclaimer",
  footer.indexOf("{FOOTER_DISCLAIMER}") > -1 &&
    footer.indexOf("{FOOTER_DISCLAIMER}") < footer.indexOf("Trouble using")
);

/* ---- 5. The address is never typed --------------------------------------- */

const literalAddresses = footer.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? [];
check(
  "SiteFooter types no email address; it renders CONTACT_EMAIL",
  literalAddresses.length === 0 && !footer.includes(CONTACT_EMAIL),
  literalAddresses.join(", ")
);

/* ---- 6. Readable, reachable, quiet --------------------------------------- */

const tooSmall = [
  ...footer.matchAll(/\btext-(caption|overline|xs)\b|\btext-\[(\d+)px\]/g),
].filter((m) => !m[2] || Number(m[2]) < 14);
check(
  "no footer text below body-sm (14px)",
  tooSmall.length === 0,
  tooSmall.map((m) => m[0]).join(", ")
);
const linkClass =
  footer.match(/const FOOTER_LINK_CLASS = "([^"]*)";/)?.[1] ?? "";
check(
  "footer links are body-sm with a 24px target",
  ["inline-flex", "min-h-[24px]", "items-center", "text-body-sm"].every((c) =>
    linkClass.split(" ").includes(c)
  ),
  linkClass
);
check(
  "both footer paragraphs are body-sm",
  (footer.match(/<p className="text-body-sm text-on-surface-muted">/g) ?? [])
    .length === 2
);
check(
  "the footer stays quiet: muted links, nothing filled or primary",
  linkClass.split(" ").includes("text-on-surface-muted") &&
    !/\b(bg-primary|button-primary|button-secondary|text-primary)\b/.test(
      footer
    ),
  linkClass
);

if (failures) {
  console.error(`\n${failures} site-footer check(s) failed`);
  process.exit(1);
}
console.log("\nAll site-footer checks passed.");
