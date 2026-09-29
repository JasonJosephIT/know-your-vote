# FL-GOV brief run: founder decisions (2026-09-27)

Asked in one batch at the start of Session C2, answered by the founder in chat.

| # | Question | Decision |
| - | -------- | -------- |
| D1 | FL-GOV spine | **Core 4:** `A1` Property insurance costs, `A3` Property taxes, `A2` Housing affordability, `A4` Cost of living in Florida. **Plus a bio section for every candidate** (see below). |
| D2 | How to pass `word_count` | **Decide after the pilot**, with the measured numbers in hand. |
| D3 | Datto (no `official_site`) | **Record silence:** `no_stated_position_found` on every spine issue. The race does not wait. |
| D4 | Jewett (captcha on `scottjewett.com`) | **Same as D3** if the ingest's browser fallback can't read it. Never solve the captcha. |
| — | Where Jev runs | Cloud session, **pilot one candidate only, then stop** for the go-ahead. The founder supplied a TypeSafe key for this; it is passed through the environment only and is never written to a file. |

## The bio section (founder, verbatim intent)

> Let's have the first section be like a bio page, and we can have that for every
> single candidate. It would be just a simple biography: who they are, what they've
> done within the last 10 years, etc., not specifically policy-wise, just basic facts
> of where they were and what they were doing. We can then go into what they provide
> also on their site, if they have a short "Who am I?" It can literally just be
> "self-describes as blah blah blah," and we put their own self-description.

It has two parts, and each maps onto a bucket that already exists:

1. **Biography facts from the last 10 years.** These are `verifiable_fact` claims, which is the Recorder's bucket (Allowlist B: public record, filings, official bios), and each one has a source. The schema already carries them in `profile.facts`, and `brief-rows.ts` does not emit them yet. The same work is D2 option (a), so the bio section and the `word_count` fix are one piece of work.
2. **Self-description.** This is a verbatim `stated_position` quote from the candidate's own About or "Who I am" page, attributed as "self-describes as …". The ingest follows only policy-looking links today (`selectPolicyPages`), so it has to learn to fetch the About page too, under the same robots rules.

The same rules hold for both parts: every candidate gets the same kinds of source, nothing without a source, and no paraphrase of the self-description. The pilot measures whether the ingest reaches an About page as it stands.

## After the pilot (founder, 2026-09-27)

> go with (c), fix the --limit bug, then run all candidates

- **D2 = (c):** a recorded threshold decision instead of Recorder facts or a smaller spine.
  - **Still open: the form of (c).** On the full race, `word_count` ranges from 0 to 3,867, a variance of 100%.
  - Three candidates are silent (Datto, Abrams and Jewett) and have 0 words, so any `word_count_pct` below 100 still HALTs. The five candidates with runs alone vary by 91.5%.
  - (c) therefore means one of two things, and the founder has to pick:
    - `word_count_pct = 100` for FL-GOV, which turns this gate off for the race.
    - Change what the gate measures, for example exclude silent candidates and set a threshold of at least 92.
  - `run-2026-09-27.md` has the numbers.
- **`--limit`:** fixed so that it refuses to drop passages (`limitShortfall`).
- **The commitment gate (0.85) and the page cap (8)** were not raised. They are unchanged, and the same for every candidate.

## The form of (c), and the apply (founder, 2026-09-27)

> set word_count_pct to 150 and apply brief.sql

- **`word_count_pct = 150` for FL-GOV-general only**, passed as a per-call override to `balance_audit_core`. The global `DEFAULT_THRESHOLDS` stays at 15.
  - Variance is `(max − min) / max`, so it can never exceed 100%. Any threshold of 100 or more means **the `word_count` gate cannot HALT this race**.
  - That is the recorded intent: the founder decided that uneven campaign-site length, and silent candidates, do not block publication.
  - The soft flags still fire and are stored.
- **`brief.sql` applied** over the Supabase MCP on the founder's yes. How it was applied, and how it was verified, is in `run-2026-09-27.md` under "Apply and audit".
- **Publishing was then authorised separately:** "yes, publish FL-GOV". It was published at 2026-09-27 15:26 UTC (see `run-2026-09-27.md`).

## Link picking, `--limit`, and re-ingesting FL-GOV (founder, 2026-09-29)

After the keyword ingest of the other 46 races (`../ingest-2026-09-29-keywords.md`) found 32 of 81 readable sites read only at the homepage, and the About page read for 1 of 90:

> Explain 1 and 2, and what the issues were there. After that, we can try doing it in Jev, and we can remove the limit.

Asked which limit and whether FL-GOV is included, the founder answered: **the Jev `--limit` in Step 2**, and **yes, re-ingest FL-GOV too**.

- **Links are picked by Jev** (`--links jev`, now the ingest default): every on-site content link on the homepage is judged by its path and text, links at or above 0.5 are followed up to the unchanged 8-page cap, plus the strongest About page.
- **`--limit` is removed** from `candidate-policy-noul.ts`. Every passage is always asked.
- **FL-GOV is re-ingested and re-run the same way**, into each candidate's `reingest-2026-09-29/`. The published brief is not changed by this; rebuilding it from the new runs is a separate decision.
- **Unchanged:** the 8-page cap and the 0.85 threshold.
