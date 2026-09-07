# Remaining-work briefs

The CAP runtime is on `main`: **S1 complete** (tool layer, `toollayer/`) and
**S2 code-complete** (`runtime/` — session runner, three agent configs, the
Anthropic loop, and the `S1StdioClient` MCP-stdio client). All merged; 100
toollayer + 39 runtime tests green on `main`.

What's left is running S2 **live** against the real S1, then building S3. Each
brief below is self-contained and pick-up-able on its own, **in order**. The
governing spec is always `../../CAP_Runtime_PRD_v1.md`; these briefs orient.

| # | Brief | Owner | Unblocks |
|---|---|---|---|
| 00 | [Founder prerequisites](00-founder-prerequisites.md) | founder (+ agent for the venv) | everything live |
| 01 | [S2-01 — Profiler live acceptance](01-s2-01-profiler-live.md) | agent | S2-02/03 |
| 02 | [S2-02/03 — Record + Fact-Checker live](02-s2-02-03-record-factchecker-live.md) | agent | S3 |
| 03 | [S3 — the orchestrator](03-s3-orchestrator.md) | agent (+ founder for the real race) | done |

**Prior context that still applies:** `../../toollayer/AGENT_BRIEF.md` (loop
protocol, house rules, ADR-R1, the Python minefield, the live-Claude + real-
guard-cores probe technique). Read it once before starting.

**Definition of done (whole build):** one command runs one race end to end —
intake → 3 agents × N candidates → balance audit → human gate → publication —
every invariant enforced by code, every action logged, a HALT provably blocking
dispatch, zero secrets in any agent context.
