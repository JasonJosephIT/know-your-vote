# R-agent prompt snapshots

The R1–R4 refresh agents are **Cowork scheduled tasks** stored outside this
repo at `~/.claude/scheduled-tasks/<taskId>/SKILL.md` on the operator's Mac,
with operational mirrors at `.superpowers/sdd/r{1..4}-scheduled-prompt.txt`
(that directory is gitignored). A plain repo coding agent can read neither.

This directory holds **read-only snapshots** so repo agents can see the real
contract. Editing a file here changes nothing — a prompt change must be
applied with the `scheduled-tasks` MCP (`update_scheduled_task`) *and* copied
to the `.superpowers/sdd/` mirror, per `docs/admin-dashboard/roadmap.md`
TASK-A15.

| File | Stored task | Cron | Snapshot | Fidelity |
|---|---|---|---|---|
| `r1-candidate-news.prompt.txt` | `cap-r1-candidate-news` | `0 9 1,15 * *` | 2026-09-06 | byte-identical to `.superpowers/sdd/r1-scheduled-prompt.txt` and to the stored `SKILL.md` body (frontmatter stripped; the only diff is a trailing newline) |

Live task list on 2026-09-06 (`list_scheduled_tasks`): `cap-r1-candidate-news`,
`cap-r2-contact-refresher`, `cap-r3-election-news`, `cap-r4-ops-digest` — all
enabled. **No `cap-r0-dispatcher` exists** (TASK-A14 unbuilt).
