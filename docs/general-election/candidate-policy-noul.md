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

## Verified

```bash
node scripts/verify-candidate-site.ts   # quotes verbatim, crawl on-site, capped, robots-aware
node scripts/verify-policy-noul.ts      # no identity in the state, symmetric questions, fail-closed reads
```

Both are pure and offline. Ingest was exercised against a live campaign site
(120 passages across four pages); the ask step has been exercised in
`--dry-run` only, because this environment has no `TYPESAFE_API_KEY`.
