# Product Vision — Know Your Vote

*The voter-facing application of the Civic Awareness Project (CAP). This document covers strategy, audience, and brand. Technical detail lives in `prd.md`; the build plan in `product-roadmap.md`; visual design tokens in `design.md`.*

---

## 1. Vision & Mission

### Vision Statement

A country where any voter, regardless of party, can look at their own ballot and see every candidate presented fairly — what they say, what they've done, and what's been verified — and walk into the booth calm and confident instead of anxious and guessing.

### Mission Statement

Know Your Vote turns the Civic Awareness Project's neutrality-audited pipeline into a warm, plain-language web app that lets Florida voters look up their ballot by ZIP or county and read side-by-side, source-traceable candidate briefs that give every candidate equal space and equal scrutiny.

### Founder's Why

This project starts from an uncomfortable but honest premise: there is no such thing as unbiased information, and any tool that *claims* to be unbiased should be distrusted. The interesting question is not "how do we remove bias" — it's "how do we make fairness measurable, visible, and enforced." That reframing is the whole project.

The Civic Awareness Project answers it mechanically. Three separate agents handle three separate jobs that every other source blends together: a Profiler captures what a candidate *says* about themselves, a Record agent documents what they've *done* from primary sources only, and a Fact-Checker adjudicates what's *true* against a fixed verdict scale. A deterministic Balance Audit then refuses to publish a race until every candidate has received comparable space and comparable scrutiny. Neutrality isn't a vibe here — it's a gate that halts the pipeline.

Know Your Vote is where that engineering meets a real, nervous, busy voter. The backend already proves the fairness; this app makes it *feel* welcoming — cheerful, empowering, and recognizable to someone on either side of any race. The "why" is simple: a fairer-informed electorate shouldn't require a research habit or a subscription. It should take a ZIP code and a minute.

*(The personal biography behind this project is a placeholder in `VISION.md` — sharpen the Founder's Why with your own story before using this document publicly.)*

### Core Values

- **Fairness you can audit, not just assert.** Every neutrality claim must be backed by something a skeptic can check — a source link, a scrutiny count, a published methodology. We would rather show our math than ask for trust.
- **Describe, never decide.** We tell voters what each candidate says, has done, and what's verified. We never tell them who to vote for, never infer motive, and never editorialize. The reader draws the conclusion.
- **Silence is data, not a gap to fill.** If a candidate has no stated position on a shared issue, we record that honestly ("no stated position found") rather than inventing one or quietly omitting the issue.
- **Anonymous by default.** A voter should be able to use the entire app without an account, a login, or leaving a trace. Personal data is handled only when a voter explicitly asks us to (e.g. email me my polling place).
- **Comfort on both sides.** The tone, palette, and copy must feel safe and welcoming to a committed partisan of either party and to someone with no party at all. If any group feels the app is "not for them," we've failed a core requirement.

### Strategic Pillars

- **The pipeline is the source of truth; the app is the window.** The app never authors or edits a claim. It only presents what the audited pipeline has already published. This keeps the neutrality guarantees intact end-to-end.
- **Location first, everything else second.** The entire experience begins with "where do you vote." ZIP/county resolution is the front door; every feature hangs off the ballot it produces.
- **Neutral framing is a feature, not a disclaimer.** Equal space, equal scrutiny, "learn more" instead of "vote for," and the visible methodology are product surfaces we design deliberately — not fine print bolted on at the end.
- **Ship the four metros fully before widening.** A complete, trustworthy experience for Miami, Fort Lauderdale, Tampa, and Orlando beats a shallow national shell. Depth earns the right to expand.

### Success Looks Like

Twelve months out: a Florida voter in any of the four target metros can open Know Your Vote on their phone, type their ZIP, and in under a minute see every race and candidate on their ballot laid out side by side — fairly. Thousands of voters have done this, a meaningful share return for the next election, and at least a few nonpartisan libraries or civic groups hand it out as *the* neutral option. The public Symmetric Scrutiny methodology page has been read and picked apart by skeptics from both parties, and the most common piece of feedback — from people who disagree with each other — is the same: "It actually felt fair." The Claude Corps application showed not a slide deck but a working, audited product.

---

## 2. User Research

### Primary Persona

**Maria, 34 — Orlando (Orange County).** A parent of two who works in operations at a mid-size company. Maria reliably votes in presidential elections but feels genuinely lost below the top of the ticket — she couldn't name her congressional candidates or say what the Chief Financial Officer race is even about. She's mildly progressive but privately allergic to being told how to think, and she distrusts both cable news and the glossy mailers stuffing her mailbox. Her research budget is fifteen minutes on her phone, usually the night before or the morning of. Today she copes by voting the top of the ticket and leaving down-ballot races blank or guessing, then feeling a low hum of guilt about it. She would switch to a tool the instant it felt *fast, fair, and unpushy* — something that lays out her options without an agenda and doesn't make her feel dumb for starting late.

### Secondary Personas

- **Devon, 19 — first-time voter, Tampa.** Finds election coverage alienating and combative. Wants a plain, judgment-free "who's even on my ballot and what do they stand for" starting point, on mobile, with zero jargon.
- **Priya, 41 — recently moved to Fort Lauderdale.** Votes every year but doesn't yet know Florida's offices, districts, or local names. Needs the app to translate "your address" into "your specific races and candidates."
- **Ms. Alvarez — reference librarian / civic educator.** A nonpartisan multiplier. She'll only recommend a resource she's confident is neutral for *everyone* who walks up to her desk. If the methodology holds up, she becomes a distribution channel; if it looks slanted, she won't touch it.

### Jobs To Be Done

- **Functional:** "When I know an election is coming, help me see everyone on *my* ballot and understand what they say, what they've done, and what's true — fast, and without ten open tabs."
- **Emotional:** "Help me feel calm and capable instead of anxious and behind — informed enough to vote the whole ballot without dread."
- **Social:** "Let me be the person who's actually informed — and give me something I can share with friends or family across the aisle without it starting a fight."

### Pain Points

1. **Can't tell promise from record from fact (high severity, every election).** The single hardest thing for a voter is distinguishing what a candidate *claims*, what they've *actually done*, and what's *independently verified*. Today these are hopelessly blended. Consequence: decisions made on spin. This is the pain the entire product is built to kill.
2. **Down-ballot blindness (high severity, every election).** Voters know the top race and almost nothing below it. They currently skip or guess. Consequence: races decided by name recognition, not information.
3. **Everything feels slanted or paywalled (high, ongoing).** Partisan guides push, news sites wall off or thin out local coverage. Consequence: fatigue and disengagement — "do nothing."
4. **Research is a chore (medium-high, every election).** Assembling a fair picture means many sources and real time most people won't spend. Consequence: the informed minority stays small.
5. **Not sure a "neutral" tool is actually neutral (medium, but trust-critical).** Burned before, voters are rightly skeptical of anything claiming balance. Consequence: even a fair tool must *prove* it, or it's dismissed.

### Current Alternatives & Competitive Landscape

- **Partisan voter guides / endorsement lists** — clear and confident, but by design tell you who to support. Great if you already agree; useless as a neutral picture. Switching cost: low, but they don't solve the actual problem.
- **Ballotpedia** — broad and genuinely nonpartisan, but encyclopedic and dense; it doesn't hold candidates in a race side by side or separate say/do/true, and it's a lot of reading on a phone.
- **VOTE411 / League of Women Voters** — trusted and nonpartisan, built on candidate-submitted answers; strong on "what they say," weak on independent record and fact-check, and coverage/participation is uneven.
- **Local news** — best on context, but frequently paywalled, thin on down-ballot races, and carries perceived slant.
- **Official sample ballot (Supervisor of Elections)** — authoritative on *what's* on your ballot, essentially nothing on *who* the candidates are.
- **General AI chatbots** — will answer "who should I vote for," but with no sourcing guarantees, no balance enforcement, and real hallucination risk on exactly the facts that matter.
- **Doing nothing / asking a friend** — the most common alternative, and the real competitor. The bar to beat is "vote the top and guess the rest."

**The gap:** nobody combines *your specific ballot* + *mechanical say/do/true separation* + *equal, audited scrutiny across candidates* + *every claim traceable to a source*, in a form a nervous voter finds welcoming. That is the whitespace.

### Key Assumptions to Validate

- **We assume voters want a neutral tool more than a tool that agrees with them.** Many people enjoy confirmation. *To validate:* measure completion and return rates, and test messaging that leads with fairness vs. convenience.
- **We assume "equal space, equal scrutiny" reads as trustworthy rather than as "both-sidesing."** Balance can feel like false equivalence. *To validate:* user-test the brief layout and methodology page with partisans from both sides; watch for "you're normalizing X" reactions.
- **We assume the pipeline can produce audit-passing briefs for all target races on time.** Balance HALTs are a feature, but a race that keeps halting can't ship. *To validate:* dry-run all target races end-to-end and track the audit block rate before launch.
- **We assume ZIP→races resolution is reliable enough to trust.** A wrong ballot destroys credibility instantly. *To validate:* test ZIP/county resolution against known addresses across all four metros, including split-ZIP edge cases.
- **We assume the Find My Candidates quiz can surface aligned candidates without reading as an endorsement.** "Here are your matches" is dangerously close to "vote for these." *To validate:* test result framing ("learn more," full field always shown) and check whether users perceive it as a recommendation.
- **We assume device-local storage is enough — that people don't need cross-device sync of saved candidates.** *To validate:* watch for drop-off or requests for accounts before building any auth.
- **We assume free/grant funding is viable and we won't need revenue.** *To validate:* confirm the funding path early; the product's neutrality story is weaker if it ever has to monetize attention.
- **We assume a daily "what changed" feed is valuable, not noise, this far from an election.** *To validate:* measure engagement with the news feed vs. the briefs; be willing to make it a quieter digest.

### User Journey Map

**Awareness:** Maria hears about Know Your Vote from a librarian, a friend, or a nonpartisan post framed around "see your ballot, fairly." She's mildly skeptical ("sure, 'neutral'") but the promise is concrete enough to try.

**Consideration:** She lands on a calm, uncluttered page — no logos of parties, no hot takes, just "Enter your ZIP to see who's on your ballot." Low threat, no signup wall. Curiosity beats skepticism.

**First use:** She types her ZIP. In seconds she sees her actual races. She taps the congressional race and — for the first time — sees both candidates side by side, equal space, with What They Say / What They've Done / Fact-Check cleanly separated. *(This is the magic moment: fair, fast, and clearly not pushing her.)* Relief.

**Habit formation:** She saves two candidates to "keep in mind," takes the quiz out of curiosity, and gets "candidates worth a closer look" across parties — which reads as helpful, not bossy. She opts in to get her polling place by email. She closes the app feeling, unusually, *ready.*

**Advocacy:** After voting the whole ballot for the first time in years, she sends it to her sister (who votes the other way) with "this one's actually fair, try it." The cross-aisle share is the growth loop — and only neutrality makes it possible.

---

## 3. Product Strategy

### Product Principles

- **Location is the front door.** Nothing meaningful happens before "where do you vote." Optimize that first interaction ruthlessly.
- **Present, don't author.** The app renders audited pipeline output. It never generates a claim, softens a verdict, or reorders candidates by anything but a neutral rule (e.g. ballot order or alphabetical, applied identically).
- **Equal by construction.** Every candidate in a race gets identical layout, identical section structure, and space capped symmetrically. Fairness is enforced in the components, not left to editorial care.
- **"Learn more," never "vote for."** Every recommendation-shaped surface (the quiz especially) is framed as an invitation to look closer, always shows the full field, and never ranks candidates as better or worse.
- **Calm over engagement.** No outrage mechanics, no infinite scroll of hot takes, no dark patterns. Success is a voter who leaves *informed and done*, not one who doomscrolls.
- **Privacy is the default, not a setting.** Anonymous use is the norm; the app asks for personal data only in the one flow (email delivery) where it's unavoidable.

### Market Differentiation

Every alternative makes the voter choose between *neutral but shallow* (Ballotpedia, sample ballots) and *deep but slanted* (partisan guides, opinionated news). Know Your Vote refuses the tradeoff by moving neutrality from an editorial intention to an engineered property. The mechanical separation of say/do/true means a candidate's spin can never masquerade as their record; the source-or-dropped rule means no unbacked claim ever appears; and the deterministic Balance Audit means a race literally cannot publish until every candidate has been covered evenly and scrutinized comparably. Crucially, this is *defensible* and *legible*: the Symmetric Scrutiny methodology is public, the scrutiny counts are shown, and every claim links to its source — so the neutrality survives contact with a motivated skeptic. Competitors would have to re-architect around a fairness gate to match it; bolting "we're balanced, trust us" onto an existing product doesn't reproduce it. For the target user, the payoff is emotional as much as informational: this is the one place a nervous voter, of any party, can get the whole picture and *believe* it's fair.

### Magic Moment Design

**The moment:** a voter enters their ZIP and, in under a minute, sees every candidate in their races side by side — equal space, equal scrutiny — with What They Say / What They've Done / Fact-Check, each traceable to a source.

For this to happen reliably, several things must be true in the MVP: ZIP/county resolution must be fast and correct for all four metros; the target races must already have *audit-passed* briefs sitting in the database (no live generation in the request path); and the side-by-side layout must render cleanly on a phone without hiding any candidate. The shortest path from arrival to magic is exactly two steps — land → enter ZIP → see the fair ballot — so nothing (no signup, no onboarding, no tour) may sit between them. Because the briefs are pre-generated and only *read* at request time, the moment is achievable in the MVP; the pipeline work that makes it possible already exists. The single biggest threat to the moment is a race that can't pass the Balance Audit in time, so pre-launch dry-runs of every target race are a hard gate on the roadmap.

### MVP Definition

**In scope (v1 — buildable in ~6–8 weeks on the existing pipeline):**

- **ZIP/county → races resolution.** Enter a ZIP or pick a county; get your statewide races plus your congressional district. "Done" = correct races for any address in the four metros, with a graceful "outside our coverage" message elsewhere.
- **Races section.** A location picker at the top; a list of the voter's races; drill into a race to see all candidates side by side. "Done" = every target race renders its full candidate set with equal layout.
- **Candidate brief.** The three audited sections (Say / Done / Fact-Check), organized under the race's issue spine, every item sourced, verdicts on fact-checks. "Done" = matches pipeline output exactly, published-only.
- **Candidates section + save.** A candidate's profile with official site and *verified* social handles; "keep in mind" bookmarking stored device-local. "Done" = save/unsave persists across visits without an account.
- **Find My Candidates quiz.** ZIP + multiple-choice + free-response; Claude interprets answers and surfaces aligned candidates (full field shown, "learn more" framing). "Done" = returns candidates for the user's actual races with neutral framing and no ranking.
- **Local Electoral News feed.** A neutral, daily "what changed" feed from the pipeline (new filings, votes, fact-checks, re-audits) plus curated official-source links. "Done" = updates daily via a scheduled job, no external hot-takes.
- **Where-to-vote (opt-in email).** Enter ZIP + email to receive polling place and key deadlines. "Done" = email sends on request; no address/email stored beyond what delivery requires.
- **Four-section navigation.** Persistent bar — Candidates, Races, News, Find My Candidates — docked bottom on mobile, top on desktop.
- **Methodology page.** Plain-language "how we stay fair," with the scrutiny counts. "Done" = linked from every brief.

**Magic moment check:** the moment lives entirely inside "ZIP → Races → brief," all of which are in scope. Scope is correct.

### Explicitly Out of Scope

- **User accounts / cross-device sync.** Tempting for saved candidates, but it adds auth, a privacy surface, and friction that contradicts "anonymous by default." *Reconsider* only if users actively demand sync (post-launch).
- **Mass SMS delivery.** The original CAP MVP used Twilio to the owner's phone; real voter SMS needs A2P 10DLC registration and carries TCPA risk. *Reconsider* post-launch with proper registration.
- **Geography beyond the four FL metros.** A national shell would be thin and dilute trust. *Reconsider* after the four metros are complete and audited — next is the remaining FL districts.
- **User comments / ratings / community features.** Any user-generated content reintroduces the bias and moderation problems the whole project exists to avoid. *Reconsider:* likely never, or only as private notes.
- **External news aggregation.** Pulling third-party headlines adds a neutrality and moderation burden inconsistent with "pipeline + official sources." *Reconsider* only with a robust lean-balancing method.
- **Candidate-facing tools / claim disputes in-app.** Out of scope for v1; disputes route through the existing "flag this brief" path. *Reconsider* post-launch.

### Feature Priority (MoSCoW)

- **Must have:** ZIP/county resolution; Races list + side-by-side race view; audited candidate briefs (Say/Done/Fact-Check); four-section navigation; methodology page; published-only read layer.
- **Should have:** Candidates section with verified handles + device-local save; Find My Candidates quiz; Local Electoral News daily feed.
- **Could have:** Where-to-vote opt-in email; shareable brief links; "compare two candidates" focused view; issue-filtered browsing.
- **Won't have (this time):** Accounts/sync; mass SMS; out-of-FL coverage; comments/UGC; external news; in-app claim disputes; push notifications.

### Core User Flows

1. **See my ballot (the magic-moment flow).** Trigger: voter opens app. Steps: land → enter ZIP (or pick county) → see races → tap a race → read candidates side by side. Outcome: a fair, sourced picture of the race. Success: reaches a brief in under a minute, no signup.
2. **Find candidates to learn about.** Trigger: voter taps Find My Candidates. Steps: enter ZIP → answer multiple-choice + free-response issue questions → Claude interprets → see aligned candidates (full field, "learn more" framing) → open a brief or save one. Outcome: a curiosity-driven, non-endorsing shortlist. Success: completes the quiz and opens at least one brief, and does *not* report feeling told how to vote.
3. **Keep candidates in mind + get voting info.** Trigger: voter finds a candidate worth tracking. Steps: open candidate → "keep in mind" (saved device-local) → view saved list with official links/handles → optionally enter email for polling place + deadlines. Outcome: a personal, private watchlist plus the logistics to actually vote. Success: saves persist across visits; opt-in email delivers correctly.

### Success Metrics

- **Primary metric — "fair ballots delivered":** count of unique sessions that enter a ZIP and open at least one candidate brief. *Good:* the core loop works and people reach the magic moment. *Great:* a strong majority of sessions that enter a ZIP go on to open a brief.
- **Secondary:** brief completion (scrolled through all three sections); quiz completion rate; saved-candidate rate; return rate across the election cycle; opt-in email requests.
- **Leading indicators (trust):** methodology-page visits; qualitative "felt fair" feedback captured from *both* self-identified sides; low bias-flag rate relative to briefs viewed.
- **Neutrality/operational (from the pipeline):** 100% of published claims source-traceable; symmetric-scrutiny variance within thresholds for every published race; audit block rate tracked (a healthy sign the gate works, but zero shipped races is a failure).

### Risks

- **Perceived bias despite mechanical balance (likely / severe).** Someone *will* accuse the app of slant. *Mitigation:* publish the methodology and scrutiny counts, source every claim, and provide a visible "flag this brief" path; treat the audit trail as a public asset.
- **A race that won't pass the Balance Audit before launch (possible / high).** The gate could keep halting a target race. *Mitigation:* dry-run all races early; budget curation time; be willing to launch a race in a clearly-labeled "in review" state rather than shipping something unbalanced.
- **Wrong ballot from bad ZIP resolution (possible / severe to trust).** *Mitigation:* test against known addresses per metro; handle split ZIPs; show the resolved district back to the user for confirmation.
- **Quiz reads as an endorsement (possible / high).** *Mitigation:* always show the full field, frame strictly as "learn more," never rank, and user-test the framing before launch.
- **Neutral tone read as boring or cold (possible / medium).** Calm must not become lifeless. *Mitigation:* warmth and encouragement in copy and color carry the personality; lean on the design system.
- **Low engagement far from an election (likely / medium).** *Mitigation:* make the news feed a genuinely useful quiet digest; design for spikes around election dates rather than daily habit.
- **Funding/sustainability (possible / medium).** A free tool needs a backer. *Mitigation:* secure grant/mission funding early; never pivot to attention-monetization, which would poison the neutrality story.
- **Legal/compliance around voter info and email (possible / medium).** *Mitigation:* opt-in only, minimal data, clear privacy copy, PII scrubbing in logs; no mass SMS at MVP.

---

## 4. Brand Strategy

### Positioning Statement

For everyday voters who feel behind or unsure about their ballot, **Know Your Vote** is the nonpartisan civic app that shows every candidate in your races side by side — what they say, what they've done, and what's been verified, each traceable to a source. Unlike partisan voter guides that tell you who to support, or encyclopedias and sample ballots that leave you to do the work, Know Your Vote gives every candidate equal space and equal scrutiny, and proves its fairness instead of just claiming it.

### Brand Personality

Picture the best poll worker you've ever met, with the instincts of a great reference librarian. Warm and unhurried. Genuinely glad you showed up, whoever you are, whoever you're voting for. They hand you exactly what you need, clearly, and they'd *never* lean over and whisper who to pick — that's not their job and they know it's sacred that it isn't. They dress plainly and professionally, not in a suit and not in a mascot costume: approachable, credible, no theater. They speak in short, plain sentences and never make you feel dumb for asking. They'd never raise their voice, never pick a side, never use a scary headline to get your attention. They believe, quietly and completely, that an informed voter is a good thing regardless of how they vote — and everything about them is built to make that easier.

### Voice & Tone Guide

**Voice (constant):** Plain, warm, encouraging, scrupulously neutral. Everyday words. Short sentences. Confidence without pressure.

| Context | DO | DON'T |
|---|---|---|
| Onboarding / first screen | "Enter your ZIP to see who's on your ballot." | "Discover the TRUTH about your candidates!" |
| Empty state (no ballot yet) | "Add your ZIP or county and we'll show your races." | "You haven't done anything yet." |
| Error (ZIP not found) | "We couldn't match that ZIP. Double-check it, or pick your county instead." | "Invalid input. Error 404." |
| Success (brief loaded) | "Here's your race — every candidate, same space, same scrutiny." | "Here are the candidates you'll love." |
| Quiz results | "Based on your answers, these candidates' stated positions line up — worth a closer look, not a recommendation." | "Your top match is Candidate X. Vote smart!" |
| Neutrality note | "We describe what each candidate says, has done, and what's verified. You decide." | "We cut through the spin so you don't have to think about it." |
| Marketing copy | "See your ballot, laid out fairly. In about a minute." | "The only voter guide that gets it right." |

### Messaging Framework

- **Tagline:** *Your ballot, laid out fairly.*
- **Homepage headline:** *See everyone on your ballot — what they say, what they've done, and what's been verified.*
- **Value propositions:**
  1. **Fair by design.** Every candidate gets equal space and equal scrutiny — and we show the receipts.
  2. **The whole picture, separated cleanly.** Promises, record, and verified fact, never blended into spin.
  3. **A minute, not a research project.** Enter your ZIP and you're informed — no account, no agenda.
- **Feature descriptions:** *Races* — "Your ballot by ZIP or county, candidates side by side." *Candidates* — "Keep candidates in mind, with their official links in one place." *News* — "A calm daily digest of what actually changed." *Find My Candidates* — "Answer a few questions; discover candidates worth a closer look."
- **Objection handlers:** *"Nothing's really neutral."* → "Agreed — that's why we don't ask you to trust us. Every claim links to its source, every candidate gets the same scrutiny, and our method is public for you to pick apart." *"Are you telling me who to vote for?"* → "Never. We show you everyone, fairly. The choice is entirely yours."

### Elevator Pitches

- **5-second:** "Know Your Vote shows everyone on your ballot, fairly — what they say, what they've done, and what's verified."
- **30-second:** "Most voter info is either slanted or scattered across a dozen tabs. Know Your Vote lets a Florida voter enter their ZIP and instantly see every candidate in their races side by side — with promises, record, and fact-checks cleanly separated and every claim sourced. Behind it is a system that literally won't publish a race until every candidate has been covered evenly. It's the neutral starting point that actually proves it's neutral."
- **2-minute:** "Voters want to do the right thing, but the information landscape makes it miserable — partisan guides push an agenda, news is paywalled or thin down-ballot, and everything blends what a candidate *says* with what they've *done* and what's *true*. So people vote the top of the ticket and guess the rest. Know Your Vote fixes the root problem. Its pipeline uses three separate AI agents for three separate jobs — one captures the candidate's self-portrait, one documents their record from primary sources only, and one fact-checks claims against a fixed verdict scale — and a deterministic Balance Audit refuses to publish a race until every candidate has equal space and comparable scrutiny. The app turns that audited output into something a nervous voter finds genuinely welcoming: type your ZIP, see your ballot, read every candidate fairly, in about a minute, with no account and no agenda. We're launching in Florida's four biggest metros with real races. The ask is simple — help us get this in front of voters and let skeptics from both sides test our methodology, because the whole point is that fairness you can check beats fairness you're asked to believe."

### Competitive Differentiation Narrative

The voter-information market forces an ugly choice. On one side sit the neutral-but-shallow options — Ballotpedia, official sample ballots — accurate and unbiased, but dense or bare, and never holding a race's candidates side by side. On the other sit the deep-but-slanted options — partisan guides and opinionated outlets — engaging and clear precisely because they've already decided for you. Voters who want depth *and* fairness are stuck assembling it themselves across a dozen sources, which almost nobody does. Know Your Vote collapses that tradeoff by making neutrality a property of the system rather than a promise from an editor. The mechanical separation of say/do/true stops spin from impersonating a record; the source-or-dropped rule keeps unbacked claims off the page entirely; and the Balance Audit gate makes uneven coverage *structurally impossible to publish*. Most importantly, all of it is legible and checkable — sources on every claim, scrutiny counts in the open, methodology public — so the fairness holds up when a partisan comes looking for the thumb on the scale. A competitor can slap "balanced" on a landing page in an afternoon; they cannot reproduce a fairness gate without rebuilding around it. That architecture, plus a warm tone that welcomes both sides, is the durable difference.

---

## 5. Visual Design

Visual design tokens (colors, typography, spacing, components, motion) live in `docs/design.md`. If that file does not yet exist, run the Design System skill with image references to generate it before building. The stated direction to carry into that file: a calm, trustworthy palette; a clean, minimalist, straight-lined aesthetic that reads professional and informative *without* looking like a government website; and warmth in the details so the neutrality never feels cold.
