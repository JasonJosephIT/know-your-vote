# UI inspiration: shortlist (2026-10-05)

This is a research pass only. Nothing in `src/` was changed. The shortlist pairs each pattern from the reference sites with a problem seen on the live site (knowyour.vote) on 2026-10-05.

| File | What's in it |
|---|---|
| `baseline-knowyour-vote.md` | 11 issues seen on the live site |
| `inspo-civic.md` | Ballotpedia, BallotReady, Vote.org, CalMatters, Texas Tribune, Vote Smart, iSideWith |
| `inspo-govds.md` | GOV.UK, USWDS, NHS, Canada.ca, vote.gov, GetCalFresh. Includes our token contrast numbers |
| `inspo-editorial.md` | PolitiFact, AllSides, Ground News, Our World in Data, Semafor, Axios |

Each file has markup notes and Tailwind v4 sketches written with our tokens (`bg-surface`, `text-on-surface-muted`, `border-border`, …).

## Ranked shortlist

### Tier 1: fixes a live problem

1. **Issue rows as the default race layout** (CalMatters). Today the Governor page is 37,837px tall: 8 candidate columns, with issue blocks that don't line up across columns (baseline 3–4). Instead, give each issue an H2 with one card per candidate under it, in ballot order. On a phone, each issue row becomes a scroll-snap carousel controlled by a sticky candidate switch, and all rows scroll together. The `?pick=` issue view already does half of this.
   *See* `inspo-civic.md` §5, `inspo-editorial.md` §2.
2. **Collapse long quote lists** (GOV.UK details). Show the first 1–2 quotes per issue and put the rest behind "Show N more from this candidate". Make "No stated position found" a single compact line, not a full-size box (baseline 5–6).
   *See* `inspo-govds.md` §7.
3. **Deadline strip that knows the date** (CalMatters key dates, GOV.UK warning text). It reads "Register by October 5", and today is October 5. It needs "today" and "passed" states, with passed dates greyed (baseline 2). **Time-sensitive.**
   *See* `inspo-govds.md` §8, `inspo-civic.md` §5.4.
4. **Measure page: yes/no meaning boxes first, plain title, official text last** (Ballotpedia, CalMatters). The H1 is currently the 3-line all-caps official title, followed by a dense block of ballot text (baseline 9). Changes:
   - a plain verb-phrase title, with the official title under it;
   - two left-ruled boxes explaining what a YES vote does and what a NO vote does, using sage and accent, never green and red;
   - the official text inside `<details>`, with a reading-level chip.

   *See* `inspo-civic.md` §1.
5. **Richer home race rows** (BallotReady, Ballotpedia votebox). Each race card currently shows only "Statewide / Full brief". Add a candidate count and party mix, shown as text (for example "8 candidates · 2 REP, 1 DEM, 5 other"), and make the row compact (baseline 1).

### Tier 2: builds trust (on-brand: "in their own words", "how we stay fair")

6. **Where each stance comes from** (Vote Smart, PolitiFact). Before each quote, say where and when it came from: "From their campaign site · checked Sep 30". Do this before adding any verdict.
7. **"Last checked / next check" plus "Spot a mistake?"** (NHS review date, Our World in Data "About this data"). This makes the weekly re-check routine visible.
8. **News lean chip with a "Not yet rated" state, linked to its rationale** (AllSides). Use neutral styling and show position with a marker, never blue and red. This also gives C7-a the `unrated` value it lacks. Don't add a Ground News style coverage-mix bar until outlets are rated.
9. **Socials grouped by "Campaign" vs "Official office"** (BallotReady), shown as a single compact row. On mobile the socials currently push the content below the fold (baseline 7).
10. **Non-government identity footer and "You can't register here" handoff** (USWDS identifier, GetCalFresh).

### Tier 3: larger additions, each needs its own brainstorm

11. **Step-by-step "How to vote in Florida"**, with "or" branches for mail, early and Election Day voting (GOV.UK step-by-step).
12. **Ballot checklist**, with per-race "read up" status kept in localStorage only (GOV.UK task list).
13. **Spanish toggle** (CalMatters). This matters for Miami-Dade.
14. **Mobile bottom dock** with the four destinations (CalMatters). Mostly done already: the bottom nav has Candidates and News.

## Don't borrow

- **Written support/oppose summaries** (CalMatters). The founder retired the written case for and against on 2026-09-23. Endorsement and finance facts are fine.
- **Quizzes and "match" scores** (iSideWith). The quiz was clipped on 2026-09-25.
- **Party-coloured headers, red/green for yes/no, or verdict counts per candidate.**
- **A donate modal fired over content mid-read.** Ours appears on the race page while scrolling (baseline 8). CalMatters and others were noted as doing the same thing badly.

## Contrast notes (from `inspo-govds.md`)

- `warning` `#b07a1e` is 3.35:1 on cream, and `accent` `#b26836` is 4.26:1 on white. Neither is safe for body text.
- `border` and `border-strong` are too faint to outline a control on their own. Use `border-border-input`.
