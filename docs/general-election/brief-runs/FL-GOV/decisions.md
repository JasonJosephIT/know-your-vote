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

## Re-run, reviews and FL-GOV rebuild (founder, 2026-09-29)

Asked whether (1) every failure gets one identical re-run, (2) Step 3 reviews go ahead for every run, and (3) FL-GOV's brief is rebuilt from `reingest-2026-09-29/`:

> Yes to all

- **One identical re-run of every failure**, the same rule for every candidate: the 9 candidates whose Jev-link ingest failed were run again at 19:17 UTC with the same command (`jev-driver-2026-09-29.sh jev-retry-targets-2026-09-29.tsv`). The failed attempt is kept in each folder's `attempt-1-failed/`. Dan Green and Oliver Gilbert were read on the re-run; the other 7 failed again and are recorded silence. There is no second re-run.
- **Step 3 reviews** for all 90 runs, one reviewer subagent each on `profiler-review-prompt.md` (header change recorded there).
- **FL-GOV is rebuilt** from the new runs: a new `plan.json` and `brief.sql` in `FL-GOV/rebuild-2026-09-29/`. Applying it replaces the live, published brief, so it waits on its own yes.

## The second commitment gate (founder, 2026-09-30)

On the three options in `../review-2026-09-29.md` for the 70 passages flagged under check 3:

> 1

A second gate question is added to Step 2 (`OWN_COMMITMENT_ID`), and every run is re-run and re-reviewed. The same 0.85 threshold applies to it as to every other question. The wording, the pilot that shaped it, and the result are in `../gate2-2026-09-30.md`.

Asked whether to keep 0.85 on the second gate and re-review all 90 runs, the founder answered: **keep 0.85, re-review**. The re-reviews are summarised in `../review-2026-09-30.md`.
- Across all runs, 81 pass and 9 fail, all on check 3, with 16 flagged passages.
- For FL-GOV, Jewett and Burkett now pass. Jolly still fails on one About-page passage (`266196cf`).
- That passage is a claim in `rebuild-2026-09-29/brief.sql`. The brief is still not applied.

## The 16 flagged passages: withhold the past record only (founder, 2026-09-30)

On the options in `../review-2026-09-30.md` for the 16 passages still flagged under check 3, the founder chose the middle path:

> middle path

- **12 are withheld.** They are only a past record: Soto's and Simpson's list items, Diaz-Balart's two appropriations lines, Ingoglia's résumé bullet and Bilirakis's funding line.
  - They are listed with their reasons in `../withheld-2026-09-30.json`.
  - A plan points at that list with `"withheld_from"`. `scripts/brief-rows-sql.ts` then emits no claim for them, records each as `withheld_after_review` with its reason in the SQL header, and refuses to build if an entry no longer names a policy passage in its run.
- **4 are kept, with the reviewer's note recorded in the same file.** They carry forward-looking wording: Lee, Gilbert, Nixon, and Jolly's `266196cf`.
- **The rule, the same for every candidate:** a flagged passage is withheld only when it is a past record with no commitment.
- **FL-GOV:** none of its passages are withheld. `rebuild-2026-09-29/plan.json` now points at the list, and the rebuilt `brief.sql` has the same rows as before, with one added header comment. It is still not applied.

## Apply the rebuilt FL-GOV brief (founder, 2026-09-30)

Asked whether to apply `rebuild-2026-09-29/brief.sql`, which replaces the live, published brief:

> yes, apply the FL-GOV brief

- **Applied** on 2026-09-30, 21:45–21:58 UTC, in 12 batches. The first batch took the race's profiles dark (`balance_check_passed = false`) in the same transaction as the deletes, so no reader could see a half-built brief. The race stayed `published` throughout.
- **The live fingerprints equal the local reference** on claims, claim sources, positions, issues and profiles.
- **The Balance Audit passes** on the applied profiles, with the `word_count` threshold of 150 decided on 2026-09-27. It was written back in the same shape as before. Datto and Abrams are flagged `stated_position_asymmetry`. Jewett is no longer flagged: his site was read in this rebuild.
- Details, hashes and the rollback steps are in `rebuild-2026-09-29/apply-2026-09-30.md`. The audit is in `rebuild-2026-09-29/audit-2026-09-30.json`.

## D1, the bio section: proposed (pending founder confirmation), 2026-10-04

Launch handoff §3, founder decision 8: build the bio section D1 promised "for every candidate", or drop the promise. **Not decided.** This records the recommended call so the founder can confirm or flip it.

**Proposed (pending founder confirmation): drop the bio section for 2026.** The D1 spine stays as decided. No bio is built, and nothing a voter sees promises one.

- **It is not built, and neither half has a pipeline.**
  - `src/lib/brief-rows.ts` emits stated positions only. Live on 2026-10-04, all 82 profiles have empty `facts`, `verifiable_fact_count = 0` and no `opinions`, and all 648 claims are `stated_position`.
  - Part 1 (biography facts from the last 10 years, the Recorder's Allowlist B) has no ingest, no reviewer and no bucket in the writer.
  - Part 2 (a verbatim "self-describes as" quote) has passages on disk but no rule. The second commitment gate (2026-09-30) was built to reject exactly this kind of text, biography, so a self-description needs its own path through Step 2 and its own reviewer check.
- **The reach would be uneven.**
  - The 2026-09-29 Jev-link ingest read an About page for 56 of the 90 readable sites (`../ingest-jev-2026-09-29.md`).
  - The 9 ballot candidates with no site, and the walled ones, would have none.
  - A section that 56 of 106 candidates can fill is the asymmetry the Balance Audit exists to flag.
- **There is no review time.** A new content type needs:
  - its gate or exemption;
  - a reviewer check (verbatim, from the candidate's own About page, the candidate's own words and not a third party's);
  - a block in `CandidateBrief`;
  - its own audit decision;
  - a methodology paragraph.

  The refresh calendar (`../refresh-plan-2026-10.md`) has no room for that before early voting on 10-24.
- **The voter loses little.** Every candidate card already links the candidate's official site, where the About page is.

**Where the public UI stands (grep of `src/`, and live `GET`s of a race page and `/manifest.webmanifest`, 2026-10-04).**
- No page or component promises a bio, biography or self-description. The methodology page being rewritten in this PR says "There is no bio section."
- The nearest promise is the record and the facts, "what they've done". It appears in four places:
  - the home page hero ("what they've done, and what's been verified") and caption ("says, has done, and what's verified"), `src/app/(public)/page.tsx`;
  - the site metadata in `src/app/layout.tsx`. Live, every page's `description`, `og:description` and `twitter:description` say "what they've done, and what's been verified". `twitter:description` has no setting of its own, and the live tag matches the Open Graph text. The decision 1 rewrite in this PR replaces both texts;
  - the PWA manifest, `src/app/manifest.ts` line 13 (served live as `/manifest.webmanifest`): "See everyone on your ballot, what they say, what they've done, and all facts no cap." Nothing in this PR changes it. "No cap" is the house register the voice guide allows for social copy. The problem is the promise of records and "all facts";
  - the "canonical lines" in `docs/voice-and-tone.md` that the manifest copies.
- All four belong to decision 1, the trust-copy rewrite. The manifest and the voice guide are flagged to its owner.
- `IssueSection`'s "What They've Done" heading renders only when a bucket has items, and today none does.

**To flip (build it):** the smallest honest version is part 2 alone.
- One verbatim self-description per candidate, quoted from the About page their 2026-09-29 run already read, labelled "Self-describes as".
- "No self-description found" for everyone else.
- The same rule for all 106.

It needs a writer bucket, the reviewer check, a UI block and the founder's call on the audit's treatment of a 56-of-106 section. Part 1 (Recorder facts) is a separate project, not one for this cycle.
