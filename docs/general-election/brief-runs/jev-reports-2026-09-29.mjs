// Builds the per-candidate ingest-report.md files and the summary for the
// 2026-09-29 Jev-link re-ingest and Step 2 run, from what jev-driver-2026-09-29.sh
// left on disk (meta.tsv, ingest.log, links.jsonl, passages.jsonl, run.json).
// It reads only; it never edits passages or re-fetches a site.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const BASE = "docs/general-election/brief-runs";
const [batchStart, batchEnd] = process.argv.slice(2);
const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const jsonl = (p) => read(p).split("\n").filter(Boolean).map((l) => JSON.parse(l));
const secs = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 1000);
const COST_PER_MTOK = 0.042; // input-only, as recorded in news-issue-taxonomy-options-2026-09-18.md

const NODE_WARNING = /MODULE_TYPELESS_PACKAGE_JSON|^Reparsing as ES module|^To eliminate this warning|^\(Use `node --trace-warnings/;
const SELECTED = /^\s+(\d+) links, (\d+) policy page\(s\) selected \(cap (\d+)\)(?:, about page: (\S+))?/;
const PASSAGE_LINE = /^\s+\d+ passage\(s\)\s+\S/;

const targets = read(`${BASE}/jev-targets-2026-09-29.tsv`).trim().split("\n").slice(1).map((l) => {
  const [race, cid, name, site, out] = l.split("\t");
  return { race, cid, name, site, dir: `${BASE}/${out}` };
});

function before(t) {
  // The keyword crawl this replaces: attempt-1-keywords for the 46 races, the
  // published 2026-09-27 ingest for FL-GOV.
  const d = t.race === "FL-GOV-general" ? t.dir.replace(/\/reingest-2026-09-29$/, "") : `${t.dir}/attempt-1-keywords`;
  const ps = jsonl(`${d}/passages.jsonl`);
  return { passages: ps.length, pages: new Set(ps.map((p) => p.url)).size };
}

function classify(r) {
  if (r.exit === 0 && r.passages > 0) return "ok";
  if (/robots\.txt disallows .* — stopping/.test(r.log)) return "robots_block";
  if (/bot challenge did not clear/.test(r.log)) return "bot_wall";
  if (/Jev could not judge every link/.test(r.log)) return "jev_links_failed";
  if (/Could not fetch the homepage/.test(r.log)) return "unreachable";
  if (r.passages === 0 && /bot challenge \(HTTP \d+\), retrying in the browser/.test(r.log)) return "challenge_empty";
  if (r.passages === 0 && r.links > 0) return "no_text";
  return r.passages === 0 ? "zero_passages" : "nonzero_exit";
}
const LABEL = {
  ok: "SUCCESS",
  robots_block: "FAILURE: robots.txt disallows the crawl (honoured)",
  bot_wall: "FAILURE: bot challenge did not clear (not solved, by rule)",
  jev_links_failed: "FAILURE: Jev could not judge every link",
  unreachable: "FAILURE: homepage could not be fetched",
  challenge_empty: "FAILURE: bot challenge; the browser rendered a page with no links and no text",
  no_text: "FAILURE: homepage fetched with links but no text (client-side rendering, no challenge)",
  zero_passages: "FAILURE: zero passages",
  nonzero_exit: "FAILURE: non-zero exit",
};

const rows = targets.map((t) => {
  const meta = Object.fromEntries(read(`${t.dir}/meta.tsv`).trim().split("\n").map((l) => l.split("\t")));
  const log = read(`${t.dir}/ingest.log`);
  const passages = jsonl(`${t.dir}/passages.jsonl`);
  const links = jsonl(`${t.dir}/links.jsonl`);
  const run = existsSync(`${t.dir}/run.json`) ? JSON.parse(read(`${t.dir}/run.json`)) : null;
  const perUrl = new Map();
  for (const p of passages) perUrl.set(p.url, (perUrl.get(p.url) ?? 0) + 1);
  const lines = log.split("\n");
  const sel = lines.map((l) => l.match(SELECTED)).find(Boolean);
  const about = sel?.[4] && sel[4] !== "none" ? sel[4] : null;
  const notes = lines.filter((l) => l.trim() && !NODE_WARNING.test(l) && !PASSAGE_LINE.test(l) && !SELECTED.test(l) &&
    !/^site: /.test(l) && !/^\d+ passage\(s\)( ->|$)/.test(l.trim()) && !/asking Jev about/.test(l));
  const linkProv = (log.match(/as (jev:\S+\/links\/q-\w+)/) ?? [])[1] ?? null;
  const r = {
    ...t, start: meta.start, end: meta.end, exit: Number(meta.exit), policyExit: meta.policy_exit ?? "",
    log, passages: passages.length, words: passages.reduce((n, p) => n + p.text.split(/\s+/).filter(Boolean).length, 0),
    perUrl, urls: [...perUrl.keys()].sort(), links: sel ? Number(sel[1]) : null, selected: sel ? Number(sel[2]) : null,
    cap: sel ? Number(sel[3]) : null, about, aboutPassages: about ? perUrl.get(about) ?? 0 : 0, judged: links,
    overCap: links.filter((l) => l.policy !== null && l.policy >= 0.5 && l.chosen !== "policy").length,
    linkProv, notes, run, before: before(t),
    crawlDelay: (log.match(/honoring Crawl-delay: (\S+)s/) ?? [])[1] ?? null,
    viaBrowser: Number((log.match(/(\d+) page\(s\) fetched in the browser/) ?? [])[1] ?? 0),
  };
  r.status = classify(r);
  return r;
});

const f2 = (x) => (x === null || x === undefined ? "—" : Number(x).toFixed(2));
for (const r of rows) {
  const c = r.run?.counts;
  const md = [
    `# Ingest and policy run: ${r.cid} (${r.name}), ${r.race}`, "",
    `Site: ${r.site}`, "",
    "Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:", "",
    "```",
    `node scripts/candidate-site-ingest.ts --site ${r.site} --out ${r.dir}/passages.jsonl 2> ${r.dir}/ingest.log`,
    `node scripts/candidate-policy-noul.ts --in ${r.dir}/passages.jsonl --json ${r.dir}/run.json > ${r.dir}/run-report.txt 2> ${r.dir}/run.log`,
    "```", "",
    "## Ingest", "",
    "| Field | Value |", "|---|---|",
    `| Start / end (UTC) | ${r.start} → ${r.end} (${secs(r.start, r.end)} s) |`,
    `| Exit code | ${r.exit} |`,
    `| Result | **${LABEL[r.status]}** |`,
    `| Passages | **${r.passages}** (${r.words} words) from ${r.urls.length} page(s); keyword crawl: ${r.before.passages} from ${r.before.pages} |`,
    `| Links | ${r.links ?? "—"} on the homepage, ${r.judged.length} judged by Jev${r.linkProv ? ` (\`${r.linkProv}\`)` : ""} |`,
    `| Policy pages chosen | ${r.selected ?? "—"} (cap ${r.cap ?? 8})${r.overCap ? ` — **${r.overCap} more at or above 0.5 left out by the cap**` : ""} |`,
    `| About page | ${r.about ? `${r.about} (${r.aboutPassages} passage(s))` : "**none**"} |`, "",
    ...(r.urls.length ? ["| Page | Passages |", "|---|---|", ...r.urls.map((u) => `| ${u}${u === r.about ? " (About)" : ""} | ${r.perUrl.get(u)} |`), ""] : []),
    ...(r.judged.length ? ["### Every link Jev judged", "",
      "Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.", "",
      "| policy | about | chosen | link | text |", "|---|---|---|---|---|",
      ...[...r.judged].sort((a, b) => (b.policy ?? -1) - (a.policy ?? -1)).map((l) =>
        `| ${f2(l.policy)} | ${f2(l.about)} | ${l.chosen ?? ""} | ${new URL(l.url).pathname} | ${(l.text ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").slice(0, 60)} |`), ""] : []),
    "### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)", "",
    ...(r.notes.length ? ["```", ...r.notes, "```"] : ["None."]), "",
    "## Step 2: policy run (Jev)", "",
    ...(r.run ? [
      "| Field | Value |", "|---|---|",
      `| Status | ${r.run.status} (exit ${r.policyExit}) |`,
      `| Provenance | \`${r.run.provenance}\`, threshold ${r.run.threshold} |`,
      `| Asked | ${c.asked} of ${c.passages} passages, ${c.failed} failed |`,
      `| State a policy (gate ≥ ${r.run.threshold}) | ${c.states_policy} |`,
      `| …and match a taxonomy issue | ${c.with_issue} |`,
      `| Tokens | ${r.run.usage?.input_tokens ?? 0} in, ${r.run.usage?.output_tokens ?? 0} out |`, "",
      "The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.",
    ] : ["Not run: the ingest produced no passages."]), "",
  ].join("\n");
  writeFileSync(`${r.dir}/ingest-report.md`, md);
}

// ---- summary ---------------------------------------------------------------
const ok = rows.filter((r) => r.status === "ok");
const failed = rows.filter((r) => r.status !== "ok");
const runs = rows.filter((r) => r.run);
const sum = (xs, f) => xs.reduce((n, x) => n + f(x), 0);
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const inTok = sum(runs, (r) => r.run.usage?.input_tokens ?? 0);
const provs = [...new Set(runs.map((r) => r.run.provenance))];
const linkProvs = [...new Set(rows.map((r) => r.linkProv).filter(Boolean))];
const partial = runs.filter((r) => r.run.status !== "complete" || r.run.counts.failed > 0);
const byRace = new Map();
for (const r of rows) byRace.set(r.race, [...(byRace.get(r.race) ?? []), r]);
const rel = (r) => r.dir.slice(BASE.length + 1);
const wasHomeOnly = ok.filter((r) => r.before.pages <= 1);

const summary = [
  "# Re-ingest with Jev link picking, and Step 2 (2026-09-29)", "",
  "Founder, 2026-09-29, after `ingest-2026-09-29-keywords.md`: pick the links to follow with Jev instead of a word list, remove the Step 2 `--limit`, and re-ingest FL-GOV the same way so every candidate gets the same crawl. **No database write and nothing published.** FL-GOV's published brief is unchanged; its new files are in each candidate's `reingest-2026-09-29/`.", "",
  "## What changed", "",
  "- **Links:** `--links jev` (the new default, `src/lib/link-noul.ts`, tested by `scripts/verify-link-noul.ts`). Every on-site content link on the homepage is put to Jev as its path and anchor text with two questions: does it lead to stated positions, and is it the candidate's own About page. Links at or above 0.5 are followed, strongest first, up to the unchanged 8-page cap, **plus the strongest About page**. Donate, cart, contact, login, legal and site-plumbing links are never offered. News and press posts are, and Jev decides. Every judgement is saved in the candidate's `links.jsonl`.",
  "- **Step 2:** `--limit` is gone from `scripts/candidate-policy-noul.ts`; every passage is always asked, and passing `--limit` is now an error so an old command cannot look capped.",
  "- **Unchanged:** robots.txt (our token and every Anthropic token), Crawl-delay, one request at a time per site, the browser fallback, no captcha solving, the 8-page cap, and the 0.85 commitment threshold.", "",
  "## How it ran", "",
  `- **Targets:** \`jev-targets-2026-09-29.tsv\`: the 90 candidates of the first 2026-09-29 ingest plus FL-GOV's 7 sites, **${rows.length} in total**. Datto (FL-GOV) has no site and stays silent under D3.`,
  "- **Driver:** `jev-driver-2026-09-29.sh`, six candidates at a time, each a different host. For each one it runs the ingest, then, when that produced passages, the policy run. Same flags for everyone, no retries with other flags.",
  `- **Wall-clock:** ${batchStart} → ${batchEnd} (${Math.round(secs(batchStart, batchEnd) / 60)} min).`,
  `- **Provenance:** every policy run is \`${provs.join("`, `")}\`${provs.length === 1 ? " (identical across all runs)" : " — **NOT identical, see below**"}; every link judgement is \`${linkProvs.join("`, `")}\`.`, "",
  "## Totals", "",
  "| | Keyword crawl | Jev links |", "|---|---|---|",
  `| Readable sites | ${rows.filter((r) => r.before.passages > 0).length} | **${ok.length}** |`,
  `| Passages | ${sum(rows, (r) => r.before.passages)} | **${sum(ok, (r) => r.passages)}** (median ${median(ok.map((r) => r.passages))}) |`,
  `| Pages read (incl. homepages) | ${sum(rows, (r) => r.before.pages)} | **${sum(ok, (r) => r.urls.length)}** |`,
  `| Homepage only | ${rows.filter((r) => r.before.passages > 0 && r.before.pages <= 1).length} | **${ok.filter((r) => r.urls.length <= 1).length}** |`,
  `| About page read | ${1} | **${ok.filter((r) => r.about && r.aboutPassages > 0).length}** |`,
  `| Hit the 8-page cap | ${2} + Jolly | **${ok.filter((r) => r.selected === r.cap).length}** (${ok.filter((r) => r.overCap).map((r) => `${r.name}: ${r.overCap} left out`).join(", ") || "none left out"}) |`, "",
  `Of the ${wasHomeOnly.length} sites the keyword crawl read only at the homepage, ${wasHomeOnly.filter((r) => r.urls.length > 1).length} now reach more pages. The rest are one-page sites, or sites whose only other links Jev judged not to hold positions (their \`links.jsonl\` shows each score).`, "",
  "## Step 2 (Jev policy run)", "",
  `- **Runs:** ${runs.length} (every readable site), ${runs.filter((r) => r.run.status === "complete" && r.run.counts.failed === 0).length} complete with 0 failed requests${partial.length ? `; **partial: ${partial.map((r) => `${r.name} (${r.run.counts.failed} failed)`).join(", ")}**` : ""}.`,
  `- **Passages asked:** ${sum(runs, (r) => r.run.counts.asked)}; state a policy at 0.85: ${sum(runs, (r) => r.run.counts.states_policy)}; and match a taxonomy issue: ${sum(runs, (r) => r.run.counts.with_issue)}.`,
  `- **Cost:** ${(inTok / 1e6).toFixed(2)}M input tokens, about **$${(inTok / 1e6 * COST_PER_MTOK).toFixed(2)}** at $${COST_PER_MTOK}/MTok (input only). The link judgements are not in this total: about ${sum(rows, (r) => r.judged.length)} small requests.`, "",
  ...(failed.length ? ["## Failures (reported as-is, not retried)", "",
    "| Race | Candidate | Site | Result | Keyword crawl |", "|---|---|---|---|---|",
    ...failed.map((r) => `| ${r.race} | [${r.cid}](${rel(r)}/ingest-report.md) ${r.name} | ${r.site} | ${LABEL[r.status]} | ${r.before.passages ? `${r.before.passages} passages` : "also failed"} |`), "",
    "Under D3/D4 each becomes **recorded silence** unless the founder decides otherwise.", ""] : []),
  "## Per race", "",
  "| Race | Candidate | Passages (before → now) | Pages | Links judged → chosen | About | States a policy | Matches an issue | Result |", "|---|---|---|---|---|---|---|---|---|",
  ...[...byRace.entries()].flatMap(([race, rs]) => rs.map((r, i) =>
    `| ${i ? "" : race} | [${r.cid}](${rel(r)}/ingest-report.md) ${r.name} | ${r.before.passages} → **${r.passages}** | ${r.before.pages} → ${r.urls.length} | ${r.judged.length} → ${r.selected ?? "—"}${r.selected === r.cap ? " (cap)" : ""} | ${r.about ? "yes" : "no"} | ${r.run ? r.run.counts.states_policy : "—"} | ${r.run ? r.run.counts.with_issue : "—"} | ${r.status === "ok" ? "ok" : "**" + r.status + "**"} |`)), "",
  "## Races that still start uneven", "",
  "Multi-candidate races where a candidate is unreadable, or where the count of passages that state a policy differs 10× or more. Their `word_count` gate will need the founder's call, as FL-GOV's did.", "",
  ...[...byRace.entries()].filter(([, rs]) => rs.length > 1).map(([race, rs]) => {
    const ps = rs.map((r) => (r.run ? r.run.counts.states_policy : 0)); const mx = Math.max(...ps), mn = Math.min(...ps);
    return mn === 0 || mx >= 10 * mn ? `- **${race}:** ${rs.map((r) => `${r.name} ${r.run ? r.run.counts.states_policy : "unreadable"}`).join(", ")}` : null;
  }).filter(Boolean), "",
  "## Next, on the founder's go-ahead", "",
  "1. Step 3: Profiler reviews of each run (a reviewer subagent per candidate, as FL-GOV had).",
  "2. Each race's spine and `word_count` decision, then Step 4 plans and `brief.sql`, as D1/D2 were for FL-GOV.",
  "3. FL-GOV: decide whether to rebuild its brief from `reingest-2026-09-29/` (the published one came from the keyword crawl).",
  "4. The bio section can now quote the About pages read here (self-description); the Recorder facts are still to do.", "",
].join("\n");
writeFileSync(`${BASE}/ingest-jev-2026-09-29.md`, summary);
console.log(`${rows.length} reports; ok=${ok.length} failed=${failed.length} runs=${runs.length} partial=${partial.length}`);
