# Handoff — Phase A2: Monitor (target)

The Overview goes live: six R4 panels + a health strip + an on-demand neutrality-lint verdict. Build to this spec. Refs: design.md §2 (flow 4), §4, §5 (neutrality lint); PRD AFR-001…004. Data: `GET /api/admin/overview`, `GET /api/health`. Reuse the A1 panel grid + `Card` + `DegradedBanner`.

> **First principle (R4's rule):** numbers come from queries, **never** estimates. A panel that can't measure shows **Degraded** (names the missing migration/dep); a panel that measured nothing shows **Empty** ("has not run yet"). Never a fake zero.

---

## A. Health strip (top of Overview)

Consumes `GET /api/health` → `{ supabase, migrations:{0005,0006}, agents:{R1:{last,status}…}, cron_heartbeat_age }`. A single row above the panel grid.

| Element | Spec |
|---|---|
| Container | `flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3` |
| Status dot | `size-2 rounded-full` — `bg-success` (green) reachable · `bg-warning` degraded/stale · `bg-error` down |
| Label | `text-caption text-on-surface-muted` — e.g. "Supabase OK · 0005 applied · 0006 pending · cron 3h ago" |

| State | Rendering |
|---|---|
| Healthy | success dot + summary text |
| Migration pending | warning dot; inline `text-warning` "0006 pending" (link/hint to apply) |
| Supabase unreachable | error dot; `role="alert"`; **disable actions elsewhere** (design.md §6) |
| Cron stale | warning dot; "cron {age} ago" turns `text-warning` past threshold |

`/api/health` is auth-gated — unauth gets 401, nothing about ops leaks (design.md §4).

---

## B. Panel component (shared)

All six use one shell: `Card.flex flex-col gap-2` → header `h2.text-overline text-on-surface-muted` + body. Grid unchanged from A1: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`. Big numbers use `text-h2 font-heading`; supporting rows `text-body-sm`; meta/timestamps `text-caption text-on-surface-muted`.

Per-panel state matrix (every panel implements all four):

| State | Rendering |
|---|---|
| Default | measured value(s) |
| Empty | `text-body-sm text-on-surface-muted` "has not run yet" / "0 …" (a real zero) |
| Degraded | `<DegradedBanner missing="…">` in place of the number |
| Error | `role="alert"` `text-error` line + the value area greyed |

---

## C. The six panels

Order fixed (matches R4 / A1 placeholders).

### 1. Agent runs — `agent_run` registry (AFR-002)
Per agent **R1–R4** (+ dispatcher): last run **status chip**, `items_written`, relative `started_at`, `summary` (truncate 2 lines), `report_path` (mono caption).
- Status chip: pill `rounded-full px-2 py-[2px] text-caption` — `running` info · `ok` success · `ok_empty` on-surface-muted · `failed` error · `dry_run` accent.
- Missing agent → row reads "has not run yet" (`text-on-surface-muted`), **not** absent.
- **Degraded**: 0006 not applied → `<DegradedBanner missing="migration 0006 (ops tables)">` (no `agent_run` table to read).

### 2. Freshness — logistics stamps
Newest `info_last_verified_at` (race) / `site_last_verified_at` (candidate) / `candidate_contact.last_verified_at`; oldest-stale count.
- **Degraded**: 0005 not applied → `<DegradedBanner missing="migration 0005 (candidate_contact)">` (per AFR-033/§6). Display whichever `candidate_contact` anon-policy the founder chose (Q4).

### 3. Feed health — `news_item` + neutrality verdict (AFR-003)
Counts by `item_type` (candidate_news / election_news / official_link) last 30d; newest published relative time. Plus an **on-demand neutrality lint** over last-30-day agent-written rows via `src/lib/neutrality.ts` (shared matcher, A2 task A05):
- Verdict chip: `pass` → `text-success` "neutral"; `flagged` → `text-error` "N terms flagged" + expandable list (term + row). 0 rows → explicit "0 agent-written rows" pass (not blank).
- Lint runs server-side; trigger is a `Button variant="secondary"` "Re-check". Result region `role="status"`.

### 4. Pipeline state
Published race count, `pipeline_event` newest, draft/in_review counts. Empty → "no pipeline activity yet".

### 5. Waiting on Jason — pending `review_item` count
Big `text-h2` count of `status='pending'`. This is the **queue-badge source** (A3 nav badge). 0 → "Nothing awaiting review." Links to `/admin/queue`.
- **Degraded**: 0006 not applied → banner.

### 6. Open risks
Count of `failed` agent runs + `apply_error` review items + stale claims. Each risk: `text-body-sm` + `text-error` marker. 0 → "No risks surfaced yet."

---

## D. Interactions, responsive, a11y
- **No client polling < 30s** (design.md §5). Refreshes silent (server re-render), not animated. Provide a manual "Refresh" (`Button secondary`) if needed.
- Overview `< 1s p95` (design.md NFR) — panels are independent; render each as it resolves, don't block the grid on the slowest.
- Responsive: grid 1→2→3 (`sm`/`lg`); health strip wraps (`flex-wrap`).
- a11y: each panel `Card` gets an `aria-labelledby` → its header id; status dots need `aria-label` (color isn't the only signal — pair with text); lint result `role="status"`.
- Edge: partial data (some agents ran, some not) → mixed rows, never hide the un-run ones. Very large counts → `Intl.NumberFormat`.
