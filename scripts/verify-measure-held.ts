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
  "methodology says a held question shows the ballot text plus sources that take no side, not the text alone",
  !/ballot text alone/.test(methodology) &&
    /Until then its page shows the ballot text and any official documents, research and reporting that take no side, but nothing that argues for either side\./.test(methodology),
  methodology.match(/A ballot question is published only[^.]*\.[^.]*\./)?.[0] ?? "sentence not found"
);
const flatPage = page.replace(/\s+/g, " ");
check(
  "the fallback card says 'nothing else' only when there are no neutral resources",
  /neutral\.length > 0 \? "the official ballot text and the explainers above, and no case for either side\." : "the official ballot text and nothing else\."/.test(flatPage)
);

/* The freeze (ballot-content-completion §3.5 and §3.6.4, BC8 and BC11,
   recommended pending founder confirmation). From 2026-10-17 nothing is
   added to a measure page for this election, so the held note and its
   caption stop promising more, and the fallback for a listed measure with
   no note stops saying resources "are being collected": through Nov 3 that
   branch is reached only by a measure taken down for a correction. */
const am1 = heldNote("FL-AM1-general");
if (am1) {
  const text = am1.paragraphs.join(" ");
  check("AM1 held note: no 'yet' (nothing more is coming before Nov 3)", !/\byet\b/i.test(text), text);
  check(
    "AM1 held note: the freeze wording of the second paragraph",
    am1.paragraphs[1] ===
      "We add for and against columns only from each side's own case, read at its own source: a statement, testimony or page it published itself. We have read the supporters' case that way, but not the opponents', so neither column is shown.",
    am1.paragraphs[1]
  );
  check("AM1 held note: updated on the last day before the freeze", am1.updated === "2026-10-17", am1.updated);
}
check(
  "held-note caption says sources stopped on October 17, not that we look every week",
  flatPage.includes("We stopped adding sources to this page on October 17, 2026, for this election. This note was last updated") &&
    !/every week/.test(flatPage)
);
check(
  "fallback card: the freeze wording, not 'being collected'",
  flatPage.includes(
    "This page shows no for or against columns right now. We show them only when the sources on both sides meet our rules, which the methodology page explains. Until then, this page shows{\" \"}"
  ) && !/being collected/.test(flatPage)
);

if (failures > 0) { console.error(`\n${failures} check(s) failed.`); process.exit(1); }
console.log("\nverify-measure-held: all checks passed.");
