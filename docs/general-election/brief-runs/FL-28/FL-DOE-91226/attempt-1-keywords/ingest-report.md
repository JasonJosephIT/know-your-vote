# Ingest report: FL-DOE-91226 (Carlos A. Gimenez), FL-28-general

Site: https://carlosgimenezforcongress.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-28/FL-DOE-91226 && node scripts/candidate-site-ingest.ts --site https://carlosgimenezforcongress.com/ \
  --out docs/general-election/brief-runs/FL-28/FL-DOE-91226/passages.jsonl 2> docs/general-election/brief-runs/FL-28/FL-DOE-91226/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:47:42Z |
| End (UTC) | 2026-09-29T09:47:46Z |
| Wall-clock | 4 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **3** (136 words)
- Distinct page URLs (`jq -r .url | sort -u`): **2**
- Crawl: 19 links on the homepage, 1 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://carlosgimenezforcongress.com/ | 2 |
| https://carlosgimenezforcongress.com/take-now-issue-priority-surveyvv | 1 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
