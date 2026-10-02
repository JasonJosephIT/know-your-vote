# Ingest subagent prompt (Step 1)

The same template goes to every candidate. Only the header block differs.
Ingest is deterministic (`scripts/candidate-site-ingest.ts`), so no role system
prompt applies. The subagent runs the script and reports what it did, and
nothing else.

## Header (per candidate)

```
CANDIDATE_ID: {{candidate_id}}
NAME: {{legal_name}}
RACE: FL-GOV-general
OFFICIAL_SITE: {{official_site}}
OUT_DIR: docs/general-election/brief-runs/FL-GOV/{{candidate_id}}
```

## Body (verbatim for every candidate)

```
You are the INGEST step for the Know Your Vote FL-GOV brief run. Work in the
repository at /home/user/know-your-vote. You run one deterministic script and
report what it did. You do not read, summarize or judge the candidate's content.

1. Record the start time: `date -u +%Y-%m-%dT%H:%M:%SZ`.
2. Run, from the repo root, exactly:
     mkdir -p {{OUT_DIR}} && node scripts/candidate-site-ingest.ts --site {{official_site}} \
       --out {{OUT_DIR}}/passages.jsonl 2> {{OUT_DIR}}/ingest.log
   (No timing wrapper: the container has no /usr/bin/time. Wall-clock comes from
   the start and end timestamps in steps 1 and 3.)
   Use the script's defaults for --pages and --browser. Do not pass any other flag.
   Let it take as long as it takes: it honours robots.txt and Crawl-delay, which
   must never be shortened.
3. Record the end time and the exit code.
4. Report, and write the same report to {{OUT_DIR}}/ingest-report.md:
   - start, end, wall-clock seconds, exit code;
   - passage count (`wc -l` of passages.jsonl) and distinct page URLs
     (`jq -r .url` | sort -u), listed;
   - every robots.txt / Crawl-delay / bot-challenge / browser-fallback / unreachable
     line from ingest.log, verbatim;
   - whether any fetched page looks like an About / bio / "Who I am" page (by URL only).

Rules:
- A result of zero passages or a non-zero exit is a FAILURE to report as-is. Do not
  retry with different flags, other URLs, or a different tool.
- Never solve a captcha, never bypass robots.txt, never edit passages.jsonl.
- Do not fetch the site any other way (no curl, no browser) beyond the script.
- Do not commit. Do not touch any file outside {{OUT_DIR}}.
```

## Revision history

- 2026-09-27, attempt 1 (David Jolly): the command was wrapped in `/usr/bin/time -v`,
  which this container lacks. The shell exited 127 before `node` started, and no request
  reached the site. The wrapper was removed. The failed attempt's report is kept in
  `FL-DOE-89243/attempt-1-failed/`. It cost 59,117 subagent tokens.
- 2026-09-27, before the other six candidates: added `mkdir -p {{OUT_DIR}} &&`, because their
  run folders did not exist yet (Jolly's had been created by hand). Nothing else changed. The
  six ingests were dispatched with this version.
- 2026-09-29: the ingest's default link choice changed from the keyword list to Jev
  (`--links jev`, founder decision in `decisions.md`). The command above is unchanged,
  and it now needs `TYPESAFE_API_KEY` in the environment. The re-ingest of every site
  that day ran this command through `../jev-driver-2026-09-29.sh`, not per-candidate
  subagents.
