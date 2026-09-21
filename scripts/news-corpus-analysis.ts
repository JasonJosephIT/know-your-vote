/* What is the Florida press actually covering? — corpus analysis.

   Characterizes a pool built by scripts/news-eval-pool.ts and aggregates it.
   This is ANALYSIS, not ingest: nothing is written to news_item. Storing rows
   still requires founder gate C7-a (every outlet's leanTag is null, so
   usableOutlets() returns 0) and migration 0027.

   Run: node scripts/news-corpus-analysis.ts <pool.jsonl> [--threshold 0.85]
        [--concurrency 6] [--out report.md] */

import { readFileSync, writeFileSync } from "node:fs";
import { loadEnvLocal } from "./env-local.ts";
import { applyThreshold, buildQuestions, buildState, provenance } from "../src/lib/news-characterize.ts";
import { jevEngine } from "../src/lib/news-characterize-engines.ts";
import { ASKABLE, ASKABLE_IDS, CATEGORIES, SUB_ISSUES, TAXONOMY_VERSION, categoriesFor } from "../src/lib/news-issues.ts";

loadEnvLocal(import.meta.url);
const args = process.argv.slice(2);
const num = (n: string, d: number) => { const i = args.indexOf(n); if (i === -1) return d; const v = Number(args[i+1]); return Number.isFinite(v) ? v : d; };
const threshold = num("--threshold", 0.85);
const concurrency = Math.max(1, Math.min(10, num("--concurrency", 6)));
const outPath = args.indexOf("--out") !== -1 ? args[args.indexOf("--out") + 1] : null;
const pool = args.find((a) => !a.startsWith("--") && !args.includes(a) === false && a.endsWith(".jsonl"));
if (!pool) { console.error("need a pool .jsonl"); process.exit(2); }

interface Row { title: string; summary: string | null; url: string; outlet: string; publisher: string; publishedAt: string | null }
const rows: Row[] = readFileSync(pool, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));

let engine;
try { engine = jevEngine(); } catch (e) { console.error((e as Error).message); process.exit(2); }
const questions = buildQuestions(ASKABLE);
console.error(`${rows.length} articles · threshold ${threshold} · concurrency ${concurrency} · ${provenance(engine.modelId, questions, TAXONOMY_VERSION)}`);

const tags: string[][] = new Array(rows.length);
let tokens = 0, errors = 0, done = 0;

async function worker(start: number) {
  for (let i = start; i < rows.length; i += concurrency) {
    try {
      const { answers, usage } = await engine!.characterize(buildState(rows[i]), questions);
      tags[i] = applyThreshold(answers, threshold, ASKABLE_IDS);
      if (usage?.input_tokens) tokens += usage.input_tokens;
    } catch { errors++; tags[i] = []; }
    if (++done % 100 === 0) console.error(`  ${done}/${rows.length}`);
  }
}
await Promise.all(Array.from({ length: concurrency }, (_, k) => worker(k)));

/* ---- aggregate ---------------------------------------------------------- */
const L = (id: string) => SUB_ISSUES.find((s) => s.id === id)?.label ?? CATEGORIES.find((c) => c.id === id)?.label ?? id;
const subCount = new Map<string, number>(SUB_ISSUES.map((s) => [s.id, 0]));
const catCount = new Map<string, number>(CATEGORIES.map((c) => [c.id, 0]));
let untagged = 0;
const perOutlet = new Map<string, { n: number; tagged: number }>();

rows.forEach((r, i) => {
  const t = tags[i] ?? [];
  if (t.length === 0) untagged++;
  for (const id of t) subCount.set(id, (subCount.get(id) ?? 0) + 1);
  for (const c of categoriesFor(t)) catCount.set(c, (catCount.get(c) ?? 0) + 1);
  const o = perOutlet.get(r.publisher) ?? { n: 0, tagged: 0 };
  o.n++; if (t.length) o.tagged++;
  perOutlet.set(r.publisher, o);
});

const pc = (n: number) => `${((n / rows.length) * 100).toFixed(1)}%`;
const bar = (n: number, max: number) => "█".repeat(Math.round((n / Math.max(1, max)) * 40));
const out: string[] = [];
const say = (s = "") => { out.push(s); console.log(s); };

const dates = rows.map((r) => r.publishedAt).filter(Boolean).sort();
say(`# What the Florida press covered — corpus analysis`);
say();
say(`**${rows.length} articles** from **${perOutlet.size} outlets**, published `
  + `${dates[0]?.slice(0,10)} → ${dates[dates.length-1]?.slice(0,10)}. `
  + `Engine \`${engine.modelId}\`, taxonomy v${TAXONOMY_VERSION}, threshold ${threshold}.`);
say();
say(`**${untagged} of ${rows.length} (${pc(untagged)}) carried no tracked issue at all** — obituaries, `
  + `sport, weather, traffic, entertainment. That is the real noise floor of a local-news sweep.`);
say();
say(`## Coverage by category`);
say();
say(`| Category | Articles | Share |`);
say(`|---|---|---|`);
const catMax = Math.max(...catCount.values());
for (const [id, n] of [...catCount].sort((a, b) => b[1] - a[1])) {
  const c = CATEGORIES.find((x) => x.id === id)!;
  say(`| ${c.label}${c.inQuiz ? "" : " *(not in quiz)*"} | ${n} | ${pc(n)} ${bar(n, catMax)} |`);
}
say();
say(`## Coverage by issue`);
say();
say(`| Issue | Articles | Share |`);
say(`|---|---|---|`);
for (const [id, n] of [...subCount].sort((a, b) => b[1] - a[1])) say(`| ${id} ${L(id)} | ${n} | ${pc(n)} |`);
say();
say(`## Outlets by how much tracked-issue news they carried`);
say();
say(`| Outlet | Articles | With an issue | Rate |`);
say(`|---|---|---|---|`);
for (const [pub, v] of [...perOutlet].sort((a, b) => b[1].tagged / b[1].n - a[1].tagged / a[1].n)) {
  say(`| ${pub} | ${v.n} | ${v.tagged} | ${((v.tagged / v.n) * 100).toFixed(0)}% |`);
}
say();
say(`_${tokens} input tokens · $${((tokens/1_000_000)*0.042).toFixed(4)} · ${errors} errors._`);
say(`_Analysis only: nothing was written to news_item. Storing rows still requires gate C7-a and migration 0027._`);

if (outPath) { writeFileSync(outPath, out.join("\n") + "\n"); console.error(`\nwrote ${outPath}`); }
