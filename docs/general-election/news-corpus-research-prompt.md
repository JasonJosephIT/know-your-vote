# Research prompt — expanding the news outlet corpus

**What this file is.** A self-contained prompt to paste into a fresh coworker
session that has web access. It asks for research only. Copy everything from
"Prompt begins" to the end of the file; it assumes no knowledge of the
conversation that produced it.

**Why it exists.** `src/lib/news-sources.ts` holds 23 outlets, and
`usableOutlets()` currently returns **zero** of them, because every entry ships
with `feed: null` and `leanTag: null`. The sweep therefore does nothing. Those
two nulls are deliberate — the session that wrote the file had no network
egress and refused to guess a feed URL, and assigning an editorial lean to a
named newsroom is a founder gate. This research closes the first gap and
prepares the second for sign-off.

---

## Prompt begins

You are researching news outlets for **Know Your Vote**, the voter-facing app
of the Civic Awareness Project: a nonpartisan Florida ballot tool covering the
2026 general election on November 3, 2026. Your output is a research document.
You are not writing application code.

### What the system does with your answer

A scheduled sweep reads a fixed list of outlets, pulls recent headlines, and
matches them against the candidate roster. It never runs a per-candidate web
search. That design choice is load-bearing: because every candidate is matched
against the same pool by the same rule, equal coverage becomes a property of
the mechanism rather than a promise. The list of outlets *is* the editorial
decision, so it lives in the repository where it can be reviewed and argued
with.

Two consequences shape what you need to give me.

**The corpus is the denominator.** The project publishes a variance number
over how many articles were available per candidate. That number is meaningless
without a fixed, stated pool. So the pool needs to be wide enough to be fair
and explicit enough to be audited.

**Slot selection spreads across lean.** When the app fills a candidate's news
cards, it takes the newest item from each distinct lean before it takes a
second item from any one lean. A county whose outlets are all rated the same
way gives that rule nothing to work with. Breadth across the spectrum in each
county matters more than raw outlet count.

### Counties currently covered

Four, and only these four. Each has a FIPS code and an internal metro key you
should carry through in your output.

| County | FIPS | Metro key | Principal city |
|---|---|---|---|
| Miami-Dade | 12086 | `miami` | Miami |
| Broward | 12011 | `fort_lauderdale` | Fort Lauderdale |
| Hillsborough | 12057 | `tampa` | Tampa |
| Orange | 12095 | `orlando` | Orlando |

Coverage also spans 16 U.S. House districts under the enacted 2026 Florida map
plus five statewide or at-large races including U.S. Senate, which is why the
statewide and national tiers below matter and are not an afterthought.

### What to research

**Tier 1 — local, per county.** For each of the four counties, find every
outlet that covers local and state politics with original reporting. Include
daily and weekly newspapers, television station newsrooms, public radio,
alternative weeklies, digital-native local newsrooms, and the local editions of
larger networks. Spanish-language and Haitian Creole outlets matter especially
in Miami-Dade and Broward and are frequently missed; look for them
deliberately. Aim for breadth across the political spectrum within each county
rather than a long list of similar newsrooms.

**Tier 2 — statewide.** Outlets covering Florida politics from Tallahassee or
statewide, including wire services, nonprofit newsrooms, public media, and
trade or political-insider publications.

**Tier 3 — national.** A handful, eight at most. These serve the U.S. Senate
and U.S. House races. Prioritize outlets with well-documented independent
bias ratings and genuine coverage of Florida federal races, and make sure the
handful spans the spectrum rather than clustering.

### What to return for each outlet

A row per outlet with these fields. The first six mirror the data structure the
code already uses, so keep the names and value sets exact.

| Field | Value |
|---|---|
| `domain` | The registrable host, lowercase, no scheme, no `www`. Use a path suffix only when a network's local edition lives under a path rather than a subdomain, as in `cbsnews.com/miami`. |
| `publisher` | The newsroom's own name for itself, spelled as it spells it. |
| `type` | One of `factual_reporting`, `opinion`, `primary_doc`, `candidate_self`. A newsroom's opinion section is a **separate row** from its news section, because the two get different card treatment. |
| `countyFips` | The FIPS above for a local outlet, or null for statewide and national. This is the newsroom's base, not its broadcast footprint. |
| `leanTag` | One of `left`, `center-left`, `center`, `center-right`, `right`, `N/A`. See the sign-off rule below. |
| `feed` | A verified RSS or Atom URL. See the verification rule below. |
| `leanBasis` | The citation behind your proposed lean: which rating organization, what it says, when it was last updated, with a link. |
| `retrieval` | Which method actually works, and record the first one that does, in this order: RSS or Atom, then a news sitemap or `sitemap.xml`, then an HTML listing page, then a search API. |
| `access` | Paywall posture (none, metered, hard), whether headlines and summaries are readable without a subscription, and anything notable in the site's terms of use about automated access. |
| `robots` | What `robots.txt` says about the paths you would read, and any crawl-delay it sets. |
| `volume` | Rough political articles per week, so the sweep's cost and each county's denominator can be estimated. |
| `notes` | Ownership, recent newsroom closures or mergers, whether the outlet is a "pink slime" or partisan operation posing as local news, and anything else a reviewer should weigh. |

### Two rules that decide whether your work is usable

**Verify every feed by actually fetching it.** A feed URL that 404s fails
silently and looks exactly like "no news this week," which is the worst
possible failure for this product. Fetch each one, confirm it parses as RSS or
Atom, confirm it contains recent items, and report the date of the newest item
you saw. If an outlet has no working feed, say so plainly and record what the
next retrieval method down the list would be. A feed you did not fetch is worse
than no feed, so mark anything unverified as unverified rather than including
it in the clean list.

**Propose lean, never assert it.** Assigning an editorial lean to a named news
organization is an editorial act with a real reputational cost for a
nonpartisan product, and it is reserved for founder sign-off. Give a proposed
value and the cited basis for it, from published independent media-bias
ratings, and flag every outlet where raters disagree or where no rating exists.
Do not fill this in from your own impression of an outlet, and do not present a
guess as a rating. Where no independent rating covers a small local outlet,
say that directly rather than reasoning your way to a value.

Use `N/A` only where editorial lean genuinely does not apply, such as a
government primary document. It means "does not apply," not "unknown."

### Deliverables

1. A findings document with three tables, one per tier, in the field order above.
2. A short section per county naming which leans are represented and which are
   missing, since that gap is what breaks slot selection.
3. A list of outlets you considered and rejected, with the reason. Rejections
   are as reviewable as inclusions.
4. A flagged list of every outlet where the lean has no citation or the raters
   disagree, for founder sign-off.
5. A summary of what changed against the current 23, meaning which existing
   entries you verified, which you would retire, and what is new.

### Do not

Do not edit `src/lib/news-sources.ts` or open a pull request. Do not fill in a
lean tag as though it were settled. Do not include an outlet whose feed you
could not fetch in the verified list. Do not add outlets outside the four
covered counties, Florida statewide, or the national tier, and do not expand
the county list yourself.

### The outlets already in the file

These 23 are already present, all with `feed` and `leanTag` null. Verify them
alongside your new candidates, and treat this as a starting point rather than a
list to preserve.

**Miami-Dade (12086):** miamiherald.com, wlrn.org, local10.com, wsvn.com,
nbcmiami.com, miaminewtimes.com

**Broward (12011):** sun-sentinel.com, cbsnews.com/miami

**Hillsborough (12057):** tampabay.com, wusf.org, wfla.com, wtsp.com,
cltampa.com

**Orange (12095):** orlandosentinel.com, cfpublic.org, wftv.com, wesh.com,
orlandoweekly.com

**Statewide:** floridaphoenix.com, newsserviceflorida.com, wfsu.org,
floridapolitics.com, apnews.com

Note that Broward has only two entries and one of them is a network's local
edition, which makes it the thinnest county in the corpus and the most urgent
to widen.

### Context worth reading if you have the repository

`src/lib/news-sources.ts` for the data structure and the reasoning behind the
two null fields. `docs/general-election/candidate-news-PRD.md` section 5 for
why the sweep replaced per-candidate search. `docs/general-election/news-fairness.md`
for the opinion-labelling and equal-slot rules. `src/lib/news-slots.ts` for the
selection order your lean spread has to feed.

## Prompt ends

---

## After the research comes back

The feed URLs can land by pull request once verified, since that field is null
only because the authoring session had no network access. The lean tags cannot:
they need founder sign-off against the cited basis, one outlet at a time. Until
both fields are filled for a given outlet, `usableOutlets()` skips it and the
sweep reads nothing from it, which is the intended fail-closed behavior and not
a bug to work around.
