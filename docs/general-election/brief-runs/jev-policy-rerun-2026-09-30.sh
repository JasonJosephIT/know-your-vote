#!/usr/bin/env bash
# Step 2 again, on the same passages, with the second gate (policy-noul.ts
# OWN_COMMITMENT_ID). Founder, 2026-09-30: option 1 of review-2026-09-29.md.
# No site is fetched. The one-gate run and its review move to
# attempt-1-one-gate/ in each candidate folder; the new run is written in place.
# Same flags for everyone: default threshold 0.85, no --limit. Six at once.
# Needs TYPESAFE_API_KEY in the environment (never written to a file).
set -u
cd "$(dirname "$0")/../../.."
B=docs/general-election/brief-runs
one() {
  local out="$B/$5"
  [ -s "$out/passages.jsonl" ] && [ -f "$out/run.json" ] || return 0
  mkdir -p "$out/attempt-1-one-gate"
  for f in run.json run-report.txt run.log review.md; do
    [ -e "$out/$f" ] && mv "$out/$f" "$out/attempt-1-one-gate/$f"
  done
  node scripts/candidate-policy-noul.ts --in "$out/passages.jsonl" \
    --json "$out/run.json" > "$out/run-report.txt" 2> "$out/run.log"
  echo "$(date -u +%H:%M:%S) policy=$? $2"
}
export -f one
export B
tail -n +2 "$B/jev-targets-2026-09-29.tsv" | while IFS=$'\t' read -r race cid name site out; do
  printf '%s\0%s\0%s\0%s\0%s\0' "$race" "$cid" "$name" "$site" "$out"
done | xargs -0 -n 5 -P 6 bash -c 'one "$@"' _
