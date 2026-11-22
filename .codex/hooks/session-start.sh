#!/bin/bash
# Cloud sessions only: install graphify and its MCP server dependency, build
# the code knowledge graph in graphify-out/ (gitignored: it is rebuilt here
# every session, never committed), and install graphify's git hooks so the
# graph rebuilds after each commit and checkout.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

VENV="$HOME/.graphify-venv"

# A dedicated venv: the system Python's Debian-managed PyJWT blocks a plain
# `pip install mcp`.
if [ ! -x "$VENV/bin/python" ]; then
  python3 -m venv "$VENV"
fi
# [sql] adds the SQL parser, so supabase/migrations/ is in the graph too.
"$VENV/bin/pip" install -q --disable-pip-version-check "graphifyy[sql]" mcp

# graphify on PATH for the rest of the session.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export PATH=\"$VENV/bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"
fi

cd "$CLAUDE_PROJECT_DIR"

# AST only, no LLM calls. PYTHONHASHSEED=0 matches graphify's own git hooks:
# clustering is hash-order dependent, so an unpinned run produces different
# communities than the post-commit rebuild and every commit would leave
# graphify-out/ dirty.
PYTHONHASHSEED=0 "$VENV/bin/graphify" update . > /dev/null

# Name the clusters by product area with TypeSafe, then regenerate
# graph.json and GRAPH_REPORT.md with those names. Needs TYPESAFE_API_KEY from
# the environment's settings; without it the script exits 0 and graphify's
# file-based names stay.
if [ -n "${TYPESAFE_API_KEY:-}" ]; then
  python3 scripts/graphify-label-typesafe.py > /dev/null
  PYTHONHASHSEED=0 "$VENV/bin/graphify" cluster-only . > /dev/null
fi

# post-commit / post-checkout: rebuild the graph in the background.
"$VENV/bin/graphify" hook install > /dev/null
