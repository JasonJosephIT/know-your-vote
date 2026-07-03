# Handoff — Phase A4: Agent Control (target)

The Agents page: request R1–R4 runs, watch request state honestly, cancel, and read run history. Refs: design.md §5 (dispatcher, agent prompts v1.1); PRD AFR-010…012, AFR-034. Data: `POST /api/admin/agents/run-requests` (+ `[id]` DELETE), `GET /api/admin/agents/runs`.

> **The one honest truth this page must tell:** the dashboard is hosted, the agents are not (ADR-001). A trigger is a **queue write**, not an RPC — it executes only when the Claude desktop app is open on the operator's machine. Every trigger control states this; request age is always visible.

---

## A. Page layout — `/admin/agents`

Two regions in the `max-w-[1120px]` column, `gap-6`:
1. **Trigger grid** — one card per agent R1–R4.
2. **Run history** — recent `agent_run` rows.

Persistent caveat banner at top: `role="note"` `rounded-md border border-border-strong bg-surface-muted px-4 py-3 text-caption text-on-surface-muted` — "Requests execute when the Claude desktop app is open on the operator's machine. A request may sit **pending** until then."

---

## B. Agent trigger card (×4: R1, R2, R3, R4)

`Card.flex flex-col gap-3`:
- **Header**: agent id `text-h3 font-heading` + one-line role (`text-caption text-on-surface-muted`, e.g. R1 fact-check, R2 contact/gated, R3 dates, R4 digest).
- **Live-request row**: current `agent_run_request` state for this agent (there is at most one live per agent — `uq_run_request_live`).
- **Action**: `Button primary` "Run now" (+ optional note `Input`). When a live request exists, button is **disabled** and the row shows the existing one (see states).

### Request-state machine (`agent_run_request.status`)
| Status | Chip | Card behavior |
|---|---|---|
| (none) | — | "Run now" enabled |
| `pending` | `text-info` "Queued {age}" | button disabled; **Cancel** (`Button secondary`) shown; age ticks (client, ≥ 30s cadence) |
| `claimed` | `text-accent` "Running (claimed {age})" | button disabled; no cancel (in flight); stale > 6h → hint "app likely closed — will fail next pass" |
| `fulfilled` | `text-success` "Done {age}" | transient → collapses; "Run now" re-enabled; links to the resulting `agent_run` |
| `failed` | `text-error` "Failed" + `failure_reason` | `role="alert"`; "Run now" re-enabled |
| `cancelled` | `text-on-surface-muted` "Cancelled" | "Run now" re-enabled |

### Interactions
- **Trigger**: `POST …/run-requests {agent, note?}` → 202 → optimistic "Queued". Writes `admin_action(action='trigger')`.
- **Duplicate (AFR-012)**: 409 → **do not** create; surface the existing live request inline (`role="status"` "Already queued {age}") + focus its Cancel. Never silently swallow.
- **Cancel**: `DELETE …/run-requests/:id` on a `pending` → 200 → row clears. Writes `admin_action(action='cancel')`. Only `pending` is cancellable (not `claimed`).
- **Degraded**: 0006 not applied → whole page is `<DegradedBanner missing="migration 0006 (ops tables)">`, triggers disabled. Claude app closed is **not** an error — it's the normal pending path (caveat banner covers it).

---

## C. Run history — `GET /api/admin/agents/runs?agent&limit`

`agent_run` rows, newest-first. Optional per-agent filter (`select`). Row (`flex items-center gap-3 border-b border-border py-2`):
- agent id chip · **status chip** (`running` info · `ok` success · `ok_empty` muted · `failed` error · `dry_run` accent) · `items_written` · relative `started_at` · duration (`finished_at−started_at`) · `summary` (truncate 1 line, expand for full 3-line) · `report_path` (mono caption, not a link — local artifact).
- `run_request_id` present → small "triggered" marker linking back to the request; absent → "scheduled".

States: Empty → "No runs recorded yet." (until A14/A15 wire agents to write registry rows) · Degraded (0006) → banner · Error → `role="alert"`.

---

## D. Out-of-UI notes (context for the builder)
A14 (`cap-r0-dispatcher` Cowork task) and A15 (agent prompts v1.1) are **not** web UI — they're scheduled-task prompts (mirrored in `.superpowers/sdd/`). They make the data this page reads real: agents write their own `agent_run` rows, R2/R3 dual-write `review_item` gated findings into the A3 queue (AFR-034). This page must render correctly **before** they exist (empty states) and **after** (live rows) with no code change — same fail-closed idiom.

---

## E. Responsive & a11y
- Trigger grid: `grid grid-cols-1 gap-4 sm:grid-cols-2` (4 agents → 2×2 on desktop, stack on mobile).
- Age/relative times: `<time datetime>` with `aria-label` full timestamp; update no faster than 30s.
- Status chips carry text + color. `failed` → `role="alert"`; duplicate/queued → `role="status"`.
- "Run now" disabled state uses `Button` disabled tokens (`bg-surface-muted text-on-surface-muted`) — visibly inert, `aria-disabled`, with the reason (live request) adjacent.
- Cancel is a real `<form>`/Server Action; confirm not required (pending only, reversible-ish).
