#!/usr/bin/env bash
# Step 1 (ingest) for every ballot candidate with an official_site outside FL-GOV.
# Runs the exact command from FL-GOV/ingest-prompt.md once per candidate: default
# --pages and --browser, no other flag, no retry. Six candidates run at once; each is
# a different host, and the script itself serializes requests and honours robots.txt
# and Crawl-delay within its host. Per-candidate start, end and exit code go to meta.tsv.
set -u
cd "$(dirname "$0")/../../.."
TARGETS=docs/general-election/brief-runs/ingest-targets-2026-09-29.tsv

one() {
  local race="$1" cid="$2" site="$4"
  local out="docs/general-election/brief-runs/${race%-general}/${cid}"
  local start end code
  start=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  mkdir -p "$out" && node scripts/candidate-site-ingest.ts --site "$site" \
    --out "$out/passages.jsonl" 2> "$out/ingest.log"
  code=$?
  end=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  printf 'start\t%s\nend\t%s\nexit\t%s\nsite\t%s\n' "$start" "$end" "$code" "$site" > "$out/meta.tsv"
  echo "$end exit=$code $race $cid $site"
}
export -f one

tail -n +2 "$TARGETS" | while IFS=$'\t' read -r race cid name site; do
  printf '%s\0%s\0%s\0%s\0' "$race" "$cid" "$name" "$site"
done | xargs -0 -n 4 -P 6 bash -c 'one "$@"' _
