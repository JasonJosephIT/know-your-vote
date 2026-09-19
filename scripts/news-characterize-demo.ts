/* A runnable demonstration of the characterizer — no database, no sweep.

   Why this exists. The real pipeline is currently dark: every outlet's
   `leanTag` is null pending the founder's C7-a sign-off, so `usableOutlets()`
   returns 0, the sweep produces no rows, and there is nothing in `news_item`
   for scripts/news-characterize.ts to read. That is a founder gate, not a code
   problem, and no model can close it — CN-R3 forbids the agent classifying an
   outlet's lean, which is the whole of C7-a.

   So this script exercises the SAME code path the runner uses — buildState →
   buildQuestions → Jev → applyThreshold → categoriesFor — against fixed
   headlines instead of stored rows. It needs exactly one thing the rest of the
   pipeline does not have yet: TYPESAFE_API_KEY.

   Run:
     node scripts/news-characterize-demo.ts [--threshold 0.7] [rows.jsonl]

   With no file it uses the fixtures below, which are chosen to exercise the
   decisions the taxonomy design actually made, including the ones that were
   impossible before it was two-level. Each carries a `want` note saying what a
   correct answer looks like — read the output against it; this is a
   demonstration, not an assertion, and it deliberately does not pass or fail. */

import { loadEnvLocal } from "./env-local.ts";
import {
  DEFAULT_THRESHOLD,
  applyThreshold,
  buildQuestions,
  buildState,
  provenance,
} from "../src/lib/news-characterize.ts";
import { jevEngine } from "../src/lib/news-characterize-engines.ts";
import { ASKABLE, ASKABLE_IDS, TAXONOMY_VERSION, categoriesFor } from "../src/lib/news-issues.ts";
import { readFileSync } from "node:fs";

interface DemoRow {
  title: string;
  summary: string | null;
  url: string;
  /** What a correct answer looks like, in prose. Not asserted. */
  want: string;
}

const FIXTURES: DemoRow[] = [
  { title: "Broward homeowners face fourth straight year of property insurance increases",
    summary: "Regulators approved rate filings averaging 14 percent as reinsurance costs climbed.",
    url: "https://example.com/2026/09/18/broward-insurance-rates/",
    want: "A1 property insurance → insurance" },
  { title: "Lawmakers file bill to raise the homestead exemption ahead of November vote",
    summary: "The proposal would shift part of the school levy off owner-occupied homes.",
    url: "https://example.com/2026/09/18/homestead-exemption-bill/",
    want: "A3 property taxes → insurance (NOT a ballot_measure row; Amendment 3 is a measure, not an issue)" },
  { title: "Florida's economy is slowing, state economists tell legislative panel",
    summary: "Revenue estimates were revised down, with no single sector named as the driver.",
    url: "https://example.com/2026/09/18/economy-slowing/",
    want: "B1 → economy. Deliberately broad: this is the fixture that was meant to need a parent question. B1 caught it at 0.98 unaided, which is why the parent questions were dropped. If this ever returns {}, that decision needs revisiting." },
  { title: "Appeals court hears challenge to Florida's gestational limit",
    summary: "Both sides argued over the standard applied by the lower court.",
    url: "https://example.com/2026/09/18/gestational-limit-appeal/",
    want: "B5 → abortion. IMPOSSIBLE before the taxonomy went two-level — under the quiz's 8 this returned {}." },
  { title: "Supervisors of elections ask for more early-voting sites in three counties",
    summary: "County budgets and staffing were cited in the requests.",
    url: "https://example.com/2026/09/18/early-voting-sites/",
    want: "A7 → elections. Also impossible before." },
  { title: "Retirees in Central Florida weigh changes to Medicare Advantage plans",
    summary: "Open enrollment begins next month.",
    url: "https://example.com/2026/09/18/medicare-advantage/",
    want: "B4 → retirement. Also impossible before." },
  { title: "Red tide bloom persists off Sanibel as restoration funding debate continues",
    summary: "Researchers reported elevated cell counts for a third week.",
    url: "https://example.com/2026/09/18/red-tide-sanibel/",
    want: "A5 → environment" },
  { title: "Orange County schools budget vote set for Tuesday",
    summary: null,
    url: "https://example.com/2026/09/18/schools-budget-vote/",
    want: "A6 → education, AND the no-dek input floor: sitemap rows have title + slug only (spec §4.2)" },
  { title: "Margaret Ellen Whitfield, 91, of Coral Gables",
    summary: "She is survived by three children and seven grandchildren.",
    url: "https://example.com/2026/09/18/obituaries/whitfield/",
    want: "NOTHING. {} is the correct answer. The Sentinel sitemaps are full of obituaries and wire sports, so this is the single most important case here." },
  { title: "Marlins drop series finale in eleven innings",
    summary: "The bullpen allowed four runs after the eighth.",
    url: "https://example.com/2026/09/18/marlins-finale/",
    want: "NOTHING. Same reason." },
];

/* Before anything reads process.env. */
loadEnvLocal(import.meta.url);

const args = process.argv.slice(2);
const ti = args.indexOf("--threshold");
const threshold = ti === -1 ? DEFAULT_THRESHOLD : Number(args[ti + 1]);
if (!Number.isFinite(threshold) || threshold <= 0 || threshold >= 1) {
  console.error("--threshold must be a number strictly between 0 and 1");
  process.exit(2);
}
const file = args.find((a) => !a.startsWith("--") && a !== String(args[ti + 1]));

const rows: DemoRow[] = file
  ? readFileSync(file, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l))
  : FIXTURES;

let engine;
try {
  engine = jevEngine();
} catch (e) {
  console.error((e as Error).message);
  console.error(
    "\nAdd TYPESAFE_API_KEY to .env.local in THIS worktree (worktrees do not\n" +
      "share one with the main checkout) and re-run. Nothing else is needed:\n" +
      "this script touches no database.",
  );
  process.exit(2);
}

const questions = buildQuestions(ASKABLE);
console.error(
  `${rows.length} rows · threshold ${threshold} · ${ASKABLE.length} questions/article · ` +
    provenance(engine.modelId, questions, TAXONOMY_VERSION),
);

let totalIn = 0;
for (const row of rows) {
  const state = buildState(row);
  let answers: Record<string, unknown>;
  let usage: { input_tokens?: number } | undefined;
  try {
    ({ answers, usage } = await engine.characterize(state, questions));
  } catch (e) {
    console.log(`\n✗ ${row.title}\n  ERROR ${(e as Error).message}`);
    continue;
  }
  const tags = applyThreshold(answers, threshold, ASKABLE_IDS);
  const cats = categoriesFor(tags);
  if (usage?.input_tokens) totalIn += usage.input_tokens;

  /* Every probability, not just the ones that cleared — the near misses are
     what a threshold sweep is for, and hiding them would hide the tuning. */
  const scored = ASKABLE_IDS
    .map((id) => [id, (answers[id] as { noul?: number } | undefined)?.noul])
    .filter((e): e is [string, number] => typeof e[1] === "number")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id, v]) => `${id}:${v.toFixed(2)}`)
    .join(" ");

  console.log(`\n${row.title}${state.dek === null ? "  [no dek]" : ""}`);
  console.log(`  tags       ${tags.length ? tags.join(", ") : "{} (none over threshold)"}`);
  console.log(`  categories ${cats.length ? cats.join(", ") : "—"}`);
  console.log(`  top scores ${scored}`);
  console.log(`  want       ${row.want}`);
}

if (totalIn > 0) {
  console.error(
    `\n${totalIn} input tokens · $${((totalIn / 1_000_000) * 0.042).toFixed(6)} at Jev's $0.042/MTok (output free)`,
  );
}
