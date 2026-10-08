# Corrections during the content freeze

From **Sun 2026-10-18 00:00 EDT (04:00 UTC)** to **Wed 2026-11-04 00:00 EST
(05:00 UTC)**, ballot content changes only by a correction. This file is
where the database guard's refusal message points. The design is
`docs/superpowers/specs/2026-10-08-ballot-content-completion-design.md` §3.6
(founder decisions BC9 to BC19, each recommended pending founder
confirmation).

Two things enforce the freeze, and neither is a lock:

- **The database guard**, migration `0050_content_freeze.sql`. Inside the
  window a write to a frozen table fails with
  `Ballot content is frozen until Election Day (content_freeze). Corrections only: docs/general-election/corrections/README.md`
  unless the transaction names its correction file (below). It starts and
  stops by the clock in the `content_freeze` row.
- **The code tripwire**, `scripts/verify-freeze.ts` in CI. Inside the window
  it fails when a frozen file (`FROZEN_FILES` in `scripts/freeze-manifest.ts`)
  differs from its sha256 in `docs/general-election/freeze-2026-10-18.json`,
  or when an entry names a correction file that does not exist. It blocks a
  merge only once `main` requires the CI checks (`docs/ci.md` §1).

Any session that can write can also set the correction setting or disable a
trigger, and anyone can edit the manifest. The control is the founder's yes
on every correction, recorded in the correction file.

## What is frozen

- race briefs: `claim`, `claim_source`, `position`, `issue`, `profile`;
- publication state: `race_publication`, `measure_publication`;
- the roster and its links: `candidate`, `race`, `candidate_contact`,
  `candidate_social_account`;
- measure pages: `ballot_measure`, `measure_resource`;
- which races a voter is shown: `zip_district`, `block_district`;
- `source` rows that a claim or a measure resource points to;
- the code files in `FROZEN_FILES` (`scripts/freeze-manifest.ts`): the race,
  race-issues, candidate, measure and methodology pages and what they import
  that shapes a brief, a roster, a party or incumbency label, a contact block
  or a measure.

These writes go through the guard without a correction (0050's exceptions):

- a race or measure taken to `listed` (an emergency takedown never waits);
- `candidate.site_last_verified_at`, `race.info_last_verified_at` and
  `race.key_dates` (freshness stamps, and election logistics approved by a
  human in `/admin`, BC18);
- a new `source` row, and an update or delete of a `source` row that no
  `claim_source` or `measure_resource` row cites;
- an `UPDATE` that changes nothing.

## Not frozen

Each has its own gate:

- **The news plane** (`news_item`). News reaches voters only through
  approval in `/admin`. R1 and R3 are paused through Nov 3 (BC12).
- **Reminders and election dates**: `election_event` is not guarded, so a
  wrong reminder date is fixed the way `reminders-e2e-runbook.md` "Sending a
  correction" says (pause reminders, fix and verify the row, dry run,
  rehearse, send). That email path needs `CORRECTION_SECRET`, which the
  freeze does not.
- `review_item`, `admin_action` and the operator console.

## What is a correction

- a quote that does not match its source byte for byte;
- a passage attributed to the wrong candidate or race;
- a roster fact that changed: a withdrawal, a death, a court-ordered ballot
  change;
- a link that now points somewhere hacked or unrelated, as Colucci's did;
- a measure resource that no longer loads or no longer says what its row
  records;
- a page that crashes, or states something false about our process or the
  ballot.

**What is not:** new or changed content on a candidate's site; a campaign
asking to add or remove positions; a newly found statement on an amendment; a
copy, layout or feature improvement. Each such request is still recorded
(step 1) and answered "after November 3".

## How a correction gets in

### 1. Record it

Create `docs/general-election/corrections/2026-MM-DD-<slug>.md`:

```markdown
# <one line: what is wrong, where>

- Reported by / how: <name or "agent source check">, <email, issue, check file>, <date>
- The claim: <what the page says, with its URL>
- The evidence: <the live source, fetched YYYY-MM-DD: URL, and what it says now>
- A correction under README "What is a correction"? <yes: which kind / no: why not>
- Founder: <yes or no, quoted, with the date>
- Applied: <date, by whom, what ran>
- Checked live: <date, URL, a quote from the page after the cache expired>
```

A request that is not a correction is recorded the same way and answered
"after November 3".

### 2. Hold it, if the error is live and harmful

In the founder's SQL editor, one transaction each.

**A race (BC16).** The race stays `published` and renders the roster with
"Brief in review" until step 4:

```sql
BEGIN;
SET LOCAL kyv.freeze_correction = 'docs/general-election/corrections/<file>.md';
UPDATE profile
   SET audit = audit || '{"balance_check_passed": false}'
 WHERE race_id = '<race_id>';
INSERT INTO admin_action (actor, action, subject_kind, subject_ref, detail)
VALUES ('founder', 'note', 'race_publication', '<race_id>',
        jsonb_build_object('reason', 'Correction hold: docs/general-election/corrections/<file>.md'));
COMMIT;
```

**A measure.** The page shows its neutral block and the fallback text:

```sql
BEGIN;
SET LOCAL kyv.freeze_correction = 'docs/general-election/corrections/<file>.md';
UPDATE measure_publication SET status = 'listed' WHERE measure_id = '<measure_id>';
INSERT INTO admin_action (actor, action, subject_kind, subject_ref, detail)
VALUES ('founder', 'list', 'measure_publication', '<measure_id>',
        jsonb_build_object('prior_status', 'published', 'new_status', 'listed',
                           'reason', 'Correction hold: docs/general-election/corrections/<file>.md'));
COMMIT;
```

### 3. The fix

In the founder's SQL editor, as one transaction:

```sql
BEGIN;
SET LOCAL kyv.freeze_correction = 'docs/general-election/corrections/<file>.md';
-- the fix
COMMIT;
```

- **A brief fix** then runs `docs/general-election/brief-runs/refresh-plan-2026-10.md`
  Step 4 checks 2 to 4 for that race: fingerprints against a reference
  rebuilt with the fix (the reference builder, which the brief-refresh work
  adds per spec §3.4 item 4 and is not in the repo yet, must run
  `SET kyv.freeze_correction = 'pglite reference'` first), the audit at
  `word_count_pct = 150`, and the read as `anon`.
- **A measure resource that no longer loads (BC17).** Replace the row, in one
  transaction, with the Internet Archive capture of the same URL taken on or
  before the date the row was verified, after opening that capture and
  seeing the recorded title. Kind, stance, title and note stay; a new
  `source` row carries the capture's URL. The count does not change, so the
  deferred balance trigger passes. Only when no such capture exists, or the
  page now says something else, delete the row. If that delete breaks the 2x
  gate (either Amendment 3 support row), the same transaction first takes the
  measure to `listed` as in step 2, and it stays listed through Nov 3.
- **A roster field from `/admin` (BC18).** Approving a `gated_diff` for
  `race.office`, `race.district` or `candidate.qualifying_status` fails with
  the freeze message as its `apply_error`, and the item stays pending. Apply
  the value here, then approve the item again: it writes the same value,
  which changes nothing, so the guard lets it through and the item closes.
- **A code fix** goes through a pull request that changes the file, sets
  that file's `sha256` in `docs/general-election/freeze-2026-10-18.json` to
  the new hash (the failing `verify-freeze.ts` line prints it), and adds
  `"correction": "docs/general-election/corrections/<file>.md"` to that
  entry. `node scripts/verify-freeze.ts --write` is refused inside the window.
- **A correction migration** applied in the window starts with
  `SELECT set_config('kyv.freeze_correction', 'docs/general-election/corrections/<file>.md', true);`,
  which lasts for that migration's transaction.

### 4. Re-publish, if it was held

- **A race:** re-run the audit write-back (refresh plan Step 4 check 3), which
  sets `balance_check_passed = true`, under the setting.
- **A measure:** under the setting, set it back to `published` with an
  `admin_action` `publish` row.

Cite the correction file in each reason. Request the page twice after the
3600 s cache expires, and record a quote in the correction file.

## The guard probe (Sun 2026-10-18)

In the SQL editor, once:

```sql
BEGIN;
INSERT INTO issue (issue_id, race_id, tier, title, display_order)
VALUES ('probe-freeze', 'FL-GOV-general', 'spine', 'Probe', 99);
ROLLBACK;
```

The expected result is the freeze error and nothing written. Then:

```sql
SELECT now() >= starts_at AND now() < ends_at FROM content_freeze;  -- true
SELECT prosecdef, proconfig FROM pg_proc
 WHERE proname = 'refuse_during_content_freeze';                    -- true, {search_path=""}
```

## Source checks

On Sat 10-17 after the freeze-copy deploy, and on Mon 10-26, a session sends
one `GET` to every distinct URL a published claim's `claim_source` or a
published measure's `measure_resource` cites, and writes the results to
`source-check-2026-10-17.md` and `source-check-2026-10-26.md` in this folder:
status code, final host, and for measure resources whether the recorded
title still appears. An unreachable page, a redirect to another host, or a
missing measure title starts step 1. A candidate page whose text changed is
not a correction.
