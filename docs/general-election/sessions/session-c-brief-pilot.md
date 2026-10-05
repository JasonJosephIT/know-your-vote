# Session C — Brief pipeline pilot, then FL-GOV end to end

**Start this session with:** "Read `docs/general-election/sessions/session-c-brief-pilot.md` and do it."

**Run it on the founder's Mac, not in the cloud.** The arm64 Python 3.12 venv,
`.env.local` and the database credentials live there.

## Goal

Produce the first published race with audited briefs. The pipeline has never
run live. The pilot measures real cost and finds the bugs a first run always
finds. FL-GOV comes next because it is the only race whose candidates already
have websites (7 of 8, `0032`).

## Blocked until the founder has done this

From `Civic Awareness (Know Your Vote)/runtime/BRIEFS/00-founder-prerequisites.md`
(status last recorded in `docs/general-election/r1-r4-run-scope.md` §4):

- `SUPABASE_DB_URL` set in `.env.local`
- `cap_readonly` given a login (`ALTER ROLE cap_readonly LOGIN PASSWORD '…'`)
  and `CAP_READONLY_DB_URL` set
- `ANTHROPIC_API_KEY` set; it's present but empty today
- all three rotated, since they were exposed in a transcript

**Check these first and stop if any is missing.** Don't work around a missing
credential.

## Read first

- `docs/general-election/r1-r4-run-scope.md`: run scope, per-session rails
  (§3), and the recommended order (§6).
- `docs/general-election/profile-writer-2026-09-21.md`: how a policy run
  becomes brief rows, and **§3, why a scraped brief HALTs the Balance Audit on
  `word_count`**.
- `docs/general-election/candidate-sites-2026-09-21.md`: the FL-GOV sites and
  their `robots.txt` notes. `davidjolly.com` has `Crawl-delay: 10`;
  `scottjewett.com` sits behind a bot wall.
- `runtime/BRIEFS/01-s2-01-profiler-live.md`, `02-s2-02-03-record-factchecker-live.md`,
  and `03-s3-orchestrator.md`.

## Steps

1. **Pilot, one candidate** (BRIEFS 01 + 02): profiler, then record, then
   fact-checker. Pick an FL-GOV candidate whose site is crawlable. Record real
   tokens, wall clock and cost per session. Nothing further is scheduled until
   this produces numbers (`r1-r4-run-scope.md` §6).
2. **Fix what the pilot breaks.** Expect bugs in the S1 tool layer over MCP
   stdio, which is running for the first time.
3. **FL-GOV end to end** (BRIEFS 03, S3-01): all seven candidates with sites,
   then `scripts/brief-rows-sql.ts`, then the Balance Audit.
4. **Stop at the audit and report.** If it HALTs on `word_count` (expected, see
   profile-writer §3), report the numbers to the founder. They decide the fix:
   the Record agent, a narrower shared spine, or a recorded threshold change.
   Also report the Datto question: he has no site, so he'd show no stated
   position on every issue.
5. **After the founder's decisions and sign-off**, apply the rows and flip
   FL-GOV to `published`.

## Output

- A run report at `docs/general-election/pilot-run-2026-09-XX.md`: measured
  cost per session, projected cost for all 53 races, every bug found, and the
  audit verdict with its numbers.
- Any fixes as normal PRs.
- **No migration.** The brief-rows writer prints SQL; it doesn't write a
  migration. If one is truly needed, `0037` is reserved for this session.

## Done when

FL-GOV is published with every candidate's `balance_check_passed` set by a
real audit run, and the founder has signed off. Or: the report says exactly
what blocks it and which decision is needed.

## Don't

- **Don't trim or edit quotes to pass `word_count`.** The quote is what the
  source said, and editing it would falsify the citation and the audit
  together (profile-writer §3).
- Don't raise an audit threshold without a recorded founder decision.
- Don't start a second race before FL-GOV has been through the audit.
