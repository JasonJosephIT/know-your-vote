#!/bin/sh
# Create or refresh the clean worktree the scheduled agents run from
# (docs/superpowers/specs/2026-10-07-candidate-leads-agent-design.md §2).
#
# The main checkout is stale and dirty and its default node is x86, which
# crashes on this Mac. This keeps a separate worktree DETACHED at
# origin/main, so it never holds a branch another session needs and nothing
# is ever committed from it; installs packages with the arm64 npm only when
# package-lock.json changes; and links (never copies) the main checkout's
# .env.local so scripts find their keys.
#
# Usage: sh scripts/agent-worktree.sh   (safe to run every time)
set -eu

NODE_DIR="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin"
WT="${KYV_AGENT_WORKTREE:-/Users/jsloth/Projects/kyv-agent-worktree}"
HERE=$(cd "$(dirname "$0")" && pwd)
MAIN=$(git -C "$HERE" worktree list --porcelain | sed -n '1s/^worktree //p')
[ -n "$MAIN" ] || { echo "agent-worktree: could not find the main checkout" >&2; exit 1; }

[ -x "$NODE_DIR/node" ] || { echo "agent-worktree: arm64 node missing at $NODE_DIR" >&2; exit 1; }
[ "$("$NODE_DIR/node" -p process.arch)" = "arm64" ] || { echo "agent-worktree: $NODE_DIR/node is not arm64" >&2; exit 1; }
export PATH="$NODE_DIR:$PATH"
# This install's bin/npm is a plain text file (the archive lost its symlink),
# so run npm through node instead of through the shim.
NPM_CLI="$NODE_DIR/../lib/node_modules/npm/bin/npm-cli.js"
[ -f "$NPM_CLI" ] || { echo "agent-worktree: npm missing at $NPM_CLI" >&2; exit 1; }

git -C "$MAIN" fetch --quiet origin main
if [ -e "$WT/.git" ]; then
  # checkout --detach carries local edits across, so refuse them explicitly
  # (the .env.local symlink is gitignored and does not count).
  if [ -n "$(git -C "$WT" status --porcelain)" ]; then
    echo "agent-worktree: $WT has local changes; refusing to run agents on edited code" >&2
    exit 1
  fi
  git -C "$WT" checkout --quiet --detach origin/main
else
  # Drop registrations whose directory was deleted, or add would refuse.
  git -C "$MAIN" worktree prune
  git -C "$MAIN" worktree add --quiet --detach "$WT" origin/main
fi

SUM=$(shasum "$WT/package-lock.json" | cut -d' ' -f1)
if [ ! -f "$WT/node_modules/.lock-sum" ] || [ "$(cat "$WT/node_modules/.lock-sum")" != "$SUM" ]; then
  (cd "$WT" && "$NODE_DIR/node" "$NPM_CLI" ci --no-audit --no-fund --loglevel=error)
  echo "$SUM" > "$WT/node_modules/.lock-sum"
fi

[ -f "$MAIN/.env.local" ] || { echo "agent-worktree: no .env.local in $MAIN" >&2; exit 1; }
ln -sfn "$MAIN/.env.local" "$WT/.env.local"

echo "agent worktree ready at $WT ($(git -C "$WT" rev-parse --short HEAD))"
