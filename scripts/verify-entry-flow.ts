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
  "Forget my district hands focus to the Set your district link",
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
  ["src/components/features/LocationEntry.tsx", "Full statewide coverage isn&apos;t available yet"],
  ["src/components/features/JudicialRetentionNote.tsx", "The Florida Division of Elections"],
] as const) {
  const src = code(file);
  const at = src.indexOf(phrase);
  const opener = at > 0 ? src.lastIndexOf("<p ", at) : -1;
  const tag = opener >= 0 ? src.slice(opener, src.indexOf(">", opener) + 1) : "";
  check(`${file}: "${phrase}…" is at least body-sm`, tag.includes("text-body-sm") && !tag.includes("text-caption"), tag);
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nverify-entry-flow: all checks passed.");
