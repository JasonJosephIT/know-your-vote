# Ingest report: FL-DOE-90009 (Angie Nixon), FL-SEN-general

Site: https://angienixon.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-SEN/FL-DOE-90009 && node scripts/candidate-site-ingest.ts --site https://angienixon.com/ \
  --out docs/general-election/brief-runs/FL-SEN/FL-DOE-90009/passages.jsonl 2> docs/general-election/brief-runs/FL-SEN/FL-DOE-90009/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:49:24Z |
| End (UTC) | 2026-09-29T09:49:44Z |
| Wall-clock | 20 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **162** (5042 words)
- Distinct page URLs (`jq -r .url | sort -u`): **5**
- Crawl: 135 links on the homepage, 4 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://angienixon.com/ | 18 |
| https://angienixon.com/angie-nixon-condemns-ashley-moodys-hypocrisy-on-immigration-and-blind-support-for-trumps-mass-deportations | 6 |
| https://angienixon.com/priorities | 111 |
| https://angienixon.com/rep-angie-nixon-condemns-trump-administration-decision-to-kick-750000-americans-off-health-insurance | 5 |
| https://angienixon.com/vote | 22 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  only 73 characters of text, rendering in the browser: https://angienixon.com/
  only 73 characters of text, rendering in the browser: https://angienixon.com/priorities
  only 73 characters of text, rendering in the browser: https://angienixon.com/rep-angie-nixon-condemns-trump-administration-decision-to-kick-750000-americans-off-health-insurance
  only 73 characters of text, rendering in the browser: https://angienixon.com/angie-nixon-condemns-ashley-moodys-hypocrisy-on-immigration-and-blind-support-for-trumps-mass-deportations
  only 73 characters of text, rendering in the browser: https://angienixon.com/vote
  5 page(s) fetched in the browser
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
