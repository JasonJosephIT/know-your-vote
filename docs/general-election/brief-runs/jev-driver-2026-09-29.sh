#!/usr/bin/env bash
# Re-ingest with Jev link picking, then Step 2 (Jev policy run), for every ballot
# candidate with an official_site: the 46 races of the first 2026-09-29 ingest plus
# FL-GOV. Founder, 2026-09-29: pick links with Jev, remove the Step 2 --limit,
# and re-ingest FL-GOV the same way. Same flags for everyone: ingest defaults
# (--pages 8, --browser auto, --links jev), policy run at the default 0.85
# threshold with no --limit. No retry with other flags. Six candidates at once,
# each a different host; the ingest honours robots.txt and Crawl-delay per host.
# Needs TYPESAFE_API_KEY in the environment (never written to a file).
set -u
cd "$(dirname "$0")/../../.."
B=docs/general-election/brief-runs
# A target file can be passed as $1 (the one identical re-run of failures uses
# jev-retry-targets-2026-09-29.tsv); the default is the full list.
TARGETS=${1:-$B/jev-targets-2026-09-29.tsv}

one() {
  local site="$4" out="$B/$5"
  local start end code pcode=""
  mkdir -p "$out"
  start=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  node scripts/candidate-site-ingest.ts --site "$site" \
    --out "$out/passages.jsonl" 2> "$out/ingest.log"
  code=$?
  end=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  if [ "$code" -eq 0 ]; then
    node scripts/candidate-policy-noul.ts --in "$out/passages.jsonl" \
      --json "$out/run.json" > "$out/run-report.txt" 2> "$out/run.log"
    pcode=$?
  fi
  printf 'start\t%s\nend\t%s\nexit\t%s\nsite\t%s\npolicy_exit\t%s\npolicy_end\t%s\n' \
    "$start" "$end" "$code" "$site" "$pcode" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$out/meta.tsv"
  echo "$(date -u +%H:%M:%S) ingest=$code policy=${pcode:-skip} $2 $site"
}
export -f one
export B

tail -n +2 "$TARGETS" | while IFS=$'\t' read -r race cid name site out; do
  printf '%s\0%s\0%s\0%s\0%s\0' "$race" "$cid" "$name" "$site" "$out"
done | xargs -0 -n 5 -P 6 bash -c 'one "$@"' _
