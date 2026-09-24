@AGENTS.md

## Code knowledge graph

A graphify knowledge graph of this repo is committed in `graphify-out/`:
- `graphify-out/GRAPH_REPORT.md`: summary of communities, hub nodes and structure. Read this first for orientation.
- `graphify-out/graph.json`: the full graph. Query it with `graphify query "<question>"`, `graphify explain "<node>"`, `graphify path "A" "B"` or `graphify affected "<node>"` (requires `pip install graphifyy`).
- Rebuild after code changes with `graphify update .` (no LLM needed).
