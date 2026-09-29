# Ingest report: FL-DOE-90721 (Maria Elvira Salazar), FL-27-general

Site: https://mariaelvirasalazar.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-27/FL-DOE-90721 && node scripts/candidate-site-ingest.ts --site https://mariaelvirasalazar.com/ \
  --out docs/general-election/brief-runs/FL-27/FL-DOE-90721/passages.jsonl 2> docs/general-election/brief-runs/FL-27/FL-DOE-90721/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:47:39Z |
| End (UTC) | 2026-09-29T09:49:14Z |
| Wall-clock | 95 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **96** (3313 words)
- Distinct page URLs (`jq -r .url | sort -u`): **9**
- Crawl: 81 links on the homepage, 8 policy page(s) selected (cap 8) — **cap reached**
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://mariaelvirasalazar.com/ | 4 |
| https://mariaelvirasalazar.com/earlyvoting | 2 |
| https://mariaelvirasalazar.com/issues | 11 |
| https://mariaelvirasalazar.com/issues/economy | 11 |
| https://mariaelvirasalazar.com/issues/environment | 15 |
| https://mariaelvirasalazar.com/issues/fight_socialism | 10 |
| https://mariaelvirasalazar.com/issues/healthcare | 11 |
| https://mariaelvirasalazar.com/issues/infrastructure | 20 |
| https://mariaelvirasalazar.com/issues/public_safety | 12 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  honoring Crawl-delay: 10s
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
