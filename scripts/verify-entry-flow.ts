/* Guardrails for the four HIGH findings of the 2026-10-05 interface review
   of the voter entry flow (home, race and measure pages).

   1. The district picker saves on submit, never on change (WCAG 3.2.2): a
      collapsed <select> fires change on arrow keys (Windows) and type-ahead,
      so committing on change navigated away on the first keystroke.
   2. Every width has a way to the shared ballot: the section nav lists "/"
      first, because the wordmark is hidden below md.
   3. The race page's "Other issues they raise" intro makes no claim that an
      issue is quoted for one candidate only (13 of FL-GOV's 17 are not).
   4. A race or measure ID that isn't readable doesn't promise it is coming
      ("Check back soon"): RLS can't tell in-review from nonexistent, and the
      way out goes to "/", which every visitor has.

   Source scans only, comments stripped. Run: node scripts/verify-entry-flow.ts */

import { readFileSync } from "node:fs";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
const read = (p: string) => {
  try {
    return readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  } catch {
    return "";
  }
};
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/* ---- 1. district picker -------------------------------------------------- */
const entry = code("src/components/features/LocationEntry.tsx");
const select = entry.slice(entry.indexOf('id="district-picker"'), entry.indexOf("</select>", entry.indexOf('id="district-picker"')));
check("the district picker exists", select.length > 0);
check("the district select has no onChange (WCAG 3.2.2)", select.length > 0 && !/onChange=/.test(select));
check("the district select is required, so an empty submit does nothing", /\brequired\b/.test(select));
check(
  "the picker commits from a form's onSubmit",
  /id="district-picker-form"[\s\S]*?onSubmit=\{\(e\) => \{[\s\S]*?commit\(/.test(entry)
);
check(
  "the picker has its own submit button",
  /<Button type="submit" variant="secondary">\s*See my races\s*<\/Button>\s*<\/form>/.test(entry)
);
check(
  "the 'or choose your district' toggle exposes its state",
  /aria-expanded=\{showPicker\}\s*aria-controls="district-picker-form"/.test(entry)
);
check(
  "the district select uses the shared 16px select recipe",
  /border-border-input bg-surface px-3 py-3 text-body/.test(select)
);

/* ---- 2. a way to the ballot at every width ------------------------------- */
const nav = code("src/components/nav/SectionNav.tsx");
const firstHref = nav.match(/const items = \[\s*\{\s*href: "([^"]+)"/)?.[1];
check('the section nav lists "/" first', firstHref === "/", String(firstHref));
{
  /* The items render through one Link in items.map; its class must not hide
     it at any width (the wordmark's `hidden … md:block` is the failure). */
  const itemLink = nav.match(/items\.map\(\(item\) => \{[\s\S]*?<Link[\s\S]*?className=\{`([^`]*)`\}/)?.[1] ?? "";
  check(
    "the section items, Ballot included, show at every width",
    itemLink.length > 0 && !/(^|\s)hidden(\s|$)/.test(itemLink),
    itemLink
  );
}
check(
  "amendment pages light up the Ballot section",
  /href: "\/",\s*label: "Ballot",\s*alsoMatch: \["\/measures"\]/.test(nav)
);

/* ---- 3. the "Other issues" intro ----------------------------------------- */
const compare = code("src/components/features/RaceCompare.tsx").replace(/\s+/g, " ");
check(
  "the Other issues intro makes no one-candidate-only claim",
  compare.includes("Other issues they raise") && !/quoted for one candidate only|Each is quoted for one/i.test(compare)
);
check(
  "it says the same issue can appear under more than one name",
  /the same issue can appear under more than one name/.test(compare)
);

/* ---- 4. unreadable IDs --------------------------------------------------- */
for (const [file, h1] of [
  ["src/app/(public)/races/[raceId]/page.tsx", "This race isn&apos;t published"],
  ["src/app/(public)/measures/[measureId]/page.tsx", "This ballot question isn&apos;t published"],
] as const) {
  const src = code(file).replace(/\s+/g, " ");
  check(`${file}: says it isn't published, not that it's coming`, src.includes(h1) && !/Check back soon/.test(src));
  check(`${file}: names the out-of-date link`, src.includes("the link may be out of date"));
  check(
    `${file}: the way out goes to /, not "your" races or ballot`,
    !/Back to your (races|ballot)/.test(src) && /href="\/" className="text-label text-primary/.test(src)
  );
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nverify-entry-flow: all checks passed.");
