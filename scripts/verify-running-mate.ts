/* The running-mate line (spec
   docs/superpowers/specs/2026-10-08-roster-completeness-design.md §3.6 and
   §6; D5 and D6, Recommended pending founder confirmation).

   Florida's governor and lieutenant governor run as one ticket, and every
   Governor card shows "Running mate for Lieutenant Governor: <name>", or
   none does. This checks:

   1. D6, normalizeDoeText: the raw "Running Mate" fields of canDetail 89042
      and 90630 read "Bryan Avila" and "Ruben A. Coto"; nothing but entities
      and whitespace changes; an unknown entity throws. The read tool's copy
      (scripts/roster-reads-lib.ts) is this same function.
   2. All or none, runningMatesFor: eight named gives eight lines; one
      missing, blank or absent (a row cached before 0049) gives none; a race
      whose rows hold no running mate (every race but Governor) gives none.
   3. RunningMateLine prints runningMateLine's text in one fixed element.
   4. The three cards (CandidateBrief, ListedCandidateCard in RaceListing,
      the RaceCompare roster card) each render <RunningMateLine> once, never
      behind a condition, from the race-level value; only the two pages call
      runningMatesFor.
   5. Nothing else in src/ reads running_mate or its source columns, or
      prints the line's words. The candidate-lead kind "running_mate" (R5)
      is a different thing: in the three files that define and show that
      kind, quoted strings are skipped, and a property read is still caught.
   6. Each guard above catches the change it exists for (mutations).

   Run: node scripts/verify-running-mate.ts */

import {
  normalizeDoeText,
  runningMateLine,
  runningMatesFor,
  type RunningMateRow,
} from "../src/lib/running-mate.ts";
import { normalizeDoeText as readToolCopy } from "./roster-reads-lib.ts";
import { checker, edit, importVariant, read, sourceFiles, stripComments } from "./source-checks.ts";

const { check, mutation, done } = checker("running-mate");
type Module = typeof import("../src/lib/running-mate.ts");

/* 1. D6. The raw strings are the fields as served (CR LF) and as headless
   Chromium serializes them (LF), spec §2.6 and the worksheet. */
const RAW_89042 = " Bryan&nbsp;\r\n\t\t    Avila                     ";
const RAW_90630 = " Ruben&nbsp;\r\n\t\t    A.&nbsp;\r\n\t\t    Coto                     ";
const RAW_90630_DOM = " Ruben&nbsp;\n\t\t    A.&nbsp;\n\t\t    Coto                     ";

function d6Problems(normalize: Module["normalizeDoeText"]): string[] {
  const problems: string[] = [];
  const want = (raw: string, expected: string) => {
    let got: string;
    try {
      got = normalize(raw);
    } catch (err) {
      problems.push(`normalizeDoeText(${JSON.stringify(raw)}) throws: ${String(err)}`);
      return;
    }
    if (got !== expected) problems.push(`normalizeDoeText(${JSON.stringify(raw)}) is ${JSON.stringify(got)}, want ${JSON.stringify(expected)}`);
  };
  want(RAW_89042, "Bryan Avila");
  want(RAW_90630, "Ruben A. Coto");
  want(RAW_90630_DOM, "Ruben A. Coto");
  want(" José&nbsp;\n  O'Brien-Núñez, Jr. ", "José O'Brien-Núñez, Jr.");
  want(" Joe  Van Vactor", "Joe Van Vactor");
  try {
    normalize("Pe&ntilde;a");
    problems.push("normalizeDoeText must throw on an entity it cannot decode (&ntilde;)");
  } catch {
    /* expected */
  }
  return problems;
}

const d6 = d6Problems(normalizeDoeText);
check('D6: canDetail 89042 reads "Bryan Avila" and 90630 "Ruben A. Coto"; nothing else changes', d6.length === 0, d6.join("; "));
check("the read tool's normalizeDoeText is this one (one copy)", readToolCopy === normalizeDoeText);

/* 2. All or none. The eight tickets as the worksheet stores them. */
const TICKETS: RunningMateRow[] = [
  { candidate_id: "FL-DOE-89042", running_mate: "Bryan Avila" },
  { candidate_id: "FL-DOE-89243", running_mate: "Gwen Graham" },
  { candidate_id: "FL-DOE-84076", running_mate: "Nicole Skelly" },
  { candidate_id: "FL-DOE-90630", running_mate: "Ruben A. Coto" },
  { candidate_id: "FL-DOE-89571", running_mate: "Rachel Rodriguez" },
  { candidate_id: "FL-DOE-88529", running_mate: "Benjiman Rojas" },
  { candidate_id: "FL-DOE-90433", running_mate: "Joe Van Vactor" },
  { candidate_id: "FL-DOE-89630", running_mate: "Juan Santana" },
];

function gateProblems(m: Pick<Module, "runningMatesFor" | "runningMateLine">): string[] {
  const problems: string[] = [];
  const lines = (rows: RunningMateRow[]) => {
    const mates = m.runningMatesFor(rows);
    return rows.map((r) => m.runningMateLine(mates, r.candidate_id));
  };
  const all = lines(TICKETS);
  if (all.some((l) => l === null) || all[0] !== "Running mate for Lieutenant Governor: Bryan Avila" || all[3] !== "Running mate for Lieutenant Governor: Ruben A. Coto") {
    problems.push(`eight named must give eight lines, the name exactly as stored: ${JSON.stringify(all)}`);
  }
  const withGap = (gap: Partial<RunningMateRow>) => TICKETS.map((t, i) => (i === 7 ? { candidate_id: t.candidate_id, ...gap } : t));
  for (const [what, rows] of [
    ["one null", withGap({ running_mate: null })],
    ["one blank", withGap({ running_mate: "   " })],
    ["one absent (a row cached before 0049)", withGap({})],
  ] as const) {
    if (lines([...rows]).some((l) => l !== null)) problems.push(`${what} of eight must hide every line`);
  }
  const house: RunningMateRow[] = [
    { candidate_id: "FL-DOE-1", running_mate: null },
    { candidate_id: "FL-DOE-2", running_mate: null },
  ];
  if (lines(house).some((l) => l !== null)) problems.push("a race with no running mates (every race but Governor) shows no line");
  if (m.runningMatesFor([]) !== null) problems.push("an empty race shows no line");
  const mates = m.runningMatesFor(TICKETS);
  if (m.runningMateLine(mates, "FL-DOE-00000") !== null || m.runningMateLine(mates, "toString") !== null) {
    problems.push("a candidate the race did not compute gets no line");
  }
  if (m.runningMateLine(null, "FL-DOE-89042") !== null) problems.push("no race value, no line");
  return problems;
}

const gate = gateProblems({ runningMatesFor, runningMateLine });
check("runningMatesFor: all eight named gives eight lines; any one missing gives none", gate.length === 0, gate.join("; "));

/* 3. The line component. */
const LINES = "src/components/features/RosterLines.tsx";
function lineComponentProblems(code: string): string[] {
  const c = stripComments(code);
  const start = c.indexOf("export function RunningMateLine");
  const next = c.indexOf("export function", start + 1);
  const body = start < 0 ? "" : c.slice(start, next < 0 ? undefined : next);
  const problems: string[] = [];
  if (!/const text = runningMateLine\(runningMates, candidateId\);\s*return text \? <p className="text-caption text-on-surface-muted">\{text\}<\/p> : null;/.test(body)) {
    problems.push("RunningMateLine must print runningMateLine(runningMates, candidateId) in one fixed <p>");
  }
  if ((body.match(/<p\b/g) ?? []).length !== 1) problems.push("RunningMateLine has exactly one element");
  return problems;
}
const lineComponent = lineComponentProblems(read(LINES));
check(`${LINES} prints the line in one fixed element`, lineComponent.length === 0, lineComponent.join("; "));

/* 4. The three cards, and who computes the race value. */
const CARDS = [
  "src/components/features/CandidateBrief.tsx",
  "src/components/features/RaceListing.tsx",
  "src/components/features/RaceCompare.tsx",
];
const USE = "<RunningMateLine runningMates={runningMates} candidateId={candidate.candidate_id} />";
function cardProblems(code: string): string[] {
  const c = stripComments(code);
  const problems: string[] = [];
  const exact = c.split(USE).length - 1;
  const all = (c.match(/<RunningMateLine\b/g) ?? []).length;
  if (exact !== 1 || all !== 1) problems.push(`renders ${USE} ${exact} time(s), <RunningMateLine> ${all} in all; want exactly once`);
  if (/(&&|\?|:)\s*\(?\s*<RunningMateLine\b/.test(c)) problems.push("<RunningMateLine> sits behind a condition");
  if (!/import\s*\{[^}]*\bRunningMateLine\b[^}]*\}\s*from\s*["']@\/components\/features\/RosterLines["']/.test(c)) {
    problems.push("must import RunningMateLine from @/components/features/RosterLines");
  }
  if (/\brunningMatesFor\s*\(/.test(c)) problems.push("a card must take the race value as a prop, not compute it");
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
    if (file === "src/lib/running-mate.ts") continue;
    const calls = /\brunningMatesFor\s*\(/.test(stripComments(text));
    if (calls && !PAGES.has(file)) problems.push(`${file} calls runningMatesFor`);
    if (!calls && PAGES.has(file)) problems.push(`${file} must compute the race's running mates`);
  }
  return problems;
}
const callers = callerProblems(SRC);
check("only the race page and the candidate page call runningMatesFor", callers.length === 0, callers.join("; "));

/* 5. No other reader. */
const ALLOWED = new Set(["src/lib/running-mate.ts", "src/types/schema.ts"]);
const LEAD_KIND_FILES = new Set([
  "src/lib/candidate-leads.ts",
  "src/types/admin.ts",
  "src/components/admin/ReviewItemCard.tsx",
]);
const COLUMN = /\brunning_mate(?:_source|_verified_at)?\b/;
const WORDS = /Running mate for Lieutenant Governor/i;
function readerProblems(files: ReadonlyMap<string, string>): string[] {
  const problems: string[] = [];
  for (const [file, text] of files) {
    if (ALLOWED.has(file)) continue;
    let code = stripComments(text);
    if (LEAD_KIND_FILES.has(file)) code = code.replace(/"[^"\n]*"/g, '""');
    const column = code.match(COLUMN);
    if (column) problems.push(`${file} reads ${column[0]}`);
    if (WORDS.test(code)) problems.push(`${file} prints the running-mate line itself`);
  }
  return problems;
}
const readers = readerProblems(SRC);
check(`no other file in src/ reads running_mate or prints the line (${SRC.size} files)`, readers.length === 0, readers.join("; "));

/* 6. Mutations. */
await mutation("one ticket without a running mate still shows the other seven", async () => {
  const m = await importVariant<Module>("src/lib/running-mate.ts", [["if (!name || !name.trim()) return null;", "if (!name || !name.trim()) continue;"]]);
  return gateProblems(m);
});
await mutation("D6 decodes no entities", async () => {
  const m = await importVariant<Module>("src/lib/running-mate.ts", [["decodeEntities(raw)", "raw"]]);
  return d6Problems(m.normalizeDoeText);
});
await mutation("D6 stops collapsing whitespace", async () => {
  const m = await importVariant<Module>("src/lib/running-mate.ts", [['return decoded.replace(/\\s+/g, " ").trim();', "return decoded.trim();"]]);
  return d6Problems(m.normalizeDoeText);
});
await mutation("the line component reads the map itself", () =>
  lineComponentProblems(edit(read(LINES), "const text = runningMateLine(runningMates, candidateId);", "const text = runningMates?.[candidateId];")),
);
await mutation("a card shows the line only for some candidates", () =>
  cardProblems(edit(read(CARDS[2]), USE, `{candidate.official_site && ${USE}}`)),
);
await mutation("a card drops the line", () => cardProblems(edit(read(CARDS[0]), USE, "")));
await mutation("a card computes its own race value", () =>
  cardProblems(edit(read(CARDS[1]), USE, `${USE}{String(runningMatesFor([]))}`)),
);
await mutation("a lead-kind file reads the column", () => {
  const copy = new Map(SRC);
  const file = "src/components/admin/ReviewItemCard.tsx";
  copy.set(file, `${read(file)}\nexport const y = (c: { running_mate: string }) => c.running_mate;\n`);
  return readerProblems(copy);
});
await mutation("a loader reads running_mate", () => {
  const copy = new Map(SRC);
  copy.set("src/lib/briefs.ts", `${read("src/lib/briefs.ts")}\nexport const x = (c: { running_mate: string }) => c.running_mate;\n`);
  return readerProblems(copy);
});
await mutation("a page stops computing the race value", () => {
  const copy = new Map(SRC);
  const page = "src/app/(public)/races/[raceId]/page.tsx";
  copy.set(page, read(page).split("runningMatesFor(").join("noRunningMates("));
  return callerProblems(copy);
});

done();
