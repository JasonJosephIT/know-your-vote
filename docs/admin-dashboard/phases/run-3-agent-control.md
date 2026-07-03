# Run 3 — Agent Control Plane (Phase A4) · after Run 1

Buildable independently of Runs 2 and 4 (needs only Run 1). Its outputs become *visible* in Run 2's queue/panels, but nothing here blocks on them. Tasks TASK-A13…A15.

**Parallel rule:** if running alongside Run 2, do NOT create or edit `src/types/admin.ts` (Run 2 owns it) — define this run's small zod schemas inside the route files.

**Split personality warning:** TASK-A13 is normal repo code. TASK-A14/A15 edit **Cowork scheduled tasks** (stored prompts outside the repo) — they must be executed from the Claude desktop app session that has the `scheduled-tasks` and Supabase MCPs, not by a plain repo coding agent. If this run is dispatched to a coding agent, it should do A13, then STOP and report A14/A15 back for the operator session.

## Scope
Run-request API + Agents page; `cap-r0-dispatcher` scheduled task; agent prompt v1.1 (registry dual-write, gated-findings dual-write, R4 amendment).

## Before you start
- Read: `docs/admin-dashboard/design.md` § 2 (data flow 1), § 5 (Dispatcher; Agent prompts v1.1); `docs/admin-dashboard/prd.md` AFR-010…012, AFR-034.
- Requires merged Run 1. Live 0006 apply is founder-gated: the dispatcher and agents fail closed (skip-and-note) until it lands — their prompts must say so, and verifying that behavior counts as passing today.
- Prompt mirrors live in `.superpowers/sdd/` (git-excluded by design — they are local audit artifacts). After ANY stored-prompt change, re-verify fidelity: diff the SKILL.md body (frontmatter stripped) against its mirror.
- **Dirty working tree:** commit ONLY files your tasks create/modify.

## Tasks (mark `- [x]` in `docs/admin-dashboard/roadmap.md`; keep Status line accurate)

- **TASK-A13** *(repo code)* — Run-request API + Agents page.
  Files: `src/app/api/admin/agents/run-requests/route.ts` (+ `[id]` DELETE for cancel), `src/app/api/admin/agents/runs/route.ts`, `src/app/admin/(sections)/agents/page.tsx`
  Rules: POST → 202 + row; duplicate live request → 409 surfacing the existing one (partial unique index is the backstop); UI shows request age and the caveat "executes when the Claude desktop app is open on the operator's machine"; zod schemas inline in route files (see parallel rule).
  Verify: request → pending row; duplicate → 409; cancel works; runs list renders (empty is honest until A14/A15).

- **TASK-A14** *(Cowork session)* — `cap-r0-dispatcher` scheduled task, cron `*/30 * * * *`, `notifyOnCompletion: false` + mirror file.
  Files: `.superpowers/sdd/r0-dispatcher-prompt.txt` (mirror; stored task created via scheduled-tasks MCP)
  Contract (design.md § 5): claim oldest `pending` (status-guarded UPDATE, set `claimed_at`) → execute that agent's stored SKILL.md prompt verbatim as a sub-run → agent writes its own `agent_run` (with `run_request_id`) → mark `fulfilled`/`failed`+reason; stale `claimed` > 6 h ⇒ mark `failed('stale claim')` next pass; ONE request per pass; ops-plane writes only; if 0006 absent, write nothing, report "0006 not applied", stop.
  Verify: with a seeded pending request (post-0006-apply) a manual "Run now" claims → executes → fulfills; prompt fidelity diff vs mirror; pre-apply, a run reports the fail-closed message.

- **TASK-A15** *(Cowork session)* — Agent prompts v1.1 for R1–R4 (update stored tasks via `update_scheduled_task` + mirrors together).
  Files: `.superpowers/sdd/r1-scheduled-prompt.txt` … `r4-scheduled-prompt.txt` mirrors
  Edits — appendix additions only, constitutions otherwise untouched:
  1. All four: on start INSERT `agent_run(agent, status='running', run_request_id if dispatched)`; on finish UPDATE it (status `ok|ok_empty|failed|dry_run`, items_written, summary, report_path). If ops tables absent, skip registry writes and note it in the run report.
  2. R2 + R3: additionally INSERT one `review_item` per gated diff / date mismatch (kind + payload per design.md § 3, `source='agent:RN'`) — dual-write alongside the run-report prose.
  3. R4: rule 1 amended to "READ-ONLY on the content plane; you may write only your own agent_run row"; section 1 reads the registry first, RunReports markdown as fallback.
  Verify: fidelity diff per agent (SKILL.md body vs mirror, frontmatter stripped); next run of any agent (dry-run acceptable) produces an `agent_run` row — or, pre-0006, the skip-note in its report.

## Definition of done
A13 merged via branch `admin/phase-a4` (PR "Admin console Phase A4 — agent control plane"); A14/A15 completed from the operator session with fidelity checks recorded; all three checked in roadmap.md.
