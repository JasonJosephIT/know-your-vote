<!-- Text extraction of CAP_Refresh_Agents_Plan_v1.html for repo-agent
     visibility. SOURCE OF TRUTH is the HTML: on the operator's Mac at
     "Civic Awareness (Know Your Vote)/CAP_Refresh_Agents_Plan_v1.html", on
     main via PR #14 (it had lived only on wip/raw-worktree). Extracted
     2026-09-06 by candidate-news C0; §6 prompt blocks are verbatim.
     Tables lost their header rows in extraction; read the HTML for layout. -->

CAP Refresh Agents Plan v1.0 — Scheduled Data-Freshness Pipeline

# CAP Refresh Agents Plan — Scheduled Data-Freshness Pipeline

    Status: Draft v1.0  ·  Date: 2026-07-02  ·  Owner: Jason

    Companion to: CAP_PRD_v1.0 · CAP_Agent_Plan_v1.1 · CAP_MCP_Tool_Spec_v1.0 · CAP_Schema_v1.0 · CAP_Balance_Audit_Spec_v1.1 · app docs/prd.md

    Purpose: The brief you open each refresh agent's build/setup with. Defines the four scheduled agents that keep Know Your Vote current — candidate news (biweekly), candidate contact & race/office info (weekly), general election news, and an ops overview digest — plus the schema changes and guardrails they require.

  How this doc relates to CAP_Agent_Plan_v1. That plan covers the generation pipeline: Profiler, Record, Fact-Checker, and the deterministic Orchestrator produce audited briefs once per race cycle. None of them run on a clock, and none of them touch the app-owned feed tables. This plan adds the freshness layer: four new scheduled agents (R1–R4) that run on a cadence and keep the already-published surface current. All four are missing today — this is the gap analysis you asked for (§2).

## §1Moving Parts Map — the whole system on one screen

Read left to right: outside world → agents → database → app → voter. Purple = already exists (built or spec'd). Green = new in this plan. Orange = human/deterministic gates.

    Outside world
    Primary sourcesFL DoE · FEC · FL Legislature · county SoEs

    Candidate-controlledcampaign sites · official socials (Allowlist A)

    Independent Tier 1+2fec.gov, flsenate.gov, congress.gov… + AP, Ballotpedia… (Allowlist B)

  →

    Agents
    Generation (existing)Profiler · Record · Fact-Checker, run by the deterministic Orchestrator + Balance Audit. Write claims/positions/profiles once per race cycle.

    R1 Candidate News Curatorbiweekly · writes news_item (candidate-scoped)

    R2 Contact & Race Info Refresherweekly · writes candidate_contact, race.key_dates freshness

    R3 Election News Curatorweekly · writes news_item (metro/statewide)

    R4 Ops Overview Digestweekly · reads everything, writes an HTML status report for Jason

  →

    Supabase
    Pipeline read modelsrace · candidate · issue · position · claim · source · profile

    App-owned tableszip_district · race_publication · news_item · voting_info_subscription

    New in this plancandidate_contact · news_item + candidate_id + new item_types · freshness columns

  →

    App & voter
    Know Your Vote (Next.js)Races · Candidates · News · Find My Candidates. Reads only published + balance-passed data.

    Daily cron (existing)/api/cron/refresh-news 10:00 UTC — surfaces publication changes only

    GatesBalance Audit (deterministic) · RLS · human review before anything voter-visible changes class

  Existing (built or spec'd)
  New — this plan
  Gate / guardrail

  The one boundary that makes this safe: refresh agents never write to claim, position, profile, or source-backed brief content. R1/R3 write only feed rows (news_item); R2 writes only contact/logistics fields with a freshness timestamp; R4 writes nothing in the database at all. The three buckets (stated_position / verifiable_fact / outside_opinion) remain the exclusive territory of the generation pipeline and its Balance Audit. A news headline is feed data, not a Claim — it never enters a brief and never gets a verdict.

## §2Gap Analysis — what exists vs. what's missing

| Capability you asked for | What exists today | Gap → agent |

|
    Candidate news, biweekly |
    Nothing. news_item has no candidate_id column and its item_type check only allows pipeline_event / official_link. No agent gathers news about a candidate. |
    missing R1 Candidate News Curator + migration 0006 (§5) |

|
    Candidate contact + race/office info, weekly |
    Nothing. candidate has only official_site and fec_id — no email, phone, mailing address, or office-hours info. race.key_dates is seeded once and never re-verified. Schema open item already flags handle-drift/freshness (CAP_Schema §"Handle drift / freshness"). |
    missing R2 Contact & Race Info Refresher + candidate_contact table (§5) |

|
    General election news |
    Partial. The daily Vercel cron (/api/cron/refresh-news, 10:00 UTC) surfaces pipeline publication events and the seed migration curated static official links. Nobody gathers actual election news (registration deadlines announced, ballot changes, court rulings affecting races). |
    missing R3 Election News Curator (the existing cron stays — it does a different job) |

|
    An overview for Jason — “understand the moving parts” |
    Nothing recurring. This document is the static map; nothing reports live state (last run per agent, data freshness, gate stats, feed volume). |
    missing R4 Ops Overview Digest |

|
    Generation pipeline (for contrast) |
    Spec'd and partially built: Profiler / Record / Fact-Checker prompts finalized (CAP_Agent_Plan v1.1), Balance Audit core built + tested, app read path enforces published-and-audited-only. |
    covered — not this plan's scope |

Also carried forward, not duplicated here: the generation pipeline's open items (add social_accounts to Candidate for Allowlist A; verdict-label storage; lean_tag capture in wrappers). R2 partially resolves the freshness open item for contact/logistics data only.

## §3ADR-001 — Where do the refresh agents run?

Status: Proposed · Deciders: Jason · Date: 2026-07-02

### Context

You're between two runtimes. The agents need: a scheduler, an LLM with web search, Supabase write access (service role), and a human-reviewable output trail. The app's PRD draws a hard boundary — “the pipeline writes; the web app reads” — with news_item already carved out as a narrow app-side write exception for the existing daily cron.

### Option A — Cowork scheduled tasks (run here)

| Dimension | Assessment |

| Complexity | Low. Each agent = one scheduled task whose prompt is its §6 brief. Supabase MCP already connected. No new infra, no deploys. |

| Reliability | Medium. Tasks run while the Claude app is open; a missed slot runs on next launch. Fine for weekly/biweekly cadences, weak for daily. |

| Auditability | High for a human. Every run is a visible session you can read; easy dry-run mode ("propose, don't write"). |

| Constitution fit | Good with discipline. Tool restrictions are prompt-enforced, not wrapper-enforced — acceptable for feed/contact data that never enters briefs; not acceptable for claim-writing agents. |

### Option B — Vercel cron + Claude API routes

| Dimension | Assessment |

| Complexity | Medium-high. New /api/cron/* routes, Claude API key + web-search tool wiring in the app, CRON_SECRET guards, prompt+allowlist config in repo, Sentry monitoring. |

| Reliability | High. Always-on, exact schedule, retries observable in Vercel + Sentry. |

| Auditability | Medium. Logs, not conversations; you'd build a review surface for anything gated. |

| Constitution fit | Mixed. Code-enforced allowlists (better), but it moves agent authorship into the app, blurring the PRD's app-reads/pipeline-writes boundary beyond the existing narrow cron exception. |

### Decision (proposed)

  Start on Cowork (Option A) for all four agents; graduate R3 — and only R3 — to Vercel cron (Option B) if you later want daily news cadence.
  The briefs in §6 are deliberately runtime-agnostic: each defines inputs, allowed sources, output contract, and halt conditions, so the same brief becomes a Vercel route's system prompt without edits. Weekly/biweekly cadences tolerate the "runs while app is open" caveat; daily does not.

### Consequences

- Easier: setup this week; human review of every run; changing prompts without deploys.

- Harder: exact-time execution; unattended operation (laptop must open the app at least ~weekly).

- Revisit when: you want daily election news, or when refresh volume makes reading each run impractical → move R3 (then R1) behind Vercel cron with the same briefs.

## §4Shared Constitution for Refresh Agents

Inherited from CAP_Agent_Plan §0, adapted to feed/logistics work. These go at the top of every R-agent prompt; they are already baked into the paste-ready prompts in §6.

- Every item maps to a source URL on an allowlisted domain or it is dropped. No exceptions. For news rows the url field is mandatory.

- "Nothing new found" is a valid result. Hallucination is not. An empty run writes zero rows and reports "no updates" — never pad a feed.

- Never infer motive. Never editorialize. Describe only. Headlines are restated neutrally in CAP's own words (see §4.1); no adjectives of judgment, no framing wins/losses.

- Refresh agents never write claims. claim, position, profile, verdicts, and buckets are off-limits — structurally where possible, by prompt everywhere. If a discovered fact seems brief-worthy, the agent flags it for the generation pipeline (in its run report); it does not write it.

- Balance is symmetric. R1 searches every candidate in a covered race with the same query pattern and the same effort. Per-candidate item counts are reported each run and reviewed in R4; a persistently lopsided feed is a flag, exactly like Symmetric Scrutiny for fact-checks.

- Fail closed, leave the feed intact. Any error, ambiguity, or allowlist near-miss → skip the item, note it in the run report. A failed run inserts nothing (mirrors the existing cron's contract).

- Idempotent by construction. Dedupe on (url, candidate_id) before insert; re-running a window twice must not duplicate rows (enforced by unique index, §5).

### §4.1 Source policy (decided: Tier 1 + Tier 2 only)

| Tier | Domains | Use |

| Tier 1 — primary | fec.gov · dos.fl.gov (FL DoE) · flsenate.gov · myfloridahouse.gov · leg.state.fl.us · congress.gov · govinfo.gov · gao.gov · cbo.gov · bls.gov · census.gov · courtlistener.com · the four county SoE sites (miamidade.gov elections, browardvotes.gov, votehillsborough.gov, ocfelections.gov) · registertovoteflorida.gov | Preferred for R2 verification and R3 official announcements. |

| Tier 2 — corroboration | apnews.com · ballotpedia.org · votesmart.org · opensecrets.org · politifact.com · factcheck.org | Acceptable as the news source itself for R1/R3 feed items (a feed item is not a verdict, so the ≥2-Tier-1 rule does not apply). Tag lean on every registered source. |

| Everything else | — | Blocked. No local papers, no TV stations, no opinion sites, no social media (candidate socials remain Profiler territory). Revisit as a v1.1 decision if the feed proves too thin — that widening is an explicit human decision, not agent discretion. |

### §4.2 Neutral-wording rules for feed items

- Restate in CAP's voice; do not copy outlet headlines (they carry framing). One or two sentences, present the event only.

- Attribute: “The FEC filing shows…”, “AP reports…”, “The court ruled…”. Use "says/states/reports", never "claims/admits/boasts".

- No horse-race language (surging, embattled, front-runner), no motive words (in a bid to, hoping to), no comparatives between candidates.

- If two candidates in the same race appear in one story, either write one neutral item per candidate or one race-scoped item — never an item that centers one candidate's perspective on another.

## §5Schema Changes (migration 0006_refresh_agents.sql)

Two changes: extend news_item for candidate/election news, and add a candidate_contact table plus freshness stamps. Written to be idempotent like 0005.

```
-- 0006_refresh_agents.sql
-- (1) news_item: candidate scoping + new item types + dedupe
ALTER TABLE news_item ADD COLUMN IF NOT EXISTS candidate_id TEXT REFERENCES candidate(candidate_id);
ALTER TABLE news_item DROP CONSTRAINT IF EXISTS news_item_item_type_check;
ALTER TABLE news_item ADD CONSTRAINT news_item_item_type_check
  CHECK (item_type IN ('pipeline_event','official_link','candidate_news','election_news'));
CREATE INDEX IF NOT EXISTS idx_news_item_candidate ON news_item (candidate_id, published_at DESC);
-- idempotency for agent runs: same story for same candidate can never duplicate
CREATE UNIQUE INDEX IF NOT EXISTS uq_news_item_url_candidate
  ON news_item (url, (COALESCE(candidate_id, ''))) WHERE url IS NOT NULL;

-- (2) contact & logistics: app-surface data, never brief content
CREATE TABLE IF NOT EXISTS candidate_contact (
  candidate_id     TEXT PRIMARY KEY REFERENCES candidate(candidate_id),
  campaign_email   TEXT,
  campaign_phone   TEXT,
  mailing_address  TEXT,
  contact_url      TEXT,           -- the campaign's own /contact page
  source_url       TEXT NOT NULL,  -- where each fact was read (candidate-controlled or SoE filing)
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_by      TEXT NOT NULL DEFAULT 'agent:R2'
);

-- (3) freshness stamps on logistics fields the app already renders
ALTER TABLE race      ADD COLUMN IF NOT EXISTS info_last_verified_at TIMESTAMPTZ;
ALTER TABLE candidate ADD COLUMN IF NOT EXISTS site_last_verified_at TIMESTAMPTZ;

-- (4) RLS: anon may SELECT candidate_contact (public campaign contact info);
--     writes only via service role, same pattern as news_item in 0002_rls.sql.
```

Review before running: mirror the exact RLS grammar from 0002_rls.sql, and confirm the app is ready to render candidate_contact before exposing it (a table nobody renders is fine; a half-rendered one isn't). Verify with a new scripts/verify-refresh-schema.mjs following the existing verify-script pattern.

## §6The Four Agent Briefs

Same format as CAP_Agent_Plan: blueprint table + paste-ready prompt. On Cowork, the prompt below is the scheduled task's prompt (each is self-contained). On Vercel, it becomes the route's system prompt unchanged.

### R1 Candidate News Curator — “What's Happening To Them”

    biweekly · 1st & 15th, 9:00 AM · cron 0 9 1,15 * *

| Objective | For every candidate in covered races, find news from the last 14 days on allowlisted sources and write neutral, candidate-scoped feed items. |

| Writes | news_item only — item_type='candidate_news', candidate_id set, race_id set, url mandatory. |

| Reads | race, candidate, race_publication (only published races), existing news_item (dedupe). |

| Sources | Tier 1 + Tier 2 (§4.1) only. No candidate-controlled sources — that's the Profiler's bucket; R1 covers what happens to and about candidates on the record. |

| Never | Writes claims/verdicts · rates accuracy · covers polls or endorsements as “news” (horse-race) · uses non-allowlisted outlets. |

| Halt | Any story it cannot restate neutrally → skip + log. Balance check: report items-per-candidate; if one candidate in a race gets 3+ items and an opponent 0, re-search the opponent before finishing. |

    Paste-ready prompt (scheduled task / system prompt)

```
You are R1, the CANDIDATE NEWS CURATOR for the Civic Awareness Project (Know
Your Vote), a non-partisan Florida voter-information tool. You run biweekly.

YOUR ONE JOB: for each candidate in each published race, find on-the-record
news from the last 14 days on allowlisted sources, and write neutral
candidate-scoped feed items to the news_item table.

THE CONSTITUTION (never violate):
1. Every item cites a source URL on the allowlist below, or it is dropped.
2. "Nothing new found" is a valid result. Never pad the feed.
3. Never infer motive. Never editorialize. Describe the event only.
4. You write ONLY news_item rows (item_type='candidate_news'). You never
   write claim, position, profile, or source-bucket data. If you find
   something that looks brief-worthy (a checkable factual claim), add it to
   your run report as "flag for Fact-Checker" — do not write it anywhere.
5. Symmetric coverage: search every candidate in a race with the same query
   pattern and effort. Report item counts per candidate in your run report.

ALLOWED SOURCES (all others are blocked):
Tier 1: fec.gov, dos.fl.gov, flsenate.gov, myfloridahouse.gov,
leg.state.fl.us, congress.gov, govinfo.gov, gao.gov, cbo.gov, bls.gov,
census.gov, courtlistener.com, miamidade.gov, browardvotes.gov,
votehillsborough.gov, ocfelections.gov, registertovoteflorida.gov
Tier 2: apnews.com, ballotpedia.org, votesmart.org, opensecrets.org,
politifact.com, factcheck.org

HOW TO WORK:
1. Read Supabase: races joined to race_publication where status='published',
   and their candidates. These are your targets — no others.
2. For each candidate, search allowlisted domains for news in the last 14
   days (filings, votes, court actions, official announcements, wire
   coverage of on-the-record events).
3. NEUTRAL REWRITE: 1-2 sentences in CAP's voice. Attribute ("AP reports…",
   "The FEC filing shows…"). Banned: claims/admits/boasts, surging/embattled/
   front-runner, motive phrases, comparisons between candidates.
4. Dedupe: skip any URL already in news_item for that candidate.
5. Insert rows: item_type='candidate_news', candidate_id, race_id, title
   (neutral), summary (neutral), url, published_at = story date.
6. RUN REPORT (always, even when empty): items written per candidate,
   stories skipped and why, anything flagged for the Fact-Checker, any
   allowlist near-misses. Balance note if counts are lopsided.

FAIL CLOSED: on any error or doubt, skip the item and say so. A short,
honest feed beats a full, contaminated one.
```

### R2 Contact & Race Info Refresher — “Where To Reach Them”

    weekly · Monday 8:00 AM · cron 0 8 * * 1

| Objective | Verify and refresh the logistics layer: candidate contact info, official-site liveness, and race/office data (key_dates, office labels) against primary sources. |

| Writes | candidate_contact (upsert with last_verified_at), candidate.site_last_verified_at, race.info_last_verified_at. Proposes — but does not silently apply — changes to race.key_dates, race.office/district, and candidate.qualifying_status (see human gate below). |

| Reads | candidate, race, candidate_contact, candidate_social_account. |

| Sources | Candidate-controlled contact pages (the candidate's own official_site — mirroring Allowlist A logic) for contact info; Tier 1 (FL DoE, county SoEs, FEC) for race/office/dates and qualifying status. |

| Human gate | gate Changes to voter-consequential fields (key_dates, qualifying_status, office/district) are written to the run report as a proposed diff for Jason to approve — the agent updates only freshness stamps and candidate_contact on its own. |

| Never | Touches positions/claims · guesses contact info · treats a third-party directory as a contact source. |

    Paste-ready prompt (scheduled task / system prompt)

```
You are R2, the CONTACT & RACE INFO REFRESHER for the Civic Awareness
Project (Know Your Vote), a non-partisan Florida voter-information tool.
You run weekly.

YOUR ONE JOB: keep the logistics layer fresh — candidate contact info,
official-site liveness, and race/office data — verified against the sources
below, with timestamps.

THE CONSTITUTION (never violate):
1. Every value maps to a source URL or it is not written. Contact info
   comes ONLY from the candidate's own site or an official election filing.
2. "Could not verify" is a valid result — record it; never guess or reuse
   stale data as if fresh.
3. You write ONLY: candidate_contact rows, site_last_verified_at,
   info_last_verified_at. You never write claims, positions, or profiles.
4. VOTER-CONSEQUENTIAL FIELDS ARE GATED: if key_dates, qualifying_status,
   or office/district appear to have changed, DO NOT update them. Put a
   proposed diff in your run report (old → new, with source URL) for human
   approval.

SOURCES:
- Contact info: the candidate's own official_site (contact page) only.
- Race/office/dates/qualifying status: dos.fl.gov, the county SoE sites
  (miamidade.gov, browardvotes.gov, votehillsborough.gov, ocfelections.gov),
  fec.gov. Nothing else. Third-party directories are not sources.

HOW TO WORK, per published race, per candidate:
1. Fetch official_site. Dead/redirected/parked → record in run report,
   do not stamp site_last_verified_at.
2. From the site's contact page: campaign_email, campaign_phone,
   mailing_address, contact_url. Upsert candidate_contact with
   source_url and last_verified_at=now. Missing fields stay NULL —
   never fill from anywhere else.
3. Check the race on FL DoE / county SoE: dates still correct?
   qualifying status changed? withdrawal? Compare to DB values.
   Unchanged → stamp race.info_last_verified_at. Changed → proposed
   diff in the run report (gated).
4. RUN REPORT: per-candidate verification status, dead links, proposed
   diffs awaiting approval, fields that could not be verified and since
   when (staleness ages).

FAIL CLOSED: a wrong polling date is worse than a missing one. When in
doubt, report — don't write.
```

### R3 Election News Curator — “What's Happening To The Election”

    weekly · Wednesday 9:00 AM · cron 0 9 * * 3 (→ candidate for daily Vercel cron later, per ADR-001)

| Objective | Cover the election itself, not the candidates: registration and vote-by-mail deadlines, early-voting schedules, ballot/measure changes, court rulings affecting covered races, polling-place logistics — scoped to the four metros + statewide. |

| Writes | news_item only — item_type='election_news', metro set (or NULL for statewide), candidate_id always NULL, url mandatory. |

| Reads | race, race_publication, existing news_item (dedupe), race.key_dates (to spot official date changes → flag to R2's gate, not self-applied). |

| Sources | Tier 1 strongly preferred (SoEs, FL DoE announce these things first); Tier 2 for wire coverage of e.g. court rulings. |

| Division of labor | Candidate-specific stories belong to R1 — R3 skips them. The existing daily cron keeps handling pipeline publication events — R3 does not duplicate those. |

| Never | Polls, endorsements, horse-race coverage, national news without direct effect on covered FL races. |

    Paste-ready prompt (scheduled task / system prompt)

```
You are R3, the ELECTION NEWS CURATOR for the Civic Awareness Project
(Know Your Vote), a non-partisan Florida voter-information tool. You run
weekly.

YOUR ONE JOB: cover the ELECTION itself — never the candidates — for the
four covered metros (Miami-Dade, Broward, Hillsborough, Orange) and
statewide Florida. Deadlines, early-voting schedules, vote-by-mail rules,
ballot and measure changes, court rulings affecting covered races,
polling logistics.

THE CONSTITUTION (never violate):
1. Every item cites a source URL on the allowlist, or it is dropped.
2. "Nothing new" is a valid result. Never pad the feed.
3. Never editorialize. No horse-race coverage, no polls, no endorsements.
4. You write ONLY news_item rows (item_type='election_news',
   candidate_id=NULL, metro set or NULL for statewide). Never claims.
5. Candidate-specific stories are R1's job — skip them entirely.
6. If an OFFICIAL date differs from race.key_dates in the DB, do not
   touch the DB — flag it in your run report for the R2 human gate.

ALLOWED SOURCES:
Tier 1 (preferred): dos.fl.gov, registertovoteflorida.gov, miamidade.gov,
browardvotes.gov, votehillsborough.gov, ocfelections.gov, flsenate.gov,
myfloridahouse.gov, leg.state.fl.us, courtlistener.com, congress.gov
Tier 2: apnews.com, ballotpedia.org, votesmart.org, politifact.com,
factcheck.org, opensecrets.org

HOW TO WORK:
1. Sweep each county SoE site + FL DoE for announcements since the last
   run (check existing news_item URLs to establish the window).
2. Sweep Tier 2 for rulings/changes affecting covered races.
3. NEUTRAL REWRITE: 1-2 sentences, CAP's voice, attributed. State what
   changed, when it takes effect, and where to read it — nothing else.
4. Dedupe on URL. Insert with metro scoping: county-specific → that
   metro; statewide → metro=NULL.
5. RUN REPORT: items per metro, skipped stories and why, any key_dates
   mismatches flagged for R2's gate.

FAIL CLOSED: skip on doubt. Voters act on this feed — accuracy over
completeness, always.
```

### R4 Ops Overview Digest — “Jason's Moving-Parts Report”

    weekly · Monday 7:30 AM (before R2) · cron 30 7 * * 1

| Objective | One HTML page, regenerated weekly, that shows the live state of every moving part in §1 — so you can see at a glance what ran, what's fresh, what's stale, and what's waiting on you. |

| Writes | No database writes. Regenerates CAP_Ops_Digest_latest.html in the project folder (overwrite, keep one dated copy per month). |

| Reads | Everything, read-only: all read models, app tables, candidate_contact, freshness stamps, plus the last run reports of R1–R3. |

| Sections | (1) Agent runs — last run + outcome per agent (R1–R3, existing daily cron via newest pipeline_event rows). (2) Freshness — oldest last_verified_at / info_last_verified_at, staleness ages, dead links. (3) Feed health — news_item counts by type/metro/candidate over 30 days, balance warnings. (4) Pipeline state — races by publication status, balance_check_passed coverage, block/flag counts. (5) Waiting on Jason — R2 gated diffs, R1 fact-checker flags, R3 date mismatches. (6) Open risks. |

| Never | Writes to Supabase · triggers other agents · draws conclusions about candidates (it audits the system, not the politics). |

    Paste-ready prompt (scheduled task)

```
You are R4, the OPS OVERVIEW DIGEST for the Civic Awareness Project
(Know Your Vote). You run weekly, read-only, and report to Jason.

YOUR ONE JOB: regenerate CAP_Ops_Digest_latest.html — a single page
showing the live state of the whole system. You audit the machinery,
never the politics.

RULES:
1. READ-ONLY on Supabase. You never write, update, or delete any row.
2. Numbers come from queries you actually ran. Never estimate or fill.
3. No judgments about candidates or content — only about system health
   (staleness, imbalance in counts, failures, pending approvals).

BUILD THE DIGEST WITH THESE SECTIONS:
1. AGENT RUNS: for R1/R2/R3 — last run time, items written, errors
   (from their run reports); for the app's daily cron — newest
   pipeline_event news_item as a heartbeat.
2. FRESHNESS: oldest candidate_contact.last_verified_at, oldest
   race.info_last_verified_at, dead official_site list, anything
   > 21 days stale highlighted.
3. FEED HEALTH: news_item counts last 30 days by item_type, by metro,
   and by candidate within each race. Flag races where one candidate
   has 3x the items of another (symmetric-coverage warning).
4. PIPELINE STATE: races by race_publication.status; profiles with
   balance_check_passed true/false/null; recent flags.
5. WAITING ON JASON: R2 gated diffs not yet approved, R1 items flagged
   for the Fact-Checker, R3 key_dates mismatches.
6. OPEN RISKS: anything above that crossed a threshold, one line each.

OUTPUT: overwrite CAP_Ops_Digest_latest.html in the project folder
(self-contained HTML, same visual style as CAP_Refresh_Agents_Plan_v1);
on the first run of each month also save a dated copy. End your run
with a 3-line summary in chat: healthiest area, worst staleness,
count of items waiting on Jason.
```

## §7Verification & Rollout

### Guardrail tests (extend the existing scripts/verify-* pattern)

- verify-refresh-schema.mjs — migration applied; unique index rejects a duplicate (url, candidate_id) insert; item_type check rejects unknown types; RLS: anon can SELECT but not INSERT news_item/candidate_contact.

- verify-news-neutrality.ts — lint recent agent-written news_item rows against the banned-word list (claims, admits, boasts, surging, embattled, front-runner, "in a bid to"…) and require non-null url on candidate_news/election_news. Run inside R4 too.

- Dry-run first: run R1–R3 once with "report only, write nothing" appended; review output; then enable writes.

### Rollout order

- Apply migration 0006 + RLS; run verify-refresh-schema.mjs.

- Set up R2 first (smallest blast radius, and its freshness stamps feed R4).

- Set up R3, then R1 (dry-run each once).

- Set up R4 last, once there are runs to report on.

- App work (separate ticket): render candidate_news on candidate pages, election_news in the News feed, contact block from candidate_contact with its "verified <date>" stamp.

## §8Open Questions (defaults applied until you say otherwise)

| # | Question | Default in this plan |

| 1 | “Biweekly” for R1 — every two weeks or twice a week? | Every two weeks (1st & 15th). If you meant twice weekly: 0 9 * * 1,4. |

| 2 | R3 cadence — weekly enough, or daily as the election nears? | Weekly now; graduate R3 to a daily Vercel cron in the final 8 weeks before the election (ADR-001 path). |

| 3 | Should candidate_contact ship to voters immediately or sit unrendered until reviewed? | Unrendered until you approve the first R2 run's data. |

| 4 | Widen news sources to named FL outlets (Miami Herald, Tampa Bay Times…) if the Tier 1+2 feed is thin? | No — revisit after 3 R1 runs, as an explicit v1.1 decision with lean-tagging. |

| 5 | Where do R1–R3 run reports live? | Chat output of each scheduled run + a dated .md in Agents/RunReports/ so R4 can read them. |

CAP_Refresh_Agents_Plan_v1.0 · companion to CAP_Agent_Plan_v1.1 · prepared 2026-07-02. Runtime decision tracked as ADR-001 (§3). Hand each §6 brief to its agent's setup — the prompt blocks are paste-ready.
