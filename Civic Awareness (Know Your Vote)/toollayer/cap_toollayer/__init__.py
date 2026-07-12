"""CAP S1 — MCP tool-layer service (CAP_Runtime_PRD_v1 §5).

The single chokepoint between agents and the world: exposes T1-T12,
embeds the already-tested guard/allowlist/audit cores, holds the only
DB write role and external API keys. Everything here is I/O and wiring;
every *decision* lives in the pure cores under Agents/ and the repo root.
"""

__all__ = ["identity", "cores", "errors", "logsink", "middleware"]
