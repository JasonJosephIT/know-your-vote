@AGENTS.md

## Code knowledge graph

A graphify knowledge graph of this repo is built into `graphify-out/` at the start of every cloud session. It is gitignored and never committed, because every rebuild re-clusters it:
- `graphify-out/GRAPH_REPORT.md`: summary of communities, hub nodes and structure. Read this first for orientation.
- `graphify-out/graph.json`: the full graph. Query it through the `graphify` MCP server (`.mcp.json`; tools such as `query_graph`, `get_node`, `get_neighbors`, `shortest_path`), or on the command line with `graphify query "<question>"`, `graphify explain "<node>"`, `graphify path "A" "B"` or `graphify affected "<node>"`.
- In cloud sessions, `.claude/hooks/session-start.sh` installs graphify and the MCP server into `~/.graphify-venv`, builds the graph, and installs git hooks that rebuild it in the background after each commit and checkout. Elsewhere, `pip install "graphifyy[sql]" mcp` and run `graphify update .` yourself (no LLM needed).
- Cluster names read "<product area> · <main file>" when `TYPESAFE_API_KEY` is set in the environment: `scripts/graphify-label-typesafe.py` has TypeSafe's Jev pick each cluster's area. A rebuild after a commit re-clusters and some names fall back to plain file names. To restore them, run `python3 scripts/graphify-label-typesafe.py && PYTHONHASHSEED=0 graphify cluster-only .`. It only asks about clusters that changed.
- Don't commit anything under `graphify-out/`. Never write an API key into a file.
