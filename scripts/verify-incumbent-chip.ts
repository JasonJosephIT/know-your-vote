/* The incumbency line (spec
   docs/superpowers/specs/2026-10-08-roster-completeness-design.md §3.5,
   §3.11 and §6; D1 to D3, Recommended pending founder confirmation).

   Every card in a race shows "<label>: Yes" or "<label>: No", or none does,
   and nothing shows while SHOW_INCUMBENT_CHIP is false. It replaced an
   "Incumbent" chip that only an incumbent got. What would quietly undo it is
   a second reader: a new card, an Open seat label, a sort or a meta
   description that reads the column straight from the row, or a line shown
   only when true. So this checks:

   0. SHOW_INCUMBENT_CHIP is true since the flip PR (spec §3.11, 2026-10-09),
      which changed this one expectation together with the constant.
   1. The label table maps each of the 53 production race ids (fixture, from
      SELECT race_id FROM race on 2026-10-08) to its label, an unknown id to
      none, and agrees with the worksheet's copy (scripts/roster-worksheet.ts).
   2. incumbencyFor: with the flag false, null for every race; with it true
      (a copy of the module with only the constant changed), null when any
      candidate lacks incumbency_verified_at, when the race has no label or no
      candidates, and the full map otherwise. Yes and No come from one
      template.
   3. IncumbencyLine prints incumbencyLine's text in one fixed element.
   4. The three cards (CandidateBrief, ListedCandidateCard in RaceListing,
      the RaceCompare roster card) each render <IncumbencyLine> once, never
      behind a condition, from the race-level value; only the two pages call
      incumbencyFor.
   5. Nothing else in src/ reads is_incumbent, incumbent_id, is_open_seat or
      the incumbency columns, or prints the word "incumbent", outside
      incumbency.ts and the row types. Comments are stripped first, so a
      comment explaining the gate is not read as a use of the column.
   6. Each guard above catches the change it exists for (mutations).

   Run: node scripts/verify-incumbent-chip.ts */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  SHOW_INCUMBENT_CHIP,
  incumbencyFor,
  incumbencyLabel,
  incumbencyLine,
  type IncumbencyRow,
} from "../src/lib/incumbency.ts";
import { labelFor } from "./roster-worksheet.ts";
import { ROOT, checker, edit, importVariant, read, sourceFiles, stripComments } from "./source-checks.ts";

const { check, mutation, done } = checker("incumbent-chip");
type Module = typeof import("../src/lib/incumbency.ts");
const MODULE = "src/lib/incumbency.ts";
const FLAG = /export const SHOW_INCUMBENT_CHIP: boolean = (?:true|false);/;
const flagOn = (edits: ReadonlyArray<readonly [string | RegExp, string]> = []) =>
  importVariant<Module>(MODULE, [[FLAG, "export const SHOW_INCUMBENT_CHIP: boolean = true;"], ...edits]);

/* 0. The flag. */
const EXPECTED_FLAG = true;
console.log(`SHOW_INCUMBENT_CHIP is ${SHOW_INCUMBENT_CHIP}`);
check(
  `SHOW_INCUMBENT_CHIP is ${EXPECTED_FLAG} (spec §3.11: only the flip PR changes it, with this line)`,
  SHOW_INCUMBENT_CHIP === EXPECTED_FLAG,
);

/* 1. The label table. */
const LABELS = JSON.parse(
  readFileSync(join(ROOT, "scripts/fixtures/roster/race-labels-2026-10-08.json"), "utf8"),
) as Record<string, string>;
const ROSTER = JSON.parse(
  readFileSync(join(ROOT, "scripts/fixtures/roster/ballot-roster-2026-10-08.json"), "utf8"),
) as Array<{ race_id: string }>;
const UNKNOWN = ["FL-PBC-CC1-general", "FL-LTG-general", "FL-GOV-primary", "FL-ORA-SHERIFF-general", "FL-SEN", ""];

function labelProblems(label: Module["incumbencyLabel"]): string[] {
  const problems: string[] = [];
  for (const [raceId, want] of Object.entries(LABELS)) {
    if (label(raceId) !== want) problems.push(`${raceId} is ${JSON.stringify(label(raceId))}, want "${want}"`);
  }
  for (const raceId of UNKNOWN) {
    if (label(raceId) !== null) problems.push(`${JSON.stringify(raceId)} must have no label`);
  }
  return problems;
}

const fixtureIds = Object.keys(LABELS).sort();
const rosterIds = [...new Set(ROSTER.map((r) => r.race_id))].sort();
check(
  "the label fixture holds the same 53 race ids as the ballot roster fixture",
  fixtureIds.length === 53 && JSON.stringify(fixtureIds) === JSON.stringify(rosterIds),
  `${fixtureIds.length} vs ${rosterIds.length}`,
);
const labels = labelProblems(incumbencyLabel);
check("each of the 53 race ids gets its label, an unknown id none (§3.5)", labels.length === 0, labels.join("; "));
const drift = fixtureIds.filter((id) => labelFor(id) !== incumbencyLabel(id));
check("the worksheet's label column uses the same labels (scripts/roster-worksheet.ts)", drift.length === 0, drift.join(", "));

/* 2. incumbencyFor and incumbencyLine. */
const AT = "2026-10-09T00:00:00+00:00";
const FL20 = { race_id: "FL-20-general" };
const ROWS: IncumbencyRow[] = [
  { candidate_id: "FL-DOE-1", is_incumbent: true, incumbency_verified_at: AT },
  { candidate_id: "FL-DOE-2", is_incumbent: false, incumbency_verified_at: AT },
  { candidate_id: "FL-DOE-3", is_incumbent: false, incumbency_verified_at: AT },
];
const linesFor = (m: Pick<Module, "incumbencyFor" | "incumbencyLine">, race: { race_id: string }, rows: IncumbencyRow[]) => {
  const inc = m.incumbencyFor(race, rows);
  return rows.map((r) => m.incumbencyLine(inc, r.candidate_id));
};

function flagOffProblems(m: Pick<Module, "incumbencyFor" | "incumbencyLine">): string[] {
  return linesFor(m, FL20, ROWS).some((l) => l !== null) || m.incumbencyFor(FL20, ROWS) !== null
    ? ["with the flag false, a fully sourced race must still show no line"]
    : [];
}

function flagOnProblems(m: Pick<Module, "incumbencyFor" | "incumbencyLine">): string[] {
  const problems: string[] = [];
  const full = linesFor(m, FL20, ROWS);
  const want = [
    "Member of the U.S. House now: Yes",
    "Member of the U.S. House now: No",
    "Member of the U.S. House now: No",
  ];
  if (JSON.stringify(full) !== JSON.stringify(want)) {
    problems.push(`a fully sourced race must give every card its line: ${JSON.stringify(full)}`);
  }
  const gap = (g: Partial<IncumbencyRow>) => ROWS.map((r, i) => (i === 2 ? { candidate_id: r.candidate_id, is_incumbent: r.is_incumbent, ...g } : r));
  for (const [what, rows] of [
    ["one candidate with a null source date", gap({ incumbency_verified_at: null })],
    ["one candidate with no source field (a row cached before 0049)", gap({})],
    ["one candidate with an empty source date", gap({ incumbency_verified_at: "" })],
  ] as const) {
    if (linesFor(m, FL20, [...rows]).some((l) => l !== null)) problems.push(`${what} must hide the line on every card`);
  }
  if (linesFor(m, { race_id: "FL-PBC-CC1-general" }, ROWS).some((l) => l !== null)) {
    problems.push("a race with no label shows no line");
  }
  if (m.incumbencyFor(FL20, []) !== null) problems.push("a race with no candidates shows no line");
  const inc = m.incumbencyFor(FL20, ROWS);
  if (m.incumbencyLine(inc, "FL-DOE-9") !== null || m.incumbencyLine(inc, "toString") !== null) {
    problems.push("a candidate the race did not compute gets no line");
  }
  if (m.incumbencyLine(null, "FL-DOE-1") !== null) problems.push("no race value, no line");
  const gov = linesFor(m, { race_id: "FL-GOV-general" }, ROWS.map((r) => ({ ...r, is_incumbent: false })));
  if (gov.some((l) => l !== "Holds this office now: No")) problems.push(`an open office reads No on every card: ${JSON.stringify(gov)}`);
  return problems;
}

const real = SHOW_INCUMBENT_CHIP
  ? flagOnProblems({ incumbencyFor, incumbencyLine })
  : flagOffProblems({ incumbencyFor, incumbencyLine });
check(`incumbencyFor with the flag as shipped (${SHOW_INCUMBENT_CHIP})`, real.length === 0, real.join("; "));
const on = flagOnProblems(await flagOn());
check("with the flag true: all or none per race, one label, Yes and No from one template", on.length === 0, on.join("; "));

const helper = stripComments(read(MODULE));
check(
  "incumbencyFor returns null first thing while the flag is false, and is_incumbent is read once",
  /export function incumbencyFor\([^)]*\)[^{]*\{\s*if \(!SHOW_INCUMBENT_CHIP\) return null;/.test(helper) &&
    (helper.match(/\.is_incumbent\b/g) ?? []).length === 1,
);

/* 3. The line component. */
const LINES = "src/components/features/RosterLines.tsx";
function lineComponentProblems(code: string): string[] {
  const c = stripComments(code);
  const start = c.indexOf("export function IncumbencyLine");
  const next = c.indexOf("export function", start + 1);
  const body = start < 0 ? "" : c.slice(start, next < 0 ? undefined : next);
  const problems: string[] = [];
  if (!/const text = incumbencyLine\(incumbency, candidateId\);\s*return text \? <p className="text-caption text-on-surface-muted">\{text\}<\/p> : null;/.test(body)) {
    problems.push("IncumbencyLine must print incumbencyLine(incumbency, candidateId) in one fixed <p>");
  }
  if ((body.match(/<p\b/g) ?? []).length !== 1) problems.push("IncumbencyLine has exactly one element");
  if (/\b(Yes|No|byCandidate)\b/.test(body)) problems.push("IncumbencyLine must not look at the value: Yes and No get the same markup");
  return problems;
}
const lineComponent = lineComponentProblems(read(LINES));
check(`${LINES} prints the line in one fixed element, the same for Yes and No`, lineComponent.length === 0, lineComponent.join("; "));

/* 4. The three cards, and who computes the race value. */
const CARDS = [
  "src/components/features/CandidateBrief.tsx",
  "src/components/features/RaceListing.tsx",
  "src/components/features/RaceCompare.tsx",
];
const USE = "<IncumbencyLine incumbency={incumbency} candidateId={candidate.candidate_id} />";
function cardProblems(code: string): string[] {
  const c = stripComments(code);
  const problems: string[] = [];
  const exact = c.split(USE).length - 1;
  const all = (c.match(/<IncumbencyLine\b/g) ?? []).length;
  if (exact !== 1 || all !== 1) problems.push(`renders ${USE} ${exact} time(s), <IncumbencyLine> ${all} in all; want exactly once`);
  if (/(&&|\?|:)\s*\(?\s*<IncumbencyLine\b/.test(c)) problems.push("<IncumbencyLine> sits behind a condition");
  if (!/import\s*\{[^}]*\bIncumbencyLine\b[^}]*\}\s*from\s*["']@\/components\/features\/RosterLines["']/.test(c)) {
    problems.push("must import IncumbencyLine from @/components/features/RosterLines");
  }
  if (/\bincumbencyFor\s*\(/.test(c)) problems.push("a card must take the race value as a prop, not compute it");
  return problems;
}
for (const file of CARDS) {
  const problems = cardProblems(read(file));
  check(`${file} renders the line once, from the race value`, problems.length === 0, problems.join("; "));
}

const PAGES = new Set([
  "src/app/(public)/races/[raceId]/page.tsx",
  "src/app/(public)/candidates/[candidateId]/page.tsx",
]);
const SRC = new Map(sourceFiles("src").map((f) => [f, read(f)] as const));
function callerProblems(files: ReadonlyMap<string, string>): string[] {
  const problems: string[] = [];
  for (const [file, text] of files) {
    if (file === MODULE) continue;
    const calls = /\bincumbencyFor\s*\(/.test(stripComments(text));
    if (calls && !PAGES.has(file)) problems.push(`${file} calls incumbencyFor`);
    if (!calls && PAGES.has(file)) problems.push(`${file} must compute the race's incumbency line`);
  }
  return problems;
}
const callers = callerProblems(SRC);
check("only the race page and the candidate page call incumbencyFor", callers.length === 0, callers.join("; "));

/* 5. No other reader. */
const ALLOWED = new Set([MODULE, "src/types/schema.ts"]);
const COLUMN = /\b(is_incumbent|incumbent_id|is_open_seat|incumbency_source|incumbency_verified_at)\b/;
const WORD = /\bincumbent\b/i;
function readerProblems(files: ReadonlyMap<string, string>): string[] {
  const problems: string[] = [];
  for (const [file, text] of files) {
    if (ALLOWED.has(file)) continue;
    const code = stripComments(text);
    const column = code.match(COLUMN);
    if (column) problems.push(`${file} reads ${column[1]}`);
    const word = code.match(WORD);
    if (word) problems.push(`${file} prints "${word[0]}"`);
  }
  return problems;
}
const readers = readerProblems(SRC);
check(`no other file in src/ reads incumbency or prints it (${SRC.size - ALLOWED.size} files)`, readers.length === 0, readers.join("; "));

/* 5b. The /methodology paragraph shows only with the line (spec §3.5, §3.10):
   a rollback that sets the flag false must hide both at once. */
const METHODOLOGY = "src/app/(public)/methodology/page.tsx";
function methodologyProblems(text: string): string[] {
  const problems: string[] = [];
  if ((text.match(/Who serves now/g) ?? []).length !== 1) problems.push("the \"Who serves now\" section appears once");
  if (!/\{SHOW_INCUMBENT_CHIP && \(\s*<section[^>]*>\s*<h2[^>]*>Who serves now<\/h2>/.test(text)) problems.push("the section sits inside {SHOW_INCUMBENT_CHIP && (...)}");
  if (!/import \{ SHOW_INCUMBENT_CHIP \} from "@\/lib\/incumbency";/.test(text)) problems.push("the page takes the flag from @/lib/incumbency");
  return problems;
}
const methodology = methodologyProblems(read(METHODOLOGY));
check("the /methodology paragraph is behind SHOW_INCUMBENT_CHIP, so a rollback hides it too", methodology.length === 0, methodology.join("; "));

/* 6. Mutations. */
await mutation("the all-or-none test deleted (an unsourced candidate reads No)", async () =>
  flagOnProblems(await flagOn([["  if (!candidates.every((c) => Boolean(c.incumbency_verified_at))) return null;\n", ""]])),
);
await mutation("the line rendered only when true", async () =>
  flagOnProblems(
    await flagOn([
      [
        "if (!incumbency || !Object.hasOwn(incumbency.byCandidate, candidateId)) return null;",
        "if (!incumbency || !incumbency.byCandidate[candidateId]) return null;",
      ],
    ]),
  ),
);
await mutation("the flag no longer gates the line", async () =>
  flagOffProblems(await importVariant<Module>(MODULE, [[FLAG, "export const SHOW_INCUMBENT_CHIP: boolean = false;"], ["  if (!SHOW_INCUMBENT_CHIP) return null;\n", ""]])),
);
await mutation('a House race labelled "Holds this seat now"', async () => {
  const m = await importVariant<Module>(MODULE, [['[/^FL-\\d+-general$/, "Member of the U.S. House now"]', '[/^FL-\\d+-general$/, "Holds this seat now"]']]);
  return labelProblems(m.incumbencyLabel);
});
await mutation("the line component styles Yes differently", () =>
  lineComponentProblems(
    edit(
      read(LINES),
      'const text = incumbencyLine(incumbency, candidateId);\n  return text ? <p className="text-caption text-on-surface-muted">{text}</p> : null;',
      'const text = incumbencyLine(incumbency, candidateId);\n  return text ? <p className={text.endsWith("Yes") ? "font-bold" : "text-caption"}>{text}</p> : null;',
    ),
  ),
);
await mutation("a card shows the line only for the incumbent", () =>
  cardProblems(edit(read(CARDS[2]), USE, `{candidate.is_incumbent && ${USE}}`)),
);
await mutation("a card drops the line", () => cardProblems(edit(read(CARDS[1]), USE, "")));
await mutation("the old chip comes back", () => {
  const copy = new Map(SRC);
  copy.set(CARDS[0], edit(read(CARDS[0]), USE, `${USE}<Chip>Incumbent</Chip>`));
  return readerProblems(copy);
});
await mutation("a loader reads is_open_seat", () => {
  const copy = new Map(SRC);
  copy.set("src/lib/listing.ts", `${read("src/lib/listing.ts")}\nexport const open = (r: { is_open_seat: boolean }) => r.is_open_seat;\n`);
  return readerProblems(copy);
});
await mutation("the /methodology paragraph shows without the flag", () =>
  methodologyProblems(edit(read(METHODOLOGY), "{SHOW_INCUMBENT_CHIP && (", "{(")),
);
await mutation("a page stops computing the race value", () => {
  const copy = new Map(SRC);
  const page = "src/app/(public)/candidates/[candidateId]/page.tsx";
  copy.set(page, read(page).split("incumbencyFor(").join("noIncumbency("));
  return callerProblems(copy);
});

done();
