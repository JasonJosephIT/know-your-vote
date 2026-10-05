// Builds the per-candidate ingest-report.md files and the batch summary for the
// 2026-09-29 ingest from what the driver left on disk: meta.tsv, ingest.log and
// passages.jsonl. It reads only; it never edits passages.jsonl or re-fetches a site.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const BASE = "docs/general-election/brief-runs";
const [batchStart, batchEnd] = process.argv.slice(2);
const targets = readFileSync(`${BASE}/ingest-targets-2026-09-29.tsv`, "utf8")
  .trim().split("\n").slice(1).map((l) => {
    const [race, cid, name, site] = l.split("\t");
    return { race, cid, name, site, dir: `${BASE}/${race.replace(/-general$/, "")}/${cid}` };
  });

const ABOUT = /\/(about|bio|biography|who-?i-?am|meet|my-story|our-story|story)(\b|[-_/])/i;
const NODE_WARNING = /MODULE_TYPELESS_PACKAGE_JSON|^Reparsing as ES module|^To eliminate this warning|^\(Use `node --trace-warnings/;
const PASSAGE_LINE = /^\s+\d+ passage\(s\)\s+\S/;
const SELECTED = /^\s+(\d+) links, (\d+) policy page\(s\) selected \(cap (\d+)\)/;

const secs = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 1000);

function classify(r) {
  if (r.exit === 0 && r.passages > 0) return "ok";
  const log = r.log;
  if (/robots\.txt disallows .* — stopping/.test(log)) return "robots_block";
  if (/bot challenge did not clear/.test(log)) return "bot_wall";
  if (/Could not fetch the homepage/.test(log)) return "unreachable";
  if (r.passages === 0 && /bot challenge \(HTTP \d+\), retrying in the browser/.test(log)) return "challenge_empty";
  if (r.passages === 0 && r.links > 0) return "no_text";
  if (r.passages === 0) return "zero_passages";
  return "nonzero_exit";
}

const LABEL = {
  ok: "SUCCESS",
  robots_block: "FAILURE: robots.txt disallows the crawl (honoured)",
  bot_wall: "FAILURE: bot challenge did not clear (not solved, by rule)",
  unreachable: "FAILURE: homepage could not be fetched",
  challenge_empty: "FAILURE: bot challenge; the browser rendered a page with no links and no text",
  no_text: "FAILURE: homepage fetched with links but no text (likely rendered client-side; no challenge, so no browser fallback)",
  zero_passages: "FAILURE: zero passages",
  nonzero_exit: "FAILURE: non-zero exit",
};

const rows = targets.map((t) => {
  const meta = Object.fromEntries(readFileSync(`${t.dir}/meta.tsv`, "utf8").trim().split("\n").map((l) => l.split("\t")));
  const log = existsSync(`${t.dir}/ingest.log`) ? readFileSync(`${t.dir}/ingest.log`, "utf8") : "";
  const jsonl = existsSync(`${t.dir}/passages.jsonl`) ? readFileSync(`${t.dir}/passages.jsonl`, "utf8") : "";
  const passages = jsonl.split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const perUrl = new Map();
  for (const p of passages) perUrl.set(p.url, (perUrl.get(p.url) ?? 0) + 1);
  const urls = [...perUrl.keys()].sort();
  const lines = log.split("\n");
  const sel = lines.map((l) => l.match(SELECTED)).find(Boolean);
  const notes = lines.filter((l) => l.trim() && !NODE_WARNING.test(l) && !PASSAGE_LINE.test(l) &&
    !SELECTED.test(l) && !/^site: /.test(l) && !/^\d+ passage\(s\)( ->|$)/.test(l.trim()));
  const r = {
    ...t, start: meta.start, end: meta.end, exit: Number(meta.exit), log, passages: passages.length,
    words: passages.reduce((n, p) => n + p.text.split(/\s+/).filter(Boolean).length, 0),
    perUrl, urls, notes, links: sel ? Number(sel[1]) : null, selected: sel ? Number(sel[2]) : null,
    cap: sel ? Number(sel[3]) : null, about: urls.filter((u) => ABOUT.test(new URL(u).pathname)),
    crawlDelay: (log.match(/honoring Crawl-delay: (\S+)s/) ?? [])[1] ?? null,
    viaBrowser: Number((log.match(/(\d+) page\(s\) fetched in the browser/) ?? [])[1] ?? 0),
  };
  r.status = classify(r);
  return r;
});

for (const r of rows) {
  const cmd = `mkdir -p ${r.dir} && node scripts/candidate-site-ingest.ts --site ${r.site} \\\n  --out ${r.dir}/passages.jsonl 2> ${r.dir}/ingest.log`;
  const md = [
    `# Ingest report: ${r.cid} (${r.name}), ${r.race}`, "",
    `Site: ${r.site}`, "",
    "Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):", "",
    "```", cmd, "```", "",
    "## Run", "",
    "| Field | Value |", "|---|---|",
    `| Start (UTC) | ${r.start} |`, `| End (UTC) | ${r.end} |`,
    `| Wall-clock | ${secs(r.start, r.end)} s |`, `| Exit code | ${r.exit} |`, "",
    `Result: **${LABEL[r.status]}**`, "",
    "## Output", "",
    `- Passage count (\`wc -l passages.jsonl\`): **${r.passages}** (${r.words} words)`,
    `- Distinct page URLs (\`jq -r .url | sort -u\`): **${r.urls.length}**`,
    r.selected !== null ? `- Crawl: ${r.links} links on the homepage, ${r.selected} policy page(s) selected (cap ${r.cap})${r.selected === r.cap ? " — **cap reached**" : ""}` : "- Crawl: no link-selection line in the log (the crawl stopped before it)",
    `- About / bio page fetched (by URL): ${r.about.length ? r.about.join(", ") : "**no**"}`, "",
    ...(r.urls.length ? ["| URL | Passages |", "|---|---|", ...r.urls.map((u) => `| ${u} | ${r.perUrl.get(u)} |`), ""] : []),
    "## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)", "",
    ...(r.notes.length ? ["```", ...r.notes, "```"] : ["None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred."]),
    "", "The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.", "",
  ].join("\n");
  writeFileSync(`${r.dir}/ingest-report.md`, md);
}

// Batch summary.
const byRace = new Map();
for (const r of rows) byRace.set(r.race, [...(byRace.get(r.race) ?? []), r]);
const failed = rows.filter((r) => r.status !== "ok");
const count = (s) => rows.filter((r) => r.status === s).length;
const ok = rows.filter((r) => r.status === "ok");
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const rel = (r) => `${r.race.replace(/-general$/, "")}/${r.cid}`;

const summary = [
  "# Ingest, all remaining general-election races (2026-09-29)", "",
  "Session C2, Step 1 only, for every ballot candidate with an `official_site` outside FL-GOV. **Fetch and save only:** no Jev run, no database write, nothing published. Steps 2–6 wait on the founder.", "",
  "## How it ran", "",
  "- **Targets:** `ingest-targets-2026-09-29.tsv`, queried from Supabase on 2026-09-29: every `ballot_status = 'ballot'` candidate with a non-null `official_site` in a general race other than FL-GOV-general. That is " + `${rows.length} candidates in ${byRace.size} races.`,
  "- **Command:** the exact one from `FL-GOV/ingest-prompt.md`, per candidate: default `--pages` (8) and `--browser` (auto), no other flag, no retry. Output goes to `<RACE>/<candidate_id>/` (`passages.jsonl`, `ingest.log`, `meta.tsv`, `ingest-report.md`).",
  "- **Driver:** `ingest-driver-2026-09-29.sh` ran the command directly, six candidates at a time (each a different host), instead of dispatching one subagent per candidate as the FL-GOV run did. The command, flags and rules are identical; the subagent added only the report, which `ingest-reports-2026-09-29.mjs` now writes from the same files. This saves roughly 60k subagent tokens per candidate.",
  "- **Politeness:** the script reads robots.txt (its own token and every Anthropic crawler token) and honours any Crawl-delay; requests to one host are serialized. No captcha was solved and no robots rule was bypassed. Chromium trusts the proxy CA (checked before the run), so a browser failure below is the site's, not the container's.",
  `- **Wall-clock:** ${batchStart} → ${batchEnd} (${Math.round(secs(batchStart, batchEnd) / 60)} min) for the whole batch.`, "",
  "## Totals", "",
  "| | Candidates |", "|---|---|",
  `| Readable (exit 0, passages > 0) | **${count("ok")}** |`,
  `| Bot challenge did not clear | ${count("bot_wall")} |`,
  `| robots.txt disallows | ${count("robots_block")} |`,
  `| Bot challenge; browser rendered an empty page | ${count("challenge_empty")} |`,
  `| Links but no text (client-side rendering, no challenge) | ${count("no_text")} |`,
  `| Homepage unreachable | ${count("unreachable")} |`,
  `| Zero passages, other | ${count("zero_passages")} |`,
  `| Non-zero exit, other | ${count("nonzero_exit")} |`,
  `| **Total** | **${rows.length}** |`, "",
  `Across the readable sites: ${ok.reduce((n, r) => n + r.passages, 0)} passages (median ${median(ok.map((r) => r.passages))}, range ${Math.min(...ok.map((r) => r.passages))}–${Math.max(...ok.map((r) => r.passages))}); ${ok.filter((r) => r.selected === r.cap).length} hit the 8-page cap; ${ok.filter((r) => r.selected === 0).length} yielded the homepage only; ${ok.filter((r) => r.about.length).length} fetched an About or bio page; ${rows.filter((r) => r.crawlDelay).length} set a Crawl-delay; ${rows.filter((r) => r.viaBrowser > 0).length} needed the browser for at least one page.`, "",
  ...(failed.length ? ["## Failures (reported as-is, not retried)", "",
    "| Race | Candidate | Site | Result | Exit | Log (first noteworthy line) |", "|---|---|---|---|---|---|",
    ...failed.map((r) => `| ${r.race} | ${r.cid} ${r.name} | ${r.site} | ${LABEL[r.status]} | ${r.exit} | \`${(r.notes[0] ?? "").trim().replace(/\|/g, "\\|")}\` |`), "",
    "Under D3/D4 each of these becomes **recorded silence** (`no_stated_position_found` on every spine issue) unless the founder decides otherwise. Full logs are in each folder.", ""] : []),
  "## Findings for the founder (information only; nothing was re-run or edited)", "",
  `1. **Most sites give the homepage only.** ${ok.filter((r) => r.selected === 0).length} of ${ok.length} readable sites had no link the policy selector recognises (\`POLICY_PATH_HINTS\`: issues, platform, priorities, plan, vision, where-i-stand and similar), so only the homepage was read. The ones left with 4 passages or fewer, statewide and congressional campaigns among them: ${ok.filter((r) => r.selected === 0 && r.passages <= 4).map((r) => `${r.name} (${r.passages})`).join(", ")}. Their thin result is the selector's reach, not necessarily the candidate's silence. Changing the selector would change the ingest for every candidate, so it is a founder decision, and FL-GOV would need the same re-ingest to stay equal.`,
  `2. **The About page is almost never fetched.** ${rows.filter((r) => r.about.length).length} of ${rows.length} (${rows.filter((r) => r.about.length).map((r) => r.name).join(", ")}). The bio section (D1) still has no source for the self-description; this is FL-GOV's finding 4 at scale.`,
  `3. **The HTTP 202 challenge is one wall across many sites.** ${failed.filter((r) => /HTTP 202/.test(r.log)).length} of the ${failed.length} failures got an HTTP 202 bot challenge (Jewett's in FL-GOV was the same); ${failed.filter((r) => /HTTP 403/.test(r.log)).map((r) => r.name).join(", ")} got an HTTP 403 one (as Abrams did). On some, Chromium never cleared it; on others it "cleared" to a page with no links or text. Either way no candidate text was read. Solving or working around it is ruled out.`,
  `4. **One site blocks Anthropic crawlers by name in robots.txt** (${rows.filter((r) => r.status === "robots_block").map((r) => `${r.name}, ${r.site}`).join("; ")}). The script stopped, as it must.`,
  `5. **The 8-page cap bit only ${ok.filter((r) => r.selected === r.cap).length} site(s)** (${ok.filter((r) => r.selected === r.cap).map((r) => r.name).join(", ")}), so the cap is not today's main source of unevenness; finding 1 is.`, "",
  "## Per race", "",
  "| Race | Candidate | Passages | Pages | Links → selected | About page | Crawl-delay | Browser pages | Result |", "|---|---|---|---|---|---|---|---|---|",
  ...[...byRace.entries()].flatMap(([race, rs]) => rs.map((r, i) =>
    `| ${i ? "" : race} | [${r.cid}](${rel(r)}/ingest-report.md) ${r.name} | ${r.passages} | ${r.urls.length} | ${r.selected === null ? "—" : `${r.links} → ${r.selected}${r.selected === r.cap ? " (cap)" : ""}`} | ${r.about.length ? "yes" : "no"} | ${r.crawlDelay ? r.crawlDelay + " s" : "—"} | ${r.viaBrowser || "—"} | ${r.status === "ok" ? "ok" : "**" + r.status + "**"} |`)), "",
  "## Races where the candidates start uneven", "",
  "Races where one candidate is readable and another is not, or where passage counts differ by 10× or more. These are the races whose `word_count` gate will need the founder's call, as FL-GOV's did.", "",
  ...[...byRace.entries()].filter(([, rs]) => rs.length > 1).map(([race, rs]) => {
    const ps = rs.map((r) => r.passages); const mx = Math.max(...ps), mn = Math.min(...ps);
    return mn === 0 || mx >= 10 * mn ? `- **${race}:** ${rs.map((r) => `${r.name} ${r.passages}`).join(", ")}` : null;
  }).filter(Boolean), "",
  "Races where some ballot candidates have no `official_site` at all are not visible here (this list covers only candidates with a site); they are silent under D3.", "",
  "## Next, on the founder's go-ahead", "",
  "1. Step 2 (Jev) for the readable candidates, with the FL-GOV flags (`--limit 100000`, threshold 0.85), then Step 3 reviews.",
  "2. Each race's spine and `word_count` decision, as D1/D2 were for FL-GOV.",
  "3. The open items from FL-GOV still apply to every race: the About-page fetch for the bio section, commitment-gate recall at 0.85, the A1 wording that catches health insurance, and the 8-page cap.", "",
].join("\n");
writeFileSync(`${BASE}/ingest-2026-09-29.md`, summary);
console.log(`${rows.length} reports; ok=${count("ok")} failed=${failed.length}`);
