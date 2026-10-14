/* Guardrails for the ballot rows' readability pass (home readability spec
   2026-10-12, PR B, founder decision 2a): SharedBallot, BallotQuestions,
   JudicialRetentionNote and the LinkRows shell they share with "Your races"
   and County races. PR B ships as one unit, so its rules are pinned
   together: half of it would leave the races and the amendments styled
   differently.

   1. Candidates: one name per line on phones and inline from sm, every name
      in the order the read gives (ballot order, verify-ballot-order), each
      with the same classes and its party as a plain code after it. No
      count, no names joined into one line, nothing cut.
   2. The date is said once when every race shares it, and the party key
      sits behind "What the party codes mean".
   3. Amendments: "Amendment N" is the heading, and the official title is
      quoted under it as stored, with nothing that changes its words or
      its capitals.
   4. Judges: the h3 and the scope sentence stay visible, outside the
      <details>; the court lines and links are inside it, closed for every
      visitor on every page.
   5. Row status is 14px, not a 13px caption.
   6. Disclosures are native <details> with named groups, carets are the
      SVG glyph, and nothing in them animates (founder D2 a: on phones only
      colour changes and loading indicators move).

   The pins that were already here stay where they are: the h2s and "Each
   needs a" / "The Florida Division of Elections" at body-sm in
   verify-entry-flow, the propless <BallotQuestions /> and the note's
   county wiring in verify-judicial-retention, the server-only import graph
   in verify-shared-ballot.

   Source scans only, comments stripped. Run: node scripts/verify-ballot-rows.ts */

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
/* Comments out (a JSX comment leaves an empty {} behind, which goes too),
   whitespace runs to one space, so a pin survives a re-wrap but not a
   change of words or classes. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\s+/g, " ");

const SHARED = "src/components/features/SharedBallot.tsx";
const QUESTIONS = "src/components/features/BallotQuestions.tsx";
const JUDGES = "src/components/features/JudicialRetentionNote.tsx";
const ROWS = "src/components/ui/LinkRows.tsx";

const shared = code(SHARED);
const questions = code(QUESTIONS);
const judges = code(JUDGES);
const rows = code(ROWS);
check(
  "the four files are readable",
  [shared, questions, judges, rows].every((s) => s.length > 0)
);

/* ---- 1. candidates: one per line, ballot order, equal treatment ---------- */
check(
  "the names are not joined into one line",
  !/candidateList|\.join\(", "\)/.test(shared)
);
check(
  "every candidate is listed in the order the read gives: no sort, filter or slice",
  shared.includes("{race.candidates.map((c) => {") &&
    !/candidates\s*\.\s*(?:sort|filter|slice|splice|toSorted|toSpliced)\(/.test(shared)
);
check(
  "one name per line on phones, inline from sm",
  shared.includes(
    '<ul className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1">'
  )
);
check(
  "every name is dark body text with the same fixed classes",
  /<li key=\{c\.candidateId\} className="text-body leading-snug text-on-surface sm:whitespace-nowrap" ?> ?\{c\.name\}/.test(
    shared
  ) && (shared.match(/<li\b/g) ?? []).length === 1
);
check(
  "the party is the plain code from partyLabel, muted 14px, after the name",
  shared.includes("const party = partyLabel(c.party);") &&
    /\{party && \( ?<span className="text-body-sm text-on-surface-muted"> ?\{" "\} ?\(\{party\}\) ?<\/span>/.test(
      shared
    )
);
check(
  "no candidate count in the row",
  !/candidates`|"1 candidate"/.test(shared)
);

/* ---- 2. the date once, the party key behind a disclosure ----------------- */
check(
  "the shared date is the one general date every race has, else none",
  shared.includes("const dates = new Set(races.map((r) => r.generalDate));") &&
    shared.includes(
      "const sharedDate = dates.size === 1 ? formatDate(races[0].generalDate) : null;"
    )
);
check(
  "the intro says the date once, at a reading width",
  shared.includes(
    '<p className="text-body-sm text-on-surface-muted lg:max-w-[65ch]"> On every Florida ballot{sharedDate ? ` on ${sharedDate}` : ""}, whatever your ZIP or party, including no party. </p>'
  )
);
check(
  "a row says its own date only when there is no shared one",
  shared.includes(
    "const general = sharedDate ? null : formatDate(race.generalDate);"
  ) && !/text-caption/.test(shared)
);
{
  const at = shared.indexOf('<details className="group/legend">');
  const end = shared.indexOf("</details>", at);
  const legend = at >= 0 && end > at ? shared.slice(at, end) : "";
  check(
    'the party key sits behind "What the party codes mean"',
    /<summary className="inline-flex min-h-\[24px\] w-fit cursor-pointer list-none items-center gap-1 text-body-sm text-primary underline underline-offset-2 hover:text-primary-hover \[&::-webkit-details-marker\]:hidden"> ?What the party codes mean ?<span className="group-open\/legend:rotate-180"> ?<CaretGlyph \/> ?<\/span> ?<\/summary>/.test(
      legend
    ) && legend.includes("{legend}"),
    legend.slice(0, 200)
  );
}
check(
  "SharedBallot still renders a propless BallotQuestions",
  /<BallotQuestions \/>/.test(shared)
);

/* ---- 3. amendments: the number heads, the title is quoted ---------------- */
check(
  'the row heading is "Amendment N" alone',
  questions.includes("title={`Amendment ${m.number}`}") &&
    !/title=\{[^}]*official_title/.test(questions)
);
check(
  "the official title is quoted under it as stored, 15px dark",
  questions.includes(
    '<p className="text-[0.9375rem] leading-[1.5] text-on-surface"> {m.official_title} </p>'
  ) && (questions.match(/official_title/g) ?? []).length === 1
);
check(
  "nothing changes the title's words or capitals",
  !/\b(?:uppercase|lowercase|capitalize|normal-case|truncate|line-clamp-\d+)\b/.test(questions) &&
    !/to(?:Locale)?(?:Lower|Upper)Case\(/.test(questions)
);
check(
  "the title comes before the threshold line",
  questions.indexOf("{m.official_title}") > -1 &&
    questions.indexOf("{m.official_title}") < questions.indexOf("% to pass")
);
check(
  "the questions' intro is the supermajority sentence alone, at a reading width",
  questions.includes(
    '<p className="text-body-sm text-on-surface-muted lg:max-w-[65ch]"> Each needs a supermajority to pass, not a simple majority. </p>'
  )
);

/* ---- 4. judges: heading and scope visible, links behind a disclosure ----- */
{
  const open = judges.indexOf('<details className="group/judges">');
  const close = judges.indexOf("</details>", open);
  const h3 = judges.indexOf('<h3 className="text-label">Judges on your ballot</h3>');
  const scope = judges.indexOf(
    '<p className="text-body-sm text-on-surface"> Your ballot also asks whether to keep some judges in office. Know Your Vote doesn&rsquo;t cover these questions. </p>'
  );
  check("the note has one disclosure", open > -1 && close > open && judges.split("<details").length === 2);
  check("the h3 is outside the disclosure, so it stays in the headings list", h3 > -1 && h3 < open);
  check("the scope sentence is visible, in dark text, above the disclosure", scope > h3 && scope < open);
  check(
    'the disclosure reads "Who is on the ballot, with links", 32px tall',
    /<summary className="inline-flex min-h-\[32px\] w-fit cursor-pointer list-none items-center gap-1 text-body-sm font-semibold text-primary underline underline-offset-2 hover:text-primary-hover \[&::-webkit-details-marker\]:hidden"> ?Who is on the ballot, with links ?<span className="group-open\/judges:rotate-180"> ?<CaretGlyph \/> ?<\/span> ?<\/summary>/.test(
      judges
    )
  );
  const ul = judges.indexOf("<ul ");
  const doe = judges.indexOf("The Florida Division of Elections");
  check(
    "the court lines and the state's list are inside the disclosure",
    ul > open && ul < close && doe > open && doe < close
  );
}
check(
  "closed for every visitor: no open attribute",
  !/<details\b[^>]*\bopen\b/.test(judges) && !/<details\b[^>]*\bopen\b/.test(shared)
);
check(
  "the dropped sentence about where the links go stays dropped",
  !/The links go to the state/.test(judges)
);

/* ---- 5. row status at 14px ---------------------------------------------- */
check(
  "row status is body-sm, not a caption",
  rows.includes('{aside && <p className="text-body-sm text-on-surface-muted">{aside}</p>}') &&
    !/text-caption/.test(rows)
);

/* ---- 6. disclosures: native, named groups, SVG carets, no motion --------- */
for (const [file, src] of [
  [SHARED, shared],
  [QUESTIONS, questions],
  [JUDGES, judges],
  [ROWS, rows],
] as const) {
  check(`${file}: no ↗ ↓ › ▾ ✓ characters (the Inter subsets lack them)`, !/[↗↓›▾✓]/.test(src));
}
for (const [file, src] of [
  [SHARED, shared],
  [JUDGES, judges],
] as const) {
  check(
    `${file}: carets use a named group, so a nested open <details> can't turn them`,
    !/group-open:/.test(src) && /group-open\/\w+:rotate-180/.test(src)
  );
  check(
    `${file}: nothing animates (founder D2 a)`,
    !/\b(?:transition|animate-|duration-)/.test(src)
  );
  check(
    `${file}: imports the SVG caret`,
    src.includes('import { CaretGlyph } from "@/components/ui/Glyphs";')
  );
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nverify-ballot-rows: all checks passed.");
