/* The Incumbent chip shows for nobody until incumbency is filled for
   everybody (src/lib/incumbency.ts, recommended pending founder
   confirmation).

   On 2026-10-05 production had is_incumbent = true for one ballot candidate
   in 106, so the chip marked one incumbent and made every other sitting
   officeholder read as a challenger. The fix is one constant,
   SHOW_INCUMBENT_CHIP, read through one helper. What would quietly undo it is
   a second reader: a new card, an Open seat label, a sort or a meta
   description that reads the column straight from the row. So this checks:

   1. The helper. With the flag false it is false for every candidate,
      incumbent or not; with the flag true it is exactly is_incumbent, so
      flipping the constant is all it takes to bring the chip back.
   2. The two cards. CandidateBrief and ListedCandidateCard each render the
      chip once, and only behind showIncumbentChip.
   3. Nothing else in src/ reads the incumbency columns (is_incumbent,
      incumbent_id, is_open_seat: all three are filled by the B4 run that has
      not happened) or prints the word, outside the helper and the row types.
      Comments are stripped first, so a comment explaining the gate is not
      read as a use of the column.

   Run: node scripts/verify-incumbent-chip.ts */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  SHOW_INCUMBENT_CHIP,
  showIncumbentChip,
} from "../src/lib/incumbency.ts";

const ROOT = resolve(import.meta.dirname, "..");
const SRC = join(ROOT, "src");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/* Block comments (JSX ones included, since {/* … *\/} is a block comment
   inside braces), then line comments that start a line or follow
   whitespace, so the "//" inside a URL string survives. */
const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/[^\n]*/g, "$1");

/* 1. The helper. */
console.log(
  `SHOW_INCUMBENT_CHIP is ${SHOW_INCUMBENT_CHIP} (recommended: false until every ballot candidate's is_incumbent is verified)`
);
check(
  "a candidate who is not the incumbent never gets the chip",
  showIncumbentChip({ is_incumbent: false }) === false
);
if (!SHOW_INCUMBENT_CHIP) {
  check(
    "with the flag false, an incumbent gets no chip either",
    showIncumbentChip({ is_incumbent: true }) === false,
    "the chip must render for nobody while the flag is false"
  );
} else {
  check(
    "with the flag true, the chip follows is_incumbent",
    showIncumbentChip({ is_incumbent: true }) === true
  );
}

/* 2. The two cards. */
const GATED_CHIP =
  /\{\s*showIncumbentChip\(\s*candidate\s*\)\s*&&\s*<Chip>\s*Incumbent\s*<\/Chip>\s*\}/g;
const CARDS = [
  "src/components/features/CandidateBrief.tsx",
  "src/components/features/RaceListing.tsx",
];
for (const file of CARDS) {
  const code = stripComments(readFileSync(join(ROOT, file), "utf8"));
  check(
    `${file} renders the chip once, behind showIncumbentChip`,
    (code.match(GATED_CHIP) ?? []).length === 1 &&
      (code.match(/Incumbent\s*<\/Chip>/g) ?? []).length === 1,
    "every Incumbent chip goes through the helper, so the flag decides it"
  );
  check(
    `${file} imports the helper from src/lib/incumbency`,
    /import\s*\{[^}]*\bshowIncumbentChip\b[^}]*\}\s*from\s*["']@\/lib\/incumbency["']/.test(
      code
    )
  );
}

/* 3. No other reader. The helper reads is_incumbent behind the flag, and the
   row types declare the columns; everything else goes through the helper. */
const ALLOWED = new Set(["src/lib/incumbency.ts", "src/types/schema.ts"]);
const COLUMN = /\b(is_incumbent|incumbent_id|is_open_seat)\b/;
const WORD = /\bincumbent\b/i;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.(ts|tsx|js|jsx|mjs)$/.test(name) ? [path] : [];
  });
}

const offenders: string[] = [];
let scanned = 0;
for (const path of walk(SRC)) {
  const file = relative(ROOT, path);
  if (ALLOWED.has(file)) continue;
  scanned++;
  /* The gated chip itself is the one sanctioned use, checked in part 2. */
  const code = stripComments(readFileSync(path, "utf8")).replace(
    GATED_CHIP,
    ""
  );
  const column = code.match(COLUMN);
  if (column) offenders.push(`${file} reads ${column[1]}`);
  const word = code.match(WORD);
  if (word) offenders.push(`${file} prints "${word[0]}"`);
}
check(
  `no other file in src/ reads incumbency or prints it (${scanned} files)`,
  offenders.length === 0,
  offenders.join("; ")
);

const helper = stripComments(
  readFileSync(join(ROOT, "src/lib/incumbency.ts"), "utf8")
);
check(
  "the helper reads is_incumbent only behind SHOW_INCUMBENT_CHIP",
  /return\s+SHOW_INCUMBENT_CHIP\s*&&\s*candidate\.is_incumbent\s*;/.test(
    helper
  ) && (helper.match(/\.is_incumbent\b/g) ?? []).length === 1
);

if (failures) {
  console.error(`\n${failures} incumbent-chip check(s) failed`);
  process.exit(1);
}
console.log("\nAll incumbent-chip checks passed.");
