/* Guardrails for the HIGH and MEDIUM findings of the 2026-10-05 interface review
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
  ["src/app/(public)/races/[raceId]/page.tsx", "This race isn&rsquo;t published"],
  ["src/app/(public)/measures/[measureId]/page.tsx", "This ballot question isn&rsquo;t published"],
] as const) {
  const src = code(file).replace(/\s+/g, " ");
  check(`${file}: says it isn't published, not that it's coming`, src.includes(h1) && !/Check back soon/.test(src));
  check(`${file}: names the out-of-date link`, src.includes("the link may be out of date"));
  check(
    `${file}: the way out goes to /, not "your" races or ballot`,
    !/Back to your (races|ballot)/.test(src) && /href="\/" className="text-label text-primary/.test(src)
  );
}

/* ==== MEDIUM findings of the same review =================================
   (office order and the party legend are pinned in verify-ballot-order and
   verify-party-label, next to the functions they test) */

/* ---- 5. field errors sit on their field ---------------------------------- */
const entryFlat = entry.replace(/\s+/g, " ");
check(
  "the ZIP/address field reports itself invalid and names its error",
  /ref=\{inputRef\} id="location" name="zip" aria-invalid=\{fieldError \|\| undefined\} aria-describedby=\{fieldError \? errorId : undefined\}/.test(entryFlat)
);
check(
  "a field error renders under the field with the described-by id",
  /<p\s+key=\{stage\.seq\}\s+id=\{errorId\}\s+role="alert"\s+className="mt-2 text-body-sm text-error"\s*>/.test(entry)
);
check(
  "a field error is still announced when focus is already in the field (Enter)",
  /<p\s+key=\{stage\.seq\}\s+id=\{errorId\}\s+role="alert"/.test(entry)
);
check(
  "focus moves to the field only when it was lost or on the form's own submit",
  /if \(!active \|\| active === document\.body \|\| active === submitButton\) \{\s*inputRef\.current\?\.focus\(\);/.test(entry)
);
check(
  "server failures aren't field errors",
  (entry.match(/fail\("Something went wrong — give it another try\.", false\)/g) ?? []).length === 2 &&
    /We couldn't look up that address just now\.[^"]*",\s*false\s*\)/.test(entry)
);
const voting = code("src/components/features/VotingInfo.tsx");
check(
  "the consent box reports itself invalid, names its error and takes focus",
  /aria-invalid=\{consentError \|\| undefined\}/.test(voting) &&
    /aria-describedby=\{consentError \? consentErrorId : undefined\}/.test(voting) &&
    /if \(consentError\) consentRef\.current\?\.focus\(\);/.test(voting)
);

/* ---- 6. focus doesn't fall to <body> when its control goes ---------------- */
check(
  "the reminder form's success message takes focus once, on the change",
  /if \(stage\.kind === "sent"\) sentRef\.current\?\.focus\(/.test(voting) &&
    /ref=\{sentRef\}\s*tabIndex=\{-1\}/.test(voting)
);
const chip = code("src/components/features/DistrictChip.tsx");
check(
  "Forget my district hands focus to the Choose your district link",
  /setForgot\(true\);/.test(chip) &&
    /if \(forgot\) setLinkRef\.current\?\.focus\(/.test(chip) &&
    /ref=\{setLinkRef\}/.test(chip)
);
const install = code("src/components/features/InstallCard.tsx");
check(
  "dismissing Get the app leaves a focused stand-in, not <body>",
  /if \(dismissed\) standInRef\.current\?\.focus\(\{ preventScroll: true \}\);/.test(install) &&
    /ref=\{standInRef\}\s*tabIndex=\{-1\}/.test(install)
);
{
  /* An inline callback ref that calls focus() re-runs on every render and
     steals focus back after any later re-render (review 2026-10-05). */
  const stealers = [
    "src/components/features/LocationEntry.tsx",
    "src/components/features/VotingInfo.tsx",
    "src/components/features/DistrictChip.tsx",
    "src/components/features/InstallCard.tsx",
  ].filter((f) => /ref=\{\(\w+\) => \w+\?\.focus\(/.test(code(f)));
  check("no focusing inline callback refs", stealers.length === 0, stealers.join(", "));
}

/* ---- 7. the global focus ring reaches inputs ----------------------------- */
const input = code("src/components/ui/Input.tsx");
check(
  "Input doesn't suppress the outline (forced colors keep the ring)",
  input.length > 0 && !/outline-none|outline-hidden/.test(input)
);

/* ---- 8. main-path links look like links ----------------------------------- */
check(
  "LinkRows titles carry the link colour",
  /text-primary after:absolute after:inset-0/.test(code("src/components/ui/LinkRows.tsx"))
);
{
  const inkOnly = [
    "src/components/features/RaceCompare.tsx",
    "src/components/features/NewsStoryCard.tsx",
    "src/components/features/IssueRows.tsx",
    "src/components/features/CandidateBrief.tsx",
    "src/components/features/CandidateBrowser.tsx",
    "src/components/features/RaceListing.tsx",
    "src/components/features/SavedCandidates.tsx",
  ].filter((f) => /className="(?:underline-offset-2 )?hover:underline"/.test(code(f)));
  check("no link is ink with a hover-only underline", inkOnly.length === 0, inkOnly.join(", "));
}

check(
  "the race roster's party legend shows only for races on the November ballot",
  /const onBallot = branch === "contest" \|\| branch === "single_candidate";\s*const legend = onBallot/.test(
    code("src/components/features/RaceCompare.tsx")
  )
);

/* ---- 9. reading width and size on the measure page ------------------------ */
check(
  "the ballot summary is body size at a reading width",
  /<blockquote className="max-w-\[680px\] border-l-2 border-border-strong pl-4 text-body text-on-surface">/.test(
    code("src/app/(public)/measures/[measureId]/page.tsx")
  )
);

/* ---- 10. must-read rules aren't set as 13px captions ---------------------- */
for (const [file, phrase] of [
  ["src/components/features/BallotQuestions.tsx", "Each needs a"],
  ["src/components/features/ClaimList.tsx", "No stated position found&rdquo; means"],
  ["src/components/features/MeasureVoteMeaning.tsx", "Leaving this question blank"],
  ["src/components/features/LocationEntry.tsx", "Full statewide coverage isn&rsquo;t available yet"],
  ["src/components/features/JudicialRetentionNote.tsx", "The Florida Division of Elections"],
] as const) {
  const src = code(file);
  const at = src.indexOf(phrase);
  const opener = at > 0 ? src.lastIndexOf("<p ", at) : -1;
  const tag = opener >= 0 ? src.slice(opener, src.indexOf(">", opener) + 1) : "";
  check(`${file}: "${phrase}…" is at least body-sm`, tag.includes("text-body-sm") && !tag.includes("text-caption"), tag);
}

/* ==== LOW findings of the same review ===================================== */

check(
  "the ZIP field is a combobox only when address completion can show a list",
  /const combobox = addressEnabled\s*\?/.test(entry) && !/^\s*role="combobox"/m.test(entry)
);
check(
  "the ZIP field's label is visible, with an example as the placeholder",
  /<label htmlFor="location" className="text-label text-on-surface">/.test(entry) &&
    /placeholder=\{placeholder \?\? field\.example\}/.test(entry)
);
{
  const verbs = [
    "src/components/features/LocationEntry.tsx",
    "src/components/features/DistrictChip.tsx",
    "src/app/(public)/privacy/page.tsx",
  ].filter((f) => /\bpick your district|Pick your district|Set your district/.test(code(f)));
  check("one verb for the district: choose", verbs.length === 0, verbs.join(", "));
}
{
  const glyphs = [
    "src/components/ui/SaveToggle.tsx",
    "src/components/features/IssueFilter.tsx",
    "src/components/features/DistrictChip.tsx",
  ].filter((f) => /[✓▾]/.test(code(f)));
  check("state icons are SVG, not ✓/▾ font fallbacks", glyphs.length === 0, glyphs.join(", "));
}
const css = read("src/app/globals.css");
check(
  "motion uses design.md's 120ms standard curve",
  /--default-transition-duration: 120ms;/.test(css) &&
    /--default-transition-timing-function: cubic-bezier\(0\.2, 0, 0, 1\);/.test(css)
);
check("a tap shows a tint (tap highlight)", /-webkit-tap-highlight-color: color-mix\(/.test(css));
check("headings wrap balanced", /h4 \{\s*font-family: var\(--font-heading\);\s*text-wrap: balance;/.test(css));
check(
  "buttons press on tap, not under reduced motion",
  /active:not-disabled:scale-\[0\.97\] motion-reduce:active:not-disabled:scale-100/.test(code("src/components/ui/Button.tsx"))
);
{
  const nav = code("src/components/nav/SectionNav.tsx");
  check(
    "nav icons draw at their own 20px grid; Donate and the chip share a 1px edge",
    /className="size-\[20px\]">\{item\.icon\}/.test(nav) && /rounded-full border border-primary bg-primary/.test(nav)
  );
}
check(
  "cookie banner: Accept is the filled primary, Decline the outlined secondary (founder 2026-10-06)",
  /<Button className="px-4 py-2" onClick=\{\(\) => onDecide\("granted"\)\}>\s*Accept\s*<\/Button>/.test(
    code("src/components/features/SitePrompts.tsx")
  ) &&
    /<Button\s+variant="secondary"\s+className="px-4 py-2"\s+onClick=\{\(\) => onDecide\("denied"\)\}\s*>\s*Decline/.test(
      code("src/components/features/SitePrompts.tsx")
    )
);
{
  const lost = code("src/app/not-found.tsx") + code("src/app/error.tsx");
  check(
    "the 404 and error pages don't promise 'your ballot'",
    !/your ballot|See my ballot/.test(lost) && /See the races we cover/.test(code("src/app/not-found.tsx")) && /See the races we cover/.test(code("src/app/error.tsx"))
  );
}
check(
  "the share image's alt says what the card says",
  /alt: "Know Your Vote\. See who's on your Florida ballot\."/.test(read("src/app/layout.tsx"))
);
check(
  "cards in one grid share one radius",
  !/rounded-md border border-border bg-surface p-4/.test(code("src/components/features/RaceCompare.tsx")) &&
    !/rounded-md border border-border p-4/.test(code("src/components/features/IssueRows.tsx"))
);
for (const f of ["src/components/features/MeasureResourceRow.tsx", "src/components/features/NewsStoryCard.tsx"]) {
  const src = code(f);
  check(
    `${f}: meta separators come from one rule, not hand-placed dots`,
    src.includes("[&>*+*]:before:content-['·']") && !/>\s*·\s*\{/.test(src) && !/dateSeparator/.test(src)
  );
}
check(
  "the race skeleton's bars are one line of the text they stand in for",
  /h-\[1lh\] w-72 [^"]*text-h1/.test(code("src/app/(public)/races/[raceId]/loading.tsx"))
);
for (const [f, h] of [
  ["src/components/features/SharedBallot.tsx", "Statewide races"],
  ["src/components/features/BallotQuestions.tsx", "Ballot questions"],
] as const) {
  check(`${f}: the section heading is a size above its rows`, new RegExp(`<h2 className="text-h2">${h}</h2>`).test(code(f)));
}
{
  /* Typographic apostrophes in public copy. */
  const straight = [
    "src/app/(public)/page.tsx",
    "src/components/features/SharedBallot.tsx",
    "src/components/features/RaceCompare.tsx",
    "src/components/features/LocationEntry.tsx",
    "src/components/features/ClaimList.tsx",
    "src/app/not-found.tsx",
  ].filter((f) => read(f).includes("&apos;"));
  check("public copy uses ’, not &apos;", straight.length === 0, straight.join(", "));
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nverify-entry-flow: all checks passed.");
