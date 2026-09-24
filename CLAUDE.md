@AGENTS.md

## Code knowledge graph

A graphify knowledge graph of this repo is committed in `graphify-out/`:
- `graphify-out/GRAPH_REPORT.md`: summary of communities, hub nodes and structure. Read this first for orientation.
- `graphify-out/graph.json`: the full graph. Query it through the `graphify` MCP server (`.mcp.json`; tools such as `query_graph`, `get_node`, `get_neighbors`, `shortest_path`), or on the command line with `graphify query "<question>"`, `graphify explain "<node>"`, `graphify path "A" "B"` or `graphify affected "<node>"`.
- In cloud sessions, `.claude/hooks/session-start.sh` installs graphify and the MCP server into `~/.graphify-venv`, refreshes the graph, and installs git hooks that rebuild it in the background after each commit and checkout. Elsewhere, `pip install "graphifyy[sql]" mcp` and run `graphify update .` yourself (no LLM needed).
- Commit `graphify-out/` changes along with the code that caused them. `.gitattributes` gives `graph.json` a union merge driver, so parallel sessions don't conflict on it.
