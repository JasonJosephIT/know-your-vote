# Session C2: write FL-GOV's briefs in Claude Code, then publish

**Start this session with:** "Read `docs/general-election/sessions/session-c2-claude-code-briefs.md` and do it. Use subagent-driven development."

**Why this exists (founder, 2026-09-27):** Session C (`session-c-brief-pilot.md`) runs the Python `cap_runtime`. That needs `SUPABASE_DB_URL`, a login for `cap_readonly` and an `ANTHROPIC_API_KEY`, and none of them is set. This session does the same job from inside Claude Code instead:
- subagents act as the agents;
- the repo's existing scripts do the deterministic steps;
- the Supabase MCP does the database writes.

Session C stays valid for later. Its `cap_runtime` path is not deleted.

**Run it on the founder's Mac**, in a Claude Code session with the Supabase MCP connected and the built-in browser available.

## What this gives up, and what replaces it

`cap_runtime` guaranteed equal treatment mechanically: every candidate got the same S1 tool layer, a read-only role and a budget, and every action went into `action_log`. Here the guarantee comes from process instead, and the session must keep all of it:

- **One prompt per role, the same for every candidate.** Each role's subagent prompt is the verbatim system prompt from `Civic Awareness (Know Your Vote)/Agents/<Role>/*_system_prompt.txt`, plus a candidate-specific header (name, id, site, spine). Nothing else differs between candidates. Save the exact prompt used to `docs/general-election/brief-runs/FL-GOV/<role>-prompt.md` before dispatching.
- **Same model, same settings, for every candidate in a role.** Record the model in the run report.
- **Every quote is verbatim and every claim has a source.** Deterministic code does the quoting: `candidate-policy-noul.ts` sends the passage and the model only scores it. Never edit a quote. Never trim to pass `word_count` (profile-writer §3).
- **Every subagent writes its full output to a file** under `docs/general-election/brief-runs/FL-GOV/`, which is committed. That's the audit trail that stands in for `action_log`.
- **A reviewer subagent checks each candidate's output** against the rules before anything reaches the database.

## Read first

- `docs/general-election/profile-writer-2026-09-21.md` (the pipeline, the four writer rules, and §3: why a site-only brief HALTs the audit on `word_count`).
- `docs/general-election/candidate-sites-2026-09-21.md` (FL-GOV sites, robots.txt notes, and Datto).
- `Civic Awareness (Know Your Vote)/Agents/The Profiler/profiler_system_prompt.txt`, `…/The Recorder/recorder_system_prompt.txt`, `…/The Fact-Checker/factchecker_system_prompt.txt`.
- `Civic Awareness (Know Your Vote)/balance_audit_core.py` (pure Python, with no DB, network or model; its thresholds are `DEFAULT_THRESHOLDS`).
- `supabase/migrations/0018_publication_audit.sql` (`set_race_publication`).
- `src/lib/policy-run.ts` (the `PolicyRun` shape) and `scripts/fixtures/brief-rows/` (an example plan and runs).

## What already exists and needs no new key

| Step | Tool | Needs |
| ---- | ---- | ----- |
| Fetch each site's own pages, honouring robots.txt including the Claude agent tokens | `node scripts/candidate-site-ingest.ts --site <url> --out passages.jsonl` | No key. Chromium is used for bot walls and JS-rendered pages. |
| Decide which passages state a policy, and on which issue | `node scripts/candidate-policy-noul.ts --in passages.jsonl --json run.json`. Run `--dry-run` and `node scripts/verify-policy-noul.ts` first. | `TYPESAFE_API_KEY`, which is **already set** in the root `.env.local` |
| Turn runs into brief SQL | `node scripts/brief-rows-sql.ts --plan plan.json --out brief.sql` | Nothing. It prints SQL and writes nothing itself. |
| The equal-scrutiny check | `balance_audit_core(profiles)` in `balance_audit_core.py` | Nothing: pure Python (`/usr/bin/python3`) |
| Publish | `SELECT set_race_publication('FL-GOV-general','published','founder','<reason>')` over the Supabase MCP | Founder sign-off |

## Decisions to get from the founder at the start (ask in one batch)

- **D1: FL-GOV's spine.** No spine is committed for FL-GOV. Propose 6–10 issues from the shared taxonomy (`src/lib/news-issues.ts` / `quiz-questions.ts` ids: economy, education, healthcare, housing, environment, immigration, insurance, safety, plus categories outside the quiz where FL-GOV coverage warrants them). The founder picks them. Every candidate is measured on the same list.
- **D2: How to pass `word_count`.** A site-only brief is expected to HALT, because campaign sites differ in length (profile-writer §3). The options:
  - (a) add the Recorder's comparable `verifiable_fact` claims per candidate;
  - (b) choose a smaller, level spine;
  - (c) make a recorded decision to change the threshold.

  (a) needs a small writer change (see Step 5). Never trim quotes.
- **D3: Datto,** who has no `official_site`. He will show `no_stated_position_found` on every spine issue. Confirm that this is what's published, or that the race waits.
- **D4: Jewett's site,** which is behind a captcha (`scottjewett.com`). If the ingest can't read it through the browser fallback, treat it as D3 (record silence honestly) or wait. **Never solve a captcha.**

## Steps

### 0. Pilot one candidate, and measure

Pick a site that's easy to crawl, such as `davidjolly.com` (`Crawl-delay: 10`, which must be honoured) or `burkettforgov.com`. Run Steps 1–3 for that candidate only. Record the wall-clock time, the number of Jev requests, and the subagent tokens from each `usage` block. Project the cost to 8 candidates and then to 53 races. **Report the numbers and stop for the founder's go-ahead before continuing.**

### 1. Ingest (one subagent per candidate, identical prompt, run in parallel)

Run `candidate-site-ingest.ts` for each FL-GOV `official_site` from `0032_fl_gov_official_sites.sql` (7 of the 8 candidates). Keep `passages.jsonl` per candidate under `brief-runs/FL-GOV/<candidate_id>/`. A result of zero passages is a failure to report, not something to work around.

### 2. Policy run (Jev)

- For each candidate: run `candidate-policy-noul.ts --dry-run` first, then the real run with `--json run.json`.
- Run the questions against the D1 spine. Check how the script takes its question set, and make every candidate use the same set and the same threshold. The provenance key in each `run.json` must be identical across all candidates; check this.

### 3. Profiler review (reviewer subagent per candidate)

The reviewer checks each run against `profiler_system_prompt.txt`'s constitution:
- only candidate-controlled sources;
- quotes verbatim from the passage;
- no inferred motive;
- silence recorded, not filled in.

Findings go to `brief-runs/FL-GOV/<id>/review.md`. Fix by re-running the same way, never by hand-editing a run.

### 4. Build the plan and the SQL

- Write `brief-runs/FL-GOV/plan.json` using the fixture's shape: `race_id`, `retrieved_at`, the D1 `spine`, and per candidate its `candidate_id`, `official_site` and `run` path. Include Datto with no run. Check what the writer expects for a candidate with no site, and extend it minimally if needed so he gets `no_stated_position_found` rows.
- Run `brief-rows-sql.ts --plan … --out brief-runs/FL-GOV/brief.sql` and read the output.

### 5. Only if D2 = (a): Recorder facts

- Run one Recorder subagent per candidate on `recorder_system_prompt.txt`. It uses independent or primary sources only (Allowlist B): public record, votes and filings. Every fact gets a fetched URL, and all candidates use the same kinds of source.
- `brief-rows.ts` only emits `stated_position` today. Extend it, using test-driven development against `scripts/verify-brief-rows*`, so a run can carry `verifiable_fact` claims with sources.
- Keep the writer's four rules; in particular, no source means no claim.

### 6. Apply, audit, publish

1. **Founder check.** Show the founder the per-candidate counts (words, facts, positions and spine coverage) and the review files. Apply `brief.sql` over the Supabase MCP **only after the founder says yes**.
2. **Audit.** Read the profiles back, run `balance_audit_core` on them, and write `balance_check_passed` and `flag_reason` onto each `profile.audit` with one SQL update. Record the verdict, with its numbers, in the run report.
3. **If the audit HALTs:** stop. Report which gate failed and by how much, and let the founder decide (D2). Don't re-run with trimmed content.
4. **If it passes, publish.** With the founder's sign-off, call `set_race_publication('FL-GOV-general','published','founder', …)`. That writes the audit row. Then read back as anon: the race is visible and all 8 profiles have `balance_check_passed = true`. Check `/races/FL-GOV-general` in the browser after the cache refreshes (up to about 2 hours). The new issue chips (PR #96) should appear for the first time.

## Output

- `docs/general-election/brief-runs/FL-GOV/`: the prompts, and each candidate's passages, runs, reviews, the plan and the SQL.
- `docs/general-election/pilot-run-2026-09-XX.md`: the measured cost, the projection to 53 races, every bug found, and the audit verdict with its numbers.
- Code changes (the writer extension, and any needed script fixes) as normal PRs, reviewed.
- **No migration.** The brief SQL is applied over the MCP. If a schema change is ever needed, claim the next free number in `supabase/migrations/README.md` first.

## Don't

- Don't trim, paraphrase or reorder quotes. Don't write any text about a candidate that the candidate or a cited source didn't say.
- Don't raise an audit threshold without a recorded founder decision.
- Don't solve captchas or ignore robots.txt, `Crawl-delay` included.
- Don't start a second race before FL-GOV has been through the audit.
- Don't publish without the founder's explicit yes in chat.
