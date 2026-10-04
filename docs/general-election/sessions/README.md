# Parallel sessions to full release — 2026-09-24

Full release means candidate briefs and amendment pages are **published**, not
just listed. As of today: 0 of 53 races have briefs, 0 of 3 amendments have a
published page, and 7 of 106 ballot candidates have an `official_site`. The
practical deadline is **early voting, 2026-10-24**.

> **Status 2026-10-04.** This plan is from 09-24 and has largely run its
> course: 36 of 53 races are published with a brief (17 stay `listed`),
> Amendments 2 and 3 are published and Amendment 1 is `listed`, and 97 of 106
> ballot candidates have a verified site. Session C2 replaced Session C. What
> remains is in [`../launch-handoff-2026-10-04.md`](../launch-handoff-2026-10-04.md).
> The founder checklist below is annotated with where each item stands.

## What depends on what

```
Amendments ─────────────── independent of everything below ──────────► publish AM1–3

Candidate websites ──┬── race by race ──┐
  (7/106 today)      │                  ▼
                     │     Brief pilot (FL-GOV) ──► first published race ──► scale out
Founder: credentials ┘          ▲
Founder: word_count + spine ────┘  (needed before PUBLISHING, not before the pilot runs)
```

- **Amendments do not depend on briefs or websites.** Their only chain is
  internal: apply `0034`, then `0035`, then add sided resources, then publish.
- **Websites do not depend on anything.** They are the _input_ to briefs, but
  briefs need them one race at a time, not all 106 at once.
- **The brief pilot does not wait for websites.** FL-GOV already has 7 of 8
  sites (`0032_fl_gov_official_sites.sql`). It waits on the **founder's
  credentials** only. The `word_count` and shared-issue decisions gate
  _publishing_ the race, so the pilot can run and produce the evidence those
  decisions need.

So three sessions can start today, in parallel:

| Session                           | Brief                                                                  | Where it runs                                                      | Blocked by                                                                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| A — Amendments                    | [`session-a-amendments.md`](session-a-amendments.md)                   | cloud or local, needs web access                                   | nothing; applying migrations needs the founder's OK                                                                                          |
| B — Candidate websites            | [`session-b-candidate-websites.md`](session-b-candidate-websites.md)   | cloud or local, needs web access                                   | nothing                                                                                                                                      |
| C — Brief pilot (FL-GOV)          | [`session-c-brief-pilot.md`](session-c-brief-pilot.md)                 | **the founder's Mac** (the arm64 venv and `.env.local` live there) | founder credentials (below)                                                                                                                  |
| C2 — FL-GOV briefs in Claude Code | [`session-c2-claude-code-briefs.md`](session-c2-claude-code-briefs.md) | **the founder's Mac**, Claude Code with the Supabase MCP           | `TYPESAFE_API_KEY` (already set); founder decisions D1–D4 at the start. Replaces C for now; C stays for when the runtime's credentials exist |

## Collision rules (read before starting any session)

`supabase/migrations/` has collided five times, every time because two
sessions each took "the next number". Numbers are assigned here, up front:

| Session | Owns                                                                                                                | Must not touch             |
| ------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| A       | `0034`, `0035` (already written, not applied), `src/lib/measures*.ts`, `src/app/(public)/measures/**`               | any other migration number |
| B       | **`0036`** for its `official_site` batch; `docs/general-election/candidate-sites-*.md`                              | `0034`, `0035`, `0037+`    |
| C       | no migrations (the brief-rows writer prints SQL; it does not write a migration). If one is truly needed, **`0037`** | `0034`–`0036`              |

Each session appends only its own row to `supabase/migrations/README.md`.

## Founder checklist (no session can do these)

| #   | Task                                                                                                                                                                                                                                                                                                                                                                                                                               | Unblocks                                                                                                                                                                                                        | Date                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 1   | Confirm `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM` are set in Vercel. **Still open on 2026-10-04:** `CRON_SECRET` is set, but the Resend key sits under the wrong name (`RESEND`), and `EMAIL_FROM` and `SUPABASE_SERVICE_ROLE_KEY` are missing. No reminder has ever sent. Fix: [`../reminders-e2e-runbook.md`](../reminders-e2e-runbook.md) step 1                                                                            | the T-7 and T-1 registration reminders (missed; the signup answered 503, so no one could subscribe, and refused signups are not logged); now the voting-info signup and the Oct 21 vote-by-mail reminder onward | **before 2026-10-20** |
| 2   | Set `SUPABASE_DB_URL`, give `cap_readonly` a login and set `CAP_READONLY_DB_URL`, set `ANTHROPIC_API_KEY`, rotate all three (`runtime/BRIEFS/00-founder-prerequisites.md`). **Parked:** Session C2 built the briefs without these                                                                                                                                                                                                  | Session C                                                                                                                                                                                                       | as soon as possible   |
| 3   | ~~Decide how to close the `word_count` gap (`profile-writer-2026-09-21.md` §3) and which spine issues FL-GOV uses~~ **Done 2026-09-27** (`../brief-runs/FL-GOV/decisions.md`): spine D1 (Core 4), and `word_count_pct = 150` for FL-GOV after the pilot (D2). FL-GOV was published 09-27. D1's added bio section is not built; recommended dropped for 2026, pending founder confirmation (`../../scope-changes.md` 2026-10-04 §H) | publishing the first race                                                                                                                                                                                       | done                  |
| 4   | ~~Decide how to brief Datto, who has no website (`candidate-sites-2026-09-21.md`)~~ **Done 2026-09-27:** D3, record silence (`no_stated_position_found` on every spine issue)                                                                                                                                                                                                                                                      | publishing FL-GOV                                                                                                                                                                                               | done                  |
| 5   | ~~Confirm founder calls F1–F7 (`superpowers/specs/2026-09-23-measure-resource-ladder-design.md` §9)~~ **Done 2026-09-24** (`../measure-resources-verified-2026-09-24.md`): F1–F6 as drafted, F7 seeded Amendment 3 first. Amendments 3 and 2 published 09-25 and 09-27; Amendment 1 stays `listed`                                                                                                                                 | Session A publishing                                                                                                                                                                                            | done                  |
| 6   | ~~Verify the `ballot_return_deadline` dates (stored unverified on 09-10)~~ **Done.** The statewide `general_2026` row (2026-11-03, `received_by`) has `verified_by` set and `verified_at` 2026-09-10; all six `general_2026` rows are verified (read live 2026-10-04)                                                                                                                                                              | the Oct 27 and Nov 2 reminders                                                                                                                                                                                  | done                  |
