# Mobbin references: UI and motion patterns for every page

Reference catalog, 2026-10-12 (second pass). The founder asked: "use mobbin to find pre made ui and motion effects for our site not just the homepage". For each page group, researchers read the real components first, then searched Mobbin by pattern across web and iOS screens, website sections and flows, and proposed one change per reference. The first review passed 60 references and dropped 40. The drops were then screened again under the founder's rule below (colour and placement can change). Result: **74 kept** (70 Mobbin references and 4 platform docs) and **26 dropped**. Each section lists its drops and the reason for each. The visual version, with every screenshot, a page filter, the Top 12 and the motion list, is `mobbin-references.html` in this folder.

Contents: [What Mobbin can and can't give us](#what-mobbin-can-and-cant-give-us) · [Colour and placement can change](#the-founders-rule-colour-and-placement-can-change) · [Already decided](#already-decided-on-2026-10-12) · [Top 12](#top-12-to-build-first) · [Founder decisions](#founder-decisions) · [Motion](#motion) · [1 Chrome and home](#1-global-chrome-and-home) · [2 Races](#2-race-browsing-and-comparison) · [3 Candidate profile](#3-candidate-profile) · [4 Amendments and long-form](#4-amendments-and-long-form-pages) · [5 News and states](#5-news-and-states) · [6 Motion, site-wide](#6-motion-site-wide) · [7 Forms and flows](#7-forms-and-flows) · [Image catalog](#image-catalog) · [Mobbin notice](#mobbin-ai-usage-notice)

- **Repo.** Worktree `candidate-profiles-handoff-46d6e7`, branch `claude/registration-labels-calendar`. Line numbers are from 4260eb9 (main 71db8fb plus the founder's 10-12 fixes). After that, de157e7 set the issue bucket labels at 14px and moved DeadlineBanner's calendar link down two lines. Nothing under `src/` or `public/` was edited.
- **Sections 1-7** were written as parts 1-7, so "part N" inside a section means section N. IDs use two-letter page prefixes (HM, RS, RC, CP, AM, LF, NS, MO, AD) and keep the first catalog's numbers, so gaps in a sequence are dropped or merged entries.
- **Not repeated here:** the home resources block and scroll rhythm, in [`../home-readability-2026-10-12/home-readability.md`](../home-readability-2026-10-12/home-readability.md). References that touch home build on its PR A (A5, A7, A8, A9, merge by Wed Oct 14) and say so.
- **Frozen** column: **Yes** = a frozen page or a `scripts/freeze-manifest.ts` `FROZEN_FILES` component. **Adjacent** = not hashed, but renders on (or changes) a frozen page: LocationEntry, CountyPicker, VotingInfo, SaveToggle, and the `globals.css` rules that reach frozen routes. Both land **before Oct 16 or after Nov 4**: frozen files must merge by Fri Oct 16, the hashes are written Sat Oct 17, and the freeze starts Sun Oct 18 04:00 UTC. **No** = can ship any time.
- Effort is S, M or L. Value is high, medium or low.

## What Mobbin can and can't give us

- **It can give** real shipped screens, website sections and multi-step flows, searchable by pattern. They are good evidence for layout, hierarchy, states (error, empty, loading, success, confirmation) and the structure of microcopy. Every kept reference links to its Mobbin page and has a local screenshot in `img/`.
- **It can't give motion.** Every result is a still frame. A "flow" is a row of stills, before and after, with no duration, easing or reduced-motion behaviour. The motion references here show *what changes state*, never *how it moves*. Every timing in this catalog comes from design.md's tokens: `motion.fast` 120ms, `motion.base` 200ms, `motion.slow` 320ms, all on `cubic-bezier(0.2,0,0,1)`, and nothing bounces.
- **It has no voter guides.** No election office, sample ballot, fact-checker or GOV.UK-style civic site came back. So we searched by pattern ("equal-weight comparison of N options", "address entry with errors", "deadline stepper with past, today and next") and adapted the results. Several of our needs have no reference at all: equal-weight comparison of 5-8 options on a phone, absence stated in words with a sourced reason, a static "needs 60% to pass" diagram, lean disclosure without placing outlets on a spectrum, and empty states that blame our pipeline rather than the reader's filters. Each section's Gaps list says which.
- **Pre-made motion code** (Motion, Motion Primitives, Magic UI, Animata, Aceternity, React Bits, cult-ui, tw-animate-css) was evaluated and dropped. Every kept effect is plain CSS or React's built-in `<ViewTransition>`, at 0 KB of added dependencies (section 6).
- **Images.** `img/` is gitignored, because the repo is public and the screenshots are Mobbin's. A fresh clone has no images. Every reference keeps its Mobbin link, and the [image catalog](#image-catalog) lists each `image_url` (they expire about 30 days after 2026-10-12). The Mobbin connector wasn't authorised for the second pass, so it ran no new searches: every kept reference comes from the first run and was checked again against its saved screenshot.

## The founder's rule: colour and placement can change

On 2026-10-12 the founder said colour and placement should not limit a reference, because both can change, unless a problem is "unchangeable". So:

- **No reference was dropped for its colour or for where its content sits.** Where a reference's palette, highlighted column or position broke a rule, the reference was kept and that part was swapped for our tokens or our layout. Each row's **Adaptation** says what changes (Zillow's blue becomes `border-primary`; Copilot's share button moves from the candidate page to the race page; Monzo's cards become a two-column list).
- **A reference was dropped only when the problem is built into the pattern**, or when it duplicates a kept entry. Examples: a two-up compare that hides the rest of the field; a fill or "you are here" dot that reads as a tally on a ballot measure; a left-right spectrum that scores lean in any palette; a "before and after" frame that casts NO as the old state; a fade on a list that names candidates; a loop past 5 seconds. Recolouring doesn't fix any of these.

Every kept reference still passes the hard rules:

- **Neutrality** (AGENTS.md): nothing ranks, scores, highlights or gives more visual weight to any candidate, party, race or side of an amendment. All or none per race. Parties are never colour-coded. No art near candidates, races, measures or news. Dates are stated, never counted down. A real skew is shown with context only after the `news-fairness.md` §2 source check.
- **Motion**: only for feedback, state or spatial continuity. It respects `prefers-reduced-motion`, there is no decorative motion below lg, it is never on candidate content, and WCAG 2.2.2 applies to anything that moves for more than 5 seconds.
- **WCAG 2.2 AA**: 24px targets, 4.5:1 text, reflow at 320px, visible focus, and design.md's 14px floor for anything a voter must read.
- **Freeze**: from 2026-10-18 04:00 UTC the race, race-issues, candidate, measure and methodology pages and the `FROZEN_FILES` components take corrections only.

## Already decided on 2026-10-12

These are settled, so no reference reopens them:

- **The location field becomes address-only (no ZIP option).** The founder asked what "which part of this ZIP" means. It is DistrictConfirm, the screen that asks a voter to pick a district when their ZIP crosses a district line. A street address resolves to one census block and so to one district, so that screen retires with ZIP entry. Section 7 opens with the full answer and the knock-ons the ZIP-removal PR has to carry: the no-JavaScript route, the `ADDRESS_LOOKUP_OFF` switch, autofill, every "enter your ZIP" string, and the pins. The address-entry references (AD1-AD8, NS1, HM4) are all written for address-only entry.
- **The race header says "Registration closed <date>" once the deadline has passed.** Built in 4260eb9. No live race stores `key_dates.registration_deadline` yet, so nothing shows until a date is entered. Florida's book-closing date for the Nov 3 general was **Oct 5**, not Aug 5, so check the date before anyone enters it.
- **The candidate-page section labels go up to 14px.** Built in 4260eb9 and de157e7: `text-body-sm` semibold, still uppercase, so they never read as the 15px name link above them.
- **The calendar link says it downloads a file.** Built: DeadlineBanner and VotingInfo read "(downloads a file)", at 14px.
- **No covered race may be empty.** A separate session is fixing that. Nothing here designs a "no race yet" state.

## Top 12 to build first

Ranked by value per effort, with freeze timing as the tie-break. **Bold "Yes"** means it must merge by **Fri Oct 16** (frozen or frozen-adjacent, or needed live for the whole freeze). If it misses that, it waits until after Nov 4, which is after the election.

| # | Build | References | Files | Effort | Value | Before the freeze? | Why |
|---|---|---|---|---|---|---|---|
| 1 | Reduced-motion safety net and a 4-second cap on skeleton pulses | MO1 | `globals.css` | S | high | **Yes, by Wed Oct 14.** Adjacent: it changes the frozen race and candidate loading routes without editing them. Its own PR (M0). | Fixes a live WCAG gap in about 15 lines: the loading pulses loop forever, even for reduced-motion users, exactly where candidate content renders. Every other motion entry uses its tokens. |
| 2 | Corrections route in the footer of every page | HM7 | `SiteFooter.tsx` | S | high | **Yes.** Not frozen, but it must be live before Oct 18 04:00 UTC. | From Oct 18, corrections are the only way a ballot page can change, and today the only contact route is on /about. |
| 3 | Key dates readable without colour | HM1, HM8 | `KeyDatesRail.tsx` | S | high | Not frozen. Merge by Fri Oct 16 on home PR A's A5, so it is live when early voting opens Oct 19. | WCAG 1.4.1: today "next" and "later" differ only by colour. Visible words and a check shape fix it, with no layout change. |
| 4 | Address errors you can act on, and the district picker as a visible second route | AD1, AD2, AD7, AD3, NS1 | `ui/Input.tsx`, `LocationEntry.tsx` | S each (NS1 M) | high | **Yes.** Adjacent. Lands in the PR that removes ZIP entry, whose YourRaces copy must merge before the Sat Oct 17 hash write. | With ZIP gone, every failed address needs a next step that isn't "enter your ZIP". The picker is the only route that sends no address anywhere. |
| 5 | Race page: "Jump to" issues, a "Showing 2 of 9 issues" line, and "Why a position can be missed" on every row | RC1, RC2, RC5 | `races/[raceId]/page.tsx` or `RaceCompare.tsx`, `IssueFilter.tsx` | S | high | **Yes.** Frozen. | The row ids already exist. A phone voter reaches any issue without scrolling past an 8-card roster, and the filter says in words what it shows. |
| 6 | Each source line says what kind of source it is and when we read it | CP3 | `SourceLinks.tsx` | S | high | **Yes.** Frozen. | Type and retrieved date are already in the schema. A voter can tell a campaign website from an official record before clicking, and bad URLs stop throwing. |
| 7 | Amendment page: equal reach to YES and NO on phones, and readable resource rows | AM1, AM4 | `MeasureResourceLadder.tsx`, `MeasureResourceRow.tsx` | S | high | **Yes.** Frozen. | Below md, the NO column starts after up to 8 YES rows. Two identical jump links fix that. Rows lose the box-in-a-box, and titles go to 16px. |
| 8 | Reminder form: consent split, per-field errors and a real sent state | RS1, RS5, RS2 | `VotingInfo.tsx`, `ReminderSignupCta.tsx`, `api/voting-info/route.ts` | S, M, S | high | **Yes.** Adjacent: VotingInfo renders on YourRaces. | Voters outside the four counties learn the limit before typing, and a typo can be fixed without reloading, ahead of the Oct 21 email for the Oct 22 mail-ballot deadline. Its shape follows D4. |
| 9 | News: an error never shows as "empty", empty states give a next step, and the skeleton is static | NS2, NS3, NS4 | `NewsFeed.tsx`, `news/outlet/[slug]/page.tsx` | S | high | No. Any time. | Today an outage on an outlet page says the outlet has no stories, which misstates our coverage. |
| 10 | District chip says what it is and what it stores, and confirms "Forget" | HM2, HM5, MO4 | `DistrictChip.tsx`, `Glyphs.tsx` | S | high | No. Any time, ideally before Oct 18. | It is on every page. The panel names the cookie and says it stays in this browser, it closes on an outside tap, and the label passes WCAG 2.5.3. |
| 11 | How political lean is disclosed, with the raters named and unrated outlets counted | NS6 | `news/outlet/page.tsx` | S | high | No. Any time. | Lean is disclosed, never scored (news-fairness §1). Naming the three raters and counting the unrated outlets is that disclosure. |
| 12 | /privacy at a glance, stated dates, and one nav across About, Methodology, Privacy and Terms | LF5, LF6 | `privacy/page.tsx`, `terms/page.tsx`, `about/page.tsx` | S | high, medium | No. The same nav on /methodology is frozen. | With address-only entry, voters will ask what happens to their address. Three cards ("Only on your device", "Stored only if you sign up for email", "Never stored") answer it before the detail. |

Items 1, 2 and 4-8 are on the freeze clock: five small frozen or adjacent PRs (#4-#8) in four days, next to home PR A (Wed Oct 14) and PR B (Fri Oct 16). Decision D1 sets how many go in.

**Just outside the twelve**, in order: LF3 + LF1, the /methodology "On this page" list on phones and rail at lg (frozen; S + M; high). RC3 + RC4, the issue grid for races with 4-8 candidates (frozen; M + M; high; re-measure FL-GOV). CP1, CP4 and CP6, the profile header, quoted statements and "On this page" (frozen; M each; high). RS11 + CP11, share with an in-place "Link copied" (M; high; RS11 on home isn't frozen). RS4 + RS6, the dated "when we email you" list (M; high). Recommended after Nov 4: AM2, AM3, CP8, CP9/CP10 (D3), RC6, RC10 and MO8-MO13.

## Founder decisions

**Decided 2026-10-13: D1 (a), D2 (a), D3 (a), D4 (a).** Top 12 #1–#8 are being built as separate PRs, the frozen ones to merge by Fri Oct 16. Phones keep still except colour changes and loading indicators. The "Keep in mind" message (CP9/CP10) waits until after Nov 4. The reminder form keeps its ZIP through Nov 3, with the four counties named under the label.

Only four calls remain. Each has a recommended option.

**D1. How many frozen and frozen-adjacent items go in before the freeze?**

Top 12 items #4-#8 touch frozen or frozen-adjacent files and must merge by Fri Oct 16. Home PR A (Wed Oct 14) and PR B (Fri Oct 16) are landing in the same days.

- **(a) Recommended:** #4 and #8 first, because the address-only decision already forces changes to those flows. Then #5, #6 and #7, in that order, each as its own small PR. Whatever hasn't merged by end of day Fri Oct 16 waits until after Nov 4. Every other frozen item waits until after Nov 4, including RC3/RC4, CP1/CP4/CP6, LF1/LF3, AM3 and CP11. AM2 also waits for the news-fairness §2 source check and your sign-off on its "Nothing in this group yet" wording.
- (b) Only #4 and #8. Everything else that is frozen waits until after Nov 4.
- (c) Only the ZIP removal itself, with plain error copy. Ship unfrozen items only until Nov 4.

**D2. Does "no motion below lg" cover UI feedback motion too?**

design.md's art-on-phones rule says "No motion below lg". Feedback motion (a dialog or a message arriving) is not art, so the rule needs a reading.

- **(a) Recommended:** yes. Below lg, only colour changes and loading indicators move: AD4's spinner, which stops at 5s, and MO1's capped pulse. Every fade, rise, slide, morph and height ease is lg+ and motion-safe. This catalog is written to (a).
- (b) Allow 120-200ms feedback enters on phones too (dialogs, HM4's sheet, the CP9 message), still only under `prefers-reduced-motion: no-preference`. MO2 drops its `min-width` condition.

**D3. A message after "Keep in mind" (CP9, with CP10's Undo)?**

The message is page chrome, but it appears right after a tap on a candidate card, so it sits next to candidate content.

- **(a) Recommended:** yes, after Nov 4. One site-level message, identical for every candidate, with no name, photo or party, no motion below lg and no auto-hide. It says "kept" only when the save really stuck (private browsing can block it, and today the toggle claims success anyway).
- (b) No message. Keep the silent toggle, and add the "on this device only" line to the Saved tab.

**D4. The reminder form's ZIP field.**

The address-only decision covers the location field. The reminder form (VotingInfo) is a separate field: it asks for a ZIP to pick the county's early-voting date for the emails, posts `{ zip, email, consent }`, and /privacy lists the ZIP as stored.

- **(a) Recommended:** keep it through Nov 3, labelled for what it does. RS1 names the four counties under the label before typing, and RS5 checks it in place. Revisit after Nov 4. Removing it now would touch the subscriber table, the send cron and /privacy with four days left before the Fri Oct 16 cut-off and nine days before the Oct 21 send. The cost: YourRaces can no longer prefill it from `?zip=`, so a voter who typed an address types a ZIP once more (section 7, knock-on 6).
- (b) Replace it with a county choice (the four counties, plus "Elsewhere in Florida", which gets the statewide dates), preselected from the saved district, so the site asks for a ZIP nowhere. It has the same Fri Oct 16 deadline as #8, and /privacy changes with it.

Smaller calls are deferred, not raised: CP8's "omit or say Not listed" waits until `SHOW_CANDIDATE_CONTACT` is switched on, and RS1 leaves the consent sentence's words unchanged until you sign off a rewording.

## Motion

What the catalog proposes to move, and how each falls back. Mobbin flows show only before and after frames, so every duration and easing below comes from design.md's tokens. Section 6 has the build notes and CSS.

**Dependency cost: 0 KB.** Every effect is plain CSS (`prefers-reduced-motion`, `@starting-style`, `:target`, `::details-content`, `transition-colors`) or React's built-in `<ViewTransition>`, which Next 16 already vendors. The only script is one small IntersectionObserver island for the lg scroll-spy rails, and it sets state, not motion. Below lg, only colour changes and loading indicators move (D2 (a)).

| Effect | References | Where | lg+, motion-safe | Phones and reduced motion | Dependency | When |
|---|---|---|---|---|---|---|
| Motion tokens, reduced-motion kill switch, 2-cycle pulse cap | MO1 (MDN) | `globals.css`: reaches NewsFeed and both frozen `loading.tsx` routes | Pulses run 2 cycles (4s), then rest | Every animation and transition runs in 1ms | CSS, 0 KB | **By Wed Oct 14** (PR M0) |
| Enter fade and rise, one primitive | MO2 (MDN `@starting-style`) | `.kyv-enter`, `.kyv-enter-fast` in `globals.css` | 200ms fade + 8px rise, or 120ms fade + 4px drop. Enter only. | Instant. Browsers without `@starting-style` show it instantly. | CSS (Baseline 2024), 0 KB | Any time |
| Donate dialog and cookie banner arrive | MO3 HelloFresh | `SitePrompts.tsx` | 200ms fade + 8px rise, backdrop 0→40% | Instant, as today | CSS, 0 KB | Any time (value low) |
| District panel opens | HM2 Amazon | `DistrictChip.tsx` | 120ms fade + 4px drop | Instant | CSS, 0 KB | Any time |
| District sheet (change in place) | HM4 Amazon Shopping | DistrictChip `<dialog>` | The centred dialog may fade in | No slide on phones (a 200ms slide-up only under D2 (b)) | Native `<dialog>` + CSS, 0 KB | With the ZIP-removal PR, or after Nov 4 |
| Message after Keep in mind, with Undo | CP9 NYTimes, CP10 The Weather Channel | One region in `layout.tsx` | 200ms opacity + 8px rise | Appears instantly. No auto-hide (WCAG 2.2.1). Nothing on the card moves. | CSS, 0 KB | After Nov 4 (D3) |
| Scroll-spy current item | RC6 Zillow, CP6 Mintlify, LF1 Dub | Race, candidate and methodology rails (lg only) | Border and text colour at 120ms | No rail below lg; `motion-reduce:transition-none` | IntersectionObserver island, no library | Frozen: by Oct 16 or after Nov 4 |
| Smooth anchor scroll | RC1, CP6, LF1 | `html` | `scroll-behavior: smooth` only under `no-preference` | Instant jump | CSS, 0 KB | With those items |
| Colour-only state changes | RC2 HoneyBook, RC7 Trip.com, NS5 CVS Health, MO6 Formula 1®, AD6 Alan, NS7 Substack, CP8 Telegram | Chips, tabs, rows | 120ms colour (the existing `transition-colors`) | Colour changes are allowed below lg; `motion-reduce:transition-none` | CSS, 0 KB | With each item |
| "Link copied" in the button | RS11 Tripadvisor, CP11 Microsoft Copilot | ShareLink | Label swap for 3s, colour at 120ms | Identical: a state change, not movement | None | RS11 any time; CP11 frozen |
| Lookup spinner | AD4 Vercel | LocationEntry | 1s linear, only while loading, stopped at 5s (WCAG 2.2.2) | A static glyph under reduced motion. Shown on phones, because it is feedback. | CSS `animate-spin`, 0 KB | With #4 |
| Static skeleton, quiet swap | NS4 TradingView | NewsFeed | Static (2 pulse cycles at most if kept). 120ms opacity on swap. | Static, instant swap | CSS, 0 KB | Any time |
| Sent state cross-fade | RS2 Langdock | VotingInfo | Optional 200ms opacity | None. Focus moving to the heading is the cue. | CSS, 0 KB | With #8 |
| Tab underline morph | MO10 Mobbin, on RC7's tabs | /candidates view tabs | 200ms morph of the 2px underline | Instant swap | React `<ViewTransition>` (vendored), 0 KB | After Nov 4, with MO9 |
| Section-nav indicator slide | MO11 Wix | SectionNav lg top bar | 200ms slide of the 16×2px bar | The bottom-nav indicator jumps, as today | React `<ViewTransition>`, 0 KB | After Nov 4, with MO10 |
| ViewTransition guard | MO9 (Next 16 guide) | `globals.css` + `scripts/verify-view-transitions.ts` | Root crossfade off. Only the two named morphs above are allowed. | Every group `animation: none` | 0 KB + one verify script | With MO10 and MO11, or not at all |
| Disclosure ease | MO12 Zip (the payments app), MO13 (MDN `::details-content`) | Methodology's two `<details>` only | 200ms opacity + height (height in Chromium only) | Instant open | CSS (Baseline 2025; `interpolate-size` Chromium only), 0 KB | After Nov 4 (frozen) |
| Listbox enter | MO8 Vimeo | LocationEntry suggestions | 120ms fade + 4px drop | Instant | CSS (MO2), 0 KB | Only with suggestions on; after Nov 4 |

**Static, by design.** MO7 Slite marks a jump's target with a still halo and a 3px bar. MO4 Gemini is a text swap ("District forgotten"). MO5 Nibble is a one-line note. AM5's 60% scale is never animated: a fill toward 60% would read as results coming in. Every caret (LF3, AM3, AD2, RC10) flips with no transition, matching home-readability §7. One frozen fix needs no reference: delete `RaceCompare.tsx:259`'s caret transition after Nov 4.

**Not used** (section 6 has the reasons): Motion (motion.dev), Motion Primitives, Magic UI, Animata, Aceternity UI, React Bits, cult-ui, tw-animate-css, CSS scroll-driven animations. Also ruled out: particles, text scramble and shimmer, marquees, parallax and scroll reveals, 3D tilt and spotlights, number tickers, staggered list entrances, springs and bounce, route slides, and dialogs that morph out of candidate cards.

---

## 1. Global chrome and home

SectionNav, SiteFooter, DistrictChip and CountyPicker, HomeMasthead, DeadlineBanner + KeyDatesRail, BallotAtAGlance, CoverageSummary, ReminderSignupCta + VotingInfo, InstallCard.

- Code read on `claude/registration-labels-calendar` at 4260eb9 (main 71db8fb plus the founder's 10-12 fixes). Nothing under `src/` or `public/` was edited.
- IDs keep the first catalog's (HM for home and chrome, RS for the reminder and install cards), so cross-references between sections still point at the right rows.
- Not repeated here: the home resources block and scroll rhythm in [`../home-readability-2026-10-12/home-readability.md`](../home-readability-2026-10-12/home-readability.md). HM1, HM8 and HM6 build on its PR A (A5 and A9), which merges by Wed Oct 14.
- Screenshots are in `img/`, which is gitignored because the repo is public. Every row keeps its Mobbin link.
- Frozen: none of these files is in `FROZEN_FILES`. **Adjacent** means the file also renders on a frozen page (LocationEntry and VotingInfo render inside YourRaces). An Adjacent change lands **before Oct 16 or after Nov 4**, unless a prop that defaults to today's behaviour leaves the frozen page rendering exactly as it does now.
- Colour and placement were never a reason to drop a reference here (founder, 10-12: both can change). Each Adaptation cell says what we change.

### Current weaknesses

Each line ends with the reference that fixes it, or says why none does.

- `KeyDatesRail.tsx:17-35, 74-76`: 'next' and 'later' stops differ only by dot border colour and label colour. The words 'next' and 'passed' are sr-only, so a sighted reader who can't tell the colours apart can't see which date is next (WCAG 1.4.1). Past stops are a filled grey dot with no check or other shape cue (`:22`, `:66`). **→ HM1 Airwallex.**
- `KeyDatesRail.tsx:53-55`: the phone column joins stops with separate 12px stubs above each dot, not one line. Once home A5 makes each row a single ~20px line, the stops will read as bullets, not a timeline. **→ HM8 Mercury.**
- `DistrictChip.tsx:126-131`: the chip reads 'FL-10 · Orange' with no word saying what it is. The aria-label starts with 'Your district', which isn't on screen (WCAG 2.5.3 Label in Name). **→ HM5 Too Good To Go.**
- `DistrictChip.tsx:134-162`: the 176px (`w-44`) panel holds two bare actions and never says what is stored or where, though the file's own comment calls the chip 'the disclosure'. **→ HM2 Amazon.**
- `DistrictChip.tsx:68-82`: the panel closes only on Escape or a second tap on the chip. Tapping outside does nothing, so on a phone it stays over the content. **→ HM2 Amazon.**
- `DistrictChip.tsx:104-110, 139-145`: 'Choose your district' and 'Change district' go to `/candidates?view=races&change=1`, so the voter loses the page they were reading. Once the field takes addresses only, that detour means typing a full street address on another page. **→ HM4 Amazon Shopping.**
- `SectionNav.tsx:81-91, 122`: the filled sage Donate pill is the only filled control in the phone top bar, on every page. It competes with each page's one primary action (design.md: one primary action per view). **→ No reference; a founder call (Gaps).**
- `SectionNav.tsx:118-124, 134`: the phone top bar has no brand mark or home link (the wordmark is hidden below md). Its only contents are Donate and the chip. **→ No reference (Gaps).**
- `SectionNav.tsx:146`: at md+ the nav keeps the phone tab shape (icon over a 13px caption, min-w 76px), so it reads as an app tab bar, not a site header. **→ No reference (Gaps).**
- `CountyPicker.tsx:19-33`: 'Pick your county:' is a muted `<p>`, not a fieldset and legend, so the four buttons aren't announced as a group. They have a hover state but no pressed state. With the location field address-only, CountyPicker is reached only from the out-of-coverage state ('Or browse a covered county', `LocationEntry.tsx:543-551`). There each button navigates away, so a pressed state matters less, but the fieldset and legend still apply. **→ No reference; the fix is standard markup.**
- `CountyPicker.tsx:102-113`: DistrictConfirm's 'Not sure?' help line is a 13px caption with a plain underline. DistrictConfirm is the 'which part of this ZIP' screen: it appears only when a typed ZIP spans two House districts ('Your ZIP spans more than one congressional district. Pick yours…', `:65-68`). An address resolves to one census block and so to exactly one district (`LocationEntry.tsx:31-39`). Once ZIP entry is removed, nothing reaches this screen. **→ Retires with the ZIP option. No change needed.**
- `HomeMasthead.tsx:50-59`: 13px white caption text on the ink strip. Election Day is stated here and again in the key-dates line just below (`DeadlineBanner.tsx:51-54`), so the same fact appears twice before the h1. **→ No reference (Gaps).**
- `DeadlineBanner.tsx:106-112`: the calendar link downloaded an .ics file without saying so. **→ Done in 4260eb9.** It now reads 'Add these dates to your calendar (downloads a file)', and VotingInfo's link matches.
- `CoverageSummary.tsx:129-141, 162`: 'Not covered' is one ~60-word sentence listing seven categories, so 'are judges covered?' can't be scanned. Every dd is on-surface-muted grey. **→ HM6 Monzo.**
- `ReminderSignupCta.tsx:78`: the intro is two long sentences and never says when the emails come, though the send days follow from `REMINDER_OFFSETS` (`src/lib/notifications/schedule.ts:15-32`). **→ RS4 Deepstash.**
- `ReminderSignupCta.tsx:80-82`: the four-county ZIP limit sits below the card, after the submit button, so a voter outside those counties reads the whole form before learning it. **→ The Legora entry (consent and scope hint) among the catalog's reminder-form entries. RS6 leaves that change to it.**
- `VotingInfo.tsx:115-137`: on success the whole Card is swapped for a bare three-sentence `<p>`. The border, padding and heading vanish, the layout jumps, and 'what happens next' is prose. **→ The Langdock entry (sent state). It reuses RS4's dated list, with Ro and Sana AI folded in (see Dropped).**
- `VotingInfo.tsx:143, 211`: the heading 'Get deadline reminders by email' and the button 'Email my voting info' don't match. The consent label (`:179-198`) runs consent and privacy terms into one ~40-word muted block. **→ RS6 Shopify for the matching words; Legora for the consent split.**
- `InstallCard.tsx:154-158, 83, 107-123`: the iOS instruction is one sentence ('tap the Share button') with no glyph, though Safari's Share icon has no label. The iOS check matches in-app browsers and misses iPadOS (Macintosh user agent). The dismiss target is exactly 24px, and the card gives no reason to install. **→ RS8 Cosmos (Orbit merged in).**
- `SiteFooter.tsx:24-29, 106-125`: no Contact or 'Report a mistake' link (`CONTACT_EMAIL` appears only on /about), though from Oct 18 the ballot pages take corrections only. All footer text is 13px muted caption. **→ HM7 The New Yorker.**
- `globals.css` has no global `prefers-reduced-motion` rule. **→ The site-wide motion entries (MO1), not this group.** HM2 and HM4 put their own motion behind `motion-safe:`, so they don't depend on MO1.

### References

| ID | App | Platform | Kind | Link | What it shows | Change to make | Adaptation | Motion | Frozen | Effort | Value |
|---|---|---|---|---|---|---|---|---|---|---|---|
| HM1 | Airwallex | web | screen | [Mobbin](https://mobbin.com/screens/5b2e67a8-ded8-496b-80f0-d2aa8ab4ae03) | A three-step tracker across a verification page. Done steps carry a check in a circle, the pending step is a hollow grey dot, and the joining line is green up to the current step. A small status word ('Completed', 'In review', 'Pending') sits under every label. | KeyDatesRail: show the state as a visible word ('Passed', 'Today', 'Next') and put a grey check inside past dots. Delete the sr-only span. State then reads by shape, word and colour. | None. | None. No animated fill and no pulsing 'today' dot. | No | S | high |
| HM8 | Mercury | ios | screen | [Mobbin](https://mobbin.com/screens/ec7b66ef-59c2-495b-9872-7f17f40c5c52) | A status card with a tight vertical tracker: small dots on one continuous line, coloured up to the current step and grey after it, ending in an arrow at the last step. | KeyDatesRail phone column: run each connector from the previous dot's centre to this dot's centre, so the stops read as one line after A5. Phone dots shrink to 12px. Ships in the same PR as HM1. | None. | None. | No | S | low |
| HM2 | Amazon | web | screen | [Mobbin](https://mobbin.com/screens/b50b0c5c-fc33-4586-ad28-00524dd058fc) | A small 'Choose your location' modal. One grey sentence says why location matters, the current value sits in a bordered row ('Deliver to 94025 Change'), and there is one 'Done' button and a close X. | DistrictChip panel: 288px wide. It names the district and county, says in one sentence what the cookie does and that it stays in this browser, then offers 'Change district' and 'Forget my district' at 40px. It closes on an outside tap as well as Escape. | None. | lg+ and motion-safe only: 120ms fade with a 4px drop on open (`@starting-style`). Instant on phones and under reduced motion; no exit animation. | No | S | high |
| HM5 | Too Good To Go | ios | screen | [Mobbin](https://mobbin.com/screens/8de18ab2-04b7-4127-87e6-4781495654f5) | A Discover feed's location row: map-pin icon, a bold category word, the place in grey, a caret. The control says both what it is and its value. | DistrictChip label: a pin glyph before the value, and 'District FL-10 · Orange' from sm. The accessible name starts with the visible words. The chip and 'Choose your district' become 32px tall. | None. | None. | No | S | medium |
| HM4 | Amazon Shopping | ios | flow | [Mobbin](https://mobbin.com/flows/02faba3c-6abd-4587-91de-a46a399dd7f5) | A pin chip ('90034 ⌄') opens a bottom sheet over the dimmed page with one field and 'Apply'. The sheet closes and the same chip shows the new value. The page never navigates away. | 'Change district' and 'Choose your district' open a native `<dialog>` holding LocationEntry. On commit it closes and the page refreshes in place. The href stays for JS-off, middle-click and new tabs. | The field asks for a street address, not a ZIP (founder 10-12). Our sage primary button, not Amazon's yellow. No 'Use current location'. No slide on phones. LocationEntry gets one optional prop whose default keeps YourRaces unchanged. | Phones: none; the sheet appears in place. lg+: the centred dialog may fade in, motion-safe. A 200ms slide-up on phones only if decision D2 (b) is chosen. Always instant under reduced motion. | Adjacent: before Oct 16 or after Nov 4 | L | high |
| HM6 | Monzo | ios | screen | [Mobbin](https://mobbin.com/screens/fb745d43-b066-43d1-8289-0fde83eed7fb) | The 'What's covered' tab of an insurance quote. Each exclusion is its own card with a bold title and one plain sentence, then a 'More info' card of document rows. | CoverageSummary: split the 'Not covered' sentence into a two-column list of named categories, in /methodology#not-covered's order. Raise dd text from muted to on-surface. Every pinned needle stays verbatim. | None (no icon per item). | None. | No | S | medium |
| HM7 | The New Yorker | web | section | [Mobbin](https://mobbin.com/sites/sections/051eb1f2-7ee6-4526-937b-f2aa4998497d) | A quiet centred footer on cream: copyright, one row of plain links (Contact Us, FAQs, Terms, Privacy and more), and a last line telling screen-reader users how to reach a person. | SiteFooter: add 'Report a mistake' (a mailto with a fixed subject) and 'Contact', plus one accessibility-help line that renders `CONTACT_EMAIL`. Footer text and links go to 14px, with 24px targets. | None. | None. | No, but merge by Fri Oct 16 so it is live before Oct 18 04:00 UTC | S | high |
| RS4 | Deepstash | ios | screen | [Mobbin](https://mobbin.com/screens/a276b33b-25f4-4af8-a600-4813a2501089) | 'How your free trial works': four steps on a vertical line. The done step is checked, the current step is bold blue, and later steps are grey with one sentence each. | Home reminder card: replace the intro with a dated list of the sends this voter would get ('Right away: …', 'October 21: …'). A pure `upcomingSends()` helper builds it from `REMINDER_OFFSETS`, and the verify script walks that helper day by day. | Dates are stated, never 'Day 5' or 'in N days'. A plain list with no dots or connector, so it doesn't read as a second key-dates rail. | None. | No (home only; VotingInfo's new prop is unused in YourRaces) | M | high |
| RS6 | Shopify | web | section | [Mobbin](https://mobbin.com/sites/sections/612323f8-6fff-4972-b018-da55fb8c9c3c) | A newsletter card split in two: a grey value panel with a line-drawn envelope and a headline, and a white form panel with field, button and a two-line consent note. | VotingInfo, lg only: a value pane on the left (heading and the RS4 list) and a form pane on the right (fields, consent, one button, calendar link). Heading and button say the same thing. Nothing changes below lg. | Our tokens: a surface-muted pane and the sage button. Our envelope sticker instead of Shopify's drawing. Fields stack, because the column is ~690px. The scope hint stays with Legora. | None. | No if tied to RS4's prop; otherwise Adjacent: before Oct 16 or after Nov 4 | M | medium |
| RS8 | Cosmos | ios | screen | [Mobbin](https://mobbin.com/screens/6e58948b-0dd3-4b55-a121-91b158b2b7b3) | 'Add Extension': a light preview of the iOS share sheet, numbered steps with grey circled numerals, and one black 'Open share sheet' button. | InstallCard iOS path: two numbered steps with Share and Add glyphs, shown in Safari only, with iPadOS detected. Add a 36px dismiss, a visible 'Not now', one honest benefit line and a correct 'added' message. | No 'Open share sheet' button: `navigator.share()` doesn't offer Add to Home Screen. | None. | No | S | medium |

### Build notes

- **HM1 Airwallex** (KeyDatesRail in DeadlineBanner, home key-dates card). Build on home PR A's A5 and merge by Fri Oct 16, so it is live before early voting opens Oct 19.
  - Make `STATE_WORDS` visible as `text-body-sm` after the date: 'Passed' in `text-on-surface-muted`, 'Today' in `text-accent-strong`, 'Next' in `text-primary font-semibold`, and nothing for 'later'.
  - Keep today's rules that skip a word the label already says: state 'open' keeps its ': open now' label, and so does the stop whose key is 'today'.
  - Phone column: add the word to A5's one line (' · Next'). From sm it goes on its own line under the date. Delete the sr-only span (`:74-76`).
  - Past dot (`:64-67`): put `<CheckGlyph/>` from Glyphs.tsx inside the filled on-surface-muted dot, in `text-surface` at `text-[10px]`. Next keeps its hollow primary ring and later its hollow border-strong ring.
  - The check stays grey, never success green, which would echo the 'Accurate' verdict colour. No pulse and no animated fill. Dates are stated, never 'in N days'.
- **HM8 Mercury** (KeyDatesRail phone column, extends A5). Ship it in the same PR as HM1, after A5.
  - Keep a segment per stop, because each segment carries one of the two colours (on-surface-muted up to the reader's stop, border-strong after).
  - Run each segment from the previous dot's centre to this dot's centre. Measure the A5 row height and set `before:top` and `before:h` from it, in place of the fixed `before:top-[-12px] before:h-3`.
  - Phone dots become `size-3` (12px) at `left-[5px]` on the line. From sm keep `size-4` and today's horizontal segments. The today/open dot keeps `ring-4`.
- **HM2 Amazon** (DistrictChip panel, `:134-162`). Chrome on every page and not in `FROZEN_FILES`, so it can ship any time, ideally before Oct 18.
  - Panel classes: `absolute right-0 z-50 mt-1 flex w-[288px] max-w-[calc(100vw-32px)] flex-col gap-3 rounded-lg border border-border-strong bg-surface p-4 shadow-elevation-2`.
  - Row 1, `text-label`: 'FL-10 · Orange County'.
  - Row 2, `text-body-sm text-on-surface`: one sentence on what the cookie does and that it stays in this browser. Reuse /privacy's `kyv.district` wording rather than writing new copy (`verify-no-stored-location` pins /privacy).
  - Row 3: 'Change district' as a Link styled `button-secondary`, and 'Forget my district' as an underlined text button, each `min-h-[40px]`. When HM4 lands, 'Change district' opens HM4's dialog instead of navigating.
  - In the effect at `:68-82`, add a document `pointerdown` listener that closes the panel when the target is outside `wrapperRef`.
  - Keep it a button with `aria-expanded`, never `role=menu`. The panel names only the voter's own district and never suggests or preselects one.
  - Motion: lg+ with `prefers-reduced-motion: no-preference` only. A 120ms opacity 0→1 and translate 0 -4px→0 on `@starting-style`, `motion.fast` on the standard easing. Instant on phones. No exit animation.
- **HM5 Too Good To Go** (DistrictChip visible label, `:126-131` and `:104-110`). Not frozen.
  - Add a `MapPinGlyph` to Glyphs.tsx in its idiom: 20-unit grid, `currentColor`, 1.75 stroke, `aria-hidden`. It sits in `text-on-surface-muted` before the value.
  - Visible text: 'FL-10 · Orange' below sm and 'District FL-10 · Orange' from sm.
  - Replace the aria-label with sr-only text, so the accessible name starts with what is on screen. Below sm add an sr-only 'District ' before the value, and at every width add an sr-only ' County. Change or forget it.' after it.
  - Put the same pin on the 'Choose your district' link. Raise both to `min-h-[32px]`.
  - Check at 320px that the chip and Donate both fit the bar: about 216px is left after Donate. The pin is never a party hue, and there is no location-permission prompt.
- **HM4 Amazon Shopping** (DistrictChip change or choose in place). Frozen-adjacent, because LocationEntry renders on YourRaces: merge by Oct 16 or after Nov 4, ideally in the same PR that removes ZIP entry.
  - 'Change district' (and the 'Choose your district' link) opens a native `<dialog>` with `showModal()`. That gives a focus trap, Escape and an inert background without a library.
  - Inside: an h2 'Your district', a 44px close button, and `<LocationEntry onCommitted={() => { dialog.close(); router.refresh(); }} />`.
  - The new optional prop replaces `commit()`'s `router.push` only when it is passed. `commit()` is the one save path for an address, a ZIP and the 'or choose your district' picker (`LocationEntry.tsx:298, 343, 608`), so one prop covers all three.
  - Keep the href for JS-off, middle-click and new tabs. At lg, centre the same dialog at `max-w-[480px]`.
  - An address in Florida outside the four counties still goes to the statewide ballot and saves nothing (`:291`). The out-of-coverage CountyPicker still navigates (`:548`). Both are right: there is no district to show in place.
  - Writer's change: the proposal said 'a split block still shows DistrictConfirm'. There is no split block. An address resolves to one census block and so to one district (`LocationEntry.tsx:31-39`), so the address-only sheet never shows DistrictConfirm. If HM4 lands before ZIP entry is removed, a typed split ZIP still shows DistrictConfirm inside the sheet, and that works unchanged.
  - Don't copy Amazon's 'Use current location': geolocation is new data collection that /privacy doesn't cover. Nothing new is stored beyond the existing district cookie.
  - Motion follows decision D2. Under (a), the recommended option, the sheet appears with no slide on phones, and at lg the centred dialog may fade in, motion-safe. Under (b), phones may get a 200ms `translateY(100%→0)` slide-up, motion-safe, with the backdrop fading in over 120ms or not at all. Reduced motion is always instant.
- **HM6 Monzo** (CoverageSummary 'Not covered' row). Not frozen. Build after home PR A, whose A9 edits the same file.
  - Replace the sentence with `<ul className='grid gap-x-5 gap-y-2 sm:grid-cols-2'>`. One item per category, in /methodology#not-covered's order: a `text-label` name plus a `text-body-sm text-on-surface` clause.
  - Keep every `verify-home-coverage` needle verbatim: 'Florida House', 'Florida Senate', lowercase 'judges', 'city races', 'soil and water', 'community development'.
  - Keep A9's linked 'official sample ballot' sentence. Give 'What we don't cover' `inline-flex min-h-[24px] items-center`.
  - In Row (`:162`), change the dd from `text-on-surface-muted` to `text-on-surface`. No icon per item, since icons could read as verdicts.
  - Change the methodology list order only together with this list. Methodology is frozen from Oct 18, so a reorder lands before Oct 16 or after Nov 4.
- **HM7 The New Yorker** (SiteFooter). Not frozen. Merge by Fri Oct 16 so it is live for the whole freeze.
  - Add 'Report a mistake' as a plain `<a href={`mailto:${CONTACT_EMAIL}?subject=Correction`}>`, not `next/link`. Give `FOOTER_LINKS` an `external` flag for it.
  - Add 'Contact', linking to /about's 'Get in touch' section.
  - Import `CONTACT_EMAIL` from `src/lib/contact.ts`. That file is frozen: import it, never edit it.
  - Under the disclaimer (`:106-108`), add one `text-body-sm` line that renders the constant: 'Trouble using this site with a screen reader or keyboard? Email {CONTACT_EMAIL}.' Never hard-code the address.
  - Raise the disclaimer and links from `text-caption` to `text-body-sm`, with links `inline-flex min-h-[24px] items-center`. The mailto carries a fixed subject and no user data.
  - Writer's change: value is high, not medium. From Oct 18, corrections are the only way the ballot pages can change, and this is the only route to report one from every page.
- **RS4 Deepstash** (ReminderSignupCta and VotingInfo intro). Home only, so frozen YourRaces is unchanged.
  - Add an optional `schedule?: ReactNode` prop to VotingInfo and render it in place of the intro. Only ReminderSignupCta passes it, and only when `promoteReminders` is on.
  - Add a pure helper `upcomingSends(events, today, countyFips?)` to `schedule.ts`, built from `REMINDER_OFFSETS` and the verified events. Walk it day by day in `verify-reminder-schedule`, so the list can't promise a send the cron won't make.
  - Render it as `<ol aria-label='When we email you' className='flex flex-col gap-1 text-body-sm text-on-surface'>`. Row 1: 'Right away: where to vote and the key dates'. Then one row per remaining send, as a stated date plus its subject, for example 'October 21: the mail-ballot request deadline is the next day'.
  - Registration closed Oct 5, so from today the remaining sends are Oct 21 (mail-ballot request), the day early voting opens, Oct 27 and Nov 2 (ballot return) and Nov 3 (Election Day).
  - With no saved county, if the four counties' `early_voting_start` dates differ, that row reads 'The day early voting opens in your county', with no date. Drop any send dated before today.
  - Plain list: no dots or connector. Never 'in N days', 'Day 5' or 'tomorrow'.
- **RS6 Shopify** (ReminderSignupCta + VotingInfo layout at lg).
  - In VotingInfo's Card (form branch), at lg only: `lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:p-0`.
  - Left pane (`lg:bg-surface-muted lg:rounded-l-lg p-5`): the heading and RS4's dated list.
  - Right pane (`p-5`): the fields stacked (`flex-col`, even at lg), the consent, one primary button and the calendar link. Make the heading (`:143`) and the button (`:211`) say the same thing.
  - Below lg, nothing changes. In ReminderSignupCta, check that the corner sunburst still sits in its text-free strip.
  - Writer's change: apply the split only when `schedule` is passed (RS4's prop), so YourRaces renders unchanged and this isn't tied to the freeze. If it is applied unconditionally, it is Adjacent: before Oct 16 or after Nov 4.
  - If the reminder form also loses its ZIP field (see Gaps), the right pane is just email, consent and the button.
- **RS8 Cosmos** (InstallCard iOS path). Home only, not frozen. Orbit's points (benefit line, 'Not now', install outcome) are merged in here.
  - Replace `:154-158` with `<ol className='mt-2 flex flex-col gap-2 text-body-sm text-on-surface'>` of two rows. Each starts with a 24px numeral circle (`rounded-full bg-surface-muted text-label`): '1 Tap Share [ShareGlyph] in Safari's toolbar' and '2 Choose Add to Home Screen [AddSquareGlyph]'.
  - Add `ShareGlyph` and `AddSquareGlyph` to Glyphs.tsx in its idiom. Add no fake 'Open share sheet' button.
  - Detection (`:83`): iOS means `/iPad|iPhone|iPod/`, or Macintosh with `navigator.maxTouchPoints > 1`. Show the steps only in Safari, meaning the user agent doesn't match `/CriOS|FxiOS|EdgiOS|GSA|FBAN|FBAV|Instagram/`. Otherwise return null.
  - Dismiss (`:107-123`): `p-2.5` (36px) with aria-label 'Dismiss Get the app'. Add a visible 'Not now' text button (`min-h-[24px]`) beside Install.
  - In `install()` (`:97-103`): when `userChoice.outcome` is 'accepted', the stand-in reads 'Know Your Vote was added to your home screen'.
  - One honest benefit line: 'Opens Know Your Vote in one tap. No app store, no account.' Make no offline or alert claims, because no service worker ships. The badge sticker stays the only art.

### Gaps

- **Reminder form ZIP.** The 10-12 decision makes the *location* field address-only. The reminder form (VotingInfo) still asks for a ZIP, which it uses to pick the county's dates (it posts `{ zip, email, consent }`). Whether that field goes too is decision D4. RS4 and RS6 work either way: without a county, the early-voting row reads 'The day early voting opens in your county'.
- **Before JavaScript loads.** LocationEntry accepts only five digits until it hydrates (home-readability §9 item 11), so a typed address never rides in a GET URL. Whoever removes ZIP entry has to decide what that field does before JavaScript loads. HM4's sheet needs JavaScript anyway, and its href fallback lands on that same field.
- **Split-ZIP picker.** Nothing on Mobbin showed 'confirm which part of a split area you live in'. With address-only entry the screen retires (an address names one district), so this gap no longer needs filling. CountyPicker's fieldset and legend fix needs no reference.
- **Bottom tab bars.** The 2025-26 iOS results (CLEAR, Waymo, Fresha, Truecaller) are floating 'liquid glass' pills. Our docked three-tab bar, with its primary-muted active fill, already has the useful part, and nothing shown improves it under our rules.
- **Desktop header.** Every 'text links + location control' result was marketing chrome (Mintlify, komoot, Ditto, Greptile). None was a calm information-site header to replace the icon-over-label desktop tabs (`SectionNav.tsx:146`) with text links. The fix is standard, but Mobbin has no strong source for it.
- **Donate pill and phone home link.** No reference settles either. The Donate pill's weight and the missing home link in the phone bar need a founder call, not a pattern.
- **Masthead and dateline.** The only dateline found was the NYTimes widget ('Today · wordmark · April 26' between hairline rules). It is too thin to argue against the dark ink strip approved on 10-11, so the 13px caption and the repeated Election Day have no reference.
- **Horizontal key-date timelines.** Every one in a website section was a company history (PayPal, Wise, Apollo, HubSpot, Grok): decorative, and silent on a date's state. Only product steppers (Airwallex, Mercor, Zillow) were usable.
- **Motion.** Mobbin flows show still steps only, with no timing, easing or reduced-motion behaviour. Every motion note here comes from design.md's tokens (120, 200 and 320ms on cubic-bezier(0.2,0,0,1)), not from a reference.
- **Notification schedules with stated dates.** Every 'what you'll get' timeline found counts relative days ('Day 5', '2-3 days'). RS4's date-stated version is our own adaptation.
- **BallotAtAGlance.** No reference is needed. Home PR A replaces its count tiles with the 'On this page' jump list, and it lists races, so no art and no motion go near it.

### Dropped and why

Neither was dropped for colour or placement. Both are duplicates of an entry that is kept.

- **Ro** ([Mobbin](https://mobbin.com/screens/d3182fbb-9ba1-4882-a4a1-9abf5ffb99fc)): a 'What's next' list with a done step and timing eyebrows. Its colour and relative timing could have been adapted (stated dates in place of 'within 2-3 days', no glowing dot). What remains is a done step at the top of a dated list inside the confirmation, and that is already the Langdock confirmation reusing RS4's list. **Folded into Langdock:** VotingInfo's sent state reuses RS4's list with the first row checked, 'Sent: where to vote and the key dates'.
- **Sana AI** ([Mobbin](https://mobbin.com/flows/728d6145-a34e-4cb8-8baf-c35cead6cdfd)): a footer newsletter whose field is replaced in place by 'Thanks for signing up!'. Its one structural point is to keep the Card and h2 mounted and swap only the body, and that already lives in the Langdock entry. Its only extra is a crossfade, which is decorative motion. **Folded into Langdock:** VotingInfo keeps `<Card>` and its heading mounted in the sent state, swaps only the body, and moves focus to the new heading.

Parts of kept references we don't copy:

- **Amazon's and Instacart's 'Use current location'** (HM4): geolocation is new data collection that /privacy doesn't cover.
- **Cosmos's 'Open share sheet' button** (RS8): `navigator.share()` doesn't offer Add to Home Screen.
- **Deepstash's 'Day 5' and 'Day 7'** (RS4): dates are stated, never counted.
- **Airwallex's green progress line and any animated fill or pulse** (HM1): the check stays grey, and a looping pulse falls under WCAG 2.2.2.
- **Offline or notification claims on the install card** (RS8): no service worker ships.

---

## 2. Race browsing and comparison

Pages and components: /candidates (`CandidateBrowser`, `YourRaces`, `IssueFilter`, the view tabs in `candidates/page.tsx`), /races/[raceId] (`RaceHeader`, `RaceCompare`, `IssueSection`, `IssueRows`), /races/[raceId]/issues, `RaceListing`, `CountyRaces`, `SharedBallot`.

- **Freeze.** Every file in this group is in `scripts/freeze-manifest.ts` `FROZEN_FILES` except `src/app/(public)/candidates/page.tsx` and `globals.css`. Frozen items land **before Oct 16 or after Nov 4**.
- **Review result for this group.** 10 references kept, 1 merged (Pinterest's zero-result links into RC8 Google Drive), 1 dropped for good. IDs match the first catalog pass (RC1 to RC11; RC9 is the merged Pinterest).
- **Colour and placement didn't count against a reference** (founder, 2026-10-12). Colours and placement can be changed. If a reference's colour, highlighted column or position broke a rule, it was kept and that one part was swapped for our tokens or layout (see the Adaptation column). The one drop is a structural problem that can't be adapted.
- Line numbers were checked against `claude/registration-labels-calendar` at 4260eb9. No new Mobbin searches were run in this pass. All 10 kept screenshots are in `img/`, which is gitignored.
- **Already decided, not raised again:** the address-only location field (none of these references touches it), "Registration closed <date>" (already built, see the last weakness below), no empty covered race (a separate session is fixing that; nothing here designs a "no race yet" state).

### Current weaknesses

- `RaceCompare.tsx:65-67` (and `RaceListing.tsx:163-164`, `IssueRows.tsx:21`): `--cols` is capped at 3 and the grid wraps. FL-GOV's 8 candidates render every issue row as 3+3+2, and a 7-candidate race would leave the 7th candidate alone on a third line, so the promise that "an issue reads across" breaks above 3 candidates.
- `RaceCompare.tsx:183-208`: below md, each issue row is N separate bordered cards (p-4 + border + gap-4, about 50px of chrome per candidate plus a repeated name heading). On FL-GOV that is about 400px of chrome per issue on a phone. At md and up, `items-start` gives the cards ragged bottoms, so a row doesn't read as a row.
- `races/[raceId]/page.tsx:163-167` with `RaceCompare.tsx:95-157`: the only control above the roster is IssueFilter, and its chips go to a different route (/issues). There is no in-page jump to an issue row, even though every row already has `id="issue-<subIssueId>"` (`:165`), and the roster has `#whos-running` and `#other-issues`. On a phone, the 8-card roster with photos sits between the chips and the first issue.
- `RaceCompare.tsx:160` with `ClaimList.tsx:122-135`: `NoStatedPositionNote` explains "No stated position found" once, above the first row. Lower rows show the bare phrase after its explanation has scrolled out of view.
- `IssueFilter.tsx:20-58`: nothing says what is shown (no "Showing 2 of 9 issues"). "Show everything" appears only after a pick, at the end of the row, so the default all-issues state has no visibly selected option.
- `IssueRows.tsx:12-28`: the filtered page's cells drift from the race page's: no `bg-surface` (transparent on sand), `text-h3` names instead of `text-label`, `gap-5` instead of `gap-4`. The layout visibly shifts when a voter filters.
- `candidates/page.tsx:90-108` (not frozen): the view tabs (Browse candidates / Your races / Keeping in mind) are `rounded-full` pills in the same colours as IssueFilter's chips, so switching a view and applying a filter look alike.
- `CandidateBrowser.tsx:53-109`: below sm, the search box, two selects and the button stack into four full-width rows (about 230px) before any result. After a search, nothing lists the applied filters with one-tap removal.
- `CandidateBrowser.tsx:134-240`: about 126 candidates in about 53 race groups, with no index, and the race `<section>`s have no ids.
- `CandidateBrowser.tsx:116`, `CountyRaces.tsx:90`, `CountyRaces.tsx:122`: the result-count line, the county caption and the "won't be printed" note are 13px `text-caption`, below design.md's 14px floor for text a voter must read.
- `YourRaces.tsx:268-288`: the main list of printed races has no heading, while the sections after it (Not on your ballot, County races, ballot questions) have one, so heading navigation skips the voter's own races.
- `YourRaces.tsx:311-328`, `CountyRaces.tsx:127-144`: decided seats are a plain `<ul>` of inline text links, laid out differently from the LinkRow lists above them, with targets only one line of text tall.
- `CandidateBrowser.tsx:214-233` (no reference needed, direct fix): the card footer's "Read their brief" link has no `min-h-[24px]`, and the footer wraps with `gap-y-1` (4px). At 320px, wrapped targets can sit closer than 24px apart. Fix in the RC8 PR: `inline-flex min-h-[24px] items-center` on the link and `gap-y-2` on the footer.
- `RaceHeader.tsx:21-30`: **done in 4260eb9** (founder decision). The line now reads "Registration closed <date>" from the day after the deadline, using Florida's calendar day. No live race stores `key_dates.registration_deadline` (`{}` on all 53), so nothing shows on screen until a date is added. The founder's message said "August 5th", but Florida's book-closing date for the Nov 3 general was Oct 5, so confirm the date before anyone enters one.
- `SharedBallot.tsx`: nothing was found that a Mobbin pattern would improve.

### References

| ID | App | Platform | Kind | Link | What it shows | Change to make | Adaptation | Motion | Frozen | Effort | Value |
|---|---|---|---|---|---|---|---|---|---|---|---|
| RC1 | Tailscale | web | section | [Mobbin](https://mobbin.com/sites/sections/3ab0526b-1aff-4a84-9a6d-ef7faceb5a3b) | 'Compare all plans' with a 'Scroll to' bar of section names above the table. The bar jumps to sections. It does not filter. | Add a 'Jump to:' row of plain underlined text links above the roster: #whos-running, each #issue-<subIssueId> in row order, then #other-issues. | None needed. Text links, not pills, so they can't be confused with IssueFilter's chips. | Anchor jumps only. Smooth scroll only under no-preference. | Yes | S | high |
| RC2 | HoneyBook | web | flow | [Mobbin](https://mobbin.com/flows/722339a9-cb3d-4844-8929-1712d1ae0b17) | A 'Filter:' label before pills. Picking one turns the count line into a sentence naming the filter. With no match: a plain message and 'Reset filtering'. | Add 'All issues' as a permanent first chip (aria-current when nothing is picked), delete the trailing 'Show everything', and add a line under the chips: 'Showing all 9 issues.' / 'Showing 2 of 9 issues: Housing and Property taxes.' | None needed. It counts issues, never candidates or positions. | Chip fill: the existing transition-colors at 120ms, with motion-reduce:transition-none. | Yes | S | high |
| RC3 | Target | ios | screen | [Mobbin](https://mobbin.com/screens/92d8ed1b-5aab-457e-b154-48d178b6eb68) | 'Compare items': each attribute is one rounded group with a grey label band and the values beneath, split by hairlines. [Full flow](https://mobbin.com/flows/8b4bc165-6ace-41eb-ab0d-41f48896bee1) | Below md, render each issue as one rounded bg-surface group with one divide-y row per candidate in ballot order, instead of N bordered cards. Use the same markup in IssueRows and fix its drift there. | Target's pinned two-item header and collapsible chevrons are left out. Every candidate gets the same row. | None. | Yes | M | high |
| RC4 | Craft | web | section | [Mobbin](https://mobbin.com/sites/sections/cf4ba7be-d5c1-4cac-9032-75a24cd38c05) | 'Compare Plans & Features': four plan names as a plain, equal header, grey group bands, hairline row dividers, every cell sharing the same top and bottom edge. | At md and up, drop items-start so cells in a visual row stretch to equal height. Replace the 3-column cap with one columnsFor(count) in race-rows.ts: 4 → 2 then 4 at xl; 5-6 → 3; 7-8 → 3 then 4 at xl. | Only the shared-edge grid is borrowed. Craft's dashes, checks and blue ticks become our words ('No stated position found.'). Each cell keeps its own border, so there is no grey gap-px hole. | None. | Yes | M | high |
| RC5 | Fitbit | ios | screen | [Mobbin](https://mobbin.com/screens/15469c29-ea84-4ada-bb68-416de55d4714) | Each section header has a 'Learn more' link. Rows with no reading say 'No data' at the same size and weight as rows that have one. | In every issue row's heading line, a right-aligned 'Why a position can be missed' link to /methodology#limits at text-body-sm, on every row. | Shown on every row, not only rows with an empty cell, so it never hints at who is silent. | None. | Yes | S | medium |
| RC6 | Zillow | web | screen | [Mobbin](https://mobbin.com/screens/0acd2b7b-541a-47bc-ba60-0caa589603a4) | A listing detail panel with a fixed tab row (Overview, Facts & features…). The active tab is underlined while the sections scroll beneath. | At lg and up only, make RC1's row sticky under the bar and mark the issue in view with aria-current='location' and a 2px primary underline. | Zillow's blue becomes our border-primary. Anchors stay clear by growing the root scroll-padding-top on pages with the bar, not with scroll-mt. Phones keep RC1's static row. | lg and up only: underline colour in 120ms, motion-reduce:transition-none. Nothing slides. | Yes | M | medium |
| RC7 | Trip.com | ios | screen | [Mobbin](https://mobbin.com/screens/71d2d386-1fdb-4be3-9b8e-141171e99033) | Two tiers: underline tabs on top (the active one coloured and underlined), small outlined filter chips beneath. | Turn the three /candidates view links into an underline tab bar. Rounded-full stays the shape for filters only. | Trip.com's blue becomes our primary tokens. | Underline and text colour in 120ms, motion-reduce:transition-none. No sliding indicator. | No | S | medium |
| RC8 | Google Drive | web | screen | [Mobbin](https://mobbin.com/screens/9b4f10d3-3c94-40fe-8d39-9d55c5f702da) | 'Search results': one row of filter chips (the active one filled, with an x), a 'Clear filters' button and a plain empty state. | Below sm, put the two selects side by side. After a search, show each applied filter as a GET link that removes it, plus 'Clear all', above the result line and under the zero-results sentences. Raise the result line to 14px. | Absorbs Pinterest's zero-result links (RC9). There is no sort control, so ballot order is untouched. | None (plain page loads). | Yes | M | high |
| RC10 | Superpower | web | section | [Mobbin](https://mobbin.com/sites/sections/c807212f-5d27-47ba-b142-4f7840875e69) | A left column with a title and a quiet index list. The right column has grouped lists, each a heading over hairline rows. | Give each race section an id, and add one native details 'Jump to a race' above the results at every width, grouped Statewide / U.S. House / each county in directory.ts's office order. | Superpower's sticky side rail is left out: with 53 links it would need its own inner scroll. | None (anchor jumps). The caret rotates with no transition. | Yes | M | medium |
| RC11 | Starling | ios | screen | [Mobbin](https://mobbin.com/screens/483dad80-d590-42a3-9c6d-9d1f726b3107) | Muted group labels, each over one white rounded list with hairlines. Rows have a bold title, a muted second line and a chevron. | Use heading + LinkRowList + footnote for every group: add the missing h2 above the printed list, turn decided-seat links into full LinkRow rows, and move the 13px captions to 14px footnotes. | None needed. No party anywhere. | None beyond LinkRow's existing hover background. | Yes | S | medium |

### Build notes

- **RC1 Tailscale** (`img/tailscale-DGknzu8r.webp`). Page: /races/[raceId]. Need: jump to an issue row without leaving the page. FROZEN, before Oct 16 or after Nov 4. In `RaceCompare.tsx`, which already computes `rows` (or in `page.tsx` via `raceRows(brief)`), render `<nav aria-label="Issues on this page">` above the roster: "Jump to:" then plain text links to `#whos-running`, each `#issue-<subIssueId>` in row order, and `#other-issues` when `anyExtras`. Link classes: `inline-flex min-h-[24px] items-center gap-1 text-body-sm text-primary underline underline-offset-2`, plus the `ArrowDownGlyph` that home PR A adds to `Glyphs.tsx` (the same in-page cue as home's "On this page"). Let it wrap freely. No counts, no "most discussed", no JavaScript. Root scroll-padding (`globals.css:154-161`) already clears the bars, so add no `scroll-mt-*`.
  - Neutrality: low risk. The issues are race-wide, in spine order, and the same for every candidate. Never add per-issue counts of positions.
- **RC2 HoneyBook** (`img/honeybook-03RJ5a86.webp`). Page: IssueFilter on the race page and on /races/[raceId]/issues. Need: filter chips that say in words what is shown, with a clear "all" state. FROZEN, before Oct 16 or after Nov 4. `IssueFilter.tsx`: add a first chip "All issues" (`pickHref(raceId, [])`) with the same chip classes, `aria-current="true"` and `CheckGlyph` when `selected.length === 0`. Delete the trailing "Show everything" (`:49-58`). Under the `<ul>`, add `<p className="text-body-sm text-on-surface-muted">` reading "Showing all 9 issues." on the race page, or "Showing 2 of 9 issues: Housing and Property taxes." on /issues, with titles joined the way the page metadata joins them. Don't add `role="status"`: each change is a full page load. Chips stay GET links. Add `motion-reduce:transition-none` and `duration-[120ms]` to the existing `transition-colors`.
  - Neutrality: low risk. Count issues, never candidates ("3 candidates speak to Housing" would score coverage).
- **RC3 Target** (`img/target-bFFu82FY.webp`). Page: RaceCompare issue rows and IssueRows, below md. Need: compare N candidates on one issue on a phone with equal weight and less chrome. FROZEN, before Oct 16 or after Nov 4. Change `RaceCompare.tsx:183-208`. Container: `flex flex-col divide-y divide-border rounded-lg border border-border bg-surface md:grid md:gap-4 md:divide-y-0 md:border-0 md:bg-transparent`, plus RC4's column classes. Each `<article>`: `flex flex-col gap-2 px-4 py-3 md:rounded-lg md:border md:border-border md:bg-surface md:p-4`, with the name as a `text-label` link, then `IssueBuckets compact` or the existing fallback. The issue h2 and policy chips stay above the group. Put the same markup in `IssueRows.tsx` (a shared class constant, or one small component both files import) and fix its drift there: `bg-surface`, `text-label` names, `gap-4`. Never collapse an issue, pin a pair or reorder. Re-measure FL-GOV at 375px.
  - Neutrality: low risk, as long as every candidate gets the same row component and padding, in ballot order.
- **RC4 Craft** (`img/craft-kPSyMm5w.webp`). Page: RaceCompare issue rows at md and up, plus RaceListing's and IssueRows' column rule. Need: equal-weight columns that read across as one row, for races with 4 to 8 candidates. FROZEN, before Oct 16 or after Nov 4. Remove `items-start` at `RaceCompare.tsx:183` so every cell in a visual row stretches to the row's height. Keep each cell's own border, not `gap-px bg-border`, which would show a grey hole wherever 5 or 7 candidates leave an empty trailing cell. Replace `Math.min(count, 3)` (`RaceCompare.tsx:65`, `RaceListing.tsx:163`, `IssueRows.tsx:21`) with one pure `columnsFor(count)` in `src/lib/race-rows.ts` (frozen) that returns `{ md, xl }`: 1-3 → that many; 4 → md 2, xl 4; 5-6 → 3, 3; 7-8 → 3, 4. Set `--cols-md` and `--cols-xl` and use `md:grid-cols-[repeat(var(--cols-md),minmax(0,1fr))] xl:grid-cols-[repeat(var(--cols-xl),minmax(0,1fr))]`. Pin `columnsFor` in a verify script. Keep the name in every cell and the words "No stated position found.", never a dash. Between md and xl, 7 and 8 candidates still wrap 3+3+1 and 3+3+2. Because the cells stretch to shared edges, those wrapped lines still read as rows. Check at 768px whether 4 columns hold before you change md.
  - Neutrality: medium risk if copied literally. Copy only the shared-edge grid. Every column gets the same width, background and type.
- **RC5 Fitbit** (`img/fitbit-8W3pPOXb.webp`). Page: RaceCompare empty cells and `NoStatedPositionNote`. Need: "No stated position" cells that keep equal weight and carry their explanation down the page. FROZEN, before Oct 16 or after Nov 4. In each issue row's heading line (`RaceCompare.tsx:169-181`), add a right-aligned "Why a position can be missed" link to `/methodology#limits`: `ms-auto inline-flex min-h-[24px] items-center text-body-sm text-on-surface-muted underline`, at 14px, not caption size. Show it on every row. Leave the compact phrase and the one-time note unchanged.
  - Neutrality: low risk only because the link is on every row. Putting it only on rows with gaps would point at whoever is silent.
- **RC6 Zillow** (`img/zillow-LjdiW67m.webp`). Page: /races/[raceId], lg and up only. Need: keep issue navigation in reach on long desktop race pages and show which issue you are reading. FROZEN, before Oct 16 or after Nov 4, and only after RC1. Give RC1's row `id="issue-jump-nav"` and, at lg only, `lg:sticky lg:top-[88px] bg-background border-b border-border`. A small client island (an IntersectionObserver on the issue sections) sets `aria-current="location"` and `border-b-2 border-primary` on the link for the issue in view. The server HTML stays plain links. In `globals.css` (not frozen): `@media (min-width: 64rem) { html:has(#issue-jump-nav) { scroll-padding-top: calc(88px + 48px) } }`. Measure FL-GOV's bar at 1024px: if it wraps to two lines, use its real height. This keeps anchor targets and focused elements clear (WCAG 2.4.11) without `scroll-mt`.
  - Neutrality: low risk. It marks issues, never candidates.
- **RC7 Trip.com** (`img/trip-com-IH60fX39.webp`). Page: /candidates view tabs. Need: view tabs that look different from filter chips. Not frozen; any time. `candidates/page.tsx:90-108`: `<nav aria-label="Candidate views" className="flex flex-wrap border-b border-border">`. Each tab: `inline-flex min-h-[44px] items-center px-3 text-label text-on-surface-muted hover:text-on-surface`. Active tab: `text-primary-hover border-b-2 border-primary -mb-px`, keeping `aria-current="page"`.
  - Neutrality: none. These are views, not candidates.
- **RC8 Google Drive** (`img/google-drive-7setzh8u.webp`, absorbs RC9 Pinterest). Page: CandidateBrowser's search form and result line. Need: a compact filter bar on phones, with applied filters removable in one tap. FROZEN, before Oct 16 or after Nov 4. Below sm: the full-width search box, then the two selects in `grid grid-cols-2 gap-3`, then the button. After a search, render server GET links above the result line: "County: Orange ×", "Policy area: Housing ×", "Search: "smith" ×". Each is the same URL minus that parameter, with an sr-only "Remove" prefix and an `aria-hidden` ×. Then "Clear all" (`/candidates`). Each link is `inline-flex min-h-[24px] items-center`. Render the same links under the zero-results sentences (`:136-138`). Raise `:116` from `text-caption` to `text-body-sm`. Make the card-footer target fix listed under the weaknesses in the same PR.
  - Neutrality: low risk. Filters narrow who is listed, and ballot order inside each race is untouched. Never add a sort control.
- **RC10 Superpower** (`img/superpower-eRHUUlZh.webp`). Page: CandidateBrowser's long result list. Need: an index to jump between about 53 race groups. FROZEN, before Oct 16 or after Nov 4. Give each race `<section>` `id="race-<race_id>"`. Above the results, at every width, add one native `<details>` "Jump to a race" whose list is grouped under plain labels (Statewide, U.S. House, then each county) in `directory.ts`'s existing office order. Each anchor is `inline-flex min-h-[24px] text-body-sm`. No sticky rail, no icons, no counts of positions. `CaretGlyph` with no transition.
  - Neutrality: low risk. It indexes races, not candidates, in the existing order.
- **RC11 Starling** (`img/starling-0i56pXSY.webp`). Page: YourRaces and CountyRaces groups. Need: one grouped-list layout, with headings, rows and footnotes, for printed, decided and county races. FROZEN, before Oct 16 or after Nov 4. Add an h2 "Races we cover on your ballot" above `YourRaces.tsx:268`. Turn the decided-seat `<ul>`s (`YourRaces.tsx:311-328`, `CountyRaces.tsx:127-144`) into `LinkRowList` rows: the title is the office (plus district), and the second line is "<holder> · elected without opposition" or "· decided in the August primary", so each row is a full-width target. Move the captions at `CountyRaces.tsx:90` and `:122` to `text-body-sm` footnotes under their group.
  - Neutrality: low risk. Every decided row carries the same two facts. No party, as today.

**If these go in before the freeze**, these PR bundles keep each PR to one surface. All must merge by Fri Oct 16.

1. RC1 + RC2 + RC5, the controls and links around the issue rows (all S, `RaceCompare.tsx` / `page.tsx` / `IssueFilter.tsx`).
2. RC3 + RC4, the issue grid (M + M, `RaceCompare.tsx`, `IssueRows.tsx`, `RaceListing.tsx`, `race-rows.ts` + a verify pin). Re-measure FL-GOV at 375, 768 and 1280px.
3. RC8 + RC10 + the card-footer fix, CandidateBrowser (M + M).
4. RC11, YourRaces and CountyRaces (S).

RC6 depends on RC1 and is lg-only, so it is the first to slip to after Nov 4. RC7 isn't frozen and can ship any time.

### Motion

| ID | Effect | Reduced motion and phones |
|---|---|---|
| RC1 Tailscale | Anchor jumps. Optional `@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth } }`. | Instant jump. |
| RC2 HoneyBook | Chip fill: the existing transition-colors pinned to 120ms. | `motion-reduce:transition-none`, so the colour changes instantly. |
| RC6 Zillow | lg and up only: the active link's underline colour changes in 120ms (motion.fast, standard easing). Nothing slides. | Instant underline. Nothing sticky or animated below lg. |
| RC7 Trip.com | Underline and text colour change in 120ms. No sliding indicator. | `motion-reduce:transition-none`. |
| RC10 Superpower | Caret rotates with no transition. Anchor jumps as RC1. | Same. |

Nothing in this group moves candidate content, and nothing runs longer than 5 seconds.

### Gaps

- **Equal-weight comparison of 5 to 8 options on a phone.** Every Mobbin phone compare holds 2 or 3 items (Apple Store, Target, Expedia, lululemon). Horizontal-scroll tables (Stake, Apple News box scores) hide later columns off-screen, which would give the first candidates on the ballot more visibility. RC3's stacked group is our answer, not Mobbin's.
- **Comparison tables with no favoured column.** Almost every 4-column web compare highlights a "Recommended" or "Popular" column (Toggl, Clockwise, Squarespace, Asana, Canva, Retool). The highlight could be removed, but Craft's grid already shows the bare version (RC4).
- **Absence stated in words with a sourced reason.** Elsewhere an empty cell is an em dash, a cross, a grey check or a minus icon (Webflow, Craft, Figma, Toggl, Biograph), which reads as "no" or "against". Our "No stated position found." has no Mobbin equivalent. Fitbit's "No data" + "Learn more" (RC5) is the closest.
- **A pick-two compare that starts with nothing chosen.** Every compare flow (Target, Best Buy, lululemon, UNIQLO) preselects or carries over items. The pattern is dropped anyway (below).
- **Motion.** Flow previews are static frames, so nothing on Mobbin shows how a disclosure's height, a scroll-spy indicator or a tab underline moves, or how any of it behaves under reduced motion. The motion notes here follow design.md's tokens, not Mobbin.
- **Order disclosure ("in ballot order") and "already decided / not printed on the ballot" states.** Nothing comparable was found.

### Dropped and why

- **Apple Store "Compare iPhone" as an opt-in "Compare two" on /issues** ([Mobbin](https://mobbin.com/screens/59619ee8-ea4e-4c28-9a0e-09c363683ffa)). Dropped for good. The problem is structural, not colour or placement: a two-up compare drops the rest of the field from view and creates a shareable framing of one rival, which breaks all-or-none per race. It can't be adapted: show every candidate and it becomes the existing RaceCompare (and RC3/RC4), with nothing of the reference left.

Not dropped, only trimmed (each fault could be fixed, so the reference was kept without that part):

- Target's pinned two-item header and collapsible chevrons: left out of RC3. Every issue stays open, and no pair is pinned.
- Craft's em dashes, checks and blue ticks: replaced by our words in RC4.
- Zillow's blue underline and fixed bar: changed to our tokens, lg-only, with the root scroll-padding mechanism (RC6).
- Superpower's sticky side rail: changed to a details list (RC10).
- Pinterest's "Tweak your search" buttons: merged into RC8 as removable filter links. Its illustration is not used (no art near candidate lists).
- "Recommended"/"Popular" columns and horizontal-scroll tables: not kept as references, because a better reference covers the same need without the problem (RC4, RC3).

---

## 3. Candidate profile

Pages and components: /candidates/[candidateId] (`CandidateBrief`, `ClaimList`, `SourceLinks`, `CandidateContact`, `CandidatePhoto`), the Saved tab on /candidates (`SavedCandidates`), and `SaveToggle` ("Keep in mind"), which renders on every candidate card.

- **Freeze.** Every component above is in `scripts/freeze-manifest.ts` `FROZEN_FILES` except `SaveToggle.tsx`. The helper files some changes also touch are not frozen either: `src/lib/saved.ts`, `Glyphs.tsx`, `layout.tsx`, `globals.css` and `src/app/api/candidates/route.ts`. `SaveToggle` renders on frozen race and candidate pages, so treat it like a frozen file. Frozen items land **before Oct 16 or after Nov 4**.
- **Review result for this group.** 9 references kept and 3 dropped for good: Workable folded into CP1, Bloomberg already done, and Google a duplicate once adapted. IDs match the first catalog pass (CP1 to CP12), so CP2, CP7 and CP12 are the dropped ones.
- **Colour and placement didn't count against a reference** (founder, 2026-10-12). Where a reference's colour or position broke a rule, that part was swapped for our tokens or moved, and the reference was kept. CP11 (share) is the clearest case: it moved from each candidate page to the race and amendment pages.
- Line numbers were checked against `claude/registration-labels-calendar` at 4260eb9. No new Mobbin searches were run in this pass: the Mobbin connector isn't authorised in this session. Every kept reference comes from the first run, and I re-checked each against its saved screenshot. All 9 screenshots are in `img/`, which is gitignored.
- **Already decided, not raised again:** the 14px floor for candidate-page section labels is already built (see the bucket-label weakness below). The other four founder decisions (address-only location field, "Registration closed <date>", the calendar link that says it downloads, no empty covered race) don't touch this group.

### Current weaknesses

- `candidates/[candidateId]/page.tsx:153`: a briefed candidate's page has no h1. The name is passed as `headingLevel="h2"`, and CandidateBrief's prop only accepts h2 or h3 (`CandidateBrief.tsx:47`). The listed tier does use h1, at `text-h1` (`RaceListing.tsx:79`, from `CandidateListing.tsx:68`).
- `page.tsx:140-149`: the "Running for {office}" line sits outside the article, above the card. The office is cut off from the name it describes and is missing from the article's own header.
- `CandidateBrief.tsx:67-108` with `CandidatePhoto.tsx:28`: the 120px photo and its credit sit above the name, then come the running-mate line, the party and save row, the incumbency line and the website and socials line. At 375px that is about 330px of header before the first issue. `CandidatePhoto.tsx:38` also lazy-loads this photo, which is above the fold.
- `CandidateBrief.tsx:97-107` and `SavedCandidates.tsx:90-99`: social links use `href={s.url ?? undefined}` with no `safeHttpUrl` check, while `ListedCandidateCard` does check (`RaceListing.tsx:103`). A null url renders an `<a>` with no href: it looks like a link but can't be focused. Socials print as "handle (platform)" in 13px caption, and nothing says the link opens a new tab.
- `ClaimList.tsx:81-88`: every claim is a plain 14px paragraph. A candidate's own words look like a record summary, apart from the bucket label above them. The profile shows every claim with no in-page navigation, so a long brief is one unbroken scroll.
- ~~`IssueSection.tsx:5-9, 86`: bucket labels are 12px uppercase overline.~~ **Fixed on this branch** (4260eb9, then de157e7): they are now 14px `text-body-sm` semibold, still uppercase and tracked, so they never read as the 15px name link above them in a race-page cell. This was the founder's 2026-10-12 decision.
- `SourceLinks.tsx:7-19`: a source shows only the publisher name, in mono. `Source.type` and `Source.retrieved_at` exist (`src/types/schema.ts:117-127`) but are never shown, so a reader can't tell the campaign's own site from a filing or a news report before clicking. All of a claim's sources are joined with " · " inside one span, and `s.url` is used raw.
- `CandidateContact.tsx:33-81`: the rows are inline dt/dd in flex-wrap, so a long email or address wraps unevenly under its label. "Campaign contact page" is generic link text. The whole block is behind `SHOW_CANDIDATE_CONTACT` (line 15) and doesn't render today.
- `SaveToggle.tsx:33-49`: the toggle flips silently. Nothing tells the voter where saved candidates go (/candidates?view=saved) or that they stay on this device only; only the empty Saved tab says so (`SavedCandidates.tsx:50-54`). And if storage is blocked (private browsing), `toggleSaved` still reports success (`saved.ts:33-40, 57-62`), so the button shows "Keeping in mind" for something that wasn't kept.
- `SavedCandidates.tsx:42-60`: while the fetch runs, the list is an empty `<ul>` with no loading state. Fetch errors are swallowed (`.catch(() => {})`), leaving a blank page. Unsaving removes the card instantly with no undo. Line 87 prints the raw `office_sought`, not the district-named `officeTitle` the candidate page uses.
- `page.tsx`, whole file: there is no share action, so phone users have to find it in the browser menu.

### References

Value order (value per effort, then freeze timing). The **Frozen** column: **Yes** means a `FROZEN_FILES` file. **Adjacent** means not hashed but rendered on frozen pages. Both land before Oct 16 or after Nov 4.

| ID | App | Platform | Kind | Link | What it shows | Change to make | Adaptation | Motion | Frozen | Effort | Value |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CP3 | Microsoft Copilot | web | screen | [Mobbin](https://mobbin.com/screens/e631b279-cfc4-4c1c-85c9-f06c838b8df2) | A "References" list under an answer. Each entry shows the source's host before anyone clicks, with the page title on the next line. | One span per source: the publisher link, then " · {type in words} · retrieved {date}", all in mono. The host and "opens in a new tab" go in screen-reader-only text. | No favicons or numbered pills. The type label is plain text, and "Opinion" looks the same as the others. | None | Yes | S | high |
| CP9 | NYTimes | ios | flow | [Mobbin](https://mobbin.com/flows/69df5e84-af5c-4d28-8895-f85a168a4350) | Tapping the bookmark fills it, and a dark snackbar says the article was saved and names the tab it went to. | A message after Keep in mind: "Kept in mind on this device. See your list", or "Removed from your list." with Undo. It never shows a name, photo or party, and it stays until the voter closes it. | Our `bg-on-surface` tokens. It gets its own overlay variable instead of sharing the cookie banner's. It confirms the save actually stuck before saying so. | Opacity 200ms at lg and up only. None on phones or under reduced motion. | Adjacent | S | high |
| CP11 | Microsoft Copilot | web | flow | [Mobbin](https://mobbin.com/flows/63676cff-fa64-4d93-8924-eb72577f050e) | A Share button opens a dialog with the URL and "Copy Link". After the click, the same button reads "Link copied". | "Share this race" or "Share this amendment" in the race and amendment page headers. It uses the native share sheet where there is one, otherwise it copies the link and the label becomes "Link copied" for about 3s. | It moved from each candidate page to page level, where every candidate (or both sides) is in view. No dialog. It reuses RS11's ShareLink in our neutral tokens, not Copilot's black button. | Label and colour swap at 120ms | Yes | S | high |
| CP1 | monday.com | ios | screen | [Mobbin](https://mobbin.com/screens/28295d77-c40f-47a2-ab5c-b969aad3204b) | A compact profile: a rounded-square photo of about 64px with the name and a status line beside it, not underneath. | A two-column header at every width: the photo (72px on phones, 120px from sm), then the h1 name, the "Running for" line and the party and save row. The other lines span both columns. Social links get `safeHttpUrl`. | No camera badge, ring or status dot. The photo credit moves out of the narrow column. With no photos in the race, every card is one column. | None | Yes | M | high |
| CP4 | Liven | ios | screen | [Mobbin](https://mobbin.com/screens/cf55d189-6312-46a9-9c28-c90ad47f8582) | A quotation set off by a solid vertical rule on its left, with an attribution line under it. | "What They Say" claims sit in a neutral left-rule blockquote, with their source line under them. They are 16px on the profile and stay 14px on race-page rows. Records and fact-checks stay plain paragraphs. | Liven's green rule becomes `border-border-strong` for everyone, never the bucket's tone colour. No bottom sheet; the source line stays inline. | None | Yes | M | high |
| CP6 | Mintlify | web | screen | [Mobbin](https://mobbin.com/screens/731c0653-266e-4c03-aae6-df4d07631ebd) | A docs page with an "On this page" rail of the sections. The current one is coloured, and the rail stays put while the column scrolls. | An "On this page" list of the candidate's issues in race order. On phones it is a closed native `<details>`; at lg a sticky right rail marks the current section. It uses the same component as the methodology rail (LF1). | The rail's green current item becomes primary plus a border. The summary shows no count. | Active-link colour at 120ms, lg only. No motion below lg. | Yes | M | high |
| CP8 | Telegram | ios | screen | [Mobbin](https://mobbin.com/screens/da1998dd-24a2-4655-8ba0-aab9af83204a) | One grouped card of full-width rows split by hairlines, with a small grey label above each value and action values in link colour. | The contact block becomes a divided card of label-over-value rows in a fixed order (Email, Phone, Mail, Contact page). The contact link shows its host. Ships only when `SHOW_CANDIDATE_CONTACT` is on. | Labels at 14px (Telegram's are smaller). No avatar, ring or star. | Copy label colour swap at 120ms; nothing moves | Yes | S | medium |
| CP10 | The Weather Channel | ios | screen | [Mobbin](https://mobbin.com/screens/a5faad5f-7d5e-49f7-92ed-855ee63aee96) | After a delete, a dark snackbar names the removed item and has a separate Undo button. | Undo on unsave, through CP9's message. The Saved tab gets static placeholder rows while loading, a real error with "Try again", and the district-named office line. | No name in the message (Best Buy's rule), only in screen-reader text. The removed card isn't animated out. | Snackbar as in CP9. Nothing on the card moves. | Yes | M | medium |
| CP5 | OpenAI | web | section | [Mobbin](https://mobbin.com/sites/sections/97c6e5e9-4bc6-4297-80ff-932ac27f8559) | Article end matter in two columns: labels at left and numbered references at right, each with a back-link to where it was cited. | "Every source on this page", a closed `<details>` before the brief's footer. Inside is a list with each source once: publisher, host, type, retrieved date and back-links to the claims that cite it. | Closed by default, the same summary on every candidate page, no count anywhere. Our tokens, and a new Glyphs.tsx return arrow because Inter lacks ↩. | None. Anchor jumps use the browser default. | Yes | M | medium |

### Build notes

- **CP3 Microsoft Copilot**, `img/microsoft-copilot-py4sAgRk.webp`. Need: a citation line that says what the source is and when we read it. Files: `SourceLinks.tsx` (frozen; also renders on the race page through ClaimList). Before Oct 16 or after Nov 4; it is #6 in the Top 12.
  - Each source gets its own `<span className="inline-flex min-h-[24px] flex-wrap items-center gap-x-1">` instead of one " · "-joined run. Inside: the publisher link (underline), then plain text ` · {TYPE_LABEL[s.type]} · retrieved <time dateTime={s.retrieved_at}>{formatNewsDate(s.retrieved_at)}</time>`.
  - `TYPE_LABEL`: candidate_self "Campaign website", primary_doc "Official record", factual_reporting "News report", opinion "Opinion". All four are the same size and colour, with no badge.
  - Keep the whole line in `font-mono text-mono` (design.md: mono is for citations and dates) and the "Source:" lead-in.
  - Writer's check: `SourceLinks.tsx:12` uses `s.url` raw, and `new URL()` throws on a malformed url. Route it through `safeHttpUrl`. Add the sr-only `, {host}, opens in a new tab` only when that returns a url, and render the publisher as plain text when it doesn't.
  - Re-measure FL-GOV's race page, since the line gets longer there too.
  - Neutrality: low. Every source gets the same fields. Lean is not shown here; it stays disclosed once, on the outlet page.
- **CP9 NYTimes**, `img/nytimes-RKWRhRXk.webp`. Need: a save that confirms itself and says where the item went. Files: `SaveToggle.tsx`, a new small notify store (for example `src/lib/notify.ts`), one region in `layout.tsx`, `globals.css`. None are frozen, but SaveToggle renders on frozen pages: before Oct 16 or after Nov 4, and after Nov 4 is recommended.
  - Add one `<div role="status" aria-live="polite">` in `layout.tsx`. Styling: `bg-on-surface text-surface rounded-md px-4 py-3 text-body-sm`, with a close button whose target is at least 24px.
  - After `toggleSaved`, SaveToggle calls `notify()` with "Kept in mind on this device. See your list" (linking `/candidates?view=saved`) or "Removed from your list." plus Undo (CP10). The message never includes a name, photo or party.
  - It stays until closed, the next toggle, or navigation. No auto-hide (WCAG 2.2.1).
  - Writer's check 1: `--kyv-overlay-bottom` belongs to the cookie banner. `SitePrompts.tsx:155-171` sets it and removes it on close, so if the snackbar wrote the same variable, closing either one would erase the other's value. Give the snackbar its own `--kyv-toast-bottom` and add it beside the banner's term:
    - in the root `scroll-padding-bottom` (`globals.css:155-161`);
    - in the body's `pb-` and `min-h-` classes (`layout.tsx:180`).

    Then focus never hides under it (WCAG 2.4.11). Place it at `bottom: calc(96px + env(safe-area-inset-bottom) + var(--kyv-overlay-bottom, 0px))` on phones, so it sits above an open cookie banner, and bottom-left from md.
  - Writer's check 2: `toggleSaved` returns the new state even when `localStorage` refuses the write (`saved.ts:33-40, 57-62`). Re-read `isSaved(id)` after the toggle. Say "Kept in mind on this device" only when the save stuck; otherwise say "This device didn't keep it. Private browsing can block saving."
  - Neutrality: low. It is the same control and message for every candidate, and it is page chrome, not candidate content.
- **CP11 Microsoft Copilot**, `img/microsoft-copilot-6GCLx3ER.webp`. Need: share with in-place feedback. Files: the race page header (`races/[raceId]/page.tsx` or `RaceHeader.tsx`) and `measures/[measureId]/page.tsx`, all frozen; the ShareLink component itself is new and not frozen. By Oct 16 or after Nov 4.
  - Reuse RS11 Tripadvisor's ShareLink (built for home) with the label "Share this race" or "Share this amendment".
  - It calls `navigator.share({ title, url })` where that exists. Otherwise it calls `navigator.clipboard.writeText(origin + pathname)`, and the label swaps in place to "Link copied" with `CheckGlyph` for about 3s, announced through `aria-live="polite"`.
  - It never shares the query string. No social buttons and no dialog.
  - Writer's check: the reviewed text both said "never on candidate profiles" and "identical on every candidate page". I resolved it as page level only. The candidate page gets no share control; a voter shares the race, where every candidate is in view, and the browser menu still works on a profile.
  - Neutrality: low at page level, with one control per race or amendment and identical on all of them.
- **CP1 monday.com**, `img/monday-com-K7LtD72m.webp`. Need: a profile header with photo and office that fits a phone. Files: `CandidateBrief.tsx`, `CandidatePhoto.tsx`, `page.tsx`, all frozen. Before Oct 16 or after Nov 4.
  - Header: `<header className="grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-2 sm:gap-x-5">`.
    - Column 1: CandidatePhoto, 72px below sm and 120px from sm.
    - Column 2: the name as h1 at `text-h1`, matching the listed tier (`RaceListing.tsx:79`). Widen `headingLevel` to include "h1" and pass it from `page.tsx:153`. Under the name, the "Running for {office link}" line moved in from `page.tsx:140-149` (including the settled variant), then the PartyChip and SaveToggle row.
    - Spanning both columns (`col-span-2`): the running-mate, incumbency, website and socials lines.
  - When `photos` is null for the race (all or none), the grid is one column for every candidate.
  - Writer's check: the profile shows a photo credit under the photo (`CandidatePhoto.tsx:43-55`). In a 72px column it would wrap to a word per line, so render it as a spanning line instead.
  - Writer's check: drop `loading="lazy"` for size "lg" only.
  - Writer's check: give ListedCandidateCard's h1 mode the same grid, so a listed profile and a briefed profile look alike.
  - Socials (`CandidateBrief.tsx:97-107`, `SavedCandidates.tsx:90-99`): `href={safeHttpUrl(s.url)}`, plain text when that is null, and an sr-only " (opens in a new tab)".
  - Neutrality: low. Photos are all or none per race. Never add rings, status dots or the camera badge.
- **CP4 Liven**, `img/liven-f4IImzhS.webp`. Need: quoted statements with their citation underneath. Files: `ClaimList.tsx`, `IssueSection.tsx`, `IssueRows.tsx`, all frozen. Before Oct 16 or after Nov 4.
  - Give `Claims` a `quote` prop. When it is set, each `<li>` wraps the text in `<blockquote className="border-l-2 border-border-strong pl-3">` and the source line gets `pl-3`.
  - Writer's check: ClaimList has no compact prop, because compactness lives in `IssueBuckets` (`IssueSection.tsx:59-67`). So `IssueBuckets` passes `quote={key === "say"}` and a size: `text-body` on the profile, `text-body-sm` on compact race rows.
  - Writer's check: `IssueRows.tsx:39` renders the say bucket through ClaimList directly, so it needs `quote` too. ClaimList's own comment promises that a claim reads the same wherever it appears (`ClaimList.tsx:6-8`).
  - First confirm which field marks verbatim text: the `say` bucket or `Claim.attributed` (`schema.ts:136`). No added curly quotes.
  - Re-measure FL-GOV.
  - Neutrality: medium, held down by two rules. The rule colour is neutral for everyone, never the bucket's tone. The treatment follows a data rule (the bucket), never an editorial choice per claim.
- **CP6 Mintlify**, `img/mintlify-93ICzWqS.webp`. Need: in-page navigation for a long brief. Files: `page.tsx`, `IssueSection.tsx`, frozen, plus a new shared OnThisPage component (not frozen) that /methodology's LF1 and LF3 also use. Before Oct 16 or after Nov 4.
  - Give each IssueSection `id="issue-{issue_id}"`. Under the header, add `<nav aria-label="On this page">` listing the spine issues in race order, then any candidate-added issues.
  - Below lg: a closed native `<details>`, with rows `flex min-h-[44px] items-center`.
  - At lg: `main` goes from `max-w-[680px]` to `lg:grid lg:grid-cols-[minmax(0,680px)_200px] lg:gap-8`. The rail is `lg:sticky lg:top-[88px] self-start`, with `text-body-sm` links on a `border-l border-border` spine. The current item gets `aria-current="location"`, `border-primary` and `text-on-surface`.
  - Wrap `scroll-behavior: smooth` in `@media (prefers-reduced-motion: no-preference)`.
  - Writer's check: CandidateNews returns null when it has no stories (`CandidateNews.tsx:70`), and CandidateContact is off by flag. Link "In the news" and "Contact the campaign" only when `page.tsx` knows they render (lift those reads into the page); otherwise list issues only.
  - Writer's check: no count in the summary. LF3 shows "· 15 sections" on /methodology, but candidate-added issues differ between rivals, so a count here would compare candidates. No "top issues" either.
  - Neutrality: low. It is structural, and in spine order for everyone.
- **CP8 Telegram**, `img/telegram-Fdecfjfs.webp`. Need: contact rows that read cleanly on phones. Files: `CandidateContact.tsx`, frozen. After Nov 4, and only once `SHOW_CANDIDATE_CONTACT` is on; until then it has no visible value.
  - `<dl className="divide-y divide-border rounded-lg border border-border bg-surface">`. Each row is `flex min-h-[48px] flex-col justify-center gap-1 px-4 py-3`.
  - dt is `text-body-sm text-on-surface-muted`. dd is `text-body`, with links in `text-primary underline [overflow-wrap:anywhere]`.
  - Every candidate gets the same fixed order: Email, Phone, Mail, Contact page.
  - "Campaign contact page" becomes the page's host, plus sr-only ", opens in a new tab".
  - Optional: a 24px "Copy" text button whose label becomes "Copied", announced politely.
  - Keep the "Verified {date} · Where we read this" footer.
  - Neutrality: low. Open question below: omit or say "Not listed".
- **CP10 The Weather Channel**, `img/the-weather-channel-JwWF7j9w.webp`. Need: undo on remove, and loading and error states on the Saved tab. Files: `SavedCandidates.tsx` (frozen), `src/lib/saved.ts`, `SaveToggle.tsx` and `src/app/api/candidates/route.ts` (not frozen). Before Oct 16 or after Nov 4.
  - Writer's check: Undo needs no SavedCandidates change. Before it toggles, SaveToggle reads the old index with `readSaved().indexOf(id)`. Undo calls a new `insertSaved(id, index)` in `saved.ts`. So Undo works from every list and ships with CP9 in unfrozen files.
  - Loading: during the fetch, one static placeholder row per saved id at the real card height, with no pulse.
  - Error: replace `.catch(() => {})` (line 42) with "We couldn't load your saved candidates." and a "Try again" button that refetches.
  - Office line (line 87): show `officeTitle`. Writer's check: `/api/candidates` selects only candidate columns (`route.ts:26`), so the route must join the race row to compute it.
  - The unsaved card disappears with no exit animation.
  - Neutrality: low. The list order is the voter's own, and every row has the same shape.
- **CP5 OpenAI**, `img/openai-XUDybjFt.webp`. Need: one place to check everything a profile cites. Files: `CandidateBrief.tsx` and `ClaimList.tsx`, frozen; `Glyphs.tsx`, not frozen. Before Oct 16 or after Nov 4.
  - When `linkToDetail` is false, render `<details><summary>Every source on this page</summary>…</details>` before the footer. It goes on every candidate page in the race or on none. A candidate with no sources gets the same closed row, which says so inside.
  - Inside: one column below sm; from sm, `grid-cols-[120px_1fr]`. An `<ol>`, de-duplicated by `source_id`, with publisher, host, type label, retrieved date and back-links to `id="claim-{claim_id}"` (add that id to each Claims `<li>`, `ClaimList.tsx:82`).
  - Writer's check: `Glyphs.tsx` has only Check, Plus and Caret, so add a ReturnGlyph SVG.
  - No count anywhere, and no lean.
  - Neutrality: medium, held down by the closed, uncounted, identical summary. Unequal source counts are a real skew: the open list shows them plainly (AGENTS.md), but there's no headline number to compare.

### Motion

| ID | Effect | Phones and reduced motion |
|---|---|---|
| CP9 NYTimes | Snackbar opacity 0 to 1 at motion.base (200ms), standard easing, and an 8px rise, at lg and up only. | Appears instantly. Nothing on the candidate card moves. |
| CP10 The Weather Channel | Same snackbar as CP9. The removed card is not animated out. | Instant. |
| CP11 Microsoft Copilot | "Link copied" label and colour swap at motion.fast (120ms), back after about 3s. | Instant label swap. |
| CP6 Mintlify | Rail's active-link colour at 120ms, lg only. Smooth scrolling only under `prefers-reduced-motion: no-preference`. | No motion below lg; instant jumps. |
| CP8 Telegram | "Copied" label colour at 120ms; nothing moves. | Instant. |

All timings come from design.md's motion tokens (120/200/320ms, `cubic-bezier(0.2,0,0,1)`), not from the references. Mobbin flows show only the start and end states.

### Open questions

- **CP8 (deferred, not a decision now):** when a campaign lists no phone, say, should the row be left out (as today) or say "Not listed", the way CampaignWebsite says "none listed", so every contact card has the same rows? It matters only once `SHOW_CANDIDATE_CONTACT` is switched on, after Nov 4. Recommended then: "Not listed", so every card has the same rows.
- **CP9 and CP10:** the message after Keep in mind is decision D3 (Founder decisions, above). This pass keeps it, recommends after Nov 4, and adds the private-browsing check.

### Gaps

- **Equal-weight sibling profiles.** Mobbin has no example of several profile headers that must look identical across rivals. The invariant comes from our own code (`racePhotosFor`, `incumbencyFor`, `runningMatesFor`), not from a reference.
- **Fact-check verdicts.** No newsroom or fact-checker claim-with-verdict pattern on Mobbin. The closest source lists come from AI answer products (Copilot, ChatGPT, Perplexity, Raycast). Only their structure carries over (host visible, one entry per source, back-links); their favicon chips don't.
- **Source type and retrieved date.** No government or health portal on Mobbin shows both on each citation. The CVS Health footnote screen has superscript markers only.
- **Social link rows.** The results used brand-coloured platform logos or follower counts. Logos add uneven weight and pull in third-party assets, and counts read as popularity scores. Plain text links stay, with no strong reference.
- **Share on the profile itself.** By choice, there is no share control on a candidate page (CP11 moved to the race page). If voters ask for one later, it must be identical on every candidate page, on both tiers.
- **Motion timings.** Mobbin flows show start and end states only, so every timing above comes from design.md.

### Dropped and why

- **CP2 Workable** (https://mobbin.com/screens/025156fb-9401-4a77-b0e0-bad6ec244362): a duplicate. Its photo-beside-name header is now CP1 at every width, sm and up included. The only thing it added was right-aligning Keep in mind, which gives the voter nothing. Folded into CP1.
- **CP12 Bloomberg** (https://mobbin.com/flows/ae5cd82b-1fac-47d8-82b1-d1ea934f1114): already in place, so there is no work. `layout.tsx` sets one site-wide share image (`og-card-text.png`, no people) and one description, which every candidate page inherits; the candidate page's `generateMetadata` sets only the title. Not dropped for colour or placement.
- **CP7 Google "About this source"** (https://mobbin.com/screens/976e7ec9-4137-4be2-9d82-a082e433cea9): a duplicate once adapted. Leaving out its lean row removes the neutrality risk, but what's left (type, publisher, retrieved date) is what CP3 already shows on every source line and CP5's list repeats. Lean stays disclosed once, on the outlet page.
- **Tubi "Adding a show to list"** (https://mobbin.com/flows/a6ab2e46-c468-4cab-b7d4-f5984bfe7a33): merged into CP9. Its 8-second auto-hide is not used (WCAG 2.2.1).
- **Best Buy "Removing an alert"** (https://mobbin.com/flows/19f0053c-2aa8-4e0b-b19b-6565ee27c46f): merged into CP10. Its rule of no item name in the message was kept.
- **Delphi sticky mini-header with the person's name** (https://mobbin.com/screens/628cfd85-cf0c-4798-a24b-e969f9cf87a9): excluded on purpose. It would put candidate content in motion, and that can't be adapted away, because the moving part is the name.
- **CVS Health footnote markers** (https://mobbin.com/screens/a4770b01-da5e-4868-a399-12128a3d424c): superscripts only, with no metadata, so there is nothing for CP3 or CP5 to borrow.

---

## 4. Amendments and long-form pages

/measures/[measureId] (MeasureResourceLadder, MeasureResourceRow, MeasureVoteMeaning, MeasureThreshold), /methodology, /about, /privacy, /terms.

- **Frozen:** the measure page, its four components (all in `scripts/freeze-manifest.ts` `FROZEN_FILES`) and /methodology. Anything for them merges by Fri Oct 16 or waits until after Nov 4. /about, /privacy and /terms are not frozen and can ship any time.
- **Screened again against the founder's 2026-10-12 note:** colour can always change, and so can where content sits, so neither is a reason to drop a reference. Nothing in this group was dropped for colour or for a placement we could move. Each drop below names the structural reason.
- IDs match the main catalog (AM = amendments, LF = long-form). LF2 Slite is merged into LF1.
- The home resources block and scroll rhythm are not repeated here. They are in `../home-readability-2026-10-12/home-readability.md`. AM1 and AM3 reuse that plan's `ArrowDownGlyph` and caret rule (§7, item J2).

### Current weaknesses

**/measures/[measureId]**

- `MeasureResourceLadder.tsx:89-97`: each column has its own 'Show all N' `<details>`. A reader can open one side only, so that column ends up much longer than the other. The summary never changes to 'Show fewer', and only the browser's default marker shows whether it is open.
- `MeasureResourceLadder.tsx:56-71`: each column draws its own tier headings, so at md+ 'Positions' starts at a different height on the YES side than on the NO side. The headings are 13px uppercase captions (line 59).
- `MeasureResourceLadder.tsx:121-124`: below md, the NO column starts only after up to 8 YES rows and their disclosure, and the page has no jump link to either side. Reaching NO takes more scrolling than reaching YES.
- `MeasureResourceRow.tsx:97-114`: every row is a bordered box inside a bordered column card, so it is a box inside a box. The title, which is what the reader is choosing, is 14px (`text-body-sm`). Links open in a new tab and don't say so, although `about/page.tsx:103` does.
- `MeasureThreshold.tsx:7-11` + `MeasureVoteMeaning.tsx:54-67`: the 60%-not-50% correction is a muted text box with nothing visual. The blank-vote rule, which says what the 60% is of, sits in a separate paragraph below it.
- `measures/[measureId]/page.tsx:140-150` ('What the ballot says'): the verbatim summary has no visible source label. 'Read the full official text' is 13px `text-caption`, opens in a new tab and doesn't say so.
- `MeasureVoteMeaning.tsx:41`: `grid-cols-1 sm:grid-cols-2` stacks the YES and NO boxes below 640px. **Reviewed and kept as is.** Putting them side by side at 320px leaves two text columns of about 106px, around 5 lines deep each, and stacking in ballot order gives neither side more weight (see Dropped).

**/methodology**

- `methodology/page.tsx:282`: about 15 h2 sections sit in one 680px column with no table of contents. The only anchors are two inline links in the header (`#limits`, `#not-covered`, lines 295-301), and most sections have no id, so nobody can link or jump to them. At lg, the space beside the column is empty.
- `methodology/page.tsx:562-621`: each briefed race is its own bordered card and table, stacked with no jump list. 'Known limits' and 'What we don't cover' get further down the page with every race added.
- `methodology/page.tsx:354` and `:894`: 'How a quote gets here' and the five source groups are plain `list-decimal` lists. The page says the ladder runs 'most established first', but the layout doesn't show that order.

**/about, /privacy, /terms**

- `terms/page.tsx:37-40`: the effective date prints as raw ISO ('Effective 2026-10-04'). `privacy/page.tsx` has no 'last updated' date at all.
- `privacy/page.tsx:32-43`: the five keys kept on the device are listed in one long paragraph. Nothing shows at a glance what stays on the device, what is stored only if you sign up for email, and what is never stored.
- About, Privacy, Terms and Methodology have no shared navigation, only links inside the body text.

### Kept references

| ID | App | Platform | Kind | Link | What it shows | Change to make | Adaptation | Motion | Frozen | Effort | Value |
|---|---|---|---|---|---|---|---|---|---|---|---|
| LF1 | Dub | web | section | [Mobbin](https://mobbin.com/sites/sections/825205b6-8aa3-4195-893d-0c348638a02e) | Terms of Service: prose on the left and an 'On this page' list of 11 sections on the right. The current item is darker, with a short rule at its left edge. | /methodology at lg: a 200px sticky 'On this page' rail of the h2 sections beside the 680px column, with an id on every section and 'Back to top' at the foot. | Slite's leading-dash state (LF2) is folded in as the 2px left border on the current item, which marks it by shape as well as colour. Dub's numbered circles are not used. Section headings only, never per-race links. | lg only, optional: border and text colour change at 120ms, `motion-reduce:transition-none`. Smooth scroll only under `prefers-reduced-motion: no-preference`. | Yes | M | high |
| LF3 | Finimize | ios | screen | [Mobbin](https://mobbin.com/screens/6aef933a-e3de-4ae3-bd63-c06cdb6e99af) | An article header, then a collapsible 'TABLE OF CONTENTS' row opened to a numbered list of five sections. | /methodology below lg: a closed native `<details>` 'On this page' after the header, fed by the same `{id, label}` array as LF1, with 44px rows. | Writer's change: the caret rotates with no transition (home-readability §7). No reading time, and no current-item colour on phones. | None. Instant open, no height animation. | Yes | S | high |
| AM1 | Asana | ios | screen | [Mobbin](https://mobbin.com/screens/6d019817-8957-4507-8dda-0b9548c80442) | A help article on a phone: an 'IN THIS ARTICLE' overline and four section links, each with a down arrow that shows it jumps within the page. | Below md, one jump row before 'Understand it first' with two identical links in ballot order: 'The case for a YES' and 'The case for a NO'. | Both links or neither, same size, weight and colour. `ArrowDownGlyph` SVG (home plan J2) instead of the ↓ character, which the Inter subset lacks. No counts. | None. Instant jump. | Yes | S | high |
| AM2 | Apple Store | ios | screen | [Mobbin](https://mobbin.com/screens/4d1933e0-40ea-4a2f-b550-e4c0a264e038) | Compare iPhone at phone width: two equal column heads, a hairline between them, and values in matching rows across both halves. | At md+, each ladder tier becomes one shared row: a full-width tier label above a YES cell and a NO cell, so each tier starts at the same height on both sides. | Only part (b) is kept; part (a), YES and NO side by side on phones, is dropped. An empty cell says 'Nothing in this group yet' in words, never Apple's em dash, and only after the §2 source check and founder sign-off. The tier label moves up from the 13px caption to `text-label`. | None. | Yes (after Nov 4 recommended) | M | high |
| AM3 | GetYourGuide | ios | flow | [Mobbin](https://mobbin.com/flows/2361defc-7781-4cc1-9582-1a35cbe88a4c) | 'See more' opens a list in place, and the link at its new end reads 'See less'. | Replace the two per-column 'Show all' disclosures with one control under both columns. Closed: 'Show all: N for YES, N for NO', with real totals. Open: 'Show fewer'. | One `<details>` opens both sides at once. Each half of the extra rows is labelled with its side, because on phones the columns are stacked and the extra rows appear after both. Writer's change: `CaretGlyph` flips with no transition. | None. Rows appear with no height animation. | Yes | M | high |
| AM4 | Webflow | web | section | [Mobbin](https://mobbin.com/sites/sections/449c340b-b013-4e4d-bb1b-25b405b4644a) | A list split by hairlines. Each item has a small uppercase type label (VIDEO, BLOG POST) above a one-line title. No thumbnails, no cards. | Drop the box inside a box: `divide-y` rows, the flag on its own line above the title, the title at 16px, and 'opens in a new tab' text on links. | The flag is 14px `text-body-sm`, not Webflow's small mono caption: the opinion marker has to be read, so it stays at or above the 14px floor. Opinion rows keep the full-width tint. | None. | Yes | S | high |
| AM5 | Workable | web | screen | [Mobbin](https://mobbin.com/screens/71ee65d1-7086-4490-93ae-b4ad79f79524) | Trait rows on dotted tracks, with an 'AVERAGE' label over a fixed tick at the same x on every row: a labelled reference mark on a scale. | Under 'Needs 60% to pass.', add a static 0-100% scale with a thin tick at 50% ('Simple majority') and a heavier tick at the threshold ('Needed to pass'). Move the blank-vote sentence into the same box. | Only the labelled tick is borrowed. Workable's coloured range and score dot are left out, because a dot or fill reads as a result. | None. Never animate anything toward 60%. | Yes | S | medium |
| AM6 | Literal | web | screen | [Mobbin](https://mobbin.com/screens/22d9b1db-8046-4b85-b2b3-ae11911f1eee) | A saved book quote with a thin rule on its left and a small muted caption under it saying where it comes from. | Wrap the ballot summary in a `<figure>` with the caption 'Official ballot summary, as printed · Florida Division of Elections' and the full-text link at 24px, saying it opens in a new tab. | The caption is 14px `text-mono`. Literal's 'Page 72' becomes the issuing office. | None. | Yes | S | medium |
| LF4 | Railway | web | section | [Mobbin](https://mobbin.com/sites/sections/35a42526-d3b6-4e26-abf7-47667d6e7479) | 'How the program works': numbered circles joined by a thin vertical line, each with a short bold step name and one muted sentence. | Replace `list-decimal` at :354 and :894 with numbered 24px circles joined by a 1px line, so 'most established first' reads as a ladder. | Neutral circles (border only), no colour per step. Tier names match `TIER_LABEL`. | None. | Yes | S | medium |
| LF5 | App Store | ios | screen | [Mobbin](https://mobbin.com/screens/03f79864-2fc2-4afd-a9f8-0512620a11c3) | An app's privacy section: a 'Data Linked to You' card with a grid of categories, then 'Data Not Linked to You' in the same style. | /privacy after the lede: three equal summary cards, 'Only on your device', 'Stored by us, only if you sign up for email' and 'Never stored', each linking to its full section. | Three cards, not two. The 'Never stored' lines follow the founder's address-only decision: once the location field drops its ZIP option, the only ZIP stored is the one a reminder signup keeps. | None. | No | S | high |
| LF6 | Attio | web | section | [Mobbin](https://mobbin.com/sites/sections/4e71dd68-0727-42f0-83c2-0a7e0799adb5) | A terms page: title, a one-sentence lede, a muted 'Last updated: March 2023', and a left column listing the sibling documents with the current one highlighted. | 'Effective October 4, 2026' instead of ISO, a 'Last updated' line on /privacy, and a shared 'About this guide' nav linking About, How we stay fair, Privacy and Terms. | A wrapped row of links under the h1, not Attio's left rail, because LF1's rail takes that column on /methodology. The current page is marked with `aria-current` and plain text, not colour alone. | None. | No (the /methodology copy: Yes) | S | medium |

### Build notes

- **LF1 Dub** (`methodology/page.tsx`; need: long explainer with a table of contents and anchor navigation). Image `img/dub-NlXHKyi7.webp`. FROZEN, before Oct 16 or after Nov 4.
  - Give every h2 section an id, keeping `limits`, `not-covered` and `issue-list`.
  - At lg, `main` becomes `lg:grid lg:grid-cols-[minmax(0,680px)_200px] lg:gap-8`, so the prose stays 680px.
  - The rail is `<aside><nav aria-label="On this page">`, `lg:sticky lg:top-[88px] self-start`. 88px matches the md `scroll-padding-top` in `globals.css:160`, so no `scroll-mt` is needed.
  - Inside it, an `<ol>` of h2 links on a `border-l border-border` spine. Each link is `text-body-sm text-on-surface-muted -ml-px border-l-2 border-transparent pl-3 min-h-[24px]`.
  - The current item gets `aria-current="location"`, `border-primary` and `text-on-surface`. The 2px border is the cue that doesn't rely on colour, taken from Slite's long dash ([Mobbin](https://mobbin.com/flows/3d298076-3d6d-4061-82e2-fb931327c9d2)).
  - End the rail with a 'Back to top' link to an id on the h1.
  - Tracking the current item is an optional IntersectionObserver island. Without it, the rail is plain links.
  - Neutrality: low. The rail is navigation chrome. Links to individual races would give some races a second link and an order, so the per-race scrutiny cards (`:562-621`) stay out of it.
- **LF3 Finimize** (/methodology below lg; need: table of contents on phones). Image `img/finimize-X1K6KR2h.webp`. FROZEN, before Oct 16 or after Nov 4.
  - Place it after the header and before the 112px `method-receipts` spot, which keeps its own row (`:306-320`, design.md 'Art on phones').
  - Summary: 'On this page' in `text-label`, with a `CaretGlyph` that uses `group-open:rotate-90` and no transition.
  - Body: the same array LF1 renders, as `<ol className="divide-y divide-border">` with links `flex min-h-[44px] items-center`.
  - Closed by default, so about 48px tall. No JavaScript and no scroll-spy.
  - Neutrality: none.
- **AM1 Asana** (`MeasureResourceLadder.tsx`; need: equal reach to the YES and NO columns on phones). Image `img/asana-hFPgeJOE.webp`. FROZEN, before Oct 16 or after Nov 4.
  - Below md only (`md:hidden`), at the top of the ladder before 'Understand it first': an 'On this page' label, then a `grid grid-cols-2 gap-3` row of two links in ballot order, to `#case-yes` and `#case-no`.
  - Each link is `text-label text-primary inline-flex min-h-[44px] items-center gap-1` with an `aria-hidden` `ArrowDownGlyph`. If home PR J2 hasn't added the glyph to `Glyphs.tsx` yet, add it there.
  - Put the two ids on the two `Column` sections. Both columns always render together whenever `brief` exists (`page.tsx:153-154`), so the row renders with the ladder or not at all.
  - No counts, no `scroll-mt`. The root `scroll-padding-top` already lands the heading clear of the fixed bars.
  - Neutrality: medium if done unevenly. If counts are ever added, show both totals or neither.
- **AM2 Apple Store** (`MeasureResourceLadder.tsx:56-124` at md+; need: matching rows across two sides). Image `img/apple-store-oJsvcf3Y.webp`. FROZEN, and after Nov 4 is recommended (decision D1), because it replaces the rule that 'a tier with no rows shows no heading'.
  - Render each tier present on either side as one block: a full-width `TIER_LABEL` in `text-label`, above an `md:grid-cols-2` pair of YES and NO cells. Both cells get identical borders.
  - Where a tier has rows on one side only, the empty cell reads 'Nothing in this group yet' in `text-body-sm text-on-surface-muted`, never an em dash. Show it only after the `news-fairness.md` §2 source check confirms the gap is real, and only once the founder approves the wording.
  - Below md, keep today's stacked columns and leave `MeasureVoteMeaning.tsx:41` as it is.
  - Neutrality: medium. The empty cell shows a real imbalance, which AGENTS.md allows only after the source check, and its wording must not suggest a side has no case.
- **AM3 GetYourGuide** (`MeasureResourceLadder.tsx:89-97`; need: equal, all-or-none overflow). Image `img/getyourguide-picwmZAj.webp`. FROZEN, before Oct 16 or after Nov 4.
  - One `<details className="group">` under both columns. Its summary swaps two labels with `group-open:hidden` and `hidden group-open:inline`, as `CandidateNews.tsx:113-114` does.
  - Closed: 'Show all: {yes.length} for YES, {no.length} for NO', the real totals for both sides. Open: 'Show fewer'.
  - The body is an `md:grid-cols-2` holding each side's extra rows under its own column. Each half opens with a small `text-label` heading ('More for YES', 'More for NO'), because on phones the extra rows come after both stacked columns.
  - Keep `COLUMN_CAP` the same on both sides (8). Use `CaretGlyph`, not the ⌄ and ⌃ characters.
  - Neutrality: low. This removes today's risk of one side being open while the other stays capped.
- **AM4 Webflow** (`MeasureResourceRow.tsx`; need: readable resource rows). Image `img/webflow-UV2emTrL.webp`. FROZEN, before Oct 16 or after Nov 4.
  - Remove the per-row box (`rounded-md border p-3`, `:97-102`). The column card holds a `divide-y divide-border` list with `py-3` rows.
  - The flag ('Official document', 'Opinion', 'Research') moves to its own line above the title, in `text-body-sm font-medium text-on-surface-muted`.
  - The title becomes a 16px `text-body` link with `<span className="sr-only"> (opens in a new tab)</span>`.
  - The meta line (publisher · author · format · length · date) stays below, in 14px `font-mono text-mono`.
  - Opinion rows stay marked by their container, as a full-width tint (`-mx-5 px-5 bg-surface-muted`).
  - The flag comes only from the resource kind, never from an outlet's lean. No thumbnails, no format icons.
  - Neutrality: low. Rows look identical in the neutral block and in both columns.
- **AM5 Workable** (`MeasureThreshold.tsx`, `MeasureVoteMeaning.tsx:53-67`; need: show the 60% threshold). Image `img/workable-ILijdCJ1.webp`. FROZEN, before Oct 16 or after Nov 4.
  - Add a static `<svg role="img" aria-label="A scale from 0 to 100 percent. A simple majority is 50 percent; this amendment needs 60 percent of the votes cast on it.">`: an 8px track in `surface-muted` with a `border-input` edge (3:1), a thin `on-surface-muted` tick at 50%, and a heavier `on-surface` tick at `pct`.
  - HTML labels in `text-body-sm`: '0%' and '100%' at the ends, 'Simple majority' right-aligned to its tick, and 'Needed to pass' left-aligned from its tick, so the labels don't collide at 320px.
  - Move the blank-vote sentence (`MeasureVoteMeaning.tsx:54-67`, which applies only when the threshold is 60%) into the same `surface-muted` box. The copy stays unchanged.
  - No fill, no dot, no colour per side, never animated.
  - Value lowered in review from high to medium: the text already states the rule, and the scale shows it.
  - Neutrality: low while it stays a static diagram of the rule. High if it ever gains a fill, a tally or a poll number.
- **AM6 Literal** (`measures/[measureId]/page.tsx:140-150`; need: official text with visible attribution). Image `img/literal-QCa2u17P.webp`. FROZEN, before Oct 16 or after Nov 4.
  - Wrap the blockquote in a `<figure>`. Keep `border-l-2` and add `cite={measure.full_text_url}`.
  - Add `<figcaption className="font-mono text-mono text-on-surface-muted">` reading 'Official ballot summary, as printed · Florida Division of Elections'.
  - The link becomes `inline-flex min-h-[24px] items-center text-body-sm` with a screen-reader-only ' (opens in a new tab)', as `MeasureVoteMeaning.tsx:62` does. The summary text is untouched.
  - Neutrality: none. It names where the official wording comes from and adds no paraphrase.
- **LF4 Railway** (`methodology/page.tsx:354`, `:894`; need: show order in the steps and the source ladder). Image `img/railway-yoI9ObU3.webp`. FROZEN, before Oct 16 or after Nov 4.
  - Each `<ol>` row is `relative pl-9`. The marker is a 24px circle (`absolute left-0 rounded-full border border-border-strong bg-surface text-body-sm tabular-nums`) holding the number.
  - A 1px `bg-border` line (`absolute left-3`) joins each circle to the next.
  - The term is `text-label` and the sentence `text-body`. Keep the `<ol>` semantics.
  - Neutrality: none. It orders kinds of source, never sides or outlets.
- **LF5 App Store** (`privacy/page.tsx`; need: make a long legal page scannable). Image `img/app-store-29kmkfbU.webp`. Not frozen.
  - After the lede, three equal `Card`s, stacked on phones and `lg:grid-cols-3` at lg. Each has an h2 in `text-h3` that links to an id on its full section.
  - 'Only on your device': `kyv.district`, the kept candidates, the app-prompt flag, `kyv.ads-consent` and `kyv.donate-dismissed`, with the names taken from the same keys the prose uses.
  - 'Stored by us, only if you sign up for email': email, ZIP, consent time, unsubscribe token, subscribed flag and last welcome send.
  - 'Never stored': your address and your coordinates. Remove the 'or your ZIP' half once the address-only change removes ZIP entry from the location field.
  - The lines about ads, analytics and error reports follow the switches the prose already reads (`ADS_TAG_ENABLED`, `analyticsOn`, `errorReportsOn`).
  - Don't touch the Census wording that `scripts/verify-no-stored-location.ts` pins. The paragraphs below stay as the detail.
- **LF6 Attio** (/terms, /privacy, /about; the /methodology copy is frozen; need: stated dates and navigation between these pages). Image `img/attio-lslNzRXz.webp`.
  - `terms/page.tsx:37-40`: format the date with `Intl.DateTimeFormat('en-US', {dateStyle: 'long', timeZone: 'UTC'})` inside the existing `<time dateTime>`.
  - /privacy: add a `PRIVACY_UPDATED` constant and a 'Last updated …' line under the h1.
  - `<nav aria-label="About this guide">` holds About, How we stay fair (/methodology), Privacy and Terms, as a wrapped row under the h1. Each link is `inline-flex min-h-[24px]`. The current page is plain `text-on-surface` with `aria-current="page"`; the others are `text-primary underline`.
  - Adding the nav to /methodology is FROZEN, before Oct 16 or after Nov 4.

### Motion

| ID | Effect | Reduced motion and phones |
|---|---|---|
| LF1 Dub | lg only, optional: the current-item border and text colour change at 120ms (`motion.fast`, the default in `globals.css:103-104`) when the reader moves into a new section. `html { scroll-behavior: smooth }` only inside `@media (prefers-reduced-motion: no-preference)`. | `motion-reduce:transition-none`; anchor jumps are instant. Not shown on phones (LF3 replaces it). |
| LF3 Finimize | Writer's change: the caret rotates with no transition (home-readability §7), not the researcher's 120ms. | Nothing moves. |
| AM3 GetYourGuide | Writer's change: the caret flips with no transition. Rows appear with no height animation. | Nothing moves. |
| AM5 Workable | None, ever. Something filling toward 60% would read as results coming in. | Nothing moves. |

All other references in this group add no motion.

### Gaps

- **Equal-weight 'what a yes / no vote does' explainers.** Nearly every two-option screen Mobbin returned puts one side forward. Recolouring them doesn't help: with the highlight and badge removed, what is left is two equal boxes, which `MeasureVoteMeaning` already ships. The closest equal-weight pattern is AM2's Apple Store comparison, and it compares products, not consequences.
- **A 'needs X% to pass' diagram.** Mobbin has no static one. The results were goal sliders and progress bars with a fill, a 'you are here' dot or zone bands, which read as a target or a tally whatever their colour. AM5 is adapted from Workable's labelled reference tick.
- **Resource lists ordered by how established the source is, with opinion marked.** Every resource hub found was a marketing library with thumbnails (Stripe, Dropbox, Slack, Ramp). None groups by kind in a stated order or marks opinion pieces. News apps didn't match either.
- **Government or civic long-form pages (GOV.UK-like).** None came back. Every table-of-contents and legal reference is a SaaS terms page or a docs tool.
- **Motion for anchor jumps and scroll-spy.** Mobbin flows show only before and after states (Slite, Gemini, Hashnode, Linear), so the timing and easing of a moving highlight or a smooth scroll can't be seen there. The motion notes above come from design.md tokens and in-repo precedents (`globals.css:103-104`, `CandidateNews.tsx:113-114`), not from Mobbin.

### Dropped and why

Nothing here was dropped for colour, or for a placement we could move (founder, 2026-10-12). Each reason below is structural.

- **YES and NO side by side on phones (AM2 part a, Apple Store).** This is a reflow problem: at 320px it leaves two text columns of about 106px, around 5 lines deep each. YES above NO in ballot order gives neither side more weight, and AM1 already gives equal reach to both.
- **Two-option screens that put one side forward (Hims, Lovable, Emergent, Dribbble 'Most Popular', consent screens with one filled button).** Re-checked under the 'colours can change' note. With the highlight recoloured and the badge removed, they are the two equal boxes `MeasureVoteMeaning` already has, so there is nothing new to borrow.
- **Before-and-after pairs (Paired, Moonly).** The frame itself takes a side: 'before' and 'after' casts NO as the old state and YES as the improvement, whatever the colours.
- **Goal sliders and progress bars with fills, badges or zone bands (BitePal, Alma, The Outsiders, Hims BMI).** The fill or the 'you are here' dot is the problem, not its colour: on a ballot measure it reads as a running tally or a target. Only Workable's labelled tick is kept (AM5), without its range or dot.
- **Marketing resource hubs with thumbnails (Stripe, Dropbox, Slack, Ramp).** Every row would carry a third-party image right beside measure content, which the 'no art near measures' rule and ladder spec §6 rule out, and none of them marks opinion. Without the thumbnails, they are a plain list that AM4 Webflow shows better.
- **Apple Store's em dash for an empty cell.** Screen readers announce a dash inconsistently, and it can read as 'this side has no case'. AM2 says it in words instead.
- **Dub's numbered heading circles.** The methodology h2s aren't a sequence, and numbering them would suggest an order of importance.
- **Slite's dash that widens from 8px to 20px.** The 2px border in LF1 already marks the current item without relying on colour, so the width animation adds motion and no information. Slite's long-dash marker is merged into LF1.
- **Finimize's reading time and highlighted current item on phones.** A current-item marker needs scroll-spy inside a disclosure that is closed by default, where nobody would see it. Reading time breaks no rule but adds little, so it can be added later if wanted.
- **A reading-progress bar for /methodology (scroll-driven).** It is decorative motion on every scroll, including on phones, and `animation-timeline` is not Baseline.

---

## 5. News and states

/news (NewsFeed, NewsStoryCard, filters), the home NewsRail, /news/outlet and /news/outlet/[slug], empty states, the 404 page, the error page, loading skeletons, and LocationEntry's address errors.

- Line numbers were checked against this worktree at `4260eb9`, which already contains main `71db8fb` (#171/#172), so the LocationEntry lines match main.
- None of these files is in `FROZEN_FILES`. Two exceptions still need care. **LocationEntry** renders on the frozen YourRaces, so it lands **before Oct 16 or after Nov 4**. **NewsStoryCard** also renders on the frozen candidate page (CandidateNews uses its default card), so every change below goes in through NewsFeed or the `row` variant and never changes the default card.
- `src/lib/contact.ts` (`CONTACT_EMAIL`) is in `FROZEN_FILES`. NS9 and NS10 import it and do not edit it.
- Every image listed below was opened and checked against its description for this write-up. Colour and position were not counted against a reference, because both can be changed: where a reference's colours or layout don't fit, the Adaptation column says what changes.
- IDs use the prefix `NS` (news and states), so they don't clash with other sections or with the home plan's A/B/C items. This section doesn't repeat the home plan (`../home-readability-2026-10-12/home-readability.md`). NS5 builds on its A8, which caps phones at 4 stories, and NS7 picks up its item 6, the 13px meta lines.

### Current weaknesses

| # | Where | Weakness | Fixed by |
|---|---|---|---|
| 1 | `news/page.tsx:107-170` | County (5 values) and Issue are two native `<select>`s plus a "Show news" submit. Changing county takes 3 actions and a full GET. Nothing summarises the active filters, nothing removes or clears them, and there is no result count. The filter state appears only in the subtitle prose (`:61-72`). | MO6 Formula 1® (section 6) |
| 2 | `news/page.tsx:84-88` | The `news-empty` spot illustration sits in the /news header at lg, directly above the story list. design.md:260 says illustrations never appear in news slots. | No reference needed. Placement can change: remove it from the header, or move it well away from the list. |
| 3 | `NewsFeed.tsx:97-111` | The skeleton is three 80px bars, but a real card is a 2:1 banner plus meta line and headline (300px+), so the list jumps on load. `animate-pulse` loops with no `motion-reduce` variant, and so do `races/[raceId]/loading.tsx:12-17` and `candidates/[candidateId]/loading.tsx:4-5`. The status exists only as an `aria-label`, never as visible text. The candidate skeleton is one shapeless 520px slab. | NS4 |
| 4 | `NewsFeed.tsx:114-120` | The error state says "refresh to try again" and has no retry control. | NS2 |
| 5 | `news/outlet/[slug]/page.tsx:81-82, 145-153` | A failed Supabase read becomes `rows = []` and renders "No stories from this outlet yet.", so an outage reads as a factual empty result about that outlet. | NS2 |
| 6 | `NewsFeed.tsx:146-157`, `:122-144` | The county-only empty state has no next step. The issue-empty state offers only "Show all stories", even when a county is also set. | NS3 |
| 7 | `NewsFeed.tsx:159-219`, `NewsStoryCard.tsx:166-170` | Every /news story is a full card with a 2:1 banner, so a 375px screen holds about 1.5 stories. There is no date grouping, and with a county picked a card doesn't say whether it is county or statewide (`regionLabel` is never passed). `headingLevel="h2"` (`:171`) works around the missing group heading. | NS7, NS8 |
| 8 | `NewsRail.tsx:62-85` | The region chips show no counts. With `SHOW = 8`, "All Florida" never says how many stories exist, and a county with 1 story looks the same as one with 20. | NS5 (gated) |
| 9 | `NewsRail.tsx:89` | `aria-live="polite"` sits on the whole `<ul>`, so a screen reader re-reads up to 8 headlines on every chip press, and there is no short status line. | NS5 |
| 10 | `NewsStoryCard.tsx:187-205` | In the row variant the meta line is 13px (`text-caption`) and the inline publisher link is about 18px tall. | NS7 |
| 11 | `news/outlet/page.tsx:126-190` | The method is one prose paragraph: it names no raters and gives no count of unrated outlets. Then come 37 identical bordered cards that each repeat the "Political lean" and "Stories" labels. | NS6 (method). The cards are a gap. |
| 12 | `not-found.tsx:24-26` | There is one link ("See the races we cover"). A bad `/news/outlet/<slug>` (`notFound()` at `[slug]/page.tsx:45`) lands here with no way back to the outlet list. | NS9 |
| 13 | `error.tsx:6-23` | `error.digest` is ignored and `CONTACT_EMAIL` is never offered, so a voter can't report the problem or quote a reference. | NS10 |
| 14 | `LocationEntry.tsx:78-94` | The `UNMATCHED` messages are run-on sentences of 25-40 words, each listing several fixes, and four of the five end "or enter just your 5-digit ZIP", an option that is being removed. | NS1 |
| 15 | `LocationEntry.tsx:461-469`, `:521-525`, `:515-519` + `:529-532` | The field error is red text with no icon. A network or server error renders below the coverage disclaimer, away from the field and button, with no retry. The out-of-coverage state repeats the coverage sentence that is already on screen. Renders on frozen YourRaces. | NS1 |
| 16 | `YourRaces.tsx:259-266` (FROZEN) | The truly-empty state ends "Check back soon." with no next step. | No reference. See Gaps. |

### References

| ID | App | Platform | Kind | Link | What it shows | Change to make | Adaptation | Motion | Frozen | Effort | Value |
|---|---|---|---|---|---|---|---|---|---|---|---|
| NS1 | Walmart | web | screen | [Mobbin](https://mobbin.com/screens/f30859f8-f250-4748-9550-db513e4abe0e) | "Add Address" side sheet: one sentence saying the address couldn't be verified, then "Issues: • Street Address Line 1 maybe incorrect", an "Entered:" block echoing the address with "Edit", a "Suggested:" block, a primary "Use suggested address" and a text link "Continue with entered address". | Rebuild each `UNMATCHED` error in four parts: a one-line lead, a "What to check" list of 1-3 items, "You entered: …" with "Edit address", and "Choose your district instead". Move the non-field error up under the button row and give it "Try again". Say the coverage sentence once. | ZIP-only entry is gone, so every message ends in the district picker, never "Use my ZIP". A ZIP *inside* a full street address stays: that is part of an address. The error sits inline under the field, not in a side sheet. It uses our error token and the address group's error glyph, not Walmart blue. | None. Focus returns to the field, and `role="alert"` announces the lead line only. | **Yes (adjacent)**: before Oct 16 or after Nov 4 | M | high |
| NS2 | Klaviyo | web | flow | [Mobbin](https://mobbin.com/flows/89f7176c-6998-415e-a68a-9eda2c8dd6be) | Only the content region fails. The header and sidebar stay, and the region shows "Something went wrong", a two-sentence next step and one "Try again" button. | NewsFeed: a "Try again" button that refetches in place and keeps county and issue. Outlet page: branch on `error` and show the same message instead of "No stories from this outlet yet." | Klaviyo's centred dark button becomes our secondary `Button`, left-aligned in the 680px column. | None. The label changes to "Trying again…". | No | S | high |
| NS3 | Pinterest | web | screen | [Mobbin](https://mobbin.com/screens/45560b08-b73e-4f7e-8a82-878c035ddd68) | "Tweak your search": a heading and one sentence, one grey button per active filter ("Remove on sale", "Remove price"…), then "Clear all filters". The filter rail stays visible. | A one-line lead, the existing honest explanation, then one link-button per way out: remove the issue, remove the county, show all Florida news. The county-only state adds "See statewide news" and "Where the news comes from". | The illustration is dropped (no art in news slots). The grey pills become our secondary-button links. The copy blames our tagging, not the voter's filters. | None. | No | S | high |
| NS4 | TradingView | ios | screen | [Mobbin](https://mobbin.com/screens/86567892-ad6e-41a1-a8d9-db8f8c4d678f) | "News by watchlist" loading: under tabs that have already loaded, each placeholder row has a small circle and three short bars, then two or three headline bars. Only some rows have a thumbnail block. Very pale fills, no borders, no spinner. | Replace the three 80px bars with four placeholder rows shaped like NS7's list rows, with no pulse. Visible text "Loading the latest stories…" becomes the `role="status"` content. | The pale blue becomes `bg-surface-muted`. The source circle goes (we show no outlet logos). The pulse cap is cut from 3 cycles to 2: `animate-pulse` is 2s a cycle, so 3 cycles run 6s, past WCAG 2.2.2's 5s. | Static by default. A pulse, if one is kept, is motion-safe and at most 2 cycles. The list replaces it in place, with at most a 120ms opacity fade at lg+ under motion-safe. | No | S | high |
| NS5 | CVS Health | ios | screen | [Mobbin](https://mobbin.com/screens/0e81b9aa-935f-4bd2-976e-80e9054f3213) | Weekly-ad list view: wrapping outlined pills in a fixed alphabetical order ("All 262", "ExtraBucks 127", "Baby 5"…). The selected pill is filled, and each count follows its label in a lighter weight. | Now: replace `aria-live` on the `<ul>` with an sr-only status line. Later, only after the news-fairness §2 check: a 45-day count after each region label, plus a caption saying what the counts cover. | The dark-blue fill becomes NewsRail's existing `bg-on-surface`. Alphabetical order becomes `regionOrder`, never sorted by count. | Colour change only (the existing `transition-colors`, 120ms) plus `motion-reduce:transition-none`. The list swaps instantly. | No | S | high |
| NS6 | Particle News | ios | screen | [Mobbin](https://mobbin.com/screens/73815a7f-3412-44eb-ba9a-6253efaea52b) | A "Political Spectrum" sheet: placement is aggregated from named non-partisan raters (AllSides, Ad Fontes Media, MBFC, each a link), and it is for the publisher, not the article. A "6 UNRATED" row sits above a left-to-right spectrum of outlet logos. | On the outlet index, a boxed "How we disclose political lean": the three raters as links, "A rating describes an outlet, not an article.", and counts for every lean state. Each outlet page's lean box links to it. | Text only. The spectrum and logos are left out, and not for their red and blue: a left-to-right placement scores lean in any palette, and news-fairness.md §1 says lean is disclosed, never scored. | None. A native `<details>`, if used, opens with no animation. | No | S | high |
| NS7 | Substack | web | screen | [Mobbin](https://mobbin.com/screens/3e08654e-18f8-4ee4-aa44-1fdcc1c454f3) | A reading column of ruled rows. Each has the publication name in small caps and the date right-aligned on one line, a bold headline, a one-line grey dek, an author and read-time line, and a photo thumbnail on the right. | /news uses the `row` card shape (or a new `list` variant) sized for the 680px column: thumbnail on the right, a 14px meta line with the date pushed right, a headline, a 2-line dek, and hairline rows. | No unread dots, no "Priority" sort and no author/read-time line (we don't have the data). Order stays newest-first. Substack's orange plays no part. | None. Optional hover `bg-surface-muted` at 120ms with `motion-reduce:transition-none`. | No | M | high |
| NS8 | Lightyear | ios | screen | [Mobbin](https://mobbin.com/screens/d647f067-f5bb-4fb4-82c6-bc806d1daa36) | A scope title ("News · Apple"), a "Today" group heading, then rows with a ticker line, a 2-3 line headline, "Bloomberg Technology · ~1h" and a square thumbnail. | Group /news by Florida calendar day under an h2 that states the date ("Monday, October 12"). Headlines go back to h3. | Stated dates replace "Today" and "~1h". The ticker line is dropped. Headings aren't sticky. | None. | No | S | medium |
| NS9 | SpaceXAI | web | section | [Mobbin](https://mobbin.com/sites/sections/3ca82844-3f5f-43a0-b336-0cf721303c58) | Left: a huge pale "404", "Page not found", one sentence and "Back to home". Right: "Helpful links", ruled rows with a name, a short grey description and an arrow. | Keep the art row and h1, then add "Helpful links" as `LinkRowList` rows in a fixed order. Add a `news/outlet` not-found whose first row is "All outlets". | One column under our art, not two. The giant numeral isn't copied, because the art already fills that role. | None. | No | S | medium |
| NS10 | Tines | web | flow | [Mobbin](https://mobbin.com/flows/21eb677a-51ae-450c-8aea-5d9bc4fd240a) | A full-page "We're sorry, an error has occurred." with one "Reload the application" button and a collapsed "▸ Error signature" disclosure. The flow's last step opens it on the raw stack. | Show `error.digest` in a native `<details>` "Error reference", with one line inviting an email to `CONTACT_EMAIL` that includes the reference. | Only the digest is shown, never the message or the stack. The purple button becomes our primary `Button`. | None. | No | S | medium |

### Build notes

- **NS1 Walmart: address errors with a way forward** (`LocationEntry.tsx`, renders on frozen YourRaces, **before Oct 16 or after Nov 4**, in the same PR that removes ZIP-only entry).
  - `UNMATCHED` (`:78-94`) becomes `{ lead, checks[] }` per reason. `lead` is "We couldn't match that address" (for `ambiguous`: "That address matches more than one place"). `checks` keeps each reason's specific fix and drops every "or enter just your 5-digit ZIP":
    - `none`: the house number and street; the city and ZIP.
    - `needsPlace`: add the city and ZIP to the address.
    - `placeConflict`: the city and ZIP as they appear on your mail.
    - `checkStreet`: the direction (like N or SW) and the street type (like St or Ave).
    - `ambiguous`: the ZIP and the street's direction.
  - What renders under the field: the lead line (`role="alert"` on that line only, `text-body-sm text-error` plus the address group's error glyph); then a `<ul>` "What to check" in `text-body-sm text-on-surface`; then "You entered: {value}" on screen only, read from local state, with an "Edit address" button that focuses `#location` and keeps the text; then "Choose your district instead", which opens and focuses the district picker. Offer "Did you mean …?" only if `/api/resolve` already returns Census's matched address. Never echo the address into `track()`, a log or a URL.
  - Move the non-field error (`:521-525`) under the button row, with a secondary "Try again" that resubmits the same value.
  - In the `outOfCoverage` state (`:527-535`), drop the repeat of the coverage sentence that `:515-519` already shows. One coverage statement on screen.
  - Neutrality: none; this is geography only.
- **NS2 Klaviyo: error is never "empty"** (`NewsFeed.tsx:114-120`; `news/outlet/[slug]/page.tsx:81-82, 145-153`). Not frozen.
  - NewsFeed: keep `role="alert"`, with the copy "We couldn't load the news. Try again, or check back in a few minutes." Add a secondary `Button` "Try again" that increments an `attempt` state in the fetch `useEffect`'s deps. That refetches with no reload and keeps county and issue. While it runs, the button reads "Trying again…" and is disabled.
  - Outlet page: when `error` is set, render that message with "Try again" as a link to the same URL, instead of either empty-outlet sentence. The "no way to read this outlet" sentence stays for real no-feed outlets.
  - Neutrality: it fixes a real misstatement. Today a database error claims an outlet has no stories.
- **NS3 Pinterest: empty states with a next step** (`NewsFeed.tsx:122-157`). Not frozen.
  - The lead is `text-label`, e.g. 'No stories here are tagged "Housing" yet'. Keep the existing explanation in `text-body-sm text-on-surface-muted`.
  - Then `<Link>`s styled as secondary buttons (`rounded-md border border-border-strong px-[20px] py-3 text-label text-primary min-h-[44px]`), one per way out, in this order and only when they apply: "Remove the issue filter" (`/news?county=…`), "Remove the county" (`/news?issue=…`), "Show all Florida news" (`/news`).
  - The county-only state gets "See statewide news" and "Where the news comes from" (`/news/outlet`).
  - No illustration, and never a "related" candidate, race or story. The copy keeps saying that an empty filter shows how far our tagging has reached, not how much the press covered.
- **NS4 TradingView: shape-matched, static skeleton** (`NewsFeed.tsx:97-111`). Not frozen.
  - Four rows, each:
    - a meta bar, `w-40 h-[1lh]` at `text-body-sm` metrics;
    - two headline bars, `h-[1lh]` (`w-full`, `w-3/4`);
    - on rows 1 and 3 only, a 120×90 block on the right (88×66 below sm).
  - Fill `bg-surface-muted rounded-sm`, with `border-b border-border` between rows.
  - The `role="status"` element shows the visible text "Loading the latest stories…" (`text-body-sm text-on-surface-muted`) and drops the `aria-label`.
  - Don't edit the frozen `races/[raceId]/loading.tsx` or `candidates/[candidateId]/loading.tsx`. The site-wide `prefers-reduced-motion` rule in `globals.css` (motion section) stops and caps their pulse without touching them. Reshaping those skeletons is frozen work, before Oct 16 or after Nov 4. If it happens, keep the race skeleton's two equal columns, so no candidate slot looks larger even while loading.
- **NS5 CVS Health: chip status now, counts later** (`NewsRail.tsx`). Not frozen. Lands after home PR A, whose A8 also edits this file.
  - Now: remove `aria-live` from the `<ul>` (`:89`). Add `<p role="status" className="sr-only">Showing {region label} stories, newest first.</p>`. It carries no number, because after A8 phones show 4 stories and desktop shows 8.
  - Later, only after news-fairness.md §2's source check finds no pipeline gap (missing feed or alias): add `<span className="ms-1 font-normal tabular-nums">{n}</span>` after each chip label, counted over the full 45-day fetch rather than the capped list. Add a caption under the h2: "Counts are stories from the last 45 days." Keep `regionOrder`, never sort by count, and put no counts on the issue filter (most stories are untagged).
  - Neutrality: medium. A county with 2 stories next to one with 18 is a real skew, and AGENTS.md allows showing it with context. Never pad or trim to even it out.
- **NS6 Particle News: lean disclosure as text** (`news/outlet/page.tsx:126-133`). Not frozen.
  - Keep the existing paragraph. Under it, add a `rounded-lg border border-border bg-surface-muted p-4` block with `id="how-lean-is-disclosed"` and an h2 "How we disclose political lean".
  - The block holds:
    - one sentence naming AllSides, Ad Fontes Media and Media Bias/Fact Check as plain links (the raters `news-outlets.ts:118` already names);
    - "A rating describes an outlet, not an article.";
    - counts computed from `leanDisclosure` over the list: "Of {total} outlets: {k} rated, {u} with no independent rating, {p} not yet reviewed." Keep every state separate; never merge them.
  - On each outlet page, the lean box links to that block as "How lean is disclosed". No spectrum, no colour, no logos.
- **NS7 Substack: list rows on /news** (`NewsFeed.tsx`, `NewsStoryCard.tsx` row variant). Not frozen, as long as the default card used by CandidateNews is untouched.
  - Pass `variant="row"` (or a new `list` variant) from NewsFeed only.
  - Thumbnail on the right: `aspect-[4/3] rounded-sm`, 120px from sm, 88px below.
  - Meta line: flag, publisher link, then the stated date, pushed right with `sm:ms-auto`. Use `text-body-sm` (14px). The publisher link gets `inline-flex min-h-[24px] items-center`.
  - Headline `text-label leading-snug`, `text-h3` at lg. Dek `text-body-sm line-clamp-2 text-on-surface-muted`.
  - Rows `border-b border-border py-4` with no card border. Opinion keeps its `bg-surface-muted` inset. Footer links `inline-flex min-h-[24px]`. Rows without an image run full width.
  - With a county set, pass `regionLabel` so each row says "Statewide" or "{County} County". FeedItem needs its region added from `newsScopes`.
  - The 14px meta line also reaches the home NewsRail through the shared row variant. That is the home plan's item 6, landing early for the row variant only. The candidate page's default card waits until after Nov 4.
- **NS8 Lightyear: date groups** (`NewsFeed.tsx`). Not frozen.
  - Group items by Florida calendar day using `publishedAt` (always present).
  - Each group gets `<h2 className="text-label text-on-surface border-b border-border pb-1">` with `toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' })`, the same zone as HomeNews.
  - Cards go back to their default h3, which removes the `headingLevel="h2"` workaround at `:171`.
  - Never "Today", "Yesterday" or "2h", and never "Top" or "Most covered" groups.
- **NS9 SpaceXAI: 404 helpful links** (`src/app/not-found.tsx`; new `src/app/(public)/news/outlet/not-found.tsx`). Not frozen.
  - Below the existing link, add an h2 "Helpful links" and a `LinkRowList` in this fixed order:

    | Row | Link |
    |---|---|
    | "Races on every Florida ballot" | `/` |
    | "Election news" | `/news` |
    | "Where the news comes from" | `/news/outlet` |
    | "How we stay fair" | `/methodology` |
    | "Get in touch" | `mailto:${CONTACT_EMAIL}` |

  - Each row has a `text-label` title, a `text-body-sm` description and `min-h-[48px]`.
  - The outlet not-found puts "All outlets" (`/news/outlet`) first.
  - Rows are site sections only, never a named candidate, race or measure. The art stays on its own row above the h1, as design.md's phone-art list allows (120px).
- **NS10 Tines: error reference** (`src/app/error.tsx`). Not frozen.
  - Only when `error.digest` exists, render under the buttons: `<details><summary className="text-body-sm">Error reference</summary><code className="font-mono text-mono">{error.digest}</code></details>`.
  - Below it, add "If this keeps happening, email us at {CONTACT_EMAIL} and include the reference." as a mailto link.
  - Never show `error.message` or a stack. "Try again" (`reset`) stays the one primary action.

### Motion

| ID | Effect | Reduced motion and phones |
|---|---|---|
| NS4 TradingView | Static placeholders. If a pulse is kept: motion-safe, at most 2 cycles (4s). Loaded rows replace them in place, with at most a 120ms opacity fade at lg+. | Static blocks; instant swap. Nothing moves below lg. |
| NS5 CVS Health | The chip changes colour over 120ms (existing `transition-colors`). The list swaps with no reorder animation. | `motion-reduce:transition-none`: instant. |
| NS7 Substack | Optional row hover: `bg-surface-muted` over 120ms. | `motion-reduce:transition-none`. Hover doesn't occur on touch. |

Nothing else here moves. Error, empty and 404 states change text and focus only.

### Suggested order

1. **By Fri Oct 16:** NS1 (frozen-adjacent), in the same PR that removes ZIP-only entry.
2. **Any time, small, high value:** NS2, NS3, NS4, NS5 (status line only), NS6.
3. **Then:** NS7 with NS8 (one NewsFeed PR, so the skeleton in NS4 and the rows match), NS9, NS10.
4. **Gated:** NS5's counts, after the news-fairness §2 source check.

### Gaps

- **/news filter controls (weakness 1).** Covered by MO6 Formula 1® in section 6: county chips as `<Link>`s in NewsRail's chip style (fixed order, `aria-current`, 40px tall), the Issue `<select>` with its own Apply (WCAG 3.2.2), a "{N} stories" line and "Remove the issue filter". Klarna's pills are folded in. Not frozen.
- **Pipeline-honest empty states.** Every "no results" state on Mobbin blames the user's filters. None explains that a result is empty because our pipeline hasn't reached it yet (stories not yet tagged, an outlet with no readable feed). NS3 supplies only the remove-filter mechanics; the copy is ours.
- **Showing a skew with context.** No reference shows a calm, uncoloured line like "14 stories for Broward, 3 for Orange in the last 45 days". CVS count chips (NS5) are the nearest pattern, and the caption is ours.
- **Lean disclosure without placement.** Every source-bias pattern found (Particle, Ground-News-style coverage bars) places outlets on a left-right spectrum. Recolouring wouldn't fix that, because the placement is the score. Only Particle's text structure is usable.
- **Partial geographic coverage.** No address flow shows "we can serve part of your ballot (statewide) but not your district". The "no matches" states on Care.com and Agoda come from filters, not coverage. NS1's out-of-coverage copy is ours.
- **Reduced motion can't be judged from stills.** No reference shows whether a skeleton stops under `prefers-reduced-motion` or after 5 seconds. NS4 sidesteps this by being static.
- **Feed freshness with a stated time.** Buffer's "Last refreshed 40 minutes ago" is relative. Nothing shows a stated "Checked for new stories at 9:40 a.m.", and we have no sweep-time field to feed one.
- **YourRaces truly-empty state** (`YourRaces.tsx:259-266`, FROZEN). No reference. A separate session is making sure no covered race is empty. This state means nothing at all is visible for a location, and it still needs a next step in place of "Check back soon.": the statewide ballot and key dates. Before Oct 16 or after Nov 4.
- **Outlet index cards.** NS6 fixes the method, but the 37 cards that repeat "Political lean" and "Stories" have no reference. Making the list more compact is a later option.
- **The /news header illustration (weakness 2)** needs no reference. Placement can change, so it is a one-line move or removal.

### Dropped and why

Neither reference dropped from this group was dropped for its colour or its position.

- **Pinterest, as CandidateBrowser's zero-results state** ([Mobbin](https://mobbin.com/screens/45560b08-b73e-4f7e-8a82-878c035ddd68)). It duplicates the Google Drive entry for that use, which already puts per-filter remove links above and inside the empty result (`CandidateBrowser.tsx:136-138`). The same screen stays kept for NewsFeed's empty states (NS3), so this drops one use, not the URL.
- **Klarna, active-filter pills** ([Mobbin](https://mobbin.com/screens/2ff7fdaf-9702-4d37-9d3a-72eb63cf463c)). This is a duplicate, not a colour problem: the black pills could take our tokens. The pattern (removable active-filter pills, a "<N> stories" line kept beside the tagging sentence, and a "Remove the issue filter" link) is folded into MO6 Formula 1® (section 6).

Parts of kept references left out (the rest of each reference stays):

- **Particle's spectrum bar and the logos placed along it** (NS6). The reason is not its red and blue. Placing outlets on a left-right line scores lean in any palette, and news-fairness.md §1 says lean is disclosed, never scored.
- **Pinterest's empty-state illustration** (NS3). No art in news slots. The buttons and copy structure are kept.
- **Relative times** ("Today", "Yesterday", "~1h", "2h", "Last refreshed 40 minutes ago") in NS8. Dates are stated, never counted.
- **Substack's unread dots and "Priority" sort** (NS7). Order stays newest-first, and nothing is featured.
- **A whole-list fade on NewsRail chip changes** (the earlier Formula 1 NewsRail idea). News rows name candidates, so even a list fade puts motion on candidate content. Its useful part, the status line, is in NS5.
- **Shimmer sweeps and infinite pulses** (NS4). A moving gradient or loop that runs past 5 seconds falls under WCAG 2.2.2.
- **Tines' raw stack trace** (NS10). Too much for voters, and it can leak internals. Only the digest is shown.
- **Counts on the issue filter** (NS5). Most stories are untagged, so an issue count would read as a coverage finding.

### Images

The local files are in `img/`, which is gitignored because the repo is public. Image URLs expire about 30 days after 2026-10-12.

| ID | App | Local file | image_url | mobbin_url |
|---|---|---|---|---|
| NS1 | Walmart | `img/walmart-HRm834T5.webp` | https://mobbin.com/api/mcp/short/HRm834T5 | https://mobbin.com/screens/f30859f8-f250-4748-9550-db513e4abe0e |
| NS2 | Klaviyo | `img/klaviyo-CPjQoWQY.webp` | https://mobbin.com/api/mcp/short/CPjQoWQY | https://mobbin.com/flows/89f7176c-6998-415e-a68a-9eda2c8dd6be |
| NS3 | Pinterest | `img/pinterest-lIYFbZuC.webp` | https://mobbin.com/api/mcp/short/lIYFbZuC | https://mobbin.com/screens/45560b08-b73e-4f7e-8a82-878c035ddd68 |
| NS4 | TradingView | `img/tradingview-Bik93Ioj.webp` | https://mobbin.com/api/mcp/short/Bik93Ioj | https://mobbin.com/screens/86567892-ad6e-41a1-a8d9-db8f8c4d678f |
| NS5 | CVS Health | `img/cvs-health-Dck7IzaU.webp` | https://mobbin.com/api/mcp/short/Dck7IzaU | https://mobbin.com/screens/0e81b9aa-935f-4bd2-976e-80e9054f3213 |
| NS6 | Particle News | `img/particle-news-V2ReWamJ.webp` | https://mobbin.com/api/mcp/short/V2ReWamJ | https://mobbin.com/screens/73815a7f-3412-44eb-ba9a-6253efaea52b |
| NS7 | Substack | `img/substack-nwKjecCD.webp` | https://mobbin.com/api/mcp/short/nwKjecCD | https://mobbin.com/screens/3e08654e-18f8-4ee4-aa44-1fdcc1c454f3 |
| NS8 | Lightyear | `img/lightyear-15pgzCPg.webp` | https://mobbin.com/api/mcp/short/15pgzCPg | https://mobbin.com/screens/d647f067-f5bb-4fb4-82c6-bc806d1daa36 |
| NS9 | SpaceXAI | `img/spacexai-Fj6i7r0i.webp` | https://mobbin.com/api/mcp/short/Fj6i7r0i | https://mobbin.com/sites/sections/3ca82844-3f5f-43a0-b336-0cf721303c58 |
| NS10 | Tines | `img/tines-GardFSjQ.webp` | https://mobbin.com/api/mcp/short/GardFSjQ | https://mobbin.com/flows/21eb677a-51ae-450c-8aea-5d9bc4fd240a |

---

## 6. Motion, site-wide

Motion patterns from Mobbin flows and pre-made motion code (CSS, React ViewTransition, Motion-based libraries). This covers the site-wide layer: motion tokens and the reduced-motion safety net, one enter primitive, two allow-listed View Transition morphs and the non-candidate disclosures. It also covers the small feedback states that today pop in, jump, or confirm only to screen readers. Every other section's motion notes assume MO1 (tokens) and MO2 (enter classes) exist.

- Line numbers were checked against this worktree at `4260eb9`, which contains main `71db8fb`. Nothing under `src/` or `public/` was edited.
- **Phones.** This section follows decision D2 (a) (see Founder decisions): below lg, only colour changes and loading indicators move. Every fade, rise, morph and height ease here sits inside `@media (min-width: 64rem) and (prefers-reduced-motion: no-preference)`.
- **Frozen** column: **Yes** = edits a frozen page or a `FROZEN_FILES` component. **Adjacent** = edits no frozen file but changes what a frozen page does (through `globals.css`, or a component rendered inside a frozen one). Both mean **before Oct 16 or after Nov 4**. **No** = any time.
- Colour and position were not counted against any reference, because both can change. The Adaptation column says what changes. Drops below are only for a reason built into the pattern, or for duplicates.
- **"Zip" (MO12) is the Zip payments app** (buy now, pay later). The reference is its FAQ screen. It has nothing to do with ZIP codes. The location field is address-only (founder, 10-12), and nothing here adds a ZIP path.
- Every image was opened and checked against its description. 13 kept: 9 Mobbin flows and 4 platform docs (MDN ×3, the Next 16 guide). Mobbin wasn't re-queried this run (its connector needs re-authorisation), so the three images the first run hadn't saved were downloaded from their `image_url`.
- Changes from the first catalog: the Mobbin tab morph (MO10), the Wix indicator (MO11) and React ViewTransition (MO9) are reinstated, lg+ only, behind an allow-list and a verify script. The Vimeo listbox enter (MO8) is back. Slite (MO7) is now a static mark with no tint animation. Formula 1 (MO6) lives here for the /news county chips (section 5, weakness 1, had no reference).
- Writer's reconciliations of the researchers' drafts:
  - Motion follows the how-to where they disagreed. MO4, MO5 and MO7 have no motion. MO6 is colour only.
  - Value follows each draft's own "value low" note: MO3, MO8, MO10, MO12. MO9 and MO13 are worth no more than the entries they serve.
  - MO1 and MO7 are Adjacent, because they change frozen routes from `globals.css`.
  - MO4 keeps the link's purpose in its accessible name.
  - MO3's backdrop transition sits on `::backdrop` and uses literal values.
  - MO7 must be unlayered, and draws its mark outside the text.

**Motion audit.** `HeroRotator.module.css:60-150` holds the only keyframes. They run lg+ and motion-safe only, pause offscreen and in hidden tabs, and have a Pause button, so they are compliant and left alone. Everything else is `transition-colors` or `transition-shadow` at the 120ms token (`globals.css:103-104`), plus Button's press scale (`Button.tsx:11`, already off under `motion-reduce`). Nothing uses `view-transition`, `@starting-style`, `::details-content` or `scroll-behavior`.

### Current weaknesses

| # | Where | Weakness | Fixed by |
|---|---|---|---|
| 1 | `globals.css:99-104` | Only the 120ms default and its easing exist. design.md's motion.base (200ms) and motion.slow (320ms) have no variables. There is no global `prefers-reduced-motion` rule, so each component opts out on its own. | MO1 |
| 2 | `races/[raceId]/loading.tsx:12-16`, `candidates/[candidateId]/loading.tsx:4-5`, `NewsFeed.tsx:107` | `animate-pulse` loops forever and has no `motion-reduce` variant, and Tailwind's pulse ignores reduced motion. These are the only looping animations a reduced-motion user still gets, and on race and candidate routes they pulse exactly where candidate content will render. The two `loading.tsx` files aren't in `FROZEN_FILES` but render on frozen routes. | MO1 caps and kills the pulse with no edit to those files. The NewsFeed row shape is NS4. |
| 3 | `RaceCompare.tsx:259` (FROZEN) | The issue-row caret has `transition-transform` (120ms, already `motion-reduce:transition-none`). It is the only transition inside a race comparison, against "never on candidate content" and home-readability §7. | No reference: delete `transition-transform`. Before Oct 16 or after Nov 4. |
| 4 | `SitePrompts.tsx:98`, `:254-265`, `:178` | The donate `<dialog>` and its 40% backdrop appear instantly through `showModal()`. It unmounts on close, so it has no exit state. The cookie banner pops in, fixed over content. | MO3 (on MO2) |
| 5 | `DistrictChip.tsx:102-115` | After Forget, only an sr-only suffix confirms it. Sighted voters see the chip silently turn into "Choose your district". (The panel's enter at `:134` is HM2.) | MO4 |
| 6 | `InstallCard.tsx:64-70` | Dismiss removes the card at once. Everything below jumps up by its height, and the only confirmation is an sr-only stand-in. | MO5 |
| 7 | `news/page.tsx:107-170` | County is a `<select>` plus a "Show news" submit: three actions and a full GET to change it (section 5, weakness 1). | MO6 |
| 8 | `methodology/page.tsx:295, 299, 369, 431, 464, 713`; `CoverageSummary.tsx:136`; `YourRaces.tsx:255`; `ClaimList.tsx:129` | Jumps to `#limits` (`:695`), `#not-covered` (`:748`) and `#issue-list` (`:436`, a `<details>`) on a 965-line page land with no sign of which section is the target. | MO7 |
| 9 | `LocationEntry.tsx:477`, `:507` | The suggestion listbox pops in under the field. "Looking up…" is only a button-label swap, with no `aria-busy`. Suggestions are off in production. Frozen-adjacent (renders in YourRaces). | MO8 |
| 10 | `candidates/page.tsx:90-108` | The three view tabs are full navigations. The active pill only changes colour, and nothing carries over between views. | RC7 (restyle), then MO10 (optional lg morph) |
| 11 | `SectionNav.tsx:157-162` | The 16×2px accent indicator unmounts from one item and mounts on the next. It is one `<nav>`, at the bottom below md and at the top from md. | MO11 (lg+ only) |
| 12 | `methodology/page.tsx:436`, `:623` | The page's two long `<details>` snap open and shut. | MO12, MO13 |
| 13 | `NewsRail.tsx:89` | `aria-live="polite"` sits on the whole `<ul>`, so up to 8 headlines are re-read on every chip press. | NS5's status line. No motion: the NewsRail list fade is dropped (below). |
| 14 | `VotingInfo.tsx:115-137` | On "sent", a form of about 250px becomes one paragraph, so the layout jumps. | The Langdock entry (section 1) keeps the Card mounted. No motion added. |
| 15 | all of `src` | There is no `navigator.clipboard` or `navigator.share`, so a copy-link confirmation has nowhere to live. | RS11 Tripadvisor and CP11 (share). Their motion is a label swap only. |

### References

| ID | App | Platform | Kind | Link | What it shows | Change to make | Adaptation | Motion | Frozen | Effort | Value |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MO1 | CSS prefers-reduced-motion (MDN) | web | platform doc | [Docs](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) | MDN reference for the media feature (no image). The site uses it piecemeal (HeroRotator, Button, RaceCompare) and has no global rule. | Motion tokens on `:root`, a 2-cycle cap on `animate-pulse` through `@theme`, and one global reduced-motion rule. Its own PR (M0). | None. | None. It removes motion for reduced-motion users and stops the pulse after 4s for everyone. | Adjacent | S | high |
| MO2 | CSS @starting-style (MDN) | web | platform doc | [Docs](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) | MDN reference (no image). `@starting-style` gives an element's "before" values on its first style update, so a newly inserted element transitions in with plain CSS. Baseline 2024. | Two classes: `kyv-enter` (200ms fade + 8px rise) and `kyv-enter-fast` (120ms fade + 4px drop). They are active at lg+ only and never go on ballot content. | Replaces tw-animate-css and Motion's AnimatePresence at 0 KB. | Fade + small translate on mount, lg+, enter only. | No | S | medium |
| MO3 | HelloFresh | web | flow | [Mobbin](https://mobbin.com/flows/e2d6fd9b-819b-481e-98b1-2c1f4a9f4b3e) | "Donating a meal box": a cream top sheet drops over a dimmed meal grid. Choosing Donate swaps the same sheet's content in place, and the flow ends on a full-page thank-you. | The donate dialog gets `kyv-dialog`: a 200ms fade + 8px rise and a 0→40% backdrop fade. The cookie banner gets `kyv-enter`. Enter only. | The cream sheet becomes our surface tokens. The backdrop transition goes on `::backdrop` with literal values. Instant on phones. | lg+: 200ms fade + 8px rise, backdrop 0→40%. | No | S | low |
| MO4 | Google Gemini | web | flow | [Mobbin](https://mobbin.com/flows/e7f8db06-ee0c-4723-89ba-36b512561041) | "Updating location": "Update location" sits under the sidebar's location line. An explainer dialog opens, a dark "Updating location…" snackbar appears bottom-left, and the line changes to the new place. | After Forget, the chip's visible text reads "District forgotten" until it loses focus, replacing today's sr-only-only confirmation. | No snackbar, because the phone bar has no room for one. An sr-only ": choose your district" after the visible words keeps the link's purpose in its name. | None (a text swap). | No | S | medium |
| MO5 | Nibble | ios | flow | [Mobbin](https://mobbin.com/flows/4f7e3b25-a3be-497e-bf63-2fe64cb43614) | "Hiding special offer": after Hide, the card's slot holds a short card with a purple check, "Okay, it won't show up here anymore", and where to find the offer later. "New releases" moves up beneath it. | InstallCard's sr-only stand-in becomes a visible one-line note in the card's place. | Text only: no check badge, no purple, no card border. No height animation at any width. | None. | No | S | medium |
| MO6 | Formula 1® | ios | flow | [Mobbin](https://mobbin.com/flows/3518e6b2-537d-471b-bad6-1092b14cd1ac) | "Filtering articles": a pill row under "LATEST F1 NEWS" (All filled black, the others grey) above thumbnail, headline and stated-date rows. A filter menu narrows the list to videos. | /news: the County select and "Show news" become one link chip per county, in today's order. Issue stays a select with its own Apply. Add a "{N} stories" line and "Remove the issue filter". | The black pill becomes our on-surface ink. Chips stay in fixed county order, never ordered by volume. The same flow's NewsRail list fade is dropped. | Colour only: chip colour at 120ms, `motion-reduce:transition-none`. The list is a new render with no transition. | No | S | medium |
| MO7 | Slite | web | flow | [Mobbin](https://mobbin.com/flows/3d298076-3d6d-4061-82e2-fb931327c9d2) | "View table of contents": a right-hand contents panel marks the current section (Overview) with a short line, and the marker moves as you scroll to another section. | A static `:target` mark on an explicit methodology id list (`#limits`, `#not-covered`, `#issue-list`): a primary-muted halo with a 3px primary bar at its left. | Static state instead of a moving marker. No tint pulse and no smooth scroll. Never race, candidate or measure ids, and not home's `#sample-ballot`. | None (static state). | Adjacent | S | medium |
| MO8 | Vimeo | web | flow | [Mobbin](https://mobbin.com/flows/b03fc68c-19bf-4be5-b886-187923964601) | "Adding a location": typing "New" opens a dropdown fused to the field's bottom edge (pin icons, matched prefix in bold, "powered by Google"). Choosing one collapses the field into a plain line, and a "Saved changes" toast appears. | The listbox gets `kyv-enter-fast` at lg+. The typed prefix is bold. The form gets `aria-busy` while looking up. | Only in the PR that switches suggestions on. Prefix bold by weight, never colour. No toast, no "powered by". No ZIP escape row (address-only). | lg+: 120ms fade + 4px drop on the listbox. Nothing on selection. | Adjacent | S | low |
| MO9 | React `<ViewTransition>` via Next.js 16.3.4 (MIT) | web | platform doc | [Docs](https://nextjs.org/docs/app/guides/view-transitions) | The Next 16 "view transitions" guide (local copy `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`). It works in the App Router with no config and covers shared-element morphs, Suspense reveals, `transitionTypes` slides and crossfades, with CSS for reduced motion and pointer events. | Exactly two named morphs (MO10, MO11), with the root crossfade off, lg+ only, and the guide's reduced-motion block. A verify script fails on any other `<ViewTransition>`. | No slides, no Suspense reveals, no page or panel wrappers. The allow-list in a verify script replaces the first run's outright ban. | None of its own. | No | S | low |
| MO10 | Mobbin | web | flow | [Mobbin](https://mobbin.com/flows/fa9c0234-5310-41bd-adde-93b6f263eb78) | "Switching content view": Discover's text tabs (Apps, Screens, UI Elements, Flows). The black underline moves to the chosen tab while the chip row and card grid below change. | After RC7's underline restyle, the active tab's 2px underline morphs from the old tab to the new one at lg+. | Underline, not pill. Our primary token, not black. lg+ only. The candidate panels are never wrapped and swap instantly. | lg+: 200ms morph of the 2px underline. | No | S | low |
| MO11 | Wix | web | flow | [Mobbin](https://mobbin.com/flows/6332a6ad-304d-44fe-b05f-b811bd22a9fe) | "Switching pages (mobile)": in the editor's phone preview, an orange underline sits under Home. Choosing Services from the Screen dropdown moves it to Services, and the content becomes a "UX Consultation · Book" row. | SectionNav's 16×2px accent indicator morphs between items on the lg top bar. | Our clay accent, not Wix orange. On phones the bottom nav's indicator still jumps. Build it with MO10 or not at all. | lg+: 200ms slide of the 16×2px bar. | No | S | low |
| MO12 | Zip (the payments app, not ZIP codes) | ios | flow | [Mobbin](https://mobbin.com/flows/426ea889-bba3-4b90-bd2d-d43bb6bab458) | An FAQ: under "Zip Overview", a grouped rounded card of questions with chevrons. The open one, "Paying online", shows its answer inside the same card with its chevron up. | An opt-in `kyv-disclosure` class on methodology's two `<details>` (`:436`, `:623`): fade + height ease at lg+. | Opt-in by class, never on candidate, measure or ballot disclosures. Home county rows stay motion-free (home §7). Carets keep no transition. The grey card is our Card. | lg+: 200ms opacity + height on open and close (height in Chromium only). | Yes | S | low |
| MO13 | CSS ::details-content + interpolate-size (MDN) | web | platform doc | [Docs](https://developer.mozilla.org/en-US/docs/Web/CSS/::details-content) | MDN reference (no image). `::details-content` is Baseline 2025. `interpolate-size: allow-keywords` (animating to `height:auto`) is Chromium only, so other browsers fade but snap the height. | The CSS for MO12. | Height ease only under `@supports (interpolate-size: allow-keywords)`. A native `<details>` stays native. | As MO12. | Yes | S | low |

### Build notes

- **MO1 CSS prefers-reduced-motion (MDN).** Page: site-wide (`globals.css`). Need: one place for motion tokens, and a kill switch that also catches the skeleton pulses. Its own PR (M0), separate from home PR A, whose "no `globals.css` token changes" is about type tokens. Land it by Wed Oct 14: it reaches frozen routes, and every other motion entry uses its tokens.
  - In the existing `@theme` block, beside `--default-transition-duration` (`:103`), add `--animate-pulse: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) 2;`. That is 2 cycles = 4s, under WCAG 2.2.2's 5s. Tailwind's `pulse` keyframes end at full opacity, so the block then rests still. It reaches `NewsFeed.tsx:107` and both `loading.tsx` files with no edit to them.
  - Outside any `@layer`:
    ```css
    :root {
      --motion-fast: 120ms;
      --motion-base: 200ms;
      --motion-slow: 320ms;
      --ease-kyv: cubic-bezier(0.2, 0, 0, 1);
    }
    @media (prefers-reduced-motion: reduce) {
      *, ::before, ::after {
        animation-duration: 1ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 1ms !important;
        scroll-behavior: auto !important;
      }
    }
    ```
  - `*` doesn't reach `::view-transition-*` or `::details-content`. MO9 adds the guide's own block, and MO12 sits inside `no-preference`.
  - Check in DevTools with reduced motion emulated: the race loading route shows still blocks. Without it, they pulse twice and stop. HeroRotator is unchanged (it is already gated on `no-preference`) and its Pause button still works.
  - Neutrality: none; it applies to every page equally.
- **MO2 CSS @starting-style (MDN).** Page: `globals.css` enter utilities. Need: one zero-dependency enter primitive instead of a motion library. Unlayered:
  ```css
  @media (min-width: 64rem) and (prefers-reduced-motion: no-preference) {
    .kyv-enter      { transition: opacity var(--motion-base) var(--ease-kyv), translate var(--motion-base) var(--ease-kyv); }
    .kyv-enter-fast { transition: opacity var(--motion-fast) var(--ease-kyv), translate var(--motion-fast) var(--ease-kyv); }
    @starting-style {
      .kyv-enter      { opacity: 0; translate: 0 8px; }
      .kyv-enter-fast { opacity: 0; translate: 0 -4px; }
    }
  }
  ```
  - Used by MO3 (cookie banner) and MO8 (listbox). HM2's panel and CP9's snackbar may swap their inline `@starting-style` for these classes.
  - Enter only: React unmounts give no exit, which is acceptable.
  - Browsers without `@starting-style` show the element instantly.
  - Page chrome only. Never on candidate, race, measure or news content.
  - If D2 (b) is chosen, drop the `min-width` condition.
- **MO3 HelloFresh** (`img/hellofresh-YsUU0RON.webp`). Page: SitePrompts. Need: the donate dialog and cookie banner arrive rather than pop. Not frozen.
  ```css
  @media (min-width: 64rem) and (prefers-reduced-motion: no-preference) {
    dialog.kyv-dialog { transition: opacity var(--motion-base) var(--ease-kyv), translate var(--motion-base) var(--ease-kyv); }
    /* Literal values: ::backdrop inherits no custom properties before Safari 17.4 / Chrome 122 (SitePrompts.tsx:228). */
    dialog.kyv-dialog::backdrop { transition: background-color 200ms cubic-bezier(0.2, 0, 0, 1); }
    @starting-style {
      dialog.kyv-dialog[open] { opacity: 0; translate: 0 8px; }
      dialog.kyv-dialog[open]::backdrop { background-color: rgb(0 0 0 / 0); }
    }
  }
  ```
  - Add `kyv-dialog` to the `<dialog>` className (`:264`). Its `backdrop:bg-[rgb(0_0_0/0.4)]` stays as the end value.
  - Add `kyv-enter` to the banner's className (`:178`).
  - Value is low: these are two prompts that sit apart from ballot content.
- **MO4 Google Gemini** (`img/google-gemini-8yyDQezg.webp`). Page: DistrictChip, on every page. Need: a visible confirmation after Forget. Not frozen. In `DistrictChip.tsx:110-114`, replace the visible words:
  ```tsx
  {forgot ? (<>District forgotten<span className="sr-only">: choose your district</span></>) : "Choose your district"}
  ```
  - The accessible name starts with the visible words (2.5.3) and still says where the link goes (2.4.4). The existing `onBlur={() => setForgot(false)}` restores "Choose your district".
  - The text is about as wide as today's (18 vs 20 characters), so it fits the 320px bar.
  - No timer, toast or animation.
  - HM5 relabels this chip, so land MO4 with HM5 or after it, keeping this forgotten state.
- **MO5 Nibble** (`img/nibble-a6zg9ER9.webp`). Page: InstallCard (home). Need: a visible dismiss confirmation and a smaller jump. Not frozen. In `InstallCard.tsx:64-70`, the stand-in becomes:
  ```tsx
  <p ref={standInRef} tabIndex={-1} className="text-body-sm text-on-surface-muted focus:outline-none">Hidden. You can still add Know Your Vote to your home screen from your browser.</p>
  ```
  - `standInRef` becomes an `HTMLParagraphElement`. `focus:outline-none` is acceptable here, because the note isn't in the Tab order; focus only moves there so it doesn't fall to `<body>`.
  - The note shows only after a dismiss in this visit, as today. If RS8 adds the accepted-install branch, that branch's "added" message takes this slot.
  - No height animation at any width.
- **MO6 Formula 1®** (`img/formula-1-dl0WS20E.webp`). Page: /news. Need: change county in one tap, and see what the filters show. Not frozen; any time. In `news/page.tsx:107-170`, replace the County `<select>` and "Show news" with `<nav aria-label="County">`.
  - Links: one `<Link>` per option, in the select's current order: "Statewide only" first, then `COVERED_COUNTIES`. Each href keeps `issue`. The active link gets `aria-current="page"`.
  - Chip classes: `inline-flex min-h-[40px] items-center rounded-full border border-border-input bg-surface px-3 text-body-sm font-semibold text-on-surface transition-colors motion-reduce:transition-none`. Active: `border-on-surface bg-on-surface text-surface`, NewsRail's colours.
  - Issue stays a `<select>` with its own "Apply" button. A select that navigates on change would fail WCAG 3.2.2.
  - Above the feed, NewsFeed (a client component) shows one `text-body-sm` line, "{N} stories", once loaded and no number while loading. When an issue is set, add "Remove the issue filter" (the same URL without `issue`), beside the existing "tags are added after a story is stored" sentence.
  - Never order chips by volume.
- **MO7 Slite** (`img/slite-GhRhwbPN.webp`). Page: /methodology anchor targets. Need: show where an in-page jump landed. Adjacent: `globals.css` only, but it changes how the frozen /methodology looks, so before Oct 16 or after Nov 4. Unlayered, so it outranks the `bg-surface` utility on `#issue-list`:
  ```css
  :where(#limits, #not-covered, #issue-list):target {
    background-color: var(--color-primary-muted);
    outline: 12px solid var(--color-primary-muted); /* tinted halo; takes no layout space */
    box-shadow: -3px 0 0 12px var(--color-primary); /* shows only as a 3px bar at the halo's left edge */
  }
  ```
  - Why this shape: `#limits` and `#not-covered` have no padding, so the drafted inset bar would sit under their text. The halo plus bar moves nothing. At 15px it fits the 16px phone gutter, and outline and shadow add no scroll width.
  - Contrast on the tint `#e4efe7`: on-surface 12.9:1, on-surface-muted 5.7:1, primary links 5.3:1. The bar against white is 6.3:1.
  - The halo's top 12px may tuck under the sticky bar at `scroll-padding-top`, which is acceptable.
  - Smooth scroll, if wanted, is LF1's rule (section 4), and MO1 turns it off under reduced motion.
  - Never add race, candidate or measure ids to the list.
- **MO8 Vimeo** (`img/vimeo-xwmjKqdM.webp`). Page: LocationEntry suggestions. Need: a dropdown that belongs to the field, and visible progress. Adjacent (renders in the frozen YourRaces): before Oct 16 or after Nov 4. After Nov 4 is recommended, because HM4 and the home PRs also touch LocationEntry.
  - Add `kyv-enter-fast` to the `role="listbox"` className (`:477`).
  - For an option whose label starts with the query (case-insensitive), wrap that slice in `<span className="font-semibold">`.
  - Add `aria-busy={stage.kind === "loading"}` on the `<form>`.
  - Ship it only in the PR that turns `suggestEnabled` on (production runs it off), with an address-suggestion list design. Any "Can't find it?" row points to the district picker LocationEntry already has, never to a ZIP.
  - No toast: the existing `role="status"` block confirms.
- **MO9 React `<ViewTransition>`.** Page: candidates tabs and SectionNav only. Need: shared-element continuity with no library. Not frozen. Build MO9, MO10 and MO11 in one PR, or not at all.
  - `globals.css`, unlayered:
    ```css
    ::view-transition { pointer-events: none; }
    ::view-transition-old(root), ::view-transition-new(root) { animation: none; }
    ::view-transition-group(.kyv-morph) { animation-duration: var(--motion-base); animation-timing-function: var(--ease-kyv); }
    @media (width < 64rem) {
      ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none; }
    }
    @media (prefers-reduced-motion: reduce) {
      ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation-duration: 0s !important; animation-delay: 0s !important; }
    }
    ```
  - Runtime: `import { ViewTransition } from "react"` works, because Next vendors React canary (guide line 50). Types: `@types/react` 19.2.17 declares `ViewTransition` only in `canary.d.ts`, so if `tsc` rejects the import, add `/// <reference types="react/canary" />` to one `.d.ts` in `src`.
  - Guard: add `scripts/verify-view-transitions.ts` (`verify-all.mjs` runs `verify-*.ts`). It fails on:
    - `<ViewTransition` outside `candidates/page.tsx` and `nav/SectionNav.tsx`;
    - any name other than `cand-view-underline` or `section-nav-indicator`;
    - `transitionTypes` or `addTransitionType` anywhere in `src`;
    - any `FROZEN_FILES` path (imported from `scripts/freeze-manifest.ts`) that mentions `ViewTransition`.
  - The guide notes that named participants skip hit-testing while a transition runs, so only the `aria-hidden` indicator spans are named, never the links.
- **MO10 Mobbin** (`img/mobbin-A0H8poXX.webp`). Page: /candidates view tabs. Need: show which view you moved to. Not frozen; after RC7.
  - Replace RC7's `border-b-2 border-primary -mb-px` with a span (same look) inside the active link, which gets `relative`:
    ```tsx
    {active && (<ViewTransition name="cand-view-underline" share="kyv-morph" default="none"><span aria-hidden className="absolute inset-x-0 -bottom-px h-[2px] bg-primary" /></ViewTransition>)}
    ```
  - RC7's "no sliding indicator" stays true below lg and under reduced motion. MO10 is an optional lg+ layer on top of it.
  - Never wrap CandidateBrowser, YourRaces or SavedCandidates (all frozen). With the root crossfade off, they swap instantly.
- **MO11 Wix** (`img/wix-XwlLaRXk.webp`). Page: SectionNav. Need: indicator continuity between Ballot, Candidates and News. Not frozen.
  - In `SectionNav.tsx:157-162`, wrap the existing span:
    ```tsx
    <ViewTransition name="section-nav-indicator" share="kyv-morph" default="none">…the existing span…</ViewTransition>
    ```
  - The nav sits at the bottom below md and at the top from md. MO9's `width < 64rem` rule leaves it instant on phones and portrait tablets.
  - It moves only when the section changes. Within a section the span updates in place, and with `default="none"` nothing animates.
- **MO12 Zip** (`img/zip-8ysNQe6w.webp`) and **MO13 ::details-content (MDN).** Page: /methodology. Need: disclosures that ease rather than snap, away from candidate content. FROZEN (`methodology/page.tsx`): before Oct 16 or after Nov 4. After Nov 4 is recommended, given the low value.
  - CSS:
    ```css
    @media (min-width: 64rem) and (prefers-reduced-motion: no-preference) {
      .kyv-disclosure::details-content {
        opacity: 0; block-size: 0; overflow: clip;
        transition: opacity var(--motion-base) var(--ease-kyv), block-size var(--motion-base) var(--ease-kyv), content-visibility var(--motion-base) allow-discrete;
      }
      .kyv-disclosure[open]::details-content { opacity: 1; block-size: auto; }
      @supports (interpolate-size: allow-keywords) { .kyv-disclosure { interpolate-size: allow-keywords; } }
    }
    ```
  - Add `kyv-disclosure` to `:436` (`#issue-list`) and `:623`. About and Privacy have no `<details>` today.
  - Never on ClaimList, CandidateNews, RaceCompare, MeasureResourceLadder, SharedBallot or JudicialRetentionNote. The home county rows stay motion-free (home §7).
  - Keyboard, find-in-page and JS-off behaviour are unchanged. Browsers without `::details-content` ignore the rule and open instantly.

### Motion

| ID | Effect | Phones (below lg) and reduced motion |
|---|---|---|
| MO1 | None. Pulses stop after 2 cycles (4s). | Under reduced motion, every animation and transition runs in 1ms. |
| MO2 | 200ms fade + 8px rise, or 120ms fade + 4px drop, on mount. Enter only. | Instant. |
| MO3 | Dialog: 200ms fade + 8px rise. Backdrop: 0→40% over 200ms. | Instant (as today). |
| MO4 | None (text swap). | Same. |
| MO5 | None (one-line note). | Same. |
| MO6 | Chip colour at 120ms. The list swaps instantly. | Colour only; `motion-reduce:transition-none`. |
| MO7 | None (static `:target` state). | Same. |
| MO8 | 120ms fade + 4px drop on the listbox. | Instant. |
| MO9 | None of its own. The root crossfade is off. | All groups `animation: none`. |
| MO10 | 200ms morph of the 2px tab underline. | Instant colour and underline swap (RC7). |
| MO11 | 200ms slide of the 16×2px bar on the lg top bar. | The bottom-nav indicator jumps, as today. |
| MO12, MO13 | 200ms opacity + height (height in Chromium only). | Instant open. |

### Suggested order

1. MO1 (PR M0) by Wed Oct 14. Everything else uses its tokens, and it fixes a live WCAG gap on frozen routes.
2. Any time: MO4, MO5 and MO6 (no motion), then MO2 + MO3 in one PR.
3. By Oct 16 or after Nov 4: MO7.
4. After Nov 4: MO9 + MO10 + MO11 in one PR with the verify script; MO12 + MO13; MO8 with suggestions on; deleting the RaceCompare caret transition.

### Gaps

- Mobbin is static: flows show before-and-after frames, never the in-between. No reference gives a duration, an easing or reduced-motion behaviour, so every timing here comes from design.md's tokens (120, 200 and 320ms on `cubic-bezier(0.2,0,0,1)`).
- No Mobbin flow showed an animated bottom-tab indicator; the iOS search returned tab-bar editing flows. MO11 borrows the web underline from Wix, and the phone bottom nav keeps its jump.
- No Mobbin flow showed a skeleton-to-content handoff, only static skeletons (Upwork, Headspace, Fabric, Square, PayPal, Midday). The Next guide's Suspense reveal is deliberately unused, because it would animate race and candidate routes.
- Mobbin has no civic or voter-guide motion. Nothing was searched for or proposed for date-state changes, because dates are stated and never counted down.
- No Mobbin example puts a toast above a bottom nav and a fixed cookie banner at once. CP9 gives its snackbar its own `--kyv-toast-bottom` beside the banner's `--kyv-overlay-bottom`.
- Whether a snackbar after "Keep in mind" counts as motion on candidate content is decision D3 (CP9). Mobbin can't settle it.
- `interpolate-size` is Chromium only, so Safari and Firefox fade disclosures but snap their height. No zero-dependency, cross-browser height animation exists for native `<details>`.
- `@types/react` 19.2.17 types `ViewTransition` only as canary, so MO9 may need one type reference before `tsc` passes.

### Dropped and why

- **Slite as the methodology rail's state model** ([Mobbin](https://mobbin.com/flows/3d298076-3d6d-4061-82e2-fb931327c9d2), image 2JVs797B): a duplicate of LF1 Dub, which already has the current-item mark and "Back to top". The widening-dash animation is left out. The same URL stays kept as MO7.
- **Upwork-style skeleton screen** ([Mobbin](https://mobbin.com/screens/21331bb4-b5ed-4843-b7e5-0a4a7ccdca94)): a duplicate. Its row-shaped NewsFeed skeleton is NS4 TradingView, and its pulse on the frozen loading routes is capped by MO1.
- **Auto-hiding toast** ([Mobbin](https://mobbin.com/flows/a6ab2e46-c468-4cab-b7d4-f5984bfe7a33)): a duplicate. With auto-hide removed and the toast restyled, it is exactly CP9 NYTimes.
- **Remove with a yellow Undo** ([Mobbin](https://mobbin.com/flows/19f0053c-2aa8-4e0b-b19b-6565ee27c46f)): a duplicate, not a colour problem. Remove-with-Undo, with no name and an instant row removal, is CP10 The Weather Channel.
- **"Copied" tooltip** ([Mobbin](https://mobbin.com/flows/14549131-1df0-4d88-8754-7622a07a5ab6)): a duplicate, the third reference for the same in-place label swap. Folded into RS11 Tripadvisor ("Link copied" in the button, announced through `aria-live`), which CP11 reuses.
- **Top toast counter-example** ([Mobbin](https://mobbin.com/flows/661a551c-88ac-41fb-99ac-598becbfc87d)): nothing distinct to build. As a counter-example it has no positive use. Moved and recoloured, it becomes CP9 or RS11.
- **Formula 1 as a whole-list fade on NewsRail** ([Mobbin](https://mobbin.com/flows/3518e6b2-537d-471b-bad6-1092b14cd1ac), image dl0WS20E): built into the pattern. The fade is the whole point, and news rows name candidates, so it would put motion near candidate content. What is left without the fade is NS5's `role="status"` line. The same URL stays kept as MO6.
- **Recoloured info banner** ([Mobbin](https://mobbin.com/flows/0cc112af-af78-4152-9673-af5113ad7f25)): a duplicate. As an inline panel it is the Langdock confirmation (Card and heading stay mounted, focus moves to it).
- **Motion (motion.dev)** ([docs](https://motion.dev/docs/react-reduce-bundle-size)): the dependency has no job here. Every kept effect is CSS or React's built-in ViewTransition at 0 KB. Motion's strengths (springs, gestures, layout and exit animation) are what design.md rules out ("nothing bounces or springs").
- **Motion Primitives** ([GitHub](https://github.com/ibelick/motion-primitives)): built into the library. It pulls in Motion and its docs say nothing about reduced motion. Its accordion, disclosure and panel are matched by native `<details>` + MO12/MO13 at 0 KB. The rest (text scramble, tilt, magnetic, spotlight, infinite slider, morphing dialog) is decorative by design.
- **Magic UI** ([GitHub](https://github.com/magicuidesign/magicui)): built into the library. Blur Fade and Animated List are entrance staggers that order attention. Number Ticker counts, against "stated, never counted". Marquee and Particles fail WCAG 2.2.2.
- **Animata** ([GitHub](https://github.com/codse/animata)): decorative text, card and background effects only. It has nothing for feedback, state or spatial continuity.
- **Aceternity UI** ([licence](https://ui.aceternity.com/licence)): the free tier's licence is unstated and Pro is restrictive. Its spotlights, beams and 3D cards give weight to whatever they wrap.
- **React Bits** ([licence](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md)): MIT + Commons Clause, not plain MIT, and its moving text and backgrounds are banned near ballot content.
- **cult-ui** ([GitHub](https://github.com/nolly-studio/cult-ui)): its stack matches ours, but its components are expressive (dynamic island, textured and animated cards), they bring in Motion, and nothing kept needs them.
- **tw-animate-css** ([GitHub](https://github.com/Wombosvideo/tw-animate-css)): a duplicate of MO2. Even patched (`motion-safe:` everywhere, a pinned version), its slide distances use Tailwind's base spacing, not our 1-9 scale. About 15 hand-written lines on our tokens do the same job.
- **CSS scroll-driven animations** ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline)): built into the technique. Scroll reveals, parallax and progress bars are decorative, would animate race and candidate sections in ballot order, and aren't Baseline.
- **Techniques ruled out:**
  - Particles, and text scramble, split or shimmer: text moves while it is being read.
  - Marquee and infinite sliders: WCAG 2.2.2, and decorative.
  - Parallax and scroll reveals: decorative phone motion.
  - 3D tilt, magnetic and spotlight effects: they give weight to whatever they wrap.
  - Number tickers: a count-up reads like a score or a countdown.
  - Blur-fade and staggered list entrances: they create order emphasis down the ballot.
  - Shimmer skeleton sweeps: a moving gradient that can run past 5s.
  - Springs and bounce: design.md says nothing bounces.
  - Directional route slides through `Link` `transitionTypes`: they would move candidate pages, and Firefox lacks transition types.
  - Morphing dialogs from cards: they would animate out of candidate cards.

### Images

`img/` is gitignored (public repo). The `image_url`s expire about 30 days after 2026-10-12. MO1, MO2, MO9 and MO13 are docs, with no image.

| ID | App | File | image_url | Mobbin |
|---|---|---|---|---|
| MO3 | HelloFresh | `img/hellofresh-YsUU0RON.webp` | https://mobbin.com/api/mcp/short/YsUU0RON | https://mobbin.com/flows/e2d6fd9b-819b-481e-98b1-2c1f4a9f4b3e |
| MO4 | Google Gemini | `img/google-gemini-8yyDQezg.webp` | https://mobbin.com/api/mcp/short/8yyDQezg | https://mobbin.com/flows/e7f8db06-ee0c-4723-89ba-36b512561041 |
| MO5 | Nibble | `img/nibble-a6zg9ER9.webp` | https://mobbin.com/api/mcp/short/a6zg9ER9 | https://mobbin.com/flows/4f7e3b25-a3be-497e-bf63-2fe64cb43614 |
| MO6 | Formula 1® | `img/formula-1-dl0WS20E.webp` | https://mobbin.com/api/mcp/short/dl0WS20E | https://mobbin.com/flows/3518e6b2-537d-471b-bad6-1092b14cd1ac |
| MO7 | Slite | `img/slite-GhRhwbPN.webp` | https://mobbin.com/api/mcp/short/GhRhwbPN | https://mobbin.com/flows/3d298076-3d6d-4061-82e2-fb931327c9d2 |
| MO8 | Vimeo | `img/vimeo-xwmjKqdM.webp` | https://mobbin.com/api/mcp/short/xwmjKqdM | https://mobbin.com/flows/b03fc68c-19bf-4be5-b886-187923964601 |
| MO10 | Mobbin | `img/mobbin-A0H8poXX.webp` | https://mobbin.com/api/mcp/short/A0H8poXX | https://mobbin.com/flows/fa9c0234-5310-41bd-adde-93b6f263eb78 |
| MO11 | Wix | `img/wix-XwlLaRXk.webp` | https://mobbin.com/api/mcp/short/XwlLaRXk | https://mobbin.com/flows/6332a6ad-304d-44fe-b05f-b811bd22a9fe |
| MO12 | Zip | `img/zip-8ysNQe6w.webp` | https://mobbin.com/api/mcp/short/8ysNQe6w | https://mobbin.com/flows/426ea889-bba3-4b90-bd2d-d43bb6bab458 |

---

## 7. Forms and flows

LocationEntry (the location field, the Census lookup, the suggestions listbox, field errors, the district picker), CountyPicker, `ui/Input`, VotingInfo (the reminder form, rendered by ReminderSignupCta on home and by the frozen YourRaces), a new ShareLink, and InstallCard.

- Code read on `claude/registration-labels-calendar` at 4260eb9 (main 71db8fb plus the founder's 10-12 fixes). Every line number here matches main 71db8fb. The only change in this group's files is `VotingInfo.tsx:219`, whose calendar link now reads "(downloads a file)". Nothing under `src/` or `public/` was edited.
- IDs keep the first catalog's (AD for address entry, RS for the reminder form and share), so the other parts still point at the right rows. Part 3's CP11 reuses RS11's ShareLink.
- **InstallCard's reference is RS8 Cosmos in part 1** (Orbit merged in). It isn't repeated here.
- **Part 5's NS1 Walmart** rewrites the `UNMATCHED` address errors in the same component. AD1 supplies the error edge and glyph it uses, and AD2 supplies the "Choose your district instead" button it ends with. Build them in one PR.
- Frozen: none of these files is in `FROZEN_FILES`. **Adjacent** means the file also renders on frozen YourRaces (LocationEntry, CountyPicker and VotingInfo do). An Adjacent change lands **before Oct 16 or after Nov 4**.
- Not repeated here: the home plan ([`../home-readability-2026-10-12/home-readability.md`](../home-readability-2026-10-12/home-readability.md)). Its A7 already adds a `coverageNote` prop to LocationEntry and the home privacy sentence, so cut these changes after its PR A merges (Wed Oct 14).
- No new Mobbin searches were run in this pass. Every kept screenshot was opened and checked against its description.
- Colour and placement were never a reason to drop a reference here (founder, 10-12: both can change). Square's and Stripe's reds, Nextdoor's green and Langdock's purple gradient just take our tokens.

### "Which part of this ZIP", and what address-only retires

DistrictConfirm (`CountyPicker.tsx:50-116`) is the screen that says "Your ZIP spans more than one congressional district. Pick yours to be sure we show the right races:" (`:68`). For the six ZIPs that cross into Seminole or Pasco it says "Your ZIP is partly in Orange County and partly in Seminole County…" (`:67`). It exists only because a ZIP can straddle a district line. A street address resolves to one census block, and so to exactly one district, with nothing to ask (`LocationEntry.tsx:31-39`). Only `resolveZipCode` sets the `split` stage (`:331-339`), so once the field is address-only, LocationEntry never shows it. Frozen YourRaces keeps a server-rendered copy for old shared `/candidates?zip=` links (`YourRaces.tsx:145-205`). Leave that until after Nov 4, then retire it along with `resolveZip`'s split branch in `src/lib/resolve.ts` (also frozen).

The founder's address-only decision has knock-ons in this group that no reference covers. They belong in the PR that removes ZIP entry. That PR edits frozen YourRaces copy, so it lands by Oct 16 or after Nov 4.

1. **Before JavaScript loads** (also in part 1's Gaps). Until hydration the field is a ZIP-only GET form (`LocationEntry.tsx:409-412, 449-452`), so an address never rides in a URL. With ZIP gone, the no-JavaScript route is the district picker (AD7), which today submits only through `onSubmit` (`:601-616`). One way to make it work without JavaScript and without touching frozen YourRaces: a small route outside the frozen list (for example `/api/district/pick`) that checks the `FL-nn|fips` pair against `getCoveredDistricts()`, sets the same district cookie (same name and value /privacy lists), and answers 303 to `/candidates?view=races&district=…&county=…`.
2. **`ADDRESS_LOOKUP_OFF`.** Today the kill switch turns the field ZIP-only (`scope-copy.ts:77-82`). Once ZIP is gone, switching lookup off leaves the picker as the only route: hide the field and show AD7's picker open on every page.
3. **Autofill.** `autoComplete="postal-code"` (`scope-copy.ts:63-67`) was chosen because an autofilled ZIP resolved. With ZIP gone, it fills in something the field rejects. Choose the token in a phone test: no standard token fills a one-line address with its city.
4. **Copy that offers the ZIP route.** The `UNMATCHED` endings (`:79, 89, 91`; part 5 NS1), `:277`, `:371`, `:379`, `:386`, `:533-535`, `:562-569`, the field label and hint (`scope-copy.ts:70-74`, "Your address or ZIP code"), the address route's own strings (`api/address/resolve/route.ts:57, 115`), /privacy's "Rather not share your address? Enter your ZIP, or choose your district…" (`privacy/page.tsx:120-123`), and frozen YourRaces' "We can't place that ZIP" (`:121`) and "enter your ZIP" (`:397-398`). A ZIP typed as part of an address stays welcome ("with its city or ZIP").
5. **Pins.** Update `verify-entry-flow` (`name="zip"` on `#location`, `:114-115`) and `verify-home-coverage` (the ZIP-only field copy, `:324-376`) in the same PR.
6. **The reminder form's ZIP** is decision D4 (part 1's Gaps). One addition: YourRaces fills VotingInfo's ZIP in from `?zip=` (`YourRaces.tsx:407-408`). Without `?zip=`, a voter who has just typed a full address has to type a ZIP again.

### Current weaknesses

- `LocationEntry.tsx:461-470` + `ui/Input.tsx:22`: a field error is red text only. The input's edge doesn't change when `aria-invalid` is set (Input has no invalid style) and the message has no icon, so on a phone the field doesn't stand out. **→ AD1 Square.**
- `LocationEntry.tsx:521-525`: errors that aren't about the field (Census down, 429, network) render after the always-on coverage note (`:515-519`), about three lines below the button, away from where the voter is looking. **→ AD1 Square (part 5 NS1 adds "Try again").**
- `LocationEntry.tsx:277, 295, 371`: three messages say "choose your district below", but the picker is hidden behind a muted 14px underlined "or choose your district" button (`:578-586`). That button is about 21px tall, under the 24px target, and sits below the coverage note. Once ZIP entry goes, the picker is the only way in that doesn't send an address anywhere. **→ AD2 Zalando, AD7 Apple.**
- `LocationEntry.tsx:506-508`: the only loading feedback is the button label changing to "Looking up…". Nothing is announced, the input stays editable during a Census lookup that can take seconds, and nothing changes if it runs long. **→ AD4 Vercel.**
- `LocationEntry.tsx:515-519, 529-535, 543-545` + `CountyPicker.tsx:19`: out of coverage, the coverage limit is said twice, then "Or browse a covered county:" is followed straight away by CountyPicker's "Pick your county:". That makes four short paragraphs with no heading. For an address, this state now means only one thing: the address isn't in Florida (`api/address/resolve/route.ts:121-124`). It still says "enter your street address instead" (`:533-535`). **→ AD6 Alan.**
- `CountyPicker.tsx:20-33`: a two-column grid of bordered buttons that navigate through `onClick` and `router.push` (`LocationEntry.tsx:546-550`), under a `<p>` label. The statewide fallback is a separate link above it (`:537-542`) instead of one of the choices. **→ AD6 Alan.**
- No privacy line beside the field. Home relies on page.tsx's paragraph (and home A7). YourRaces (`:108, 136, 200`) renders the field with nothing saying that a typed address goes to the Census Bureau and only the district is kept. **→ AD3 komoot.**
- `LocationEntry.tsx:474-503` (suggestions mode, off in production): each suggestion is one 14px line with no city or ZIP line, no "can't find it" row, and no empty state when the debounced fetch returns nothing. **→ AD8 Nextdoor, only if suggestions are switched on.**
- `CountyPicker.tsx:65-113` (DistrictConfirm): the question is a `<p>`, the buttons say only "FL-23", and the help link is a 13px plain underline that opens a new tab without saying so. **→ No change: it retires with ZIP entry (above). AD7 reuses its help line.**
- `VotingInfo.tsx:179-199`: the consent checkbox is 16px (`size-4`), and its label packs the consent sentence and the privacy promise into one 3-4 line muted block. **→ RS1 Legora.**
- `ReminderSignupCta.tsx:80-82`: the ZIP limit ("For ZIP codes in … counties for now") is printed after the card, below the submit button, so a voter learns it only after filling in the form. **→ RS1 Legora.**
- `VotingInfo.tsx:155-177, 205-209` + `api/voting-info/route.ts:30-31, 65`: ZIP and email aren't checked one by one. "Invalid ZIP", "Invalid email" and "We don't cover that ZIP yet" come back as one form-level alert under the consent box, and neither field gets `aria-invalid`. **→ RS5 Claude.**
- `VotingInfo.tsx:115-137`: the success state replaces the whole Card with one ~60-word paragraph that leads with the once-a-day throttle. It has no heading, doesn't show which email was used, and the only way to fix a typo is to reload. **→ RS2 Langdock.**
- `InstallCard.tsx:154-158, 83, 97-103, 107-123`: prose-only iOS steps, in-app browsers matched and iPadOS missed, "card dismissed" announced after an accepted install, and a 24px icon-only Dismiss. **→ Part 1 RS8 Cosmos.**
- There is no share or copy-link control anywhere in `src` (no `navigator.share`, no `clipboard`). `/candidates` URLs carry district and county (`LocationEntry.tsx:240-245`), so copying the address bar shares the voter's district. **→ RS11 Tripadvisor.**

### References

| ID | App | Platform | Kind | Link | What it shows | Change to make | Adaptation | Motion | Frozen | Effort | Value |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AD1 | Square | web | screen | [Mobbin](https://mobbin.com/screens/93ba7bf7-faa4-4c51-878d-3a15cbea5c64) | A typed address in a field with a dark edge. Directly under it, a red circled "!" and one red line: "Please select an address from the suggestions list." The single suggestion card floats below. | An error edge on any `aria-invalid` Input, an error glyph before LocationEntry's field error, and non-field errors moved up under the button row. VotingInfo gets the same edge and glyph. | Our `error` token (#B4402E). No suggestion card, since production has no suggestions. | None (no shake). | Adjacent | S | high |
| AD2 | Zalando | ios | screen | [Mobbin](https://mobbin.com/screens/ce7dc247-54cf-4352-a684-ece75d26bd81) | A postcode field and an outlined FIND ADDRESS button, then "This postcode could not be found." with an underlined "Manually enter your address" link right under it. | When an error sends the voter to the picker, put a "Choose your district instead" button right under the message. It opens the picker and focuses it. The toggle becomes a 24px primary link with a caret. | Messages reworded for address-only entry: none of them says "try your ZIP". | The caret flips with no transition (home-readability §7). The picker appears without animation, and focus moving to it is the continuity cue. | Adjacent | S | high |
| AD7 | Apple | web | screen | [Mobbin](https://mobbin.com/screens/da67cc32-fb99-4df5-9c9e-b36ebc14e553) | "Find sessions near you.": a quiet "Use my current location" pill, a divider, then a second heading, "Find by Apple Store.", over two selects and an outlined Apply button. Two labelled routes to one answer. | Make the district picker a visible second route: a divider, a visible question label, a help line, the select and "See my races". It is open by default, and the home page passes `pickerCollapsed`. | No "Use my current location". Open by default, with a prop that home passes to collapse it, so frozen YourRaces gets the open picker without being edited. | None. | Adjacent | S | high |
| AD3 | komoot | web | screen | [Mobbin](https://mobbin.com/screens/4c59b396-aeb4-42b1-a4c1-96b6b04e6e72) | An "Add your home" modal. Its footer row puts a lock icon and "Only you can see this information." on the same line as the "Save edits" button. | A `privacyNote` line under the field: what you type goes to the U.S. Census Bureau to find your district, and we keep only the district. Home opts out, because A7 already says it. | The ZIP-only wording is dropped (address-only). | None. | Adjacent | S | high |
| AD4 | Vercel | web | screen | [Mobbin](https://mobbin.com/screens/30fbf24e-cdd9-4077-9065-8f0f69844c8c) | A sign-up card. The email field stays visible but greyed, and the button keeps its label, "Continue with Email", with a small spinner in front while it is disabled. | A spinner before "Looking up…", `aria-busy` on the form, a read-only input and an sr-only status. At 5s the spinner stops and a visible "Still looking" line appears. | DistrictConfirm's pending state is dropped, because that screen retires with ZIP entry. | The spinner runs 1s linear, only while loading, and stops at 5s (WCAG 2.2.2). A static glyph under reduced motion. | Adjacent | S | medium |
| AD6 | Alan | ios | screen | [Mobbin](https://mobbin.com/screens/1b81e97e-c336-4da4-b882-6f829ea64246) | "What's your question about?", one intro line, then full-width rounded rows, each with a bold title, a muted line and a chevron. The last row is a plain "Something else". Nothing is preselected. | CountyPicker becomes one column of equal link rows, plus a same-size "Another Florida county" row, under one heading. The out-of-coverage block loses its repeated sentences. | Rows separated by hairlines, not cards. The last row gets a description line too, so every row is the same size. The heading speaks to a voter registered in Florida who typed an address elsewhere. | Hover and press background over 120ms; none under reduced motion. | Adjacent | S | medium |
| AD8 | Nextdoor | web | screen | [Mobbin](https://mobbin.com/screens/44d4a5de-104f-417c-af3e-1f92890226fa) | A street-address field with a dropdown. Each option has a pin icon, the street in bold and "City, State, USA" muted below. A final pencil-icon row reads "Enter your address manually", and the provider's attribution sits at the bottom. | Only when suggestions are switched on: two-line options, a "Can't find it? Choose your district instead" row, an empty state and a maximum height. | The escape row goes to the picker, not to a ZIP. It uses the attribution our provider requires, not Google's. Text stays at 14px or larger. | None. The list appears instantly and the highlight changes instantly. | Adjacent | M | low |
| RS1 | Legora | web | section | [Mobbin](https://mobbin.com/sites/sections/7f7badac-ccf6-43ec-9a54-750d8bb73221) | An email field, then an unchecked box whose label is one consent sentence ending "I can unsubscribe at any time.", then a separate muted line about data processing with a Privacy Policy link, then Subscribe. | The checkbox label keeps only the consent sentence. The storage promise moves under the button, with a lock glyph and a /privacy link. The box becomes 20px, and the four-county limit becomes the ZIP field's hint. | None. | None. | Adjacent | S | high |
| RS5 | Claude | web | screen | [Mobbin](https://mobbin.com/screens/34e3cb61-99c3-4184-a302-74d9b03bdd0e) | Stripe's Payment Element at checkout. Of ten fields, only "Card number" turns red (edge, text and a warning icon), and "Your card number is invalid." sits directly under it. The consent box and Subscribe button don't change. | Check ZIP and email before the fetch. The route returns a `field` key, each message sits under its own field with `aria-invalid`, and focus goes to the first invalid field. | None. | None. | Adjacent | M | high |
| RS2 | Langdock | web | screen | [Mobbin](https://mobbin.com/screens/1280a48c-b864-4c08-8bd7-c5d36dd86e4a) | A centred card: "Check your email", one instruction, then an "Email sent to" read-only field with a small "Try a different email" link on its label row, then Open Gmail and Open Outlook. | Keep the Card and its h2 mounted. The sent body is a "Check your inbox" heading, "We sent … to {email}", and a "Use a different email" button back to the form. | No Gmail or Outlook buttons. Part 1's RS4 dated list goes in this body, with Ro and Sana AI folded in. | No animation below lg. At lg and up, an optional 200ms opacity cross-fade, none under reduced motion. Focus moves to the heading. | Adjacent | S | high |
| RS11 | Tripadvisor | web | flow | [Mobbin](https://mobbin.com/flows/18497b7d-61fc-4573-a0be-db5c070a8399) | A small share icon beside Save opens a two-item popover (Email, Copy link). After copying, the same item reads "Link copied" in place. No toast, no modal, and nothing else moves. | A new ShareLink under the statewide ballot on home. It calls `navigator.share` where that exists. Otherwise it shows "Copy link" (which reads "Link copied" for 3s) and "Email". It shares the origin plus "/" only. | No popover: without `navigator.share`, the two actions render inline. No social-network buttons. | A label swap only, reverting after 3s. It is a state change, not movement. | No | M | high |

### Build notes

- **AD1 Square** (`ui/Input.tsx`, LocationEntry field and non-field errors, VotingInfo fields). Adjacent: before Oct 16 or after Nov 4.
  - `Input.tsx:22`: add `aria-[invalid=true]:border-error aria-[invalid=true]:focus:border-error`. Input isn't frozen. Today only LocationEntry sets `aria-invalid` on an Input (`:440`), and VotingInfo will after RS5.
  - LocationEntry `:461-470`: make the message a `flex items-start gap-1` row led by a new `ErrorGlyph` in `Glyphs.tsx` (circle and bang, `aria-hidden`, `mt-[3px] shrink-0`). Keep `role="alert"`, `key={stage.seq}`, `id={errorId}` and `text-body-sm text-error`.
  - Move the non-field alert (`:521-525`) to directly under the button row, above the coverage note, with the same glyph. Part 5's NS1 makes the same move and adds "Try again": do it once.
  - `UNMATCHED` (`:78-94`): part 5's NS1 rewrites it, and the "— or enter just your 5-digit ZIP" endings go with ZIP entry.
  - Neutrality: none. It is a form-control state.
- **AD2 Zalando** (LocationEntry error-to-picker route and the toggle). Adjacent.
  - Under an error that points to the picker, add a text button "Choose your district instead" (`inline-flex min-h-[24px] items-center text-body-sm text-primary underline underline-offset-2`). It sets `showPicker` and focuses `#district-picker` once mounted, through a `focusPicker` flag read in a `useEffect`.
  - Rewording for address-only: `:277` becomes "We couldn't look up that address just now. Try again in a minute, or choose your district." `:295` becomes "We couldn't place that address in a district." followed by the button. `:371` and `:379` go with ZIP entry. `:386` becomes "Enter your house number and street, with your city or ZIP."
  - Toggle (`:578-586`, home only after AD7): `text-primary`, `min-h-[24px]` (about 21px today), and a `CaretGlyph` with `rotate-180` when open, with no transition (matching the home plan's carets).
  - The picker keeps submit-to-save (WCAG 3.2.2) and preselects nothing.
  - Neutrality: none. Districts stay in `CoveredDistrict` order.
- **AD7 Apple** (LocationEntry picker block, `:573-646`). Adjacent.
  - Show the picker by default under a `border-t border-border pt-4` divider. Make the sr-only label (`:618-620`) visible as `text-label`: "Know your congressional district?". Add a `text-body-sm text-on-surface-muted` help line moved from DistrictConfirm (`CountyPicker.tsx:102-113`, retiring): "Not sure? Your voter registration card or {supervisor.label} lists it." Its link gets `text-primary` and "(opens in a new tab)", and it is joined to the select's `aria-describedby`.
  - Keep the select and the secondary "See my races" button. It is still saved on submit, never on change.
  - New prop `pickerCollapsed` (default `false`). The home `page.tsx` (not frozen) passes it and keeps the toggle, restyled by AD2. YourRaces passes nothing and gets the picker open without being edited.
  - When the field is off (`ADDRESS_LOOKUP_OFF`), ignore `pickerCollapsed` and show the picker open.
  - Writer's change: value raised from medium to high. With ZIP entry gone, this is the only route that sends no address anywhere, and the planned no-JavaScript route (knock-on 1).
  - Neutrality: none.
- **AD3 komoot** (LocationEntry privacy line; YourRaces, and anywhere else the field renders). Adjacent.
  - New prop `privacyNote` (default `true`) that prints one `flex items-start gap-1 text-body-sm text-on-surface-muted` line directly under the field and button row, led by a 14px lock glyph (`aria-hidden`): "What you type goes from our server to the U.S. Census Bureau to find your district. We keep only the district, on this device." followed by a "How we handle it" link to /privacy.
  - Word it from /privacy's Census paragraph (`privacy/page.tsx:105-117`), which `verify-no-stored-location` pins. Never write "we never see your address": our server passes it on.
  - The home call site passes `privacyNote={false}`, because home A7's paragraph already says it.
  - Neutrality: none, as long as the line stays literally true.
- **AD4 Vercel** (LocationEntry loading state). Adjacent.
  - While `stage.kind === "loading"`: `aria-busy` on the form, `readOnly` on the input, and a 16px inline-SVG arc before "Looking up…" (`animate-spin motion-reduce:animate-none`), with the button width kept stable. Add `<p role="status" className="sr-only">Looking up your district.</p>`.
  - After 5s: stop the spinner, update the status text, and show a visible `text-body-sm` line under the button: "Still looking. The Census Bureau can take a few seconds."
  - No skeletons and no progress bar.
  - Neutrality: none.
- **AD6 Alan** (CountyPicker, inside LocationEntry's out-of-coverage block). Adjacent.
  - `CountyPicker.tsx:12-37`: use one column at every width, as a `<ul>` of rows. Each row is a `next/link` to `/candidates?view=races&county={fips}` (`flex min-h-[48px] items-center justify-between gap-3 border-b border-border px-4 py-3 hover:bg-primary-muted`). It shows the county name (`text-label text-on-surface`), "{metroLabel} metro" (`text-body-sm text-on-surface-muted`) and a `CaretGlyph` with `-rotate-90`. Drop the `onPick` prop and the `router.push` at `LocationEntry.tsx:546-550`.
  - The last row is the same size: "Another Florida county", described "The statewide races and amendments", linking to `STATEWIDE_BALLOT_HREF`. It replaces the separate link at `:537-542`.
  - One `<h3 className="text-label">` replaces both "Or browse a covered county:" (`:543-545`) and "Pick your county:" (`CountyPicker.tsx:19`): "Registered to vote in Florida? Pick your county." With ZIP gone, this block is reached only by a non-Florida address, so the lead (`:529-535`) shortens to "That address isn't in Florida. This guide covers Florida's ballot." The "enter your street address instead" sentence goes. Part 5's NS1 removes the same repeated coverage sentence: edit it once.
  - This supersedes part 1's fieldset-and-legend note for CountyPicker. Once the buttons become links, a heading over a list is the right grouping, because a fieldset is for form controls.
  - Neutrality: low. These are counties, not candidates. Keep `COVERED_COUNTIES` order and identical rows, so a voter outside the four counties isn't made secondary.
- **AD8 Nextdoor** (LocationEntry suggestions listbox). Build only in the PR that switches `suggestEnabled` on (`geocoderConfigured()`); production runs it off. Adjacent.
  - Options (`:482-502`): a 16px pin glyph, the street on line 1 (`text-body`), "City, FL ZIP" on line 2 (`text-body-sm text-on-surface-muted`), `py-3` rows. `AddressSuggestion` (`address-lookup.ts`) may need street and place as separate fields.
  - Add a last row that isn't an option: "Can't find it? Choose your district instead", which opens and focuses the picker (AD2's handler).
  - When the fetch returns nothing: "No matches yet. Keep typing your street and city." Add `max-h-[320px] overflow-y-auto`.
  - `:379`'s "or enter your 5-digit ZIP" goes with ZIP entry.
  - Neutrality: none. It is geography only.
- **RS1 Legora** (VotingInfo consent line and ReminderSignupCta's ZIP limit). Adjacent.
  - `VotingInfo.tsx:179-199`: the checkbox label keeps only the consent sentence, with its words unchanged until signed off. The box becomes `size-[20px]` (`size-5` is 24px on our scale) in a `min-h-[24px] items-start` label row.
  - "We store only your email and ZIP, never link them to your browsing, and every email has an unsubscribe link." moves to its own `text-body-sm text-on-surface-muted` line directly under the submit button, with a lock glyph and a /privacy link.
  - New `zipHint` prop, rendered under the ZIP label and joined into that input's `aria-describedby`. ReminderSignupCta passes "Miami-Dade, Broward, Hillsborough or Orange County ZIPs for now" (from `coveredCountyNames()`) and deletes `:80-82`. YourRaces passes nothing.
  - If decision D4 removes the reminder form's ZIP, the hint and the ZIP half of the promise go with it.
  - Neutrality: none.
- **RS5 Claude** (VotingInfo fields and the voting-info route). Adjacent; `route.ts` isn't frozen.
  - Add `noValidate`. In `submit()`, check before the fetch: ZIP must match `/^\d{5}$/`, and email must be non-empty without `validity.typeMismatch`.
  - Each message sits under its own Input in AD1's glyph row, sets `aria-invalid` and `aria-describedby` on that field, and focus goes to the first invalid one.
  - `route.ts` returns a `field` key (`"zip"` or `"email"`) with its 400s (`:30, :31, :65`), so the client maps errors by key, not by message text.
  - Copy: "Enter a 5-digit ZIP code.", "Enter an email address, like name@example.com.", and for an uncovered ZIP the `coveredCountyNames()` sentence. 429, 502 and 503 stay a form-level `role="alert"`.
  - Neutrality: none.
- **RS2 Langdock** (VotingInfo sent state, `:115-137`). Adjacent.
  - Keep `<Card>` and its h2 mounted and swap only the form body. The new body sits on `bg-primary-muted rounded-md p-4` in `text-primary-hover` (6.8:1). Don't use `success` text, which is 4.26:1 on that fill.
  - Inside: an h3 "Check your inbox" (`tabIndex={-1}`, now the focus target instead of today's `<p>`). Then "We sent where to vote and the key dates to {email}.", with the email in `font-medium`. Then, where part 1's RS4 `schedule` is passed (home), its dated list with the first row checked ("Sent: where to vote and the key dates"); elsewhere, with `remindersOn`, "A short reminder follows as each remaining deadline comes up." Then a `text-body-sm` line, "Already signed up today with this ZIP? It's the email you already have." Then "Every email has an unsubscribe link."
  - Add a text button "Use a different email" (`min-h-[24px]`). It returns to the form with the ZIP kept and focuses the email field.
  - The email is echoed on screen only, never into a URL or `track()`.
  - Neutrality: none. Echoing the voter's own email back on their own device is fine.
- **RS11 Tripadvisor** (new `ShareLink`, home `page.tsx` under `<SharedBallot />` at `:197`). Not frozen, but never put it inside `SharedBallot.tsx`, which is frozen. Rebase on home PR A, which reorders that page.
  - The client component reads `navigator.share` only after hydration (the same `useSyncExternalStore` gate InstallCard uses), so the server and client renders match.
  - Where `navigator.share` exists: a secondary text button "Share this ballot" with `ShareGlyph` (part 1 RS8 adds it to `Glyphs.tsx`). It calls `navigator.share({ title: document.title, url: location.origin + "/" })`.
  - Otherwise, two inline buttons. "Copy link" calls `clipboard.writeText` and reads "Link copied" with `CheckGlyph` for 3s, announced by a sibling `aria-live="polite"`. "Email" is a `mailto:?subject={title}&body={url}` link.
  - Add one `text-body-sm` caption: "Anyone with this link sees the same statewide ballot. It doesn't include your address or district."
  - Never share a query string or a district.
  - Neutrality: medium. The shared title and text are the page title only, with no candidate name and no prefilled opinion ("I'm voting…"). If it spreads to race, candidate or measure pages (part 3's CP11), it goes on every one in the same spot (all or none) and never inside a candidate column. On those frozen pages it lands before Oct 16 or after Nov 4.

### Motion

| ID | Effect | Reduced motion and phones |
|---|---|---|
| AD2 Zalando | Writer's change: the caret flips with no transition, matching home-readability §7 (the researcher proposed 120ms). The picker appears without animation, and focus moving to it is the cue. | Nothing moves. |
| AD4 Vercel | Spinner: 1s linear, only while loading, stopped at 5s (WCAG 2.2.2). It is feedback, not decoration. | A static glyph under reduced motion. On phones it is the same, because it is feedback. |
| AD6 Alan | Row background colour on hover and press over 120ms (`motion.fast`). | Instant. |
| RS2 Langdock | At lg and up only: an optional 200ms (`motion.base`) opacity cross-fade from form to message. | None below lg, and none under reduced motion. Moving focus to the heading is the announcement. |
| RS11 Tripadvisor | "Copy link" swaps to "Link copied" for 3s. A label change, not movement: no toast, slide or confetti. | Identical. |

No shake on errors (design.md: nothing bounces).

### Suggested order

1. **The entry PR, by Fri Oct 16** (cut after home PR A merges Wed Oct 14), or after Nov 4: ZIP removal with its knock-ons, plus AD1, AD2, AD7, AD3, AD4, AD6 and part 5's NS1, all in LocationEntry and CountyPicker. Part 1's HM4 adds an `onCommitted` prop to the same component; land it here if it's ready. YourRaces' own ZIP copy (`:121`, `:397-398`) has to merge before the Sat Oct 17 hash write.
2. **The reminder-form PR, by Oct 16 or after Nov 4:** RS1, RS5 and RS2, with part 1's RS4 and RS6.
3. **Home only, any time after PR A:** RS11 ShareLink (and part 1's RS8 InstallCard).
4. **Only with suggestions switched on:** AD8.

### Gaps

- **Split-ZIP district choice.** Nothing on Mobbin shows "your area spans two zones, pick yours" without a map. It no longer matters: DistrictConfirm retires with ZIP entry (see above).
- **"Did you mean" address correction** (H&M https://mobbin.com/screens/eec347a2-3082-4f9f-b776-c8caf7b2ac9c, Acorns, Greenlight). `/api/address/resolve` would have to return Census's matched address, and #172 deliberately refuses wrong-street and city-only near matches. Parked: not before Nov 3, and if ever, only with an explicit confirm from the voter.
- **Out-of-state address, Florida registration.** No pattern shows "that address is outside our area, but you may still vote here", for college, military or overseas voters. AD6's heading and lead are our own copy.
- **Motion.** Mobbin flows show steps, not timing or easing, so no reference shows how a form-to-success swap or a picker reveal should move. The motion notes come from design.md's tokens (120, 200 and 320ms on one easing; nothing bounces) and the hard rules.
- **Consent for civic reminders.** Every consent example was a marketing newsletter or a SaaS sign-up (Legora, Headspace, Mailchimp). None was an election office or government alert, so the consent wording still needs founder sign-off, not a copied pattern.
- **Copy-link confirmation.** Most examples use auto-dismissing toasts (LinkedIn, Notion, Luma, Grab). Only Tripadvisor (and Better Stack, merged in) showed the calmer in-place label swap that fits the motion rules.
- **Web-app install.** Covered in part 1 (RS8): Mobbin has native-app download cards but no browser "Add to Home Screen" card.

### Dropped and why

Nothing in this group was dropped for colour or placement.

- **Orbit** ([Mobbin](https://mobbin.com/flows/4cf36b84-bc68-4b0d-b65c-1d5a9edde0dd)), dropped for good as a duplicate, not a colour problem: its dark theme and purple button could have taken our tokens. Its parts (numbered steps matched to glyphs, a visible "Not now", the accepted-install announcement, one honest benefit line) are already in **part 1's RS8 Cosmos**.

Folded into a kept entry:

- **Better Stack** ("Copied!" tooltip over the button), folded into RS11: confirm in the control itself, with a sibling status.
- **Sana AI** (keep the card mounted) and **Ro** (a done step in a dated list), folded into RS2, as part 1 records.
- **Shopify**: kept in part 1 as RS6 (the lg split card). RS1 owns the consent split it would otherwise repeat.
- **Apple's two-routes entry**: kept as AD7. AD2 borrows only its idea of putting the second route where the voter is looking.

Parts of kept references we don't copy:

- **Apple's "Use my current location"** (AD7): geolocation asks for more than the field does, and /privacy doesn't cover it.
- **Langdock's Open Gmail and Open Outlook buttons** (RS2): they name two mail providers and aren't needed.
- **Tripadvisor's popover** (RS11): inline buttons need no focus or outside-click handling.
- **Nextdoor's Google attribution** (AD8): we show whatever our own provider requires.
- **Auto-dismissing toasts** for "Link copied" (LinkedIn, Notion, Luma, Grab): they appear somewhere else and vanish on a timer. The label changes in place instead.
- **Shake on error** (AD1): design.md says nothing bounces.

### Images

The local files are in `img/`, which is gitignored because the repo is public. Image URLs expire about 30 days after 2026-10-12.

| ID | App | Local file | image_url | mobbin_url |
|---|---|---|---|---|
| AD1 | Square | `img/square-klFmij1P.webp` | https://mobbin.com/api/mcp/short/klFmij1P | https://mobbin.com/screens/93ba7bf7-faa4-4c51-878d-3a15cbea5c64 |
| AD2 | Zalando | `img/zalando-tP3HQP3e.webp` | https://mobbin.com/api/mcp/short/tP3HQP3e | https://mobbin.com/screens/ce7dc247-54cf-4352-a684-ece75d26bd81 |
| AD7 | Apple | `img/apple-c7DfjPPK.webp` | https://mobbin.com/api/mcp/short/c7DfjPPK | https://mobbin.com/screens/da67cc32-fb99-4df5-9c9e-b36ebc14e553 |
| AD3 | komoot | `img/komoot-xbaKLmqE.webp` | https://mobbin.com/api/mcp/short/xbaKLmqE | https://mobbin.com/screens/4c59b396-aeb4-42b1-a4c1-96b6b04e6e72 |
| AD4 | Vercel | `img/vercel-M82aGNn7.webp` | https://mobbin.com/api/mcp/short/M82aGNn7 | https://mobbin.com/screens/30fbf24e-cdd9-4077-9065-8f0f69844c8c |
| AD6 | Alan | `img/alan-aN3T6Frr.webp` | https://mobbin.com/api/mcp/short/aN3T6Frr | https://mobbin.com/screens/1b81e97e-c336-4da4-b882-6f829ea64246 |
| AD8 | Nextdoor | `img/nextdoor-QTMokQQT.webp` | https://mobbin.com/api/mcp/short/QTMokQQT | https://mobbin.com/screens/44d4a5de-104f-417c-af3e-1f92890226fa |
| RS1 | Legora | `img/legora-bsPszMQn.webp` | https://mobbin.com/api/mcp/short/bsPszMQn | https://mobbin.com/sites/sections/7f7badac-ccf6-43ec-9a54-750d8bb73221 |
| RS5 | Claude | `img/claude-SqBdz2B5.webp` | https://mobbin.com/api/mcp/short/SqBdz2B5 | https://mobbin.com/screens/34e3cb61-99c3-4184-a302-74d9b03bdd0e |
| RS2 | Langdock | `img/langdock-dxYYQJsX.webp` | https://mobbin.com/api/mcp/short/dxYYQJsX | https://mobbin.com/screens/1280a48c-b864-4c08-8bd7-c5d36dd86e4a |
| RS11 | Tripadvisor | `img/tripadvisor-VsGhVb4x.webp` | https://mobbin.com/api/mcp/short/VsGhVb4x | https://mobbin.com/flows/18497b7d-61fc-4573-a0be-db5c070a8399 |

---

## Image catalog

Every kept reference, in section order. The local files are in `img/`, which is gitignored because the repo is public. Image URLs expire about 30 days after 2026-10-12. MO1, MO2, MO9 and MO13 are platform docs with no image.

| ID | App | Section | Local file | image_url | Link |
|---|---|---|---|---|---|
| HM1 | Airwallex | 1. Chrome and home | `img/airwallex-pI5vtVGE.webp` | https://mobbin.com/api/mcp/short/pI5vtVGE | https://mobbin.com/screens/5b2e67a8-ded8-496b-80f0-d2aa8ab4ae03 |
| HM8 | Mercury | 1. Chrome and home | `img/mercury-jG7O0h5D.webp` | https://mobbin.com/api/mcp/short/jG7O0h5D | https://mobbin.com/screens/ec7b66ef-59c2-495b-9872-7f17f40c5c52 |
| HM2 | Amazon | 1. Chrome and home | `img/amazon-3DGzLfxm.webp` | https://mobbin.com/api/mcp/short/3DGzLfxm | https://mobbin.com/screens/b50b0c5c-fc33-4586-ad28-00524dd058fc |
| HM5 | Too Good To Go | 1. Chrome and home | `img/too-good-to-go-lojXRAMc.webp` | https://mobbin.com/api/mcp/short/lojXRAMc | https://mobbin.com/screens/8de18ab2-04b7-4127-87e6-4781495654f5 |
| HM4 | Amazon Shopping | 1. Chrome and home | `img/amazon-shopping-0huasAVw.webp` | https://mobbin.com/api/mcp/short/0huasAVw | https://mobbin.com/flows/02faba3c-6abd-4587-91de-a46a399dd7f5 |
| HM6 | Monzo | 1. Chrome and home | `img/monzo-tYfUSdZW.webp` | https://mobbin.com/api/mcp/short/tYfUSdZW | https://mobbin.com/screens/fb745d43-b066-43d1-8289-0fde83eed7fb |
| HM7 | The New Yorker | 1. Chrome and home | `img/the-new-yorker-QlMSioio.webp` | https://mobbin.com/api/mcp/short/QlMSioio | https://mobbin.com/sites/sections/051eb1f2-7ee6-4526-937b-f2aa4998497d |
| RS4 | Deepstash | 1. Chrome and home | `img/deepstash-oImKluCr.webp` | https://mobbin.com/api/mcp/short/oImKluCr | https://mobbin.com/screens/a276b33b-25f4-4af8-a600-4813a2501089 |
| RS6 | Shopify | 1. Chrome and home | `img/shopify-lQapuuoJ.webp` | https://mobbin.com/api/mcp/short/lQapuuoJ | https://mobbin.com/sites/sections/612323f8-6fff-4972-b018-da55fb8c9c3c |
| RS8 | Cosmos | 1. Chrome and home | `img/cosmos-LaC6SyXu.webp` | https://mobbin.com/api/mcp/short/LaC6SyXu | https://mobbin.com/screens/6e58948b-0dd3-4b55-a121-91b158b2b7b3 |
| RC1 | Tailscale | 2. Races | `img/tailscale-DGknzu8r.webp` | https://mobbin.com/api/mcp/short/DGknzu8r | https://mobbin.com/sites/sections/3ab0526b-1aff-4a84-9a6d-ef7faceb5a3b |
| RC2 | HoneyBook | 2. Races | `img/honeybook-03RJ5a86.webp` | https://mobbin.com/api/mcp/short/03RJ5a86 | https://mobbin.com/flows/722339a9-cb3d-4844-8929-1712d1ae0b17 |
| RC3 | Target | 2. Races | `img/target-bFFu82FY.webp` | https://mobbin.com/api/mcp/short/bFFu82FY | https://mobbin.com/screens/92d8ed1b-5aab-457e-b154-48d178b6eb68 |
| RC4 | Craft | 2. Races | `img/craft-kPSyMm5w.webp` | https://mobbin.com/api/mcp/short/kPSyMm5w | https://mobbin.com/sites/sections/cf4ba7be-d5c1-4cac-9032-75a24cd38c05 |
| RC5 | Fitbit | 2. Races | `img/fitbit-8W3pPOXb.webp` | https://mobbin.com/api/mcp/short/8W3pPOXb | https://mobbin.com/screens/15469c29-ea84-4ada-bb68-416de55d4714 |
| RC6 | Zillow | 2. Races | `img/zillow-LjdiW67m.webp` | https://mobbin.com/api/mcp/short/LjdiW67m | https://mobbin.com/screens/0acd2b7b-541a-47bc-ba60-0caa589603a4 |
| RC7 | Trip.com | 2. Races | `img/trip-com-IH60fX39.webp` | https://mobbin.com/api/mcp/short/IH60fX39 | https://mobbin.com/screens/71d2d386-1fdb-4be3-9b8e-141171e99033 |
| RC8 | Google Drive | 2. Races | `img/google-drive-7setzh8u.webp` | https://mobbin.com/api/mcp/short/7setzh8u | https://mobbin.com/screens/9b4f10d3-3c94-40fe-8d39-9d55c5f702da |
| RC10 | Superpower | 2. Races | `img/superpower-eRHUUlZh.webp` | https://mobbin.com/api/mcp/short/eRHUUlZh | https://mobbin.com/sites/sections/c807212f-5d27-47ba-b142-4f7840875e69 |
| RC11 | Starling | 2. Races | `img/starling-0i56pXSY.webp` | https://mobbin.com/api/mcp/short/0i56pXSY | https://mobbin.com/screens/483dad80-d590-42a3-9c6d-9d1f726b3107 |
| CP3 | Microsoft Copilot | 3. Candidate profile | `img/microsoft-copilot-py4sAgRk.webp` | https://mobbin.com/api/mcp/short/py4sAgRk | https://mobbin.com/screens/e631b279-cfc4-4c1c-85c9-f06c838b8df2 |
| CP9 | NYTimes | 3. Candidate profile | `img/nytimes-RKWRhRXk.webp` | https://mobbin.com/api/mcp/short/RKWRhRXk | https://mobbin.com/flows/69df5e84-af5c-4d28-8895-f85a168a4350 |
| CP11 | Microsoft Copilot | 3. Candidate profile | `img/microsoft-copilot-6GCLx3ER.webp` | https://mobbin.com/api/mcp/short/6GCLx3ER | https://mobbin.com/flows/63676cff-fa64-4d93-8924-eb72577f050e |
| CP1 | monday.com | 3. Candidate profile | `img/monday-com-K7LtD72m.webp` | https://mobbin.com/api/mcp/short/K7LtD72m | https://mobbin.com/screens/28295d77-c40f-47a2-ab5c-b969aad3204b |
| CP4 | Liven | 3. Candidate profile | `img/liven-f4IImzhS.webp` | https://mobbin.com/api/mcp/short/f4IImzhS | https://mobbin.com/screens/cf55d189-6312-46a9-9c28-c90ad47f8582 |
| CP6 | Mintlify | 3. Candidate profile | `img/mintlify-93ICzWqS.webp` | https://mobbin.com/api/mcp/short/93ICzWqS | https://mobbin.com/screens/731c0653-266e-4c03-aae6-df4d07631ebd |
| CP8 | Telegram | 3. Candidate profile | `img/telegram-Fdecfjfs.webp` | https://mobbin.com/api/mcp/short/Fdecfjfs | https://mobbin.com/screens/da1998dd-24a2-4655-8ba0-aab9af83204a |
| CP10 | The Weather Channel | 3. Candidate profile | `img/the-weather-channel-JwWF7j9w.webp` | https://mobbin.com/api/mcp/short/JwWF7j9w | https://mobbin.com/screens/a5faad5f-7d5e-49f7-92ed-855ee63aee96 |
| CP5 | OpenAI | 3. Candidate profile | `img/openai-XUDybjFt.webp` | https://mobbin.com/api/mcp/short/XUDybjFt | https://mobbin.com/sites/sections/97c6e5e9-4bc6-4297-80ff-932ac27f8559 |
| LF1 | Dub | 4. Amendments and long-form | `img/dub-NlXHKyi7.webp` | https://mobbin.com/api/mcp/short/NlXHKyi7 | https://mobbin.com/sites/sections/825205b6-8aa3-4195-893d-0c348638a02e |
| LF3 | Finimize | 4. Amendments and long-form | `img/finimize-X1K6KR2h.webp` | https://mobbin.com/api/mcp/short/X1K6KR2h | https://mobbin.com/screens/6aef933a-e3de-4ae3-bd63-c06cdb6e99af |
| AM1 | Asana | 4. Amendments and long-form | `img/asana-hFPgeJOE.webp` | https://mobbin.com/api/mcp/short/hFPgeJOE | https://mobbin.com/screens/6d019817-8957-4507-8dda-0b9548c80442 |
| AM2 | Apple Store | 4. Amendments and long-form | `img/apple-store-oJsvcf3Y.webp` | https://mobbin.com/api/mcp/short/oJsvcf3Y | https://mobbin.com/screens/4d1933e0-40ea-4a2f-b550-e4c0a264e038 |
| AM3 | GetYourGuide | 4. Amendments and long-form | `img/getyourguide-picwmZAj.webp` | https://mobbin.com/api/mcp/short/picwmZAj | https://mobbin.com/flows/2361defc-7781-4cc1-9582-1a35cbe88a4c |
| AM4 | Webflow | 4. Amendments and long-form | `img/webflow-UV2emTrL.webp` | https://mobbin.com/api/mcp/short/UV2emTrL | https://mobbin.com/sites/sections/449c340b-b013-4e4d-bb1b-25b405b4644a |
| AM5 | Workable | 4. Amendments and long-form | `img/workable-ILijdCJ1.webp` | https://mobbin.com/api/mcp/short/ILijdCJ1 | https://mobbin.com/screens/71ee65d1-7086-4490-93ae-b4ad79f79524 |
| AM6 | Literal | 4. Amendments and long-form | `img/literal-QCa2u17P.webp` | https://mobbin.com/api/mcp/short/QCa2u17P | https://mobbin.com/screens/22d9b1db-8046-4b85-b2b3-ae11911f1eee |
| LF4 | Railway | 4. Amendments and long-form | `img/railway-yoI9ObU3.webp` | https://mobbin.com/api/mcp/short/yoI9ObU3 | https://mobbin.com/sites/sections/35a42526-d3b6-4e26-abf7-47667d6e7479 |
| LF5 | App Store | 4. Amendments and long-form | `img/app-store-29kmkfbU.webp` | https://mobbin.com/api/mcp/short/29kmkfbU | https://mobbin.com/screens/03f79864-2fc2-4afd-a9f8-0512620a11c3 |
| LF6 | Attio | 4. Amendments and long-form | `img/attio-lslNzRXz.webp` | https://mobbin.com/api/mcp/short/lslNzRXz | https://mobbin.com/sites/sections/4e71dd68-0727-42f0-83c2-0a7e0799adb5 |
| NS1 | Walmart | 5. News and states | `img/walmart-HRm834T5.webp` | https://mobbin.com/api/mcp/short/HRm834T5 | https://mobbin.com/screens/f30859f8-f250-4748-9550-db513e4abe0e |
| NS2 | Klaviyo | 5. News and states | `img/klaviyo-CPjQoWQY.webp` | https://mobbin.com/api/mcp/short/CPjQoWQY | https://mobbin.com/flows/89f7176c-6998-415e-a68a-9eda2c8dd6be |
| NS3 | Pinterest | 5. News and states | `img/pinterest-lIYFbZuC.webp` | https://mobbin.com/api/mcp/short/lIYFbZuC | https://mobbin.com/screens/45560b08-b73e-4f7e-8a82-878c035ddd68 |
| NS4 | TradingView | 5. News and states | `img/tradingview-Bik93Ioj.webp` | https://mobbin.com/api/mcp/short/Bik93Ioj | https://mobbin.com/screens/86567892-ad6e-41a1-a8d9-db8f8c4d678f |
| NS5 | CVS Health | 5. News and states | `img/cvs-health-Dck7IzaU.webp` | https://mobbin.com/api/mcp/short/Dck7IzaU | https://mobbin.com/screens/0e81b9aa-935f-4bd2-976e-80e9054f3213 |
| NS6 | Particle News | 5. News and states | `img/particle-news-V2ReWamJ.webp` | https://mobbin.com/api/mcp/short/V2ReWamJ | https://mobbin.com/screens/73815a7f-3412-44eb-ba9a-6253efaea52b |
| NS7 | Substack | 5. News and states | `img/substack-nwKjecCD.webp` | https://mobbin.com/api/mcp/short/nwKjecCD | https://mobbin.com/screens/3e08654e-18f8-4ee4-aa44-1fdcc1c454f3 |
| NS8 | Lightyear | 5. News and states | `img/lightyear-15pgzCPg.webp` | https://mobbin.com/api/mcp/short/15pgzCPg | https://mobbin.com/screens/d647f067-f5bb-4fb4-82c6-bc806d1daa36 |
| NS9 | SpaceXAI | 5. News and states | `img/spacexai-Fj6i7r0i.webp` | https://mobbin.com/api/mcp/short/Fj6i7r0i | https://mobbin.com/sites/sections/3ca82844-3f5f-43a0-b336-0cf721303c58 |
| NS10 | Tines | 5. News and states | `img/tines-GardFSjQ.webp` | https://mobbin.com/api/mcp/short/GardFSjQ | https://mobbin.com/flows/21eb677a-51ae-450c-8aea-5d9bc4fd240a |
| MO1 | CSS prefers-reduced-motion (MDN) | 6. Motion | none | none (platform doc) | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion |
| MO2 | CSS @starting-style (MDN) | 6. Motion | none | none (platform doc) | https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style |
| MO3 | HelloFresh | 6. Motion | `img/hellofresh-YsUU0RON.webp` | https://mobbin.com/api/mcp/short/YsUU0RON | https://mobbin.com/flows/e2d6fd9b-819b-481e-98b1-2c1f4a9f4b3e |
| MO4 | Google Gemini | 6. Motion | `img/google-gemini-8yyDQezg.webp` | https://mobbin.com/api/mcp/short/8yyDQezg | https://mobbin.com/flows/e7f8db06-ee0c-4723-89ba-36b512561041 |
| MO5 | Nibble | 6. Motion | `img/nibble-a6zg9ER9.webp` | https://mobbin.com/api/mcp/short/a6zg9ER9 | https://mobbin.com/flows/4f7e3b25-a3be-497e-bf63-2fe64cb43614 |
| MO6 | Formula 1® | 6. Motion | `img/formula-1-dl0WS20E.webp` | https://mobbin.com/api/mcp/short/dl0WS20E | https://mobbin.com/flows/3518e6b2-537d-471b-bad6-1092b14cd1ac |
| MO7 | Slite | 6. Motion | `img/slite-GhRhwbPN.webp` | https://mobbin.com/api/mcp/short/GhRhwbPN | https://mobbin.com/flows/3d298076-3d6d-4061-82e2-fb931327c9d2 |
| MO8 | Vimeo | 6. Motion | `img/vimeo-xwmjKqdM.webp` | https://mobbin.com/api/mcp/short/xwmjKqdM | https://mobbin.com/flows/b03fc68c-19bf-4be5-b886-187923964601 |
| MO9 | React `<ViewTransition>` via Next.js 16.3.4 (MIT) | 6. Motion | none | none (platform doc) | https://nextjs.org/docs/app/guides/view-transitions |
| MO10 | Mobbin | 6. Motion | `img/mobbin-A0H8poXX.webp` | https://mobbin.com/api/mcp/short/A0H8poXX | https://mobbin.com/flows/fa9c0234-5310-41bd-adde-93b6f263eb78 |
| MO11 | Wix | 6. Motion | `img/wix-XwlLaRXk.webp` | https://mobbin.com/api/mcp/short/XwlLaRXk | https://mobbin.com/flows/6332a6ad-304d-44fe-b05f-b811bd22a9fe |
| MO12 | Zip (the payments app, not ZIP codes) | 6. Motion | `img/zip-8ysNQe6w.webp` | https://mobbin.com/api/mcp/short/8ysNQe6w | https://mobbin.com/flows/426ea889-bba3-4b90-bd2d-d43bb6bab458 |
| MO13 | CSS ::details-content + interpolate-size (MDN) | 6. Motion | none | none (platform doc) | https://developer.mozilla.org/en-US/docs/Web/CSS/::details-content |
| AD1 | Square | 7. Forms and flows | `img/square-klFmij1P.webp` | https://mobbin.com/api/mcp/short/klFmij1P | https://mobbin.com/screens/93ba7bf7-faa4-4c51-878d-3a15cbea5c64 |
| AD2 | Zalando | 7. Forms and flows | `img/zalando-tP3HQP3e.webp` | https://mobbin.com/api/mcp/short/tP3HQP3e | https://mobbin.com/screens/ce7dc247-54cf-4352-a684-ece75d26bd81 |
| AD7 | Apple | 7. Forms and flows | `img/apple-c7DfjPPK.webp` | https://mobbin.com/api/mcp/short/c7DfjPPK | https://mobbin.com/screens/da67cc32-fb99-4df5-9c9e-b36ebc14e553 |
| AD3 | komoot | 7. Forms and flows | `img/komoot-xbaKLmqE.webp` | https://mobbin.com/api/mcp/short/xbaKLmqE | https://mobbin.com/screens/4c59b396-aeb4-42b1-a4c1-96b6b04e6e72 |
| AD4 | Vercel | 7. Forms and flows | `img/vercel-M82aGNn7.webp` | https://mobbin.com/api/mcp/short/M82aGNn7 | https://mobbin.com/screens/30fbf24e-cdd9-4077-9065-8f0f69844c8c |
| AD6 | Alan | 7. Forms and flows | `img/alan-aN3T6Frr.webp` | https://mobbin.com/api/mcp/short/aN3T6Frr | https://mobbin.com/screens/1b81e97e-c336-4da4-b882-6f829ea64246 |
| AD8 | Nextdoor | 7. Forms and flows | `img/nextdoor-QTMokQQT.webp` | https://mobbin.com/api/mcp/short/QTMokQQT | https://mobbin.com/screens/44d4a5de-104f-417c-af3e-1f92890226fa |
| RS1 | Legora | 7. Forms and flows | `img/legora-bsPszMQn.webp` | https://mobbin.com/api/mcp/short/bsPszMQn | https://mobbin.com/sites/sections/7f7badac-ccf6-43ec-9a54-750d8bb73221 |
| RS5 | Claude | 7. Forms and flows | `img/claude-SqBdz2B5.webp` | https://mobbin.com/api/mcp/short/SqBdz2B5 | https://mobbin.com/screens/34e3cb61-99c3-4184-a302-74d9b03bdd0e |
| RS2 | Langdock | 7. Forms and flows | `img/langdock-dxYYQJsX.webp` | https://mobbin.com/api/mcp/short/dxYYQJsX | https://mobbin.com/screens/1280a48c-b864-4c08-8bd7-c5d36dd86e4a |
| RS11 | Tripadvisor | 7. Forms and flows | `img/tripadvisor-VsGhVb4x.webp` | https://mobbin.com/api/mcp/short/VsGhVb4x | https://mobbin.com/flows/18497b7d-61fc-4573-a0be-db5c070a8399 |

## Mobbin AI usage notice

Returned by the Mobbin search tools, copied verbatim:

---

**Your Mobbin AI usage is high this month**

Usage is unlimited during beta. If your usage stays at this level, you may need to purchase more credits once limits take effect. [View usage and plan options](https://mobbin.com/settings/billing-and-usage)
