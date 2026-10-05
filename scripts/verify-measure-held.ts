/* Guardrails for the held-measure page (spec
   docs/superpowers/specs/2026-09-26-amendment-context-design.md §3).
   Run: node scripts/verify-measure-held.ts */
import { readFileSync } from "node:fs";
import { HELD_NOTES, heldNote } from "../src/lib/measure-held-copy.ts";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else { failures++; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

const ids = Object.keys(HELD_NOTES);
check("AM1 has a held note", heldNote("FL-AM1-general") !== null);
check("unknown measure has none", heldNote("FL-AM9-general") === null);
for (const id of ids) {
  const n = HELD_NOTES[id];
  check(`${id}: updated is YYYY-MM-DD`, /^\d{4}-\d{2}-\d{2}$/.test(n.updated));
  check(`${id}: has paragraphs`, n.paragraphs.length > 0 && n.paragraphs.every((p) => p.trim().length > 0));
  const text = n.paragraphs.join(" ").toLowerCase();
  /* Process only: the note may not argue the amendment's merits. */
  check(
    `${id}: no merits language`,
    !/\b(good|bad|should vote|vote yes|vote no|harmful|beneficial|wasteful|reckless|smart)\b/.test(text),
    text
  );
}

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");
const page = read("src/app/(public)/measures/[measureId]/page.tsx");
check("page renders the neutral block for a held measure", /<MeasureNeutralBlock\b/.test(page));
check("page renders the held note", /heldNote\(/.test(page));
check("page never renders sided columns outside the published brief", !/brief\s*\?\s*\(?\s*<Column|support\.map|oppose\.map/.test(page));

/* The held page shows the neutral resources (0041), so no copy may say it
   shows the ballot text alone (launch fixes, 2026-10-05). The methodology
   page is where skeptics read the rule. */
const methodology = read("src/app/(public)/methodology/page.tsx").replace(/\s+/g, " ");
check(
  "methodology says a held question shows the ballot text plus neutral sources, not the text alone",
  !/ballot text alone/.test(methodology) &&
    /Until then its page shows the ballot text and any official documents, research and reporting, but no positions or commentary from either side\./.test(methodology),
  methodology.match(/A ballot question is published only[^.]*\.[^.]*\./)?.[0] ?? "sentence not found"
);
const flatPage = page.replace(/\s+/g, " ");
check(
  "the fallback card says 'nothing else' only when there are no neutral resources",
  /neutral\.length > 0 \? "the official ballot text and the explainers above, and no case for either side\." : "the official ballot text and nothing else\."/.test(flatPage)
);

if (failures > 0) { console.error(`\n${failures} check(s) failed.`); process.exit(1); }
console.log("\nverify-measure-held: all checks passed.");
