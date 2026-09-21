# What a candidate is running on, from their own site

**Status:** built, not yet run live (needs `TYPESAFE_API_KEY`)
**Code:** `src/lib/candidate-site.ts`, `src/lib/policy-noul.ts`,
`scripts/candidate-site-ingest.ts`, `scripts/candidate-policy-noul.ts`
**Guardrails:** `scripts/verify-candidate-site.ts`, `scripts/verify-policy-noul.ts`
**Date:** 2026-09-19

## The claim this pipeline makes

Given a candidate's own site, it reports the policy areas they state positions
on, and for each one the **passage that states it** plus the page it was
fetched from. `CAP_Change_Spec_Stances_and_RelatedNews_v1.md` §5 puts the
candidate's own words at the top of the sourcing hierarchy; this is the
machinery for that lane.

## Why a Noul, and what that buys

A Jev Noul returns a number. The response has no free-text field, so the model
cannot write a summary, cannot name a candidate, and cannot produce a quote or
a url.

Every citation this pipeline emits was **retrieved before the model ran** and
is reproduced verbatim. A wrong answer can attach a real quote to the wrong
issue, which a reader can see and check. It cannot invent the quote, which a
reader cannot check. That asymmetry is the reason to ask a number rather than
ask for prose, and it is the same reason `news-characterize.ts` gives for the
news path.

## Two steps, two failure modes kept apart

### 1. Ingest (`scripts/candidate-site-ingest.ts`)

```bash
node scripts/candidate-site-ingest.ts --site https://example.com \
  [--pages 8] [--out passages.jsonl]
```

Fetches the homepage, follows the links that look like a policy section, and
writes passages as JSONL. Polite by construction: robots.txt is read and
honored, requests are serialized with a delay, the crawl is capped, and it
never leaves the site.

Which links get followed, in rank order, because the cap should spend itself on
the best pages first:

1. the path names a policy **section**: `/issues`, `/platform`, `/priorities`
2. the link names a policy **area**: `/environment`, "Homeowners insurance" —
   decided by `src/lib/policy-areas.ts`, so this reuses the taxonomy instead of
   growing a second list of topic words
3. the anchor text says "issues" and the path does not

A passage is a `<p>`, `<li>`, `<blockquote>` or `<dd>` with its nearest
heading kept as context. Headings are never passages themselves: as a citation
a heading quotes a label instead of a commitment. Boilerplate is dropped by
**prefix** ("Paid for by...", "Copyright..."), never by substring, because a
sentence that happens to contain the word "donate" is a sentence and cutting it
would edit the candidate's words. An over-long block is split on sentence
boundaries rather than truncated, and the guardrail asserts that splitting
loses no words.

### 2. Ask (`scripts/candidate-policy-noul.ts`)

```bash
# review the exact request before it is billed — no network, no key
node scripts/candidate-policy-noul.ts --in passages.jsonl --dry-run

# ask
node scripts/candidate-policy-noul.ts --in passages.jsonl \
  [--limit N] [--threshold 0.85] [--json report.json]
```

One request per passage, carrying one gate question plus one question per
sub-issue in the shared taxonomy.

**The gate** (`q_states_policy`) asks whether the passage states a policy
position at all: something the speaker says they would do, support, oppose,
fund or change if elected. Without it, "she worked as a nurse for twenty
years" is filed as a healthcare policy — "relates to healthcare" and "says
what I will do about healthcare" are different claims, and a campaign site is
full of the first.

**The issue questions** are flat and identical across issues; only the label
and the issue's own aliases vary. `verify-policy-noul.ts` asserts that by
stripping each issue's own words and requiring what is left to be
character-identical, so no issue is asked more persuasively than another.

## What the model is told, and what it is not

The state is three fields: the passage text, its heading, and the url **path**.
No candidate name, no party, no office, no race, no host.

The honest limit, same as the news path: a candidate's own site says their name
in their own words all over the page, and stripping it would corrupt the quote.
What is proven is that we added no identity. The rest is measured, and **for
this input shape it has not been measured yet**.

## The threshold is inherited, not tuned

`DEFAULT_POLICY_THRESHOLD` is 0.85, taken from the news characterizer where it
was measured on **headlines**. A passage is a different input. Treat the
default as a starting point a gold set has yet to confirm; `--threshold` exists
for that reason, and the dry-run output is the raw material for building the
gold set by hand-correcting it.

## Reading the output

Findings are grouped by policy area, then sub-issue, then citations ordered by
score, strongest first. Never by citation count: that would rank a candidate's
issues by how much their web copy repeats itself.

Three things are reported rather than dropped, because each is a different
fact and a silent empty report looks exactly like a candidate who has stated no
positions:

- passages that state a policy the taxonomy has no question for,
- passages that state no policy,
- passages whose request failed (counted, named, and they set the exit code).

## Comparing two runs

Every run writes one JSON file (`--json`), and two of them are compared with:

```bash
node scripts/compare-policy-runs.ts a.json b.json [--tolerance 0.05] [--all] [--json diff.json]
```

The format is `src/lib/policy-run.ts`. It exists because `diff` answers
neither question anyone actually has of two runs:

**1. Are these comparable?** Only when the schema, the provenance
(`jev:MODEL/tax-VERSION/q-HASH`) and the threshold all match. The provenance
hash covers the question wording, so a reworded Noul makes two runs
incomparable even at the same model and taxonomy. The report says this first
and refuses to imply otherwise: a change in our wording reported as "the model
is stable" is the one output this tool must never produce.

**2. What moved, the site or the model?** A campaign editing its housing
paragraph and Jev changing its mind about the same paragraph produce the same
shaped diff and are opposite findings, so **corpus** changes and **verdict**
changes are reported separately and never merged.

A passage id is a hash of url plus text, so edited text arrives as a removal
plus an addition. The comparer re-pairs those on url and heading and reports
them as `EDITED`, one pairing per slot — a page that gained a second block
under the same heading is not reported as an edit of the first.

Three states a passage can be in, kept distinct because two of them look
identical in a careless format:

| `verdict` | means |
|---|---|
| `null` in a `not_run` file | nobody asked (a manifest) |
| `null` in a `partial` file | the request failed; `counts.failed` says how many |
| `{ states_policy: false }` | asked, and it states no policy |

### The manifest

`--dry-run --json` writes a run file with `status: "not_run"`: the corpus and
the questions, every verdict null. It is worth writing before any key exists,
because "did the other run see the same passages and ask the same questions?"
is answerable from it alone, and that is the first thing to check when two
runs disagree.

One is committed at
[`policy-runs/2026-09-19-davidjolly-manifest.json`](policy-runs/2026-09-19-davidjolly-manifest.json):
120 passages from four pages, 17 questions, provenance
`jev:jev-1.13.0/tax-2/q-e09d4597`. A real run at that provenance is directly
comparable to it.

**Ingest is reproducible, measured rather than assumed.** Two independent
ingests of the same site minutes apart compared as 120 shared passages, zero
edited, zero added, zero dropped. So a corpus difference in a later comparison
is a change on the candidate's site, not churn in the extractor.

## Verified

```bash
node scripts/verify-candidate-site.ts   # quotes verbatim, crawl on-site, capped, robots-aware
node scripts/verify-policy-noul.ts      # no identity in the state, symmetric questions, fail-closed reads
node scripts/verify-policy-run.ts       # comparability first, corpus and verdict changes kept apart
```

Both are pure and offline. Ingest was exercised against a live campaign site
(120 passages across four pages); the ask step has been exercised in
`--dry-run` only, because this environment has no `TYPESAFE_API_KEY`.
