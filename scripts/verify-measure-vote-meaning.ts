/* Guardrails for the measure page's "What your vote does" boxes
   (MeasureVoteMeaning; founder 2026-10-05: mechanics only).

   1. Mechanics only: the component takes the threshold and nothing else
      about the measure, so it cannot say anything about one amendment's
      content, and the page keeps "We write none of it".
   2. YES and NO render through one Box component, so neither can be styled
      as the preferred answer.
   3. The blank-vote line is gated on the 60% rule (Art. XI s.5(e)), the
      only threshold where it is true.
   4. The page shows it before the ballot text, which the YES box points to.

   Run: node scripts/verify-measure-vote-meaning.ts */

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

const meaning = code("src/components/features/MeasureVoteMeaning.tsx");
check("MeasureVoteMeaning.tsx exists", meaning.length > 0);
check(
  "it takes only the threshold: no measure row, title or summary reaches it",
  /export function MeasureVoteMeaning\(\{ pct \}: \{ pct: number \}\)/.test(meaning) &&
    !/measure\.|official_title|ballot_summary|measure_id/.test(meaning)
);
check(
  "YES and NO share one Box component",
  (meaning.match(/<Box label="Voting (YES|NO)">/g) ?? []).length === 2 &&
    /<Box label="Voting YES">/.test(meaning) &&
    /<Box label="Voting NO">/.test(meaning) &&
    (meaning.match(/function Box\(/g) ?? []).length === 1
);
check(
  "YES and NO are worded as mirrors: only the verb differs",
  /<Box label="Voting YES">\s*Approves the change in the ballot summary below\.\s*<\/Box>/.test(meaning) &&
    /<Box label="Voting NO">\s*Rejects the change in the ballot summary below\.\s*<\/Box>/.test(meaning)
);
check(
  "the outcome is stated once, for both sides, outside either box",
  /If it passes, the change becomes part of the Florida Constitution\. If\s+it fails, nothing in the Constitution changes because of it\./.test(meaning)
);
check(
  "YES comes before NO",
  meaning.indexOf('label="Voting YES"') < meaning.indexOf('label="Voting NO"')
);
check(
  "no colour that could read as a recommendation (primary, accent, success, error, verdict)",
  !/\b(?:bg|border|text)-(?:l-)?(?:primary|accent|success|error|warning|verdict)/.test(meaning)
);
check(
  "the blank-vote line is gated on the 60% rule",
  /const blankCountsForNeither = Number\(pct\) === 60;/.test(meaning) &&
    /\{blankCountsForNeither && \(/.test(meaning)
);
check(
  "it cites Art. XI s.5 on flsenate.gov",
  meaning.includes("https://www.flsenate.gov/Laws/Constitution#A11S05")
);
check("it still states the threshold", /<MeasureThreshold pct=\{pct\} \/>/.test(meaning));
check("no client JavaScript", !read("src/components/features/MeasureVoteMeaning.tsx").includes('"use client"'));

const page = code("src/app/(public)/measures/[measureId]/page.tsx");
check(
  "the measure page renders it before the ballot text",
  page.includes("<MeasureVoteMeaning pct={measure.threshold_pct} />") &&
    page.indexOf("<MeasureVoteMeaning") < page.indexOf("What the ballot says")
);
check(
  "the threshold is not stated twice on the page",
  !/<MeasureThreshold\b/.test(page)
);
check(
  "the page keeps its promise",
  /We write none of it\./.test(page)
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nverify-measure-vote-meaning: all checks passed.");
