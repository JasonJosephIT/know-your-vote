# Vision — Know Your Vote

> Captured by the Product Planner skill. This file is the source of truth for
> generating product-vision.md, prd.md, and product-roadmap.md. Edit it directly
> and re-run the Product Planner to regenerate downstream documents.

**Created:** 2026-07-01
**Updated:** 2026-07-01

## Founder

- **Name:** Joseph *(suggested from account — edit to your preferred name/credit line)*
- **Expertise:** Civic technology and applied multi-agent AI systems — designing a pipeline that enforces political neutrality *mechanically* (measured, logged, and gated) rather than as an editorial promise. *(Background detail suggested — edit to reflect your real experience.)*
- **Background:** The project began from one observation: voters can't easily separate what a candidate *says*, what they've actually *done*, and what's independently *true* — and nearly every existing source blends those together with some editorial slant. Rather than claim an "unbiased" tool (which doesn't exist), the goal became to engineer *verifiable* neutrality: a system where balance is measured, logged, and enforced before anything reaches a voter. The Civic Awareness Project (CAP) backend already implements this as a Profiler / Record / Fact-Checker / Orchestrator pipeline with a deterministic Balance Audit. *(This narrative is inferred from the existing CAP project docs — refine with your personal story.)*

## Purpose

- **Who you help:** Everyday voters in Florida's four largest metros — Miami, Fort Lauderdale, Tampa, and Orlando — who want to understand their ballot without wading through partisan spin, paywalls, or homework. Especially people who feel overwhelmed, behind, or tuned out by down-ballot races.
- **Problem you solve:** Candidate information is fragmented, partisan, often paywalled, and it blurs three very different things — campaign promises, actual record, and independently verified fact. Voters can't get a fair, side-by-side, sourced picture of *everyone* on their ballot.
- **Desired transformation:** A voter goes from anxious and under-informed ("I don't know who these people are, or who to trust") to calm and confident ("I know who's on my ballot, what they say, what they've done, and what's been verified — and I could check every claim myself").
- **Why you:** You recognized that "unbiased AI" is a myth and chose the harder, more honest path: build a system that makes neutrality *auditable*. Symmetric scrutiny, source-traceable claims, and a balance gate that halts publication when candidates aren't covered evenly are already engineered into the backend. This app is how that fairness reaches real voters.

## Product

- **Name:** Know Your Vote *(the voter-facing app of the Civic Awareness Project)*
- **One-liner:** Know Your Vote gives you a calm, nonpartisan, fully-sourced picture of everyone on your ballot — what they say, what they've done, and what's been verified.
- **How it works:** A voter opens the app and enters their ZIP code or picks their county. The app resolves their races and shows every candidate side by side, with equal space and equal scrutiny. Each candidate brief has three clearly separated parts — **What They Say** (their self-portrait), **What They've Done** (the primary-source record), and **Fact-Check** (adjudicated claims with a fixed verdict scale) — every item traceable to a source. Voters can save candidates to "keep in mind," take a **Find My Candidates** quiz that surfaces candidates whose stated positions align with their answers (across all parties, framed for learning — never as an endorsement), follow a daily **Local Electoral News** feed of what changed, and opt in by email to get their polling place and key deadlines. The app is navigated by a persistent four-section bar — **Candidates, Races, News, Find My Candidates** — docked to the bottom on phones and the top on desktop.
- **Key capabilities:**
  - **Ballot by location** — enter a ZIP or choose a county and instantly see your races and every candidate in them, laid out side by side.
  - **Neutral candidate briefs** — the mechanical "What They Say / What They've Done / Fact-Check" separation, each item sourced and covered under a fixed per-race issue spine, published only after passing the symmetric-scrutiny Balance Audit.
  - **Find My Candidates quiz** — ZIP + multiple-choice + free-response answers; Claude interprets them and surfaces candidates whose *stated positions* align, showing the full field and always framing results as "candidates to learn more about," never "who to vote for."
  - **Saved candidates ("keep in mind")** — bookmark candidates and keep their official site and verified social handles in one tidy place, device-local and private.
  - **Daily "what changed" feed + where-to-vote** — a neutral Local Electoral News feed generated from the pipeline and curated official sources, plus opt-in email delivery of polling place and deadlines by ZIP.
- **Platform:** web
- **Market differentiation:** Verifiable neutrality you can audit, not just a claim of it. Know Your Vote mechanically separates promises, record, and verified fact at the data level; gives every candidate in a race equal space and equal scrutiny (enforced by a deterministic Balance Audit that *halts* publication on asymmetry); and makes every published claim traceable to a source. No partisan voter guide, news outlet, or general AI chatbot offers that combination.
- **Magic moment:** In under a minute, a voter enters their ZIP and sees every candidate in their races laid out side by side — equal space, equal scrutiny — with what they say, what they've done, and what's been fact-checked, each traceable to a source.

## Audience

- **Primary user:** Maria, 34, a busy parent and small-business employee in Orlando. She votes in presidential years but feels lost on state and congressional races. She distrusts cable news and campaign mailers, doesn't have time to research ten candidates, and feels a low-grade guilt about "not being informed enough." She's on her phone. She'd switch to a tool that felt fair, fast, and didn't try to tell her what to think.
- **Secondary users:**
  - First-time and young voters who find election coverage alienating and want a plain, judgment-free starting point.
  - Newcomers to Florida who don't yet know the local offices, races, or candidates.
  - Nonpartisan multipliers — librarians, teachers, and civic organizations — who need something they can confidently hand to anyone regardless of politics.
- **Current alternatives:** Partisan voter guides and endorsement lists; Ballotpedia and VOTE411/League of Women Voters guides; local news (often paywalled or thin on down-ballot races); official sample ballots (accurate but bare); social media; asking friends; and, most commonly, doing nothing and guessing at the booth.
- **Frustrations:** Existing options are either slanted, paywalled, or fragmented across a dozen tabs. None cleanly separate what a candidate *promises* from what they've *done* from what's *verified*. Everything feels like homework, and nothing reassures a nervous voter that the picture they're getting is fair.

## Business

- **Revenue model:** free
- **90-day goal:** Ship the Florida four-metro web app on top of the existing pipeline. A voter can enter a ZIP, see every target race, and read complete, source-traceable, balance-audited briefs for all candidates — with the Find My Candidates quiz and saved-candidates working. Serve as the centerpiece of the Claude Corps Cohort 1 application, demonstrating a working, neutrality-audited product rather than a promise.
- **6-month vision:** Expand coverage to all 28 Florida congressional districts plus state legislative races; add opt-in email reminders (deadlines, polling place) at scale; publish the public Symmetric Scrutiny methodology so anyone can audit fairness; and show early trust signals — returning voters, shares by nonpartisan orgs, and "this felt fair" feedback from both sides of the aisle.
- **Constraints:** Small, mission-driven team building with AI coding tools; the tool is free (grant/mission funded, no revenue engine). Neutrality is the hard constraint — nothing publishes if it fails the Balance Audit. Florida data availability shapes scope. No mass SMS at MVP (TCPA/A2P 10DLC); email is opt-in only. Privacy is a design constraint: anonymous use by default, no accounts.
- **Go-to-market:** Grow through explicitly nonpartisan channels — public libraries, universities, civic and voter-education organizations (LWV-style groups), and the Claude Corps network. Lead with the neutrality methodology as the trust story. Deliberately avoid partisan amplifiers, endorsements, or "who to vote for" framing, since perceived neutrality *is* the product.

## Brand Voice

- **Personality:** The calm, welcoming poll worker crossed with a great reference librarian — warm, encouraging, and scrupulously fair. Confident and clear, never preachy, never partisan, never alarmist. It celebrates the *act* of getting informed and treats every voter as capable, whatever their politics.
- **Tone of voice:** Plain, cheerful, and empowering. Short sentences, everyday words, no jargon and no horse-race drama. It reassures ("You've got this — here's your ballot, laid out fairly"), it's inclusive by design (comforting to either side of any race), and it stays rigorously neutral on candidates ("Here's what each candidate says, what they've done, and what's been verified — you decide"). Example empty state: "Enter your ZIP to see who's on your ballot." Example neutrality note: "We give every candidate the same space and the same scrutiny." Example quiz result: "Based on your answers, here are candidates whose stated positions line up — worth a closer look, not a recommendation."

> Visual identity (mood, anti-patterns, design tokens) is deliberately not
> captured here — it lives in docs/design.md, generated by the Design System
> skill from image references.

## Tech Stack

- **App type:** web
- **Frontend:** Next.js (App Router) with React and TypeScript, styled with Tailwind CSS — server rendering and static generation give fast, SEO-friendly pages for daily-updated public civic content, and the ecosystem has the best AI-coding-agent support.
- **Backend:** Next.js server actions / route handlers on Vercel, plus scheduled jobs (Vercel Cron) for the daily refresh. The CAP multi-agent pipeline writes the neutral, balance-audited data into Supabase; the web app reads it. The app never authors claims — it presents what the audited pipeline has published.
- **Database:** Supabase (Postgres) — matches the existing CAP schema exactly, where enum `CHECK`s and referential integrity enforce "buckets are sacred" and "no source → dropped" at the database level. Row-Level Security exposes only published, audit-passed briefs to the public read layer.
- **Auth:** None — the app is device-local and usable fully anonymously. Saved candidates and quiz results live in the browser (localStorage). No login, no user accounts. *(If accounts are ever added for cross-device sync, revisit; not in scope.)*
- **Payments:** None — Know Your Vote is a free civic tool with no paid tiers.
- **Analytics:** Plausible — cookieless, privacy-first, and stores no personal data, which fits anonymous civic access and avoids a consent-banner burden. Instrument only aggregate funnel events (ZIP entered → brief viewed → quiz completed), never personal identifiers. *(PostHog EU in cookieless mode is an acceptable alternative if richer funnels are later needed.)*
- **Email:** Resend — opt-in transactional email only: polling-place lookup, key deadlines, and reminders the voter explicitly requests. Emails are the single case where any personal datum (an email address) is handled, and it is never linked to browsing behavior.
- **Error tracking:** Sentry — with strict PII scrubbing configured from day one: no ZIP, email, or IP address in event payloads or breadcrumbs. Catch client and server errors without ever logging voter data.

## Tooling

- **Coding agent:** Claude Code
