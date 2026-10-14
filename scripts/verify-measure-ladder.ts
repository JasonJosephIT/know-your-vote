/* Guardrails for the measure page's resource ladder (MeasureResourceLadder,
   MeasureResourceRow; Mobbin catalog AM1 + AM4, 2026-10-12; founder
   decisions D1 (a) and D2 (a), 2026-10-13).

   1. Equal reach on phones (AM1). Below md the columns stack, so one jump
      row at the top of the ladder links to both: YES then NO, drawn from
      the same list as the columns, with one className, one glyph and no
      counts. It lives beside the columns, so it renders with both or with
      neither.
   2. Readable rows (AM4). No box inside a box: rows are split by hairlines.
      The flag sits on its own line above the title at 14px, the title is
      16px, a new-tab link says so, and an opinion row keeps its tint.
   3. Nothing reads as a recommendation and nothing moves: no side-specific
      colour, no transition or animation, no smooth scroll, and the 60%
      threshold is never animated.

   Run: node scripts/verify-measure-ladder.ts */

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
/* Comments stripped, so a rule explained in a comment can't satisfy or
   trip a check about the code. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const LADDER = "src/components/features/MeasureResourceLadder.tsx";
const ROW = "src/components/features/MeasureResourceRow.tsx";
const ladder = code(LADDER);
const row = code(ROW);
const glyphs = code("src/components/ui/Glyphs.tsx");
check(`${LADDER} exists`, ladder.length > 0);
check(`${ROW} exists`, row.length > 0);

/* The body of one function, from its declaration to the next top-level
   function, so a check about the jump row can't be met by the columns. */
const fnBody = (src: string, name: string) => {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) return "";
  const next = src.indexOf("\nfunction ", start + 1);
  const nextExport = src.indexOf("\nexport function ", start + 1);
  const ends = [next, nextExport].filter((i) => i > 0);
  return src.slice(start, ends.length ? Math.min(...ends) : undefined);
};

/* ---- 1. Equal reach on phones (AM1) ---------------------------------- */

check(
  "the two sides are one list, YES then NO, with an id each",
  /const SIDES = \[\s*\{ id: "case-yes", heading: "The case for a YES", stance: "support" \},\s*\{ id: "case-no", heading: "The case for a NO", stance: "oppose" \},\s*\] as const;/.test(
    ladder
  )
);
const jump = fnBody(ladder, "JumpRow");
check("the jump row exists", jump.length > 0);
check(
  "the jump row is a nav shown below md only",
  /<nav aria-labelledby="measure-jump" className="[^"]*\bmd:hidden\b[^"]*">/.test(jump) &&
    /<p id="measure-jump"[^>]*>\s*On this page\s*<\/p>/.test(jump)
);
check(
  "both jump links come from one map over SIDES, so they share wording, order and style",
  /\{SIDES\.map\(\(side\) => \(/.test(jump) &&
    (jump.match(/<a\b/g) ?? []).length === 1 &&
    /href=\{`#\$\{side\.id\}`\}/.test(jump) &&
    /\{side\.heading\}/.test(jump)
);
check(
  "the jump links are one fixed style with a 44px target and the down-arrow glyph",
  /className="inline-flex min-h-\[44px\] items-center gap-1 text-label text-primary underline underline-offset-2"/.test(
    jump
  ) &&
    /<ArrowDownGlyph \/>/.test(jump) &&
    !/className=\{/.test(jump)
);
check(
  "the jump links carry no counts",
  !/\.length|\bitems\b(?!-)|brief|COLUMN_CAP/.test(jump)
);
check(
  "the columns come from the same SIDES list and take its ids",
  /\{SIDES\.map\(\(side\) => \(\s*<Column\s+key=\{side\.id\}\s+id=\{side\.id\}\s+heading=\{side\.heading\}\s+items=\{brief\[side\.stance\]\}/.test(
    ladder
  ) && /<section\s+id=\{id\}/.test(fnBody(ladder, "Column"))
);
check(
  "no column heading is written out a second time",
  (ladder.match(/The case for a YES/g) ?? []).length === 1 &&
    (ladder.match(/The case for a NO/g) ?? []).length === 1
);
{
  const body = fnBody(ladder, "MeasureResourceLadder");
  check(
    "the jump row renders inside the ladder, before the neutral block and the columns",
    body.indexOf("<JumpRow />") > 0 &&
      body.indexOf("<JumpRow />") < body.indexOf("<MeasureNeutralBlock") &&
      body.indexOf("<MeasureNeutralBlock") < body.indexOf("<Column")
  );
  check(
    "the jump row is drawn once, and never by the neutral block alone",
    (ladder.match(/<JumpRow \/>/g) ?? []).length === 1 &&
      !fnBody(ladder, "MeasureNeutralBlock").includes("JumpRow")
  );
}
check(
  "the jump needs no scroll-mt: the root scroll-padding-top handles the fixed bars",
  !/scroll-mt-/.test(ladder) && /scroll-padding-top/.test(read("src/app/globals.css"))
);
check(
  "ArrowDownGlyph is in Glyphs.tsx, in the shared svg idiom",
  /export function ArrowDownGlyph\(\) \{\s*return \(\s*<svg \{\.\.\.svg\}>/.test(glyphs)
);

/* ---- 2. Readable rows (AM4) ------------------------------------------ */

check(
  "rows are not boxes: no border or radius on a row",
  !/rounded-|\bborder\b|border-border/.test(row)
);
check(
  "the lists split rows with hairlines",
  /<ul className="flex flex-col divide-y divide-border">/.test(ladder) &&
    /"flex flex-col gap-1 py-3"/.test(row)
);
check(
  "an opinion row keeps a full-width tint, the only difference from any other row",
  /marked\s*\?\s*"-mx-5 flex flex-col gap-1 bg-surface-muted px-5 py-3"\s*:\s*"flex flex-col gap-1 py-3"/.test(
    row
  )
);
{
  const flagAt = row.indexOf("{shownFlag && (");
  const titleAt = row.indexOf("{resource.title}");
  const metaAt = row.indexOf("font-mono text-mono");
  check(
    "the flag is on its own line, above the title, at 14px",
    flagAt > 0 &&
      flagAt < titleAt &&
      /\{shownFlag && \(\s*<p className="text-body-sm font-medium text-on-surface-muted">\s*\{shownFlag\}\s*<\/p>/.test(
        row
      )
  );
  check(
    "the flag is no longer on the meta line",
    metaAt > titleAt && !row.slice(metaAt).includes("shownFlag")
  );
}
check(
  "the title is 16px body text, linked or not",
  /className="text-body text-on-surface underline underline-offset-2"\s*>\s*\{resource\.title\}/.test(row) &&
    /<span className="text-body text-on-surface">\{resource\.title\}<\/span>/.test(row) &&
    !/text-body-sm text-on-surface[^"]*"\s*>\s*\{resource\.title\}/.test(row)
);
check(
  "every new-tab link says so",
  (row.match(/target="_blank"/g) ?? []).length ===
    (row.match(/<span className="sr-only"> \(opens in a new tab\)<\/span>/g) ?? []).length &&
    (row.match(/target="_blank"/g) ?? []).length > 0
);
check(
  "the meta line stays 14px mono",
  /font-mono text-mono text-on-surface-muted/.test(row)
);
check(
  "the flag never carries a lean: the row reads the card contract, which has none",
  /newsCardLabels\(source\)/.test(row) && !/\blean|newsLabels\(/.test(row)
);
check(
  "no thumbnails or format icons on a row",
  !/<img\b|<Image\b|<svg\b|Glyph/.test(row)
);
check(
  "one row component serves the neutral block and both columns",
  (ladder.match(/<MeasureResourceRow\b/g) ?? []).length === 1 &&
    fnBody(ladder, "TieredList").includes("<MeasureResourceRow") &&
    /<TieredList items=\{items\} kinds=\{NEUTRAL_KINDS\} \/>/.test(ladder) &&
    /<TieredList items=\{shown\} kinds=\{COLUMN_KINDS\} \/>/.test(ladder)
);

/* ---- 3. Nothing recommends, nothing moves ---------------------------- */

for (const [f, src] of [
  [LADDER, ladder],
  [ROW, row],
] as const) {
  check(
    `${f}: no colour that could read as a recommendation`,
    !/\b(?:bg|border|text|divide)-(?:l-)?(?:accent|success|error|warning|verdict)/.test(src) &&
      !/\b(?:bg|border|divide)-primary/.test(src)
  );
  check(
    `${f}: nothing moves (no transition, animation or smooth scroll)`,
    !/transition|animate-|scroll-smooth|behavior:\s*["']smooth/.test(src)
  );
  check(`${f}: no client JavaScript`, !read(f).includes('"use client"'));
}
check(
  "no side is styled on its own: no class depends on which side a column is",
  !/stance\s*===|side\.id\s*===|"support"\s*\?|"oppose"\s*\?/.test(ladder)
);
for (const f of [
  "src/components/features/MeasureThreshold.tsx",
  "src/components/features/MeasureVoteMeaning.tsx",
]) {
  const src = code(f);
  check(
    `${f}: the threshold is never animated`,
    src.length > 0 && !/transition|animate-|@keyframes|<animate/.test(src)
  );
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nverify-measure-ladder: all checks passed.");
