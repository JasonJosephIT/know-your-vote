/* The two privacy pages, /privacy and /privacy/how-it-works (2026-10-13).

   /privacy states each point in a sentence or two and ends it with a "How
   this works" link to a section of /privacy/how-it-works, which holds the
   detail. That split is only worth having if the links land and the two
   pages describe the same site, so this pins:

   1. LINKS. Every "How this works" on /privacy goes through one component
      whose href is /privacy/how-it-works#<topic>, every topic is an id on
      the explanation page, each /privacy section ends with exactly one, and
      a link is never rendered in a configuration where its section isn't
      (cookie-choice exists only while the ad tag is on, so its link must be
      guarded by the same switch). The explanation page links back.
   2. ONE READING OF THE DEPLOYMENT. Both pages take the address, geocoder,
      analytics, ads and error-report switches from privacyDeployment()
      (privacy/deployment.ts) and read no environment of their own, and each
      switch is read from the variable that actually starts the thing it
      describes. A page that read its own copy could describe a different
      site than the one it sits on.
   3. SHORT STAYS SHORT. /privacy carries no device keys or cookie values;
      that detail lives on the explanation page.
   4. LOGS. The request-logs section says the two things that are true once
      the address lookup keeps addresses out of URLs and reads the district
      tables from our own server, scoped so the reminder signup's stored ZIP
      doesn't contradict it, and neither page says anything about email
      addresses in logs (that waits on a database migration).
   5. SMALL FACTS that have a source of truth elsewhere: the cookie's 180
      days, the action that stays on /privacy (ResetAdsConsent), and the
      sitemap and footer entries.

   The claims themselves (cookie value, device keys, Census and Pelias
   paths, unsubscribe wording) are pinned by verify-no-stored-location.ts and
   verify-unsubscribe.ts on whichever page now makes them.

   Source checks, offline: the pages import next/link and server-only
   modules, so they are read, not rendered.

   Run: node scripts/verify-privacy-pages.ts */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { DISTRICT_COOKIE_MAX_AGE } from "../src/lib/district-cookie.ts";

const ROOT = resolve(import.meta.dirname, "..");
const source = (file: string) => readFileSync(join(ROOT, file), "utf8");
/* Comments out, including the empty braces a JSX comment leaves behind, so
   a note quoting old copy can't pass or fail a check. */
const code = (file: string) =>
  source(file)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/[^\n]*/g, "$1")
    .replace(/\{\s*\}/g, "");
/* One line, with the apostrophe and dash a voter sees. */
const rendered = (text: string) =>
  text
    .replace(/&apos;|&rsquo;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ldquo;|&rdquo;|&quot;/g, '"')
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

const PRIVACY = "src/app/(public)/privacy/page.tsx";
const HOW = "src/app/(public)/privacy/how-it-works/page.tsx";
const DEPLOYMENT = "src/app/(public)/privacy/deployment.ts";
const privacy = code(PRIVACY);
const how = code(HOW);
const deployment = code(DEPLOYMENT);

/* The switch guarding the <section> that contains `index`: the X of a
   `{X && (` written directly before the section opens, or null when the
   section always renders. */
function sectionGuard(src: string, index: number): string | null {
  const open = src.lastIndexOf("<section", index);
  if (open < 0) return null;
  const m = src.slice(0, open).trimEnd().match(/\{\s*(!?[\w.]+)\s*&&\s*\($/);
  return m ? m[1] : null;
}

/* ---- 1. Links ------------------------------------------------------------ */

console.log("1. How this works links");
{
  const component = privacy.match(
    /function HowThisWorks\([^)]*\)[\s\S]*?\n\}/
  )?.[0];
  check(
    "/privacy has a HowThisWorks component linking /privacy/how-it-works#<topic>",
    Boolean(component) &&
      /href=\{`\/privacy\/how-it-works#\$\{topic\}`\}/.test(component ?? "") &&
      /How this works/.test(component ?? "")
  );
  const textCount = (privacy.match(/How this works/g) ?? []).length;
  check(
    'every "How this works" on /privacy is that component (the text appears once, inside it)',
    textCount === 1,
    `found ${textCount}`
  );

  const uses = [...privacy.matchAll(/<HowThisWorks\s+topic="([^"]+)"/g)].map(
    (m) => ({ topic: m[1], index: m.index ?? 0 })
  );
  /* A hand-written link to a section counts too. */
  for (const m of privacy.matchAll(/href="\/privacy\/how-it-works#([^"]+)"/g)) {
    uses.push({ topic: m[1], index: m.index ?? 0 });
  }
  check("/privacy links at least eight topics", uses.length >= 8, `found ${uses.length}`);
  const topics = uses.map((u) => u.topic);
  check(
    "no topic is linked twice",
    new Set(topics).size === topics.length,
    topics.join(", ")
  );

  const ids = [...how.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  check(
    "ids on /privacy/how-it-works are unique",
    new Set(ids).size === ids.length,
    ids.join(", ")
  );
  for (const { topic, index } of uses) {
    const at = how.indexOf(`id="${topic}"`);
    check(`#${topic} exists on /privacy/how-it-works`, at >= 0);
    if (at < 0) continue;
    const anchorGuard = sectionGuard(how, at);
    const linkGuard = sectionGuard(privacy, index);
    check(
      `#${topic}: the link renders only where its section does`,
      anchorGuard === null || anchorGuard === linkGuard,
      `section needs {${anchorGuard} && …}, link is under {${linkGuard} && …}`
    );
  }

  /* Each /privacy point ends with its link: every section holds exactly
     one, as its last element. */
  const sections = privacy.split("<section").slice(1).map((s) => s.split("</section>")[0]);
  check("/privacy has a section per point", sections.length >= 8, `found ${sections.length}`);
  sections.forEach((s, i) => {
    const heading = s.match(/<h2[^>]*>([^<]*)</)?.[1]?.trim() ?? `section ${i + 1}`;
    const n = (s.match(/<HowThisWorks\b/g) ?? []).length;
    check(
      `/privacy "${rendered(heading)}" ends with one How this works link`,
      n === 1 && /<HowThisWorks[^>]*\/>\s*$/.test(s),
      `found ${n}`
    );
  });

  check(
    "/privacy/how-it-works links back to /privacy",
    /href="\/privacy"/.test(how)
  );
  check(
    "/privacy/how-it-works has its own title",
    /export const metadata = \{ title: "[^"]+ — Know Your Vote" \}/.test(how)
  );
}

/* ---- 2. One reading of the deployment ------------------------------------ */

console.log("\n2. Deployment switches");
{
  for (const [label, re] of [
    ["addressEntryEnabled()", /\baddressEntryEnabled\(\)/],
    ["geocoderHost()", /\bgeocoderHost\(\)/],
    ["NEXT_PUBLIC_PLAUSIBLE_DOMAIN", /process\.env\.NEXT_PUBLIC_PLAUSIBLE_DOMAIN\b/],
    ["SENTRY_DSN", /process\.env\.SENTRY_DSN\b/],
    ["NEXT_PUBLIC_SENTRY_DSN", /process\.env\.NEXT_PUBLIC_SENTRY_DSN\b/],
    ["ADS_TAG_ENABLED", /\bADS_TAG_ENABLED\b/],
  ] as const) {
    check(`privacyDeployment reads ${label}`, re.test(deployment));
  }
  /* From the plain module: through SitePrompts ("use client") it would be a
     client reference, always truthy (src/lib/ads.ts). */
  check(
    "ADS_TAG_ENABLED comes from @/lib/ads, not from a client module",
    /import \{ ADS_TAG_ENABLED \} from "@\/lib\/ads";/.test(deployment)
  );
  /* The variables the pages read are the ones that start each thing. */
  check(
    "the root layout loads Plausible from NEXT_PUBLIC_PLAUSIBLE_DOMAIN",
    /process\.env\.NEXT_PUBLIC_PLAUSIBLE_DOMAIN/.test(code("src/app/layout.tsx"))
  );
  check(
    "the Sentry SDKs start from SENTRY_DSN and NEXT_PUBLIC_SENTRY_DSN",
    /process\.env\.SENTRY_DSN/.test(code("src/instrumentation.ts")) &&
      /process\.env\.NEXT_PUBLIC_SENTRY_DSN/.test(code("src/instrumentation-client.ts"))
  );

  for (const [page, src] of [
    ["/privacy", privacy],
    ["/privacy/how-it-works", how],
  ] as const) {
    check(
      `${page} takes the switches from privacyDeployment()`,
      /from "\.{1,2}\/deployment"/.test(src) && /privacyDeployment\(\)/.test(src)
    );
    check(
      `${page} reads no environment or switch of its own`,
      !/process\.env|addressEntryEnabled|geocoderHost|ADS_TAG_ENABLED/.test(src)
    );
    for (const name of ["addressOn", "geocoder", "analyticsOn", "adsOn", "errorReportsOn"]) {
      check(
        `${page} branches on ${name}`,
        new RegExp(`\\{!?${name}\\s*(?:\\?|&&)|\\)\\s*:\\s*${name}\\s*\\?`).test(src)
      );
    }
  }
}

/* ---- 3. Short stays short ------------------------------------------------- */

console.log("\n3. /privacy is the short page");
check(
  "/privacy names no device key or cookie value (that detail is on how-it-works)",
  !/kyv\.|FL-27\|12086|<code>/.test(privacy)
);
check(
  "/privacy keeps the cookie-choice action",
  /<ResetAdsConsent \/>/.test(privacy) &&
    /import \{ ResetAdsConsent \} from "@\/components\/features\/SitePrompts";/.test(privacy)
);
check(
  "/privacy still names the ad provider and what it receives (the banner's Details link lands here)",
  /our ad provider \(Google\) receives the page you're on and your IP address/.test(
    rendered(privacy)
  )
);

/* ---- 4. Logs -------------------------------------------------------------- */

console.log("\n4. Request logs");
{
  const at = how.indexOf('id="request-logs"');
  check("/privacy/how-it-works has a request-logs section", at >= 0);
  const section = rendered(how.slice(at, how.indexOf("</section>", at)));
  check(
    "it says an address never goes in a web address, so request logs don't record it",
    section.includes(
      "Your address is never put in a web address on this site, so our hosting provider's request logs don't record it."
    )
  );
  /* Scoped to finding the district: the reminder signup does store a ZIP
     with the database provider, so an unscoped "your ZIP is never sent"
     would be false. */
  check(
    "it says finding a district never sends the ZIP, address or block to the database provider",
    section.includes(
      "We look up your district from a copy of the district tables held on our own server, so finding your district never sends your ZIP, your address or your census block to our database provider."
    )
  );
  check(
    "the request-logs section says those two things and nothing more",
    (section.match(/<p\b/g) ?? []).length === 2,
    section
  );
  /* Email addresses and logs wait on a database migration: no sentence on
     either page may put the two together. */
  for (const [page, src] of [
    ["/privacy", privacy],
    ["/privacy/how-it-works", how],
  ] as const) {
    const text = rendered(src.replace(/<[^>]*>/g, " "));
    const bad = text
      .split(/(?<=[.!?:;])\s/)
      .filter((s) => /\blog(?:s|ged|ging)?\b/i.test(s) && /e-?mail/i.test(s));
    check(`${page} says nothing about email addresses in logs`, bad.length === 0, bad.join(" | "));
  }
}

/* ---- 5. Small facts ------------------------------------------------------- */

console.log("\n5. Facts with a source elsewhere");
check(
  "the cookie's lifetime on how-it-works matches DISTRICT_COOKIE_MAX_AGE",
  rendered(how).includes(`expires ${DISTRICT_COOKIE_MAX_AGE / 86_400} days after you set it`),
  `DISTRICT_COOKIE_MAX_AGE is ${DISTRICT_COOKIE_MAX_AGE / 86_400} days`
);
check(
  "kyv.ads-consent is listed only while the ad tag is on (nothing writes it otherwise)",
  /\{adsOn && \(\s*<li>\s*<code>kyv\.ads-consent<\/code>/.test(how)
);
check(
  "the sitemap lists /privacy/how-it-works",
  /\$\{BASE\}\/privacy\/how-it-works`/.test(code("src/app/sitemap.ts"))
);
check(
  "the footer links /privacy/how-it-works",
  /href: "\/privacy\/how-it-works"/.test(code("src/components/nav/SiteFooter.tsx"))
);
/* Facts main added while these pages were being written (merged
   2026-10-14): the footer's "Report a mistake" mailto (#184) and the
   "Sample ballot and how to vote" links out (#190). Each is said where a
   voter looks for it, in the words of the code that makes it true. */
{
  const footer = code("src/components/nav/SiteFooter.tsx");
  const at = how.indexOf('id="contact"');
  const contact = rendered(at >= 0 ? how.slice(at, how.indexOf("</section>", at)) : "");
  check(
    "how-it-works says what writing to us hands over, and Report a mistake's fixed subject matches the footer",
    /\?subject=Correction`/.test(footer) &&
      contact.includes('"Report a mistake"') &&
      contact.includes('"Correction"') &&
      contact.includes("{CONTACT_EMAIL}") &&
      /doesn't sign you up for anything/.test(contact)
  );
  check(
    "/privacy has a Writing to us point that names Report a mistake",
    /<h2 className="text-h2">Writing to us<\/h2>/.test(privacy) &&
      rendered(privacy).includes('"Report a mistake"')
  );
  const os = how.indexOf('id="official-sites"');
  const sites = rendered(os >= 0 ? how.slice(os, how.indexOf("</section>", os)) : "");
  check(
    "how-it-works says the official sample-ballot links go out and we never see what is entered there, as their rows do",
    /We never see what you enter there/.test(sites) &&
      /We never see what you enter there/.test(code("src/components/features/VotingResources.tsx")) &&
      !/<iframe/.test(code("src/components/features/VotingResources.tsx"))
  );
}

if (failures) {
  console.error(`\n${failures} privacy-page check(s) failed`);
  process.exit(1);
}
console.log("\nAll privacy-page checks passed.");
