# Spine and balance check for the other 52 races (proposal, 2026-10-03)

Session C2, Step 4, before any plan is written. **Nothing has been applied to the database, and nothing has been published.** The roster comes from a read-only Supabase query. The counts come from the reviewed two-gate runs (`jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85), with the 12 passages in `withheld-2026-09-30.json` held back.

FL-GOV needed two founder calls before its brief could be built: D1, its spine, and D2, how to pass the `word_count` gate (see `FL-GOV/decisions.md`). This report lays out the same two calls for every other general-election race at once, plus a third question that FL-GOV never raised.

## What the runs hold

- **52 races and 98 candidates.**
  - 46 races have at least one site that was read.
  - In 6 races, no candidate has an `official_site`: Broward CC2, CC4 and CC8; Miami-Dade SB2 and SB8; Orange SB Chair.
- **14 candidates are silent.**
  - 8 have no site.
  - 5 sites put up bot walls: Beltran, Dandiya, Shuham, Taddeo and Piper.
  - 1 site's robots.txt blocks the crawl: Quinones Hernandez.
- **17 races have no claim at all.** Every candidate in them is silent or states no commitment that clears both gates: FL-CFO, Broward CC2, CC4, CC6 and CC8, Broward SB6 and SB At-Large 8, Miami-Dade SB2 and SB8, Hillsborough SB4 and SB6, Orange CC4, CC6, Clerk, SB1, SB3 and SB Chair.
- **16 races have one candidate on the ballot.**
- **28 races HALT the Balance Audit at the default `word_count` threshold (15%).** Most of them have one candidate with a long policy page and another with little or nothing.

## Decision 1: how the spine is chosen (the same rule for every race)

The spine is the 3 or 4 issues shown side by side under "Compare what each candidate says on". It is chosen from the shared taxonomy (`tax-7`, 25 sub-issues). Every other policy claim still appears under its own issue, so the spine changes which issues are compared, not which claims are shown.

- **Option 1: by coverage, per race.** Take the 4 issues the most candidates in that race address, with ties broken by the number of claims. This fills 149 of 249 candidate-issue cells (60%). But the questions are set by what the candidates chose to write about, so a candidate with one long issues page largely sets the agenda.
- **Option 2: by office, fixed before looking at the runs.** This fills 107 of 288 cells (37%), but every race for the same office asks the same questions. It is also how FL-GOV's spine was picked: by what the office does, not by who wrote what.
  - US House and Senate: `B1` Economy, inflation and jobs; `B2` Healthcare access and costs; `B3` Immigration and border enforcement; `B4` Social Security and Medicare.
  - County commission and mayor: `A2` Housing affordability; `KYV3` Growth, development and land conservation; `KYV4` Storm resilience and flood protection; `B7` Crime policy, policing and courts.
  - School board: `A6` Public school funding and teachers; `KYV9` School choice and vouchers; `KYV10` Career, vocational and higher education.
  - CFO: `A1` Property insurance costs; `A3` Property taxes; `B1`; `A4` Cost of living in Florida.
  - Agriculture Commissioner: `A5` Water quality and Everglades restoration; `KYV5` Water supply and drinking water; `KYV3`; `A4`.
  - Attorney General: `B7`; `KYV1` Threats to democratic institutions; `B3`; `A1`.
  - Clerk of Courts: no taxonomy issue fits, so the race has no spine.

**Recommendation: Option 2.** The questions are fixed by office before anyone's site is read, so no candidate's emphasis decides what everyone is compared on. Option 1 fills more cells, but it does so by letting the race's most prolific site pick the questions. Either way, a candidate with nothing on a spine issue shows "No stated position found", as Datto and Abrams do on FL-GOV.

## Decision 2: how to pass the `word_count` gate

At the default 15%, 28 races HALT. FL-GOV passed with the founder's `word_count_pct = 150` (2026-09-27), which turns the gate off: the variance cannot exceed 100%. Under 150, all 52 races pass. The `stated_position_count` and spine-coverage flags still record the asymmetry, as they do for Datto and Abrams on FL-GOV.

**Recommendation: 150 for every race,** the same rule FL-GOV runs under. Applying a stricter threshold only to these races would hold them to a standard the published race was not held to.

## Decision 3 (new): races with nothing to compare

A brief for one of the 17 no-claim races would show only "No stated position found" for every candidate on every issue. The race already appears today at the listed tier as a roster.

**Recommendation:**
- **Keep the 17 no-claim races at the listed tier, with no brief,** until a candidate's site states a position. A wall of "no stated position" adds nothing to the roster, and a voter may read it as a judgement on the candidates.
- **Publish the races with at least one claim, including the single-candidate ones.** A single-candidate race passes the audit trivially and still tells the voter what that candidate says.

## Per race

Positions are the candidate's stated-position claims after both gates and the withheld list. Option 1 and 2 show each spine issue and how many of the race's candidates address it. The audit columns use the default thresholds, so 15% on `word_count`.

| Race | Candidates | Positions per candidate | Words (min–max) | Audit at 15% | Option 1: by coverage | Option 2: by office |
| ---- | ---------- | ----------------------- | --------------- | ------------ | --------------------- | ------------------- |
| FL-SEN | 3 | Moody 0 · Gillespie 0 · Nixon 64 | 0–1593 | 100% **HALT** | B1 1/3, A2 1/3, B2 1/3, B7 1/3 | B1 1/3, B2 1/3, B3 1/3, B4 1/3 |
| FL-7 | 3 | Dalton 13 · Elijah 9 · Dennison 3 | 139–967 | 86% **HALT** | B2 3/3, B7 3/3, B1 2/3, B5 2/3 | B1 2/3, B2 3/3, B3 1/3, B4 1/3 |
| FL-8 | 2 | Haridopolos 14 · Jenkins 8 | 90–860 | 90% **HALT** | B2 2/2, B1 2/2, B7 2/2, B6 1/2 | B1 2/2, B2 2/2, B3 1/2, B4 1/2 |
| FL-9 | 2 | Soto 5 · Green 4 | 215–225 | 4% **PASS** | B1 2/2, A2 2/2, A4 2/2, B2 1/2 | B1 2/2, B2 1/2, B3 0/2, B4 1/2 |
| FL-10 | 1 | Frost 4 | 260–260 | 0% **PASS** | B2 1/1, B4 1/1, B7 1/1, B8 1/1 | B1 0/1, B2 1/1, B3 0/1, B4 1/1 |
| FL-11 | 3 | Groves 7 · Pericola 7 · Strada 0 | 0–595 | 100% **HALT** | B4 2/3, B2 1/3, A1 1/3, A2 1/3 | B1 1/3, B2 1/3, B3 1/3, B4 2/3 |
| FL-12 | 3 | Bilirakis 4 · Overman 17 · Scrivener 3 | 135–678 | 80% **HALT** | B2 2/3, A6 2/3, B5 1/3, A2 1/3 | B1 1/3, B2 2/3, B3 1/3, B4 0/3 |
| FL-14 | 3 (1 silent) | Castor 3 · Beltran 0 · Lambert 5 | 0–114 | 100% **HALT** | B1 2/3, B2 2/3, A4 1/3, A7 1/3 | B1 2/3, B2 2/3, B3 1/3, B4 0/3 |
| FL-15 | 2 | People 10 · Lee 6 | 353–528 | 33% **HALT** | B1 2/2, A7 2/2, KYV2 2/2, B2 1/2 | B1 2/2, B2 1/2, B3 1/2, B4 1/2 |
| FL-16 | 3 | Davis 1 · Gruters 7 · Kirschner 22 | 14–515 | 97% **HALT** | KYV3 2/3, B4 2/3, A2 2/3, B1 2/3 | B1 2/3, B2 1/3, B3 1/3, B4 2/3 |
| FL-20 | 3 | Maxime 42 · Andersen 2 · Schultz 0 | 0–720 | 100% **HALT** | B3 2/3, A4 2/3, B2 1/3, KYV10 1/3 | B1 1/3, B2 1/3, B3 2/3, B4 1/3 |
| FL-22 | 2 (1 silent) | Dandiya 0 · Askar 1 | 0–48 | 100% **HALT** | B1 1/2 | B1 1/2, B2 0/2, B3 0/2, B4 0/2 |
| FL-24 | 2 | Brown 21 · III 18 | 548–1586 | 65% **HALT** | B1 2/2, A2 2/2, B2 2/2, KYV10 2/2 | B1 2/2, B2 2/2, B3 1/2, B4 1/2 |
| FL-25 | 3 (1 silent) | Moskowitz 9 · Singer 14 · Jassenoff 0 | 0–718 | 100% **HALT** | A1 2/3, B7 2/3, B1 1/3, B3 1/3 | B1 1/3, B2 1/3, B3 1/3, B4 1/3 |
| FL-26 | 3 (1 silent) | Locklin 17 · Diaz-Balart 7 · Hosey 0 | 0–1485 | 100% **HALT** | B1 2/3, B3 2/3, B7 2/3, B4 1/3 | B1 2/3, B2 1/3, B3 2/3, B4 1/3 |
| FL-27 | 2 | Rodriguez 0 · Salazar 3 | 0–204 | 100% **HALT** | A5 1/2, KYV1 1/2, KYV4 1/2 | B1 0/2, B2 0/2, B3 0/2, B4 0/2 |
| FL-28 | 3 | Rojas 0 · Gimenez 0 · Ehr 8 | 0–204 | 100% **HALT** | B2 1/3, A2 1/3, B3 1/3, B7 1/3 | B1 0/3, B2 1/3, B3 1/3, B4 0/3 |
| FL-AGR | 2 | Simpson 1 · Atkins 0 | 0–40 | 100% **HALT** | KYV9 1/2 | A5 0/2, KYV5 0/2, KYV3 0/2, A4 0/2 |
| FL-ATG | 2 | Uthmeier 0 · Rodriguez 1 | 0–12 | 100% **HALT** | B7 1/2 | B7 1/2, KYV1 0/2, B3 0/2, A1 0/2 |
| FL-CFO | 2 (1 silent) | Ingoglia 0 · Taddeo 0 | 0–0 | 0% **PASS** | — | A1 0/2, A3 0/2, B1 0/2, A4 0/2 |
| FL-BRO-CC2 | 1 (1 silent) | Bogen 0 | 0–0 | 0% **PASS** | — | A2 0/1, KYV3 0/1, KYV4 0/1, B7 0/1 |
| FL-BRO-CC4 | 1 (1 silent) | Fisher 0 | 0–0 | 0% **PASS** | — | A2 0/1, KYV3 0/1, KYV4 0/1, B7 0/1 |
| FL-BRO-CC6 | 1 (1 silent) | Shuham 0 | 0–0 | 0% **PASS** | — | A2 0/1, KYV3 0/1, KYV4 0/1, B7 0/1 |
| FL-BRO-CC8 | 1 (1 silent) | McKinzie 0 | 0–0 | 0% **PASS** | — | A2 0/1, KYV3 0/1, KYV4 0/1, B7 0/1 |
| FL-BRO-SB1 | 1 | Bulman 1 | 59–59 | 0% **PASS** | A6 1/1 | A6 1/1, KYV9 0/1, KYV10 0/1 |
| FL-BRO-SB4 | 1 | Morst 1 | 96–96 | 0% **PASS** | A6 1/1 | A6 1/1, KYV9 0/1, KYV10 0/1 |
| FL-BRO-SB6 | 2 | III 0 · Cervera 0 | 0–0 | 0% **PASS** | — | A6 0/2, KYV9 0/2, KYV10 0/2 |
| FL-BRO-SB7 | 1 | Dominique 4 | 55–55 | 0% **PASS** | A6 1/1, KYV10 1/1 | A6 1/1, KYV9 0/1, KYV10 1/1 |
| FL-BRO-SBAL8 | 1 | Zeman 0 | 0–0 | 0% **PASS** | — | A6 0/1, KYV9 0/1, KYV10 0/1 |
| FL-DAD-CC2 | 1 | Bastien 5 | 83–83 | 0% **PASS** | B1 1/1, A2 1/1, KYV6 1/1, KYV10 1/1 | A2 1/1, KYV3 0/1, KYV4 0/1, B7 0/1 |
| FL-DAD-CC5 | 2 (1 silent) | Lopez 3 · Piper 0 | 0–25 | 100% **HALT** | A2 1/2, B1 1/2, KYV4 1/2 | A2 1/2, KYV3 0/2, KYV4 1/2, B7 0/2 |
| FL-DAD-SB1 | 2 | Wilson 0 · Cothiere 9 | 0–191 | 100% **HALT** | A6 1/2, B1 1/2 | A6 1/2, KYV9 0/2, KYV10 0/2 |
| FL-DAD-SB2 | 1 (1 silent) | Bendross-Mindingall 0 | 0–0 | 0% **PASS** | — | A6 0/1, KYV9 0/1, KYV10 0/1 |
| FL-DAD-SB8 | 1 (1 silent) | Colucci 0 | 0–0 | 0% **PASS** | — | A6 0/1, KYV9 0/1, KYV10 0/1 |
| FL-HIL-CC1 | 2 | Cohen 0 · Toledo 4 | 0–129 | 100% **HALT** | A2 1/2, B7 1/2, KYV3 1/2, KYV4 1/2 | A2 1/2, KYV3 1/2, KYV4 1/2, B7 1/2 |
| FL-HIL-CC3 | 2 | Myers 0 · Garcia 7 | 0–446 | 100% **HALT** | B1 1/2, B7 1/2, KYV3 1/2, A6 1/2 | A2 0/2, KYV3 1/2, KYV4 0/2, B7 1/2 |
| FL-HIL-CC5 | 2 | Manimala 2 · Hahn 3 | 27–167 | 84% **HALT** | B7 2/2, B2 1/2, KYV3 1/2 | A2 0/2, KYV3 1/2, KYV4 0/2, B7 2/2 |
| FL-HIL-CC7 | 2 | Wostal 2 · Rodriguez 3 | 112–140 | 20% **HALT** | A3 1/2, A2 1/2, B7 1/2, KYV3 1/2 | A2 1/2, KYV3 1/2, KYV4 0/2, B7 1/2 |
| FL-HIL-SB2 | 2 | Simic 1 · Lyssy 0 | 0–28 | 100% **HALT** | A6 1/2 | A6 1/2, KYV9 0/2, KYV10 0/2 |
| FL-HIL-SB4 | 1 | Rendon 0 | 0–0 | 0% **PASS** | — | A6 0/1, KYV9 0/1, KYV10 0/1 |
| FL-HIL-SB6 | 2 | Gay 0 · Perez 0 | 0–0 | 0% **PASS** | — | A6 0/2, KYV9 0/2, KYV10 0/2 |
| FL-ORA-CC2 | 2 | Brown 6 · Crabb 7 | 45–131 | 66% **HALT** | A2 2/2, KYV3 2/2, B1 1/2, KYV4 1/2 | A2 2/2, KYV3 2/2, KYV4 1/2, B7 0/2 |
| FL-ORA-CC4 | 2 | Jones 0 · Lopez 0 | 0–0 | 0% **PASS** | — | A2 0/2, KYV3 0/2, KYV4 0/2, B7 0/2 |
| FL-ORA-CC6 | 2 | Scott 0 · Gelzer 0 | 0–0 | 0% **PASS** | — | A2 0/2, KYV3 0/2, KYV4 0/2, B7 0/2 |
| FL-ORA-CC7 | 2 | Vargo 0 · Rumph 4 | 0–137 | 100% **HALT** | A2 1/2, B7 1/2, KYV3 1/2 | A2 1/2, KYV3 1/2, KYV4 0/2, B7 1/2 |
| FL-ORA-CC8 | 2 (1 silent) | Jr. 5 · Hernandez 0 | 0–217 | 100% **HALT** | A2 1/2, B1 1/2, B2 1/2, KYV4 1/2 | A2 1/2, KYV3 0/2, KYV4 1/2, B7 0/2 |
| FL-ORA-CLERK | 2 | Thomas 0 · Johnson 0 | 0–0 | 0% **PASS** | — | — |
| FL-ORA-MAYOR | 2 | Russell 0 · Messina 7 | 0–304 | 100% **HALT** | B1 1/2, B7 1/2, A3 1/2, KYV3 1/2 | A2 0/2, KYV3 1/2, KYV4 0/2, B7 1/2 |
| FL-ORA-SB1 | 1 | Marantes 0 | 0–0 | 0% **PASS** | — | A6 0/1, KYV9 0/1, KYV10 0/1 |
| FL-ORA-SB2 | 1 | O'Neal 1 | 11–11 | 0% **PASS** | A6 1/1 | A6 1/1, KYV9 0/1, KYV10 0/1 |
| FL-ORA-SB3 | 2 | Peña 0 · Moore 0 | 0–0 | 0% **PASS** | — | A6 0/2, KYV9 0/2, KYV10 0/2 |
| FL-ORA-SBCHAIR | 1 (1 silent) | Gallo 0 | 0–0 | 0% **PASS** | — | A6 0/1, KYV9 0/1, KYV10 0/1 |

## How this was produced

`spine-analysis-2026-10-03.ts` (in this folder) reads `spine-roster-2026-10-03.json` and each candidate's `run.json`, and applies the withheld list. It builds each race's rows with `buildBriefRows` (the same code as `scripts/brief-rows-sql.ts`) using the Option 1 spine, and writes `spine-analysis-2026-10-03.json`. The roster is the Supabase race and candidate rows at 2026-10-03. The audit is `balance_audit_core` over those profiles. The spine affects only the coverage flag, so the `word_count` result is the same under either option. No passage was hand-edited, and no claim was written.

## Next, on the founder's answers

For every race the answers say to brief: a `plan.json` and a `brief.sql` built from the chosen spine, an audit preview, and a reviewer pass. Then the same apply and publish as FL-GOV, race by race, each on its own yes.

## Decisions (founder, 2026-10-03)

> By office (Recommended) · 150, like FL-GOV (Recommended) · Keep at listed tier (Recommended)

1. **The spine is fixed by office,** as listed under Option 2 above.
2. **`word_count_pct = 150` for every race,** the threshold FL-GOV runs under.
3. **The 17 races with no claim stay at the listed tier** with no brief. The other 35, single-candidate races included, get a brief.

The plans, briefs and audit previews built on these decisions are in [step4-2026-10-03.md](step4-2026-10-03.md).
