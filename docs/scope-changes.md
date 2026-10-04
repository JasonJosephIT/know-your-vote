# Scope changes

A dated record of where the work has diverged from the plan the specs
describe, so the divergence is tracked rather than discovered. Newest first.

Each entry says what changed, why, and — the part that matters most — **which
existing documents now assert something false**. `docs/prd.md`,
`docs/VISION.md`, and `docs/adr/ADR-001` are read as authoritative by both
people and the coding agent; where they are stale, they are actively
misleading.

---

## 2026-10-04 · The Google Ads tag, analytics, and the cuts for November 3

Written for the launch handoff (`docs/general-election/launch-handoff-2026-10-04.md`):
the ads decision in §1, and §6. The founder's instruction for this pass was
to take the best recommended path where a founder decision gates the work,
and save the decision for them. So **every call below is Recommended
(pending founder confirmation)**: an agent's recommendation, not the
founder's decision. Each one says how to flip it.

| # | Decision | Recommended (pending founder confirmation) | To flip |
|---|---|---|---|
| A | Google Ads tag vs. the PRD's privacy promise | **Keep the consent-gated tag**, and amend the PRD to match it | Remove the tag: the edits under "If the founder says remove it" below |
| B | Plausible | **Turn it on**: set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` in Vercel production | Leave it unset, and make `/privacy`'s Plausible sentence conditional |
| C | SMS | **Cut for Nov 3** | Start Twilio toll-free verification now; see C below |
| D | Web push | **Cut for Nov 3** | See D |
| E | County district placement | **Cut for Nov 3** | See E |
| F | Statewide ZIP coverage beyond the four counties (TASK-060) | **Cut for Nov 3** | See F |
| G | A further quiz replacement | **Cut for Nov 3** | See G |
| H | The bio section promised in FL-GOV decision D1 | **Drop for 2026** | See H |

### A. The Google Ads tag

**What the specs promised.** `docs/prd.md` §2 picks Plausible "with no
consent banner" and says "No PII to third parties"; §12 lists Plausible as
the only analytics service; §14 frames the analytics choice as Plausible or
cookieless PostHog. `docs/VISION.md` §73 says the same. None of them mentions
advertising.

**What the code does.** Read on 2026-10-04 from
`src/components/features/SitePrompts.tsx`, `src/app/layout.tsx` and
`src/app/(public)/privacy/page.tsx`, and from `git show` of the two commits.

- **How it got there.** `0a628e8` (2026-10-01) put Google's tag (gtag.js) for
  Google Ads ID `AW-18487967912` straight into the root layout, with no
  consent step. `d44a89f`, 14 minutes later, moved it behind a cookie banner.
  Both reached `main` together in PR #103 (merged 2026-10-02), so, going by
  the git history, production never ran the version without consent.
- **When it loads: only after the visitor accepts.** `SitePrompts` is a
  client component in the root layout. It renders nothing until hydration,
  then reads `kyv.ads-consent` from `localStorage`. It renders `GoogleTag`
  (two `next/script` tags, `afterInteractive`) only when the stored value is
  `granted`. The server HTML never contains the tag: the live `/privacy`
  HTML, fetched with a GET on 2026-10-04, has no `googletagmanager` reference.
  No prompt and no tag appear on `/admin`.
- **What consent is stored.** One `localStorage` key, `kyv.ads-consent`,
  holding `granted` or `denied`, with no expiry. With no key, the banner
  shows. Where storage throws (some private modes), the banner shows on
  every full page load and an Accept lasts only until the next one.
- **What happens on Decline.** The value `denied` is stored, the banner
  closes, and the tag never loads. No request goes to Google, and the site
  works the same. The donation prompt then shows once, on the next page the
  visitor opens.
- **What Google gets after Accept.** The tag's one `config` call sends a page
  view on each full page load. Google receives the page address and the
  referrer with any `zip` parameter removed first (`kyvNoZip`), the visitor's
  IP address, browser details, and its own cookies. The address can still
  carry the district and county a voter chose (`?district=FL-27&county=12086`)
  and the race or candidate being read. A district is a public electoral
  unit, which the privacy design already treats as not location, so this is
  consistent, but it is more than "a page view". No conversion event is
  fired in code. Whether these page views count as conversions or feed a
  remarketing audience is set in the Google Ads account, which no agent can
  see.
- **Changing your mind.** "Change your cookie choice" on `/privacy` deletes
  the key and reloads, so the banner asks again and the tag stops loading.
  It does not delete cookies Google already set; those stay until they
  expire or the visitor clears them. `/privacy` does not claim otherwise.
- **Disclosure.** `/privacy` describes the tag as opt-in, names
  `kyv.ads-consent`, says what Google receives, and links to Google's
  advertising policy. That matches the code.

**So the tag does wait for consent.** Nothing here is a blocker. What is
false is the PRD: "no consent banner" and "no PII to third parties" were
written before advertising existed.

**Recommended (pending founder confirmation): keep the consent-gated tag.**
- It is opt-in with a real Decline. Nothing loads without Accept, and the
  site works the same either way.
- The founder chose to advertise on Google (the banner and `/privacy` both
  say "We advertise on Google"). Without the tag there is no way to tell
  whether that spend brings anyone to the site.
- It touches no content. Briefs, candidate order and the Balance Audit are
  unaffected.
- The honest version of the PRD's promise is "nothing personal goes to a
  third party unless the visitor opts in", and that is what the code does.
  `docs/prd.md` §2, §7, §12 and §14 are amended to say so.

Two smaller points for the founder, neither blocking:
- **Remarketing.** If the only purpose is "did an ad bring them here", check
  in Google Ads that the tag does not build a remarketing audience. A list
  of people who read a voter guide is sensitive. Adding
  `allow_ad_personalization_signals: false` to the `gtag('config', …)` call
  in `SitePrompts.tsx` turns ad personalization off from the site's side.
- **Revocation.** "Change your cookie choice" could also expire Google's
  first-party `_gcl_*` cookies. Today it only stops the tag loading again.

**If the founder says remove it.** There is no single switch today; the
change is one block of edits:
1. `src/components/features/SitePrompts.tsx`: delete `ADS_ID`, `GoogleTag`,
   `ConsentBanner`, `CONSENT_KEY` and `ResetAdsConsent`. Then change
   `showDonate` so it no longer waits for `consent !== null`. **This is the
   trap:** the donation prompt is sequenced after the cookie choice, so
   removing the banner alone would silently stop the donation prompt too.
2. `src/app/(public)/privacy/page.tsx`: remove the advertising paragraph, the
   `ResetAdsConsent` import, `kyv.ads-consent` from "What stays on your
   device" (five things become four), and the sentence about Google's own
   cookies.
3. `scripts/verify-no-stored-location.ts`: remove `kyv.ads-consent` from
   `ALLOWED_LOCAL`.
4. `docs/prd.md`: take the Google Ads lines out of §2, §7, §12 and §14 again.
5. Google Ads (founder): pause the campaigns or the conversion actions that
   relied on the tag.

`git revert` of the two commits is not a clean alternative: they also add the
Donate button and the donation prompt.

To make the flip a single constant, `SitePrompts.tsx` could gain
`ADS_TAG_ENABLED`. When `false`, it would render neither the tag nor the
banner, treat the cookie question as answered for the donation prompt, and
let `/privacy` hide its advertising paragraph. That file is outside this
docs pass, so the change is proposed, not made.

### B. Plausible: wired, but off in production

`src/app/layout.tsx` loads `https://plausible.io/js/script.js` only when
`NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set. **On 2026-10-04 it is not set in
Vercel production.** The live `/privacy` HTML carries no Plausible script, so
**no analytics run on knowyour.vote today.** The `track()` calls
(`ballot_viewed`, `brief_viewed` and the rest) queue into a stub that
nothing reads. The only third-party measurement on the site is the Google
tag, for visitors who accept it.

`/privacy` says "We use cookieless, aggregate analytics (Plausible)". That
describes a configuration, not today's production, so it overstates what
runs. It is not a privacy harm, but it is not true.

**Recommended (pending founder confirmation): turn Plausible on.** Create the
site in Plausible, set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=knowyour.vote` in Vercel
production, and redeploy. That makes the PRD and `/privacy` true and gives
aggregate counts for the last four weeks. Cost: the Plausible plan (PRD §2
estimates $0–9 a month; verify). **To flip:** leave the variable unset, and
make the Plausible sentence on `/privacy` conditional on it, the same way
that page already reads `PELIAS_BASE_URL`.

### C–G. Cut for Nov 3 (recommended, pending founder confirmation)

Each of these is **Recommended cut for Nov 3, pending founder confirmation**.
The deciding fact is the calendar: early voting opens 2026-10-24 and
Election Day is 2026-11-03, and the reminder pipeline still has never sent
an email.

**C. SMS reminders.**
- *State:* nothing built in `src/`. `docs/design/notification-pipeline-and-pwa.md`
  §8 gated SMS on Twilio toll-free verification and said to submit it
  "now", in Phase A. It was never submitted.
- *Why cut:* the verification alone takes 1–3 weeks, so even started today
  it may not clear before early voting, and an SMS sender, Twilio webhooks
  and a double opt-in flow would all still need building and testing. The
  email path, which is built, has never sent; it gets the remaining time.
- *Not affected:* `TWILIO_*` in `.env.example` belongs to the CAP pipeline's
  T12 dispatch to the founder's own phone, not to voter SMS.
- *To un-cut:* submit Twilio toll-free verification today, then plan for
  SMS on the 11-02 and 11-03 sends at the earliest.

**D. Web push.**
- *State:* nothing built. No push handler, subscribe card or sender exists
  in `src/`. It was Phase B of the notification design.
- *Why cut:* no time to build and test it, and Apple's web push needs the
  site installed to the home screen, so reach is small.
- *To un-cut:* build design Phase B (service-worker push handlers, a
  subscribe card, `WebPushSender`). Two weeks at least, plus a rehearsal.

**E. County district placement.**
- *State:* the commission and school-board boundary GeoJSON for the four
  counties is in `docs/general-election/boundaries/`, fetched 2026-09-21.
  Nothing reads it. So county races are listed per county: a voter sees
  every commission and school-board district race in their county, not only
  their own district's.
- *Why cut:* it needs a ZIP and block crosswalk that has not been built,
  plus the Orange map caveat in the boundaries README, and a wrong placement
  is worse than an honest county-wide list.
- *To un-cut:* build the crosswalk the boundaries README describes ("What
  still has to happen") and wire it into `src/lib/resolve.ts`.

**F. Statewide ZIP coverage beyond the four counties (TASK-060).**
- *State:* `zip_district` holds 316 ZIPs, all in the four counties. A ZIP
  outside them answers "We can't place that ZIP on a ballot yet" and links to
  the statewide ballot, which every visitor already sees on `/` with no ZIP
  (Phase 7).
- *Why cut:* the Census crosswalk files were unreachable from agent sessions
  (`www2.census.gov` 403), and the races beyond the four counties have no
  briefs, so wider ZIP coverage would add U.S. House rosters and nothing
  more.
- *To un-cut:* download the two Census files on a machine that can reach
  them and run `node scripts/build-zip-seed.mjs` with a wider `METROS`
  filter (`docs/general-election-pivot.md`, TASK-060).

**G. A further quiz replacement.**
- *State:* the quiz came off on 2026-09-25
  (`docs/general-election/quiz-clipped-2026-09-25.md`). Two replacements from
  that note shipped the same day
  (`docs/superpowers/specs/2026-09-25-quiz-replacement-design.md`): the
  Ballotpedia link on the candidates hub (`OutsideResources`) and the
  per-race issue filter (`/races/[raceId]/issues`).
- *Cut:* anything further: a comparison table by policy area, or AI used
  only for retrieval (options 3 and 4 in the clipped note).
- *Why cut:* the issue filter already gives voters the comparison, with no
  site-written text; anything AI-shaped needs its own guardrail tests.
- *To un-cut:* `/where-i-stand` and `/find-my-candidates` redirect with a
  temporary 307, so either path is free for a replacement.

### H. The bio section (FL-GOV decision D1)

**Recommended (pending founder confirmation): drop it for 2026.**
- *What was promised:* "a bio section for every candidate"
  (`docs/general-election/brief-runs/FL-GOV/decisions.md`, D1): biography
  facts from the last ten years, plus the candidate's own self-description.
- *State:* not built. `src/lib/brief-rows.ts` emits stated positions only.
  The facts half needs Recorder `verifiable_fact` claims, which no published
  profile has, and has no ingest, reviewer or writer bucket. The
  self-description half has passages on disk (the 2026-09-29 Jev-link ingest
  read an About page for 56 of the 90 readable sites,
  `docs/general-election/brief-runs/ingest-jev-2026-09-29.md`), but no writer
  bucket, gate exemption or reviewer check. The second commitment gate
  (2026-09-30) rejects biography text, so a self-description needs its own
  path through review.
- *Why drop:* the reach would be uneven. Only 56 of the 106 ballot
  candidates could fill the section; those with no site, a walled site or
  no About page could not. That gap is the asymmetry the Balance Audit
  exists to flag. And a new content type needs its gate exemption, a
  reviewer check, a UI
  block, its own audit decision and a methodology paragraph, which the
  refresh calendar has no room for before early voting on 10-24. The
  methodology rewrite drafted alongside this entry says plainly that there
  is no bio section. The full reasoning is the proposal recorded in
  `docs/general-election/brief-runs/FL-GOV/decisions.md` ("D1, the bio
  section: proposed").
- *To flip:* record the decision as "build it". The smallest honest version
  is the self-description alone: one verbatim quote per candidate from the
  About page their 2026-09-29 run already read, labelled "Self-describes
  as", and "No self-description found" for everyone else, with the same rule
  for all 106 and the same review and Balance Audit as the positions. The
  founder would also decide how the audit treats a section that only some
  candidates can fill. The biography facts half (Recorder) is a separate
  project, not one for this cycle.

**Docs updated with this entry:** `docs/prd.md` (header, §2, §3, §7, §12,
§13 and §14), `docs/product-roadmap.md`, `README.md` and `.env.example`.
**Still asserting the old promise:** `docs/VISION.md` §73 ("avoids a
consent-banner burden"); not edited in this pass.

---

## 2026-09-06 · Hosting reverted to Vercel

Vercel Pro became available, so the Cloudflare migration is reverted. Hosting
is Vercel again, with `vercel.json` crons and `src/proxy.ts` restored.

**This un-breaks most of the staleness table below.** `docs/prd.md`,
`docs/VISION.md`, and ADR-001 describe Vercel as the host with Vercel Cron
and secrets in Vercel env — all true again. Only two entries in that table
survive the reversal:

| Where | Still false | Why |
|---|---|---|
| `docs/prd.md` §182 | Rate limiting via "Vercel edge middleware" | Rate limiting is in-route (`src/lib/rate-limit.ts`); it was never middleware |
| `docs/prd.md` §433, §530 | The "closed primary" note | Removed from the app in `198cd75` — false for the general election |

Two things were deliberately **not** reverted:

- **Next stays at 16.3.4.** The upgrade from 16.2.10 was a Cloudflare
  prerequisite, but 16.3.4 is the latest stable, the build is clean, and the
  proxy works on it (verified). Downgrading would be churn that loses patches.
- **`Response.json()` annotations stay.** Cloudflare's types surfaced five
  untyped fetch results in client components. Naming those shapes is more
  correct than `any` on any platform; only the comment explaining *why* was
  corrected.

Reverted with the platform: `worker.ts`, `wrangler.jsonc`,
`open-next.config.ts`, `cloudflare-env.d.ts`, `docs/cloudflare-deploy.md`, the
adapter and wrangler dependencies, and `POST /admin/auth/refresh` +
`SessionRefresh`. That refresh pair existed only because OpenNext could not
bundle Next 16's Node-runtime Proxy; with the proxy back it is redundant, and
per-request cookie refresh through the proxy is the canonical `@supabase/ssr`
pattern this codebase was designed around.

**What the detour cost and left behind.** Roughly two days, and it was not
optional at the time — the account block meant nothing deployed at all. It
also left three things worth keeping: TASK-057/059 and TASK-061/062 were
built during it and are unaffected by hosting, and the exercise produced this
log.

**Still to do:** the Vercel Git integration should now go back to normal use
rather than being disconnected, and `/api/admin/site/deployments` — the live
Vercel API dependency flagged below — is no longer at risk.

---

## 2026-09-01 → 09-03 · The general-election window

Opening ask: pivot from the August 18 primary to the November 3 general
election, and ship within two days. Three things then changed underneath
that ask.

### 1. Hosting moved from Vercel to Cloudflare Workers *(unplanned)*

**Why:** the Vercel account is blocked at the account level, so nothing
deploys — no previews, and neither production cron. The reminder cron is the
delivery path for the general-election deadline emails, so this was on the
critical path, not a preference.

**Carried three sub-changes, each of which is itself a scope change:**

- **Next.js 16.2.10 → 16.3.4.** The OpenNext adapter's peer range excludes
  16.0.x–16.3.2 and was narrowed *upward* over time, so the old pin was an
  unsupported combination, not merely an untested one.
- **`src/proxy.ts` deleted.** Next 16's Proxy is Node-runtime-only and
  OpenNext does not support Node middleware on workerd
  ([#969](https://github.com/opennextjs/opennextjs-cloudflare/issues/969), no
  workaround). Authorization is unchanged — `requireAdmin()` was always the
  boundary — but admin session refresh now lives in
  `POST /admin/auth/refresh`.
- **Deployment is no longer one dashboard.** `NEXT_PUBLIC_*` values are
  inlined at build time and cannot come from `wrangler secret put`. See
  `docs/cloudflare-deploy.md`.

**Now false in the docs:**

| Where | Asserts |
|---|---|
| `docs/prd.md` §46, §49 | Architecture diagram: "Vercel (Next.js server)", "Vercel Cron" |
| `docs/prd.md` §87 | Tech table: route handlers "on Vercel; Vercel Cron" |
| `docs/prd.md` §172 | "Host: Vercel (Next.js-native). Preview deploys per PR" |
| `docs/prd.md` §174 | Scheduled jobs run via Vercel Cron |
| `docs/prd.md` §182 | Rate limiting via "Vercel edge middleware" — and there is no middleware at all now |
| `docs/prd.md` §184 | "Secrets live only in Vercel env" |
| `docs/prd.md` §192 | Cost table lists Vercel Hobby/Pro |
| `docs/prd.md` §507 | Scale target expressed as "on Vercel + Supabase" |
| `docs/VISION.md` §69 | Backend "on Vercel, plus scheduled jobs (Vercel Cron)" |
| `docs/product-roadmap.md` TASK-012 | Deploy target and `vercel.json`, a file that no longer exists |
| `docs/product-roadmap.md` TASK-038 | Cron scheduling via `vercel.json` |
| `docs/adr/ADR-001` | Context opens "server-rendered on Vercel… Vercel cron". Its *decision* (remote-shell PWA) is unaffected; only its premises moved |
| `docs/admin-dashboard/design.md` | Several, including `/api/admin/site/deployments`, a real functional dependency on the Vercel API that still needs a decision |

The admin console's Vercel API integration is the only one of these that is
code rather than prose. It has not been touched and will report unavailable.

### 2. Phase 7 added — "ballot first, ZIP optional" *(new direction)*

Not in the opening ask. Came out of a question about dropping saved state,
and turned out to be well-founded: eight of ten November ballot items are
statewide and identical for every Florida voter, so the ZIP wall gates a
shared ballot behind a question that changes almost nothing.

**Amends, rather than implements, the PRD:**

- **FR-001 / TASK-015** define ZIP → ballot as *the* magic moment. Phase 7
  demotes ZIP to an upgrade. The PRD and the product will disagree until one
  of them is changed.
- **`docs/prd.md` §433, §530** still instruct showing a "closed primary"
  note. That note was removed from the app on 2026-09-03 (TASK-059) because
  it is false for the general election.
- The `zip_resolved` analytics event stops being the top of the funnel.

### 3. The two-day window elapsed, and nothing is deployed

Stated on 09-01; it is now 09-03. Written down because the plans are still
scoped to two days and reading them later without this note would be
misleading.

Actual deadlines, which have more room than the window did:

| Date | What |
|---|---|
| 2026-09-28 | T-7 registration reminder fires — needs the cron live **and** TASK-058 done |
| 2026-10-05 | Voter registration deadline |
| 2026-11-03 | Election Day |

**Blocked on account access, not on engineering:** creating the R2 bucket and
D1 database and setting Worker secrets; unblocking Vercel or disconnecting
its Git integration; TASK-058's human verification of the five `general_2026`
dates (the liability gate — nothing date-driven renders or sends until it is
done); TASK-066's content through the Balance Audit.

### Shipped so far

| Commit | What |
|---|---|
| `5806a4c` | Cloudflare Workers migration (built and dry-run verified; not deployed) |
| `198cd75` | TASK-057 election-scoped race reads + TASK-059 closed-primary copy removal |
| `942fc6e` | Phase 6 plan |
| `06f7307` | Phase 7 plan |

---

## How to clear this

Two options, and it is worth picking one deliberately rather than letting the
list grow:

1. **Amend the specs** — rewrite the stale lines in `docs/prd.md`,
   `docs/VISION.md`, and ADR-001's context, and delete the entries above as
   they are fixed. Correct, and the right end state.
2. **Leave them and treat this file as the errata** — cheaper now, but every
   reader has to know this file exists, and the coding agent will not.

Option 1 is right before anyone builds from the PRD again. Until then,
`docs/prd.md` carries a pointer here.
