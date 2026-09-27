# Ingest report: FL-DOE-89243 (David Jolly, FL-GOV-general)

**Result: FAILURE (exit 127). The ingest script never ran.**

| Field | Value |
|---|---|
| Site | https://davidjolly.com/ |
| Start (UTC) | 2026-09-27T12:34:25Z |
| End (UTC) | 2026-09-27T12:34:29Z |
| Wall-clock | about 4 s |
| Exit code | 127 (command not found) |

## Cause

The command was run exactly as specified:

    /usr/bin/time -v node scripts/candidate-site-ingest.ts --site https://davidjolly.com/ \
      --out docs/general-election/brief-runs/FL-GOV/FL-DOE-89243/passages.jsonl 2> docs/general-election/brief-runs/FL-GOV/FL-DOE-89243/ingest.log

This environment has no `/usr/bin/time` binary. In bash, `time` exists only as a shell keyword. The shell failed before it started `node`, so the site was never contacted. Nothing was crawled and no robots.txt was fetched.

Full contents of `ingest.log`:

    /bin/bash: line 4: /usr/bin/time: No such file or directory

## Passages

- `passages.jsonl` was not created, so the passage count is **0**.
- Distinct page URLs: **none**.

## robots.txt / Crawl-delay / bot-challenge / browser-fallback / unreachable lines

None. The script did not run, so the log contains no such lines.

## About / bio / "Who I am" page

None. No pages were fetched.

## Not retried

The rules say not to retry with a changed command, so I didn't. To rerun, you could drop the `/usr/bin/time -v` wrapper, install GNU `time` (Debian package `time`), or use the bash `time` keyword.
