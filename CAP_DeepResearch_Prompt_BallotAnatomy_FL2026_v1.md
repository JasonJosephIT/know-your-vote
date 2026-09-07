# CAP Deep-Research Prompt — "Ballot Anatomy, Florida 2026"

Establishes what the **2026 Florida general election ballot actually contains**, and where that data lives in machine-readable form. Run once, before candidate intake.

This is the only research lane that runs *ahead* of the pipeline rather than inside it. "Where They Stand" and "Issue Discovery" both assume you already know which races and candidates exist. Right now we don't — the database holds nothing but `demo-` fixtures, and the roster CSV we have is the **qualifying** list, not the general-election field.

---

## Why this runs first

Three things are open, and each one changes downstream work:

1. **Is a U.S. Senate race on the 2026 Florida ballot?** The app models `demo-fl-us-senate` as a statewide race, and `CAP_Target_Race_Candidates_2026_v1.csv` contains no Senate rows at all. One of those is wrong. It decides whether the shared ballot is five statewide races or four — a number that currently appears in product copy.
2. **How many constitutional amendments are certified**, with what numbers, titles and thresholds. The app's copy says three and says every one needs 60%. Both need confirming; the threshold is stored per measure precisely because it is not always 60%.
3. **Which congressional districts the four covered counties actually span.** The app covers Miami-Dade (12086), Broward (12011), Hillsborough (12057) and Orange (12095), and seeds FL-10/15/23/28. Whether that mapping is complete and current is unverified.

---

## Variables (fill before running)

- `{{ELECTION_DATE}}` — 2026-11-03
- `{{STATE}}` — Florida
- `{{COVERED_COUNTIES}}` — Miami-Dade (12086), Broward (12011), Hillsborough (12057), Orange (12095)
- `{{SEEDED_DISTRICTS}}` — FL-10, FL-15, FL-23, FL-28
- `{{RETRIEVAL_DATE}}` — the date you run this

---

## The prompt

```
ROLE
You are establishing the factual structure of the November 3, 2026 Florida
general election ballot for a non-partisan voter-information tool. Your output
is ballot STRUCTURE and CANDIDATE IDENTITY only. You are not researching what
anyone believes, said, or did.

OUTPUT BUCKET
Everything here is verifiable public record: which offices are on the ballot,
who qualified for the general election, which measures were certified, and
where each of those facts is published. Nothing you produce is a position, a
record, a verdict, or an endorsement.

HARD RULES
1. Sourcing hierarchy, in this order. Never skip a tier because a lower one is
   easier to read:
   a. Florida Department of State, Division of Elections — candidate lists,
      certified results, constitutional amendment filings, the official
      election calendar. This is the authority for every fact below.
   b. The county Supervisor of Elections for county-specific questions —
      sample ballots, precinct-level ballot styles, county measures.
   c. Secondary sources (Ballotpedia, news outlets) ONLY to locate a primary
      source or to cross-check one. Never as the fact itself. If a fact exists
      only in a secondary source, report it as unconfirmed and say so.
2. Every fact carries: the source URL you actually retrieved, the retrieval
   date, and which tier (a/b/c) it came from. A fact without a retrieved URL
   does not go in the output.
3. The August 2026 primary has happened. Report the GENERAL ELECTION field —
   who is on the November ballot — not the qualifying field. If you cannot
   confirm a general-election field from tier (a), say so for that race
   rather than falling back to the qualifying list.
4. No inference and no arithmetic on the ballot. Do not deduce that an office
   "must" be up because of its term length, do not assume an amendment
   threshold, do not assume a county's districts from its geography. Look each
   one up.
5. "Not found" is a valid, useful result. Say which source you checked and
   what was absent. A confident wrong answer here propagates into a voter's
   ballot; an honest gap gets filled by a human in ten minutes.
6. Report every office on the ballot, including ones this product currently
   defers (state legislature, judicial retention, county, municipal, special
   districts). We need to know what we are omitting in order to say so
   honestly to a voter. Mark each as in-scope or deferred per the list below.

EXPLICITLY OUT OF SCOPE — do not collect
- Candidate positions, statements, promises, or records.
- Fact-checks, verdicts, or any assessment of truth.
- Endorsements, polling, fundraising, or predictions.
- Any characterization of a candidate or measure as likely, leading, extreme,
  moderate, or controversial.
These belong to other lanes and to the Balance Audit. Collecting them here
would bypass the gate that makes this product neutral.

SEARCH STRATEGY
- Start at the Division of Elections: candidate lists filtered to the 2026
  General, the certified primary results, and the constitutional amendment
  page for 2026.
- For each of the four covered counties, find the Supervisor of Elections
  sample ballot for the 2026 General. Note whether the county publishes more
  than one ballot style and what drives the difference.
- For the congressional map, find the current district boundaries in force for
  2026 and which districts intersect each covered county. Note whether any
  boundary changed since the map the app was seeded against.
- For each source you use, record whether it is machine-readable (CSV, JSON,
  API) or human-only (PDF, HTML table), how often it updates, and any stated
  terms of use or reuse restriction.

QUESTIONS TO SETTLE EXPLICITLY
Answer each in one line, with its source:
1. Is a U.S. Senate seat on Florida's 2026 general ballot? If yes, which
   seat, why it is up, and who the general-election candidates are.
2. Which statewide executive offices are on the ballot, and who are the
   general-election candidates for each?
3. How many constitutional amendments are certified for this ballot? For
   each: number, official ballot title, ballot summary as printed, full-text
   URL, who placed it on the ballot, and the passage threshold.
4. Which congressional districts intersect each of the four covered counties?
5. Are FL-10, FL-15, FL-23 and FL-28 still current district numbers for 2026,
   and are those four sufficient to cover the four counties?
6. What else appears on a typical ballot in each covered county that this
   list does not already name?

OUTPUT
Return four blocks, in this order.

BLOCK 1 — answers to the six questions above, one line each, each with
source URL, retrieval date and tier.

BLOCK 2 — races, as JSON. One object per race on the ballot:
{
  "office": "official title as printed on the ballot",
  "level": "federal | state | county | municipal | judicial",
  "district": "FL-28, or null for statewide",
  "in_scope": true | false,
  "scope_note": "why, if deferred",
  "candidates": [
    { "legal_name": "", "party": "REP | DEM | NPA | LPF | other, as the
      Division of Elections writes it", "is_incumbent": true | false,
      "official_site": "url or null" }
  ],
  "source_url": "", "retrieved": "YYYY-MM-DD", "tier": "a|b|c",
  "confidence": "confirmed | unconfirmed", "note": ""
}

BLOCK 3 — measures, as JSON, one object per certified measure:
{
  "number": "1",
  "official_title": "exactly as printed",
  "ballot_summary": "exactly as printed, verbatim",
  "full_text_url": "",
  "placed_by": "legislature | citizen_initiative | commission | local",
  "threshold_pct": 60,
  "jurisdiction": "FL",
  "source_url": "", "retrieved": "YYYY-MM-DD", "tier": "a|b|c",
  "confidence": "confirmed | unconfirmed"
}
Quote official_title and ballot_summary verbatim. Do not clean up, shorten,
or neutralize the wording — a ballot summary is a legal text and voters
encounter it exactly as written, including any wording critics dislike.

BLOCK 4 — data source inventory, as a table:
| Source | What it authoritatively provides | URL | Format | Machine-readable | Update cadence | Terms/reuse notes |

Close with a short list of anything you could not confirm, and exactly which
official source a human should check to close each gap.
```

---

## Acceptance

The run is done when:

- All six questions have a one-line answer with a tier (a) or (b) source, or a named gap.
- Every race and measure block carries a retrieved URL and a retrieval date.
- The source inventory says, for each feed, whether we can automate against it or whether a human has to read a PDF.
- Nothing in the output is a position, a verdict, or a characterization.

## What happens next

Block 2 and Block 3 map directly onto the `race` / `candidate` and `ballot_measure` tables, so a confirmed run can be turned into intake SQL without further judgement calls. Block 4 decides whether the refresh agents can poll a feed or whether ballot data stays a manual step.

None of it publishes anything on its own: races and measures still go through the Balance Audit and the publication gate, and TASK-058's date verification is unaffected.
