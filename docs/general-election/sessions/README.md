# Parallel sessions to full release — 2026-09-24

Full release means candidate briefs and amendment pages are **published**, not
just listed. As of today: 0 of 53 races have briefs, 0 of 3 amendments have a
published page, and 7 of 106 ballot candidates have an `official_site`. The
practical deadline is **early voting, 2026-10-24**.

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

| Session                  | Brief                                                                | Where it runs                                                      | Blocked by                                          |
| ------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------- |
| A — Amendments           | [`session-a-amendments.md`](session-a-amendments.md)                 | cloud or local, needs web access                                   | nothing; applying migrations needs the founder's OK |
| B — Candidate websites   | [`session-b-candidate-websites.md`](session-b-candidate-websites.md) | cloud or local, needs web access                                   | nothing                                             |
| C — Brief pilot (FL-GOV) | [`session-c-brief-pilot.md`](session-c-brief-pilot.md)               | **the founder's Mac** (the arm64 venv and `.env.local` live there) | founder credentials (below)                         |

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

| #   | Task                                                                                                                                                                       | Unblocks                       | Date                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------- |
| 1   | Confirm `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM` are set in Vercel                                                                                                    | the T-7 registration reminder  | **before 2026-09-28**                 |
| 2   | Set `SUPABASE_DB_URL`, give `cap_readonly` a login and set `CAP_READONLY_DB_URL`, set `ANTHROPIC_API_KEY`, rotate all three (`runtime/BRIEFS/00-founder-prerequisites.md`) | Session C                      | as soon as possible                   |
| 3   | Decide how to close the `word_count` gap (`profile-writer-2026-09-21.md` §3) and which spine issues FL-GOV uses                                                            | publishing the first race      | before the pilot's race goes to audit |
| 4   | Decide how to brief Datto, who has no website (`candidate-sites-2026-09-21.md`)                                                                                            | publishing FL-GOV              | same                                  |
| 5   | Confirm founder calls F1–F7 (`superpowers/specs/2026-09-23-measure-resource-ladder-design.md` §9)                                                                          | Session A publishing           | before Session A's step 4             |
| 6   | Verify the `ballot_return_deadline` dates (stored unverified on 09-10)                                                                                                     | the Oct 27 and Nov 2 reminders | before 2026-10-27                     |
