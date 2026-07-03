# Handoff — Phase A3: Submit & Review (target)

Manual submission forms, the unified approval queue with per-kind payload/diff rendering, the transactional decision flow, and the audit log + nav badge. Refs: design.md §3 (payload shapes), §5 (approve-effect transaction), §6; PRD AFR-020…034, AFR-050. Data: `POST /api/admin/ingest`, `GET /api/admin/review`, `POST /api/admin/review/:id/decision`, `GET /api/admin/log`.

> **Nothing publishes directly.** Every submission → `review_item(pending)`. Approval applies the effect server-side in one transaction; the UI shows applied/`apply_error` honestly (AFR-021, §6).

---

## A. Submit — `/admin/submit` (AFR-020/021/022)

Operator picks one of three kinds, fills a structured form; on submit → `POST /api/admin/ingest` → `review_item(pending, source='operator')`. Column: `max-w-[640px]` (wider than sign-in; forms have more fields).

### Kind selector
Segmented control (3 `Button variant="secondary"`, active = `variant="primary"`): **News story** · **Unclear statement** · **Unverified fact**. `role="radiogroup"`, each `role="radio" aria-checked`.

### Field spec (label `text-label`, help `text-caption text-on-surface-muted`, error `text-caption text-error`)

**News story → `manual_news`** `{item_type, title, summary, url, metro?, race_id?, candidate_id?, published_at}`:
| Field | Control | Rules |
|---|---|---|
| Title | `Input` | required, ≤ ~200 |
| Summary | `textarea` (Input styling, `min-h-[96px]`) | optional |
| Source URL | `Input[type=url]` | **required** (AFR-020), `safeHttpUrl` |
| Scope | `select` metro / `select` race / `select` candidate | ≥ one; drives `race_id`/`candidate_id`/`metro` |
| Published at | `Input[type=date]` | default today |

**Unclear statement / Unverified fact → `unclear_statement` / `unverified_fact`** `{text, context, candidate_id?, race_id?, source_url?}`:
| Field | Control | Rules |
|---|---|---|
| Text | `textarea` | required |
| Context | `textarea` | optional |
| Candidate / Race | `select` | optional scope |
| Source URL | `Input[type=url]` | optional, `safeHttpUrl` |

### Advisory neutrality lint (news only, AFR-022)
On blur of Title/Summary (or pre-submit), run `src/lib/neutrality.ts`. Violations render **inline** below the field: `text-caption text-error` "flagged: ‹term›" with the span highlighted (`bg-accent-muted` on the term). **Advisory only** — operator may still submit; approval re-lints authoritatively (AFR-032). Show a `role="status"` summary "2 wording flags — you can still queue this."

### Submit states
| State | Rendering |
|---|---|
| Default | filled form + `Button primary` "Add to queue" |
| Submitting | button disabled (Server Action) |
| Success | redirect `/admin/queue?added=1` → `role="status"` toast/well "Queued for review." |
| Validation error | per-field `text-error`, focus first invalid |
| Degraded | 0006 not applied → `<DegradedBanner missing="migration 0006 (ops tables)">`, form disabled |

---

## B. Queue — `/admin/queue` (AFR-030/031)

Unified list of `review_item`, **oldest-first** default, filterable. `GET /api/admin/review?status&kind`.

### Filter bar
`flex flex-wrap gap-2` of `select`s (Card-less, `border-border-strong rounded-md`): **Status** (pending default / approved / rejected / all) · **Kind** (all + the 6 kinds) · **Source** (all / operator / agent:R1 / R2 / R3). A pending count `Chip` on the right.

### `ReviewItemCard` — `src/components/admin/ReviewItemCard.tsx`
`Card` per row, `flex flex-col gap-3`:
- **Header row** (`flex items-center justify-between gap-2`): **kind chip** (`rounded-full px-2 py-[2px] text-caption`, color by kind — see below) + **source chip** (`text-caption`, `operator` primary-muted / `agent:R*` surface-muted) + created relative time (`text-caption text-on-surface-muted`).
- **Body**: per-kind payload rendering (below).
- **Status/decision area**: pending → decision controls (§C); decided → outcome line.

Kind chip colors: `manual_news` primary · `gated_diff` accent · `date_mismatch` warning · `fact_flag`/`unclear_statement`/`unverified_fact` info.

### Per-kind payload rendering (design.md §3 shapes)
| Kind | Rendering |
|---|---|
| `manual_news` | Proposed row preview: title (`text-label`), summary, source link, scope chips, date. Looks like the news card it will become. |
| `gated_diff` `{table, pk, field, old, new, source_url, seen_at}` | **Diff block**: `field` label (mono) then `old` → `new` as two rows — old `line-through text-on-surface-muted bg-error/10`, new `text-on-surface bg-success/10`, arrow between. Source link (`safeHttpUrl`) + `seen_at`. |
| `date_mismatch` `{race_id, field, db_value, official_value, source_url}` | Same diff treatment: DB value → official value, labelled "DB" / "Official", source link. |
| `fact_flag` / `unclear_statement` / `unverified_fact` | Flagged `text` (blockquote `border-l-2 border-border-strong pl-3`), `context` muted, optional scope + source link. |

Rendering rules: URLs via `safeHttpUrl` (never raw href); text via React default escaping (no `dangerouslySetInnerHTML`); long payloads truncate with "show more".

### Queue states
Empty (filtered) → "No items match." · Empty (none) → "Nothing awaiting review." · Degraded (0006) → banner · Error → `role="alert"` + retry.

---

## C. Decision flow — `POST /api/admin/review/:id/decision` (AFR-032/033, §5 transaction)

Per pending card: **Approve** (`Button primary`) + **Reject** (`Button secondary`) + optional note `Input`.

| Outcome | Rendering |
|---|---|
| Approved + applied | card collapses to `text-success` "Approved · applied {relative}" + effect summary (e.g. "→ news_item inserted, verified_by=operator") |
| Rejected | `text-on-surface-muted` "Rejected {relative}" + note |
| **`apply_error` (fail-closed)** | stays **pending**, `role="alert"` `text-error` banner with the exact constraint message (e.g. "candidate_news not a legal item_type yet — migration 0005") — AFR-033/§6. Retry allowed. |
| 409 already-decided | toast "Already decided by another tab." → refresh row |
| Confirm | Approve on `gated_diff`/`date_mismatch` (writes a gated field) → confirm step (`aria-describedby` the diff) |

Effects are a **fixed server-side map** per kind (whitelisted gated fields only: `race.key_dates`, `race.office`, `race.district`, `candidate.qualifying_status`) — the UI never names a table/field freely. Every decision writes `admin_action` (§D). Buttons disable during the transaction; success is read-your-writes (`updateTag`) so the row updates immediately.

---

## D. Log — `/admin/log` + nav badge (AFR-050)

### Log view
`GET /api/admin/log?limit` → `admin_action` rows, **newest-first**, read-only. Table/stack of rows: `flex items-center gap-3 border-b border-border py-2` — actor (`text-caption`), **action chip** (`trigger`/`submit`/`approve`/`reject`/`cancel`), subject (`subject_kind` + short id, mono), relative time; expand → `detail` JSON (`font-mono text-caption` in a `bg-surface-muted rounded-md p-3`). Append-only — no edit/delete affordances anywhere.

### Nav badge (in `AdminNav`)
Pending `review_item` count → badge on the **Queue** tab: `rounded-full bg-primary text-on-primary text-caption px-1.5 min-w-[18px] text-center` when > 0; hidden at 0. `aria-label="{n} items awaiting review"`. Sourced from the same count as Overview panel 5.

---

## E. Responsive & a11y
- Forms single-column always; `max-w-[640px]`. Queue cards full-width stack; filter bar wraps.
- Diff blocks: stack old-above-new on mobile, side-by-side `sm:grid-cols-2` on wider.
- Decision buttons: ≥ 40px targets; keyboard: Approve/Reject reachable, confirm dialog is focus-trapped, `Esc` cancels.
- Color-coded chips always carry text (color-blind safe). `role="alert"` for `apply_error`/errors, `role="status"` for success.
