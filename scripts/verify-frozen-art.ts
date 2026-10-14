/* The art inside the frozen files (phone visuals round 2, PR 2; founder
   decisions 2A and 5A, 2026-10-14; docs/design/mobile-visuals-2026-10-14/).

   Two pieces went into files that freeze on 2026-10-18 04:00 UTC
   (scripts/freeze-manifest.ts), so they had to be right before then:

     - a wave at the seam between the statewide races and the ballot
       questions, in SharedBallot.tsx (home, every width);
     - a 30px magnifier beside /methodology's "No source, no quote".

   What would regress quietly, and is pinned here:

   1. The wave renders only when both lists do, sits after the statewide
      section and before <BallotQuestions />, never inside either list, and
      carries no figure. A figure beside a list of candidates is the one
      thing design.md's art rules forbid outright.
   2. The magnifier is in the flow, in one flex row with the heading, after
      its words, phone only and 30px. Placed absolutely it runs out of the
      column at 320px with a 20px root font; from lg the page keeps its one
      spot.
   3. Every piece of art a frozen file shows below lg is one design.md's
      "Art on phones" line names, and that line names these two.

   Each check is a function over source text, and each is run once more on
   an edited copy that must fail, so a check that can no longer fail is
   caught too. Source is read with comments stripped, so a comment quoting
   a class cannot pass or fail a check.

   Pure and offline: no DB, no network.

   Run: node scripts/verify-frozen-art.ts */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { FROZEN_FILES } from "./freeze-manifest.ts";

const ROOT = resolve(import.meta.dirname, "..");
const SHARED_BALLOT = "src/components/features/SharedBallot.tsx";
const METHODOLOGY = "src/app/(public)/methodology/page.tsx";
const DIVIDER = "src/components/brand/SectionDivider.tsx";
const DESIGN = "docs/design.md";

const source = (file: string) => readFileSync(join(ROOT, file), "utf8");
const stripComments = (src: string) =>
  src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/[^\n]*/g, "$1");
/* Comment-free and on one line, so markup split across lines still
   matches. */
const flat = (src: string) => stripComments(src).replace(/\s+/g, " ");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}
/* An edit that must be caught: each fragment has to exist (or the mutation
   tests nothing), and the edited source has to raise a problem. */
function mutation(
  name: string,
  text: string,
  edits: [from: string, to: string][],
  problems: (edited: string) => string[]
) {
  let edited = text;
  for (const [from, to] of edits) {
    if (!edited.includes(from)) {
      check(`mutation fixture: ${name}`, false, `fragment not found: ${from}`);
      return;
    }
    edited = edited.replace(from, to);
  }
  check(`caught: ${name}`, problems(edited).length > 0);
}

/* The <Art .../> elements in a source: name, height and wrapper classes. */
type ArtUse = { name: string; height: number; className: string };
function artUses(text: string): ArtUse[] {
  return [...flat(text).matchAll(/<Art\b([^>]*?)\/>/g)].map((m) => ({
    name: /\bname="([^"]+)"/.exec(m[1])?.[1] ?? "",
    height: Number(/\bheight=\{(\d+)\}/.exec(m[1])?.[1] ?? NaN),
    className: /\bclassName="([^"]*)"/.exec(m[1])?.[1] ?? "",
  }));
}
/* "hidden lg:block" (or lg:flex and the like) is the desktop twin: it never
   shows below lg, so it is not phone art. */
const desktopOnly = (className: string) => {
  const cls = className.split(/\s+/);
  return cls.includes("hidden") && cls.some((c) => /^lg:(block|flex|inline|grid)/.test(c));
};

/* ---- 1. The seam wave --------------------------------------------------- */

const WAVE = /\{\s*races\.length > 0 && measures\.length > 0 && \(?\s*<SectionDivider variant="wave" \/>\s*\)?\s*\}/;

function seamProblems(text: string): string[] {
  const code = flat(text);
  const problems: string[] = [];
  if (!/import \{ SectionDivider \} from "@\/components\/brand\/SectionDivider";/.test(code))
    problems.push("SharedBallot imports SectionDivider");
  const dividers = code.match(/<SectionDivider\b/g) ?? [];
  if (dividers.length !== 1) problems.push(`one SectionDivider, found ${dividers.length}`);
  const wave = WAVE.exec(code);
  if (!wave) {
    problems.push("the wave renders only when races AND measures are non-empty");
    return problems;
  }
  const statewideEnd = code.lastIndexOf("</section>", wave.index);
  const listEnd = code.lastIndexOf("</LinkRowList>");
  const questions = code.indexOf("<BallotQuestions />");
  if (statewideEnd === -1 || statewideEnd < code.indexOf('id="statewide-races"'))
    problems.push("the wave comes after the statewide section closes");
  if (listEnd > wave.index) problems.push("the wave is outside the race list (after its last </LinkRowList>)");
  if (questions === -1 || questions < wave.index) problems.push("the wave comes before <BallotQuestions />");
  if (/<Art\b|<LedgeArt\b|<img\b/.test(code)) problems.push("no figure in SharedBallot: the seam is a plain band");
  return problems;
}

const shared = source(SHARED_BALLOT);
const seam = seamProblems(shared);
check(
  "SharedBallot: a plain wave between the statewide races and the ballot questions, only when both render",
  seam.length === 0,
  seam.join("; ")
);
{
  const divider = flat(source(DIVIDER));
  check(
    "SectionDivider is decorative and server-rendered: aria-hidden, no pointer events, no \"use client\"",
    /aria-hidden="true"/.test(divider) &&
      /pointer-events-none/.test(divider) &&
      !/^\s*["']use client["']/.test(source(DIVIDER))
  );
}
const WAVE_JSX = '<SectionDivider variant="wave" />';
mutation(
  "the wave shown when only one list renders",
  shared,
  [["races.length > 0 && measures.length > 0 && (", "measures.length > 0 && ("]],
  seamProblems
);
mutation(
  "the wave moved inside the race list",
  shared,
  [
    [WAVE_JSX, "null"],
    ["</LinkRowList>", `{races.length > 0 && measures.length > 0 && (${WAVE_JSX})}</LinkRowList>`],
  ],
  seamProblems
);
mutation(
  "the wave moved below the ballot questions",
  shared,
  [
    [WAVE_JSX, "null"],
    ["<BallotQuestions />", `<BallotQuestions />{races.length > 0 && measures.length > 0 && (${WAVE_JSX})}`],
  ],
  seamProblems
);
mutation(
  "a figure on the seam",
  shared,
  [[WAVE_JSX, `${WAVE_JSX}<Art name="sticker-palm" height={36} className="lg:hidden" />`]],
  seamProblems
);

/* ---- 2. The /methodology magnifier -------------------------------------- */

function magnifierProblems(text: string): string[] {
  const code = flat(text);
  const problems: string[] = [];
  const row =
    /<div className="flex items-end gap-2"> <h2 className="text-h2">No source, no quote<\/h2> (<Art\b[^>]*?\/>) <\/div>/.exec(
      code
    );
  if (!row) {
    problems.push('the magnifier follows the "No source, no quote" h2 in one flex row (flex items-end gap-2)');
    return problems;
  }
  const [art] = artUses(row[1]);
  if (art.name !== "sticker-magnifier") problems.push(`the piece is sticker-magnifier, not ${art.name}`);
  if (art.height !== 30) problems.push(`it is 30px, not ${art.height}`);
  const cls = art.className.split(/\s+/);
  if (!cls.includes("lg:hidden")) problems.push("it is phone only (lg:hidden)");
  if (!cls.includes("shrink-0")) problems.push("it keeps its size (shrink-0) while the heading wraps");
  if (cls.some((c) => /^(absolute|fixed|-)|^-?(left|right|inset)-/.test(c)))
    problems.push(`it is in the flow, with no position or side offset: ${art.className}`);
  if (/\beager\b/.test(row[1])) problems.push("it loads lazily (no eager)");
  return problems;
}

const methodology = source(METHODOLOGY);
const magnifier = magnifierProblems(methodology);
check(
  '/methodology: a 30px magnifier in the flow beside "No source, no quote", phone only',
  magnifier.length === 0,
  magnifier.join("; ")
);
mutation(
  "the magnifier placed absolutely",
  methodology,
  [['className="shrink-0 lg:hidden"', 'className="absolute -right-4 shrink-0 lg:hidden"']],
  magnifierProblems
);
mutation(
  "the magnifier shown from lg too",
  methodology,
  [['className="shrink-0 lg:hidden"', 'className="shrink-0"']],
  magnifierProblems
);
mutation(
  "the magnifier moved under the heading, out of its row",
  methodology,
  [['<div className="flex items-end gap-2">', "<div>"]],
  magnifierProblems
);

/* ---- 3. The closed list ------------------------------------------------- */

/* Every piece a frozen file shows below lg, and where. Adding one here
   without a matching change to design.md's "Art on phones" line is the
   thing this list exists to stop. */
const PHONE_ART_IN_FROZEN_FILES: Record<string, string[]> = {
  [METHODOLOGY]: ["method-receipts@112", "sticker-magnifier@30"],
};

function closedListProblems(files: Map<string, string>): string[] {
  const problems: string[] = [];
  for (const [file, text] of files) {
    const phone = artUses(text)
      .filter((a) => !desktopOnly(a.className))
      .map((a) => `${a.name}@${a.height}`)
      .sort();
    const allowed = [...(PHONE_ART_IN_FROZEN_FILES[file] ?? [])].sort();
    if (phone.join() !== allowed.join())
      problems.push(`${file}: phone art ${phone.join(", ") || "none"}, allowed ${allowed.join(", ") || "none"}`);
    const code = flat(text);
    if (/<LedgeArt\b/.test(code)) problems.push(`${file}: LedgeArt in a frozen file`);
    if (file !== SHARED_BALLOT && /<SectionDivider\b/.test(code))
      problems.push(`${file}: a section divider outside SharedBallot's seam`);
  }
  return problems;
}

const frozen = new Map(FROZEN_FILES.map((f) => [f, source(f)]));
const closed = closedListProblems(frozen);
check(
  `the frozen files show only the phone art listed here (${frozen.size} files)`,
  closed.length === 0,
  closed.join("; ")
);
{
  const page = "src/app/(public)/measures/[measureId]/page.tsx";
  const text = frozen.get(page) ?? "";
  mutation(
    "a desktop-only piece shown on phones in a frozen file",
    text,
    [['className="hidden shrink-0 lg:block"', 'className="shrink-0"']],
    (edited) => closedListProblems(new Map([[page, edited]]))
  );
}

/* ---- 4. design.md names both -------------------------------------------- */

{
  const paras = source(DESIGN).split(/\n\n+/);
  const line = paras.find((p) => p.startsWith("**Art on phones")) ?? "";
  check(
    "design.md's \"Art on phones\" line names the seam wave and the /methodology magnifier",
    line.includes("a wave between the statewide races and the ballot questions (never inside either list)") &&
      line.includes("plus a 30px magnifier beside /methodology's \"No source, no quote\"")
  );
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nverify-frozen-art: all checks passed.");
