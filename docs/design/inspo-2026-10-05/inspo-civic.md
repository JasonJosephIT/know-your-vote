# Civic / voter-guide UI inspiration for Know Your Vote

Collected 2026-10-05. Research only, no repo files edited. Raw captures are in `scratchpad/inspo/`.

Snippets use the real Tailwind v4 tokens from `src/app/globals.css`: `bg-background` (#f6f3ec cream), `bg-surface`, `bg-surface-muted` (#efeae0 sand), `text-on-surface`, `text-on-surface-muted`, `border-border`, `border-border-strong`, `bg-primary` (#2f6b4f sage), `bg-primary-muted` (#e4efe7), `accent` (#b26836), the `text-h1`…`text-caption`/`text-overline` scale, and `rounded-sm/md/lg` (4/8/12px).

## Access log

| Site | Result |
|---|---|
| Ballotpedia | Jina reader **blocked** (domain-level abuse ban until 19:50 UTC today). Direct `curl` with a browser UA worked: Byron Donalds candidate page, FL 2026 measures list, FL Amendment 1 (2024) measure page. |
| VOTE411 | Home page and "Compare State Issues" fetched. **The candidate comparison is address-gated** (POST form, then a session), so I could not observe it. Notes below are limited to what I saw. |
| BallotReady | Home, `/us/florida`, a position page (U.S. Senate FL) and a person page (`/people/ashley-moody`) all fetched. Next.js with Tailwind, so class names show sizes directly. |
| Vote.org | Home and Florida state page fetched. |
| CalMatters | The given URL returns a 404. Its live 2026 guide is `calmatters.org/california-voter-guide-2026/`. Fetched the landing page, the Governor race page and the Prop 1 page, plus their inline CSS. **This was the richest source.** |
| Texas Tribune | `/series/2026-texas-elections/` returned an empty body. Fetched the `/2026-vote/` hub, the "how to cast a ballot" guide and the governor guide instead. |
| Vote Smart | `justfacts.votesmart.org` returns a 403 to curl. The Jina reader worked for a bio page and a Political Courage Test page. Candidate ID 179538 turned out to be a PA state rep, not Donalds, but only the structure matters here. |
| iSideWith | Fetched the candidate policies page (Bernie Sanders). Noted patterns only. |

---

## 1. Ballotpedia

**Patterns worth taking**
1. **Colour-ruled yes/no meaning boxes (ballot measure page).** Straight after the lead paragraph come two stacked boxes. Each has a 10px left border, green for yes and red for no, on a light grey background, with one sentence of the form *A "yes" vote supported…* / *A "no" vote opposed…*. Readers learn what each vote does before anything else. This is the single best measure-page pattern in the set.
2. **Readability score for official ballot language (measure page).** Ballotpedia scores the official title and summary with Flesch-Kincaid grade and reading ease, e.g. "grade level 22" for the FL Amendment 1 summary. That number makes the case for our plain-language rewrite better than any argument we could write. Show it as a small badge next to the official text: "Official summary: grade 22 reading level · Our summary: grade 8".
3. **Facts infobox (candidate page).** A right-rail stack of `widget-row` key/value rows grouped under small section bars (Prior offices, Elections, Education, Personal, Contact). It is easy to scan. Contact links are labelled "Official website", "Official Facebook" and so on.
4. **Race "votebox" (race page / candidate page).** Each row has a 100×100 headshot thumb, the name, a party letter in parentheses, and a small "Candidate Connection" icon when the candidate filled out the survey. Candidates with no photo get a grey silhouette with a "Submit photo" overlay. Missing photos are shown as missing, never hidden.

**How it's built.** MediaWiki with inline-styled tables. The measure infobox is `float:right; width:20%; background:#F6F6F6; box-shadow:0 2px 5px #A0A0A0`, with a dark `#2B2B2B` title bar. Candidate infobox rows are `.widget-row.value-only.Republican`, so the party class colours the section bars. Results use a `.bm-percent-box` > `.bm-percent-fill` with an inline `width:%`. The page TOC is a numbered `toclevel-1/2` list.

```html
<!-- Yes/No meaning, KYV tokens (no red/green: sage = yes, accent = no keeps it neutral) -->
<div class="space-y-2">
  <p class="border-l-[6px] border-primary bg-surface rounded-r-md px-4 py-3 text-body">
    <strong>Voting YES</strong> means the homestead exemption rises to …
  </p>
  <p class="border-l-[6px] border-accent bg-surface rounded-r-md px-4 py-3 text-body">
    <strong>Voting NO</strong> means the current exemption stays at …
  </p>
</div>
<!-- Readability chip next to official text -->
<span class="inline-flex items-center gap-1 rounded-sm bg-surface-muted px-2 py-0.5 text-caption text-on-surface-muted">
  Official summary reads at grade 22 · ours at grade 8
</span>
```

**Avoid.** Party-coloured section bars on the candidate page: Ballotpedia paints the whole infobox Republican red, which is too loud for a calm, neutral guide. Avoid red/green for yes/no, which reads as good/bad. Avoid a 50-item TOC and wall-of-text MediaWiki density. Avoid long verbatim quotes as "arguments", which turns the page into a quote war.

---

## 2. VOTE411 (League of Women Voters)

**Patterns worth taking**
1. **Address CTA panel with a "what you'll get" list (home).** A two-column yellow "notched" card. On the left, an H2 sits over a bulleted list: what's on your ballot, registration, polling place, debates. On the right is the form. The benefits list makes typing an address feel worth it.
2. **Question-as-heading FAQ blocks (methodology / help).** The "Compare State Issues" page is a run of H6 questions, each with a one-line answer first ("Yes. Florida offers early in-person voting…") and detail after. The answer comes first and the nuance second.
3. **Persistent hotline list (footer / help).** "Election Day Problems?" lists 866-OUR-VOTE plus the Spanish, Asian-language and Arabic lines. That is cheap to add and matches our role as a neutral guide.

**How it's built.** Drupal and Bootstrap 4 (`col-md-6`, `form-group`, `form-control`), with `lwv-cta lwv-cta--yellow lwv-cta--notched lwv-cta--checklist`. The address form is split into Street / City / State-select, with `aria-label`s and no visible labels.

```html
<section class="grid gap-6 rounded-lg bg-primary-muted p-6 md:grid-cols-2">
  <div>
    <h2 class="text-h2 text-on-surface">Your Florida ballot, in plain language</h2>
    <ul class="mt-3 space-y-1 text-body text-on-surface-muted list-disc pl-5">
      <li>Every race and amendment on your ballot</li><li>Where candidates stand, issue by issue</li><li>Key dates for your county</li>
    </ul>
  </div>
  <form class="self-center"> <!-- ZIP/address input + button --> </form>
</section>
```

**Avoid.** Placeholder-only labels (their address fields have no visible labels; ours must). A three-field address split when a single field or a ZIP will do. A sponsor logo wall on the home page.
*Not observed:* the candidate questionnaire comparison is behind the address gate. I have not described it, to avoid passing off memory as research.

---

## 3. BallotReady

**Patterns worth taking**
1. **"Verified Webpages", grouped by capacity (candidate profile → socials).** Links are split under H3s, one per capacity: the person's campaign identity (Website, Facebook, X, Instagram, LinkedIn) and then the office they hold (Government site, official X). This maps exactly onto our Jev own-account verification and campaign-vs-official accounts. Use the heading "Verified accounts".
2. **Plain "what this office does" paragraph at the top of the race page.** The position page opens with two sentences on what a U.S. Senator does, before any names appear.
3. **Sentence-style status header (candidate profile).** Instead of badges, the header reads as prose: "Currently holds the office of **U.S. Senate – Florida** until January 3, 2027." / "Candidate for **U.S. Senate – Florida** in **2026 Florida General Election**." Both office names are links. The tone is calm and clear.
4. **Experience/Degrees as tinted chips inside titled cards (candidate bio).** A two-column grid of cards, each with a solid header bar ("Professional Experience", "Degrees"). Every entry is its own small rounded tinted block.

**How it's built.** Next.js App Router with Tailwind. Header: `bg-brprimary-20 px-4 py-12 sm:flex`. Headshot: `max-w-64 rounded-sm bg-white p-2`. Name: `text-4xl font-black`. Content column: `mx-auto max-w-4xl px-4 md:px-8`. Links grid: `grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5`, with each link `rounded-lg bg-white px-2 py-1` plus an icon and an external-link glyph. Bio cards: `grid gap-4 sm:grid-cols-2`, a header `bg-[#335571] px-4 py-2 text-lg text-white`, and items `mb-2 rounded-md bg-[#ECF2F5] p-2`. The address input has `p-3 text-lg` and a visible bold `text-xl` label. The state browser uses a state-shape icon font in which each letter is a state outline.

```html
<section class="mx-auto max-w-4xl px-4 md:px-8">
  <h2 class="text-h2 mb-1">Verified accounts</h2>
  <p class="text-caption text-on-surface-muted mb-4">We confirm each account belongs to the candidate. <a class="underline" href="/methodology#socials">How</a></p>
  <h3 class="text-label mb-2">Campaign</h3>
  <ul class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
    <li><a class="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-body-sm hover:border-primary" href="…" target="_blank" rel="noopener">
      <!-- icon --> <span class="flex-1">Instagram</span><span aria-hidden="true">↗</span></a></li>
  </ul>
  <h3 class="text-label mt-4 mb-2">Official (current office)</h3> …
</section>
```

**Avoid.** Repeating the "Get started / personalized ballot" upsell card two or three times per page. The heavy navy header bars (`#335571`); use `bg-surface-muted` with `text-on-surface` instead. Asking for an email in the address form.

---

## 4. Vote.org

**Patterns worth taking**
1. **Icon + title + one-line description task tiles (home "next steps").** Six `menu-item` cards: Register, What's on your ballot, Polling place, Track ballot, Check registration, Vote by mail. Each has a left icon, an H3 and a one-sentence promise ("It takes less than 2 minutes to register."). This works well as the row of secondary tasks under our ZIP box.
2. **Deadline blocks split by channel (key dates / help).** "Voter registration deadlines" lists **In Person:** / **By Mail:** / **Online:** each with a relative rule ("29 days before Election Day"). Also: "Election day registration: N/A", stated explicitly rather than left out.
3. **Numbered how-to steps with a bolded warning step.** For example, "Sign and date your form. This is very important!" sits as step 2 of 4.

**How it's built.** Custom CSS on a USWDS base (`usa-button`, `usa-button-secondary`). Tiles are `a.menu-item > .menu-item-left (.menu-icon sprite) + .menu-item-right (h3.menu-item-title + .menu-item-description)`. The hero has a background video.

```html
<a href="/ballot" class="flex gap-4 rounded-lg border border-border bg-surface p-4 hover:border-primary">
  <span class="grid size-10 shrink-0 place-items-center rounded-md bg-primary-muted text-primary"><!-- icon --></span>
  <span><span class="block text-label text-on-surface">What's on your ballot</span>
        <span class="block text-body-sm text-on-surface-muted">Every race and amendment for your address.</span></span>
</a>
```

**Avoid.** Turnout-guilt copy ("36% of Americans didn't vote…"), a countdown/rocket banner, a background video hero and a merch "Shop" link. All of it is activist energy, which runs against our calm, neutral tone.

---

## 5. CalMatters 2026 Voter Guide (strongest reference)

**Patterns worth taking**
1. **Issue-by-issue candidate comparison rows (race page).** The governor page has the office description, then a "Candidates" row of bio cards, then one H2 per issue (Business & Economy, Taxes, Housing…). Under each H2 sits a `comparison-section` with one card per candidate, side by side, each a short neutral paragraph. This is exactly our "candidates side by side" plus "stances by issue".
2. **Sticky candidate switch on mobile (race page).** On narrow screens each comparison section becomes a horizontal **scroll-snap** carousel, one candidate per screen. A **sticky pill segmented control** sits at the top with a 26px headshot, the name and a "D"/"R" badge. It picks which candidate shows, and all sections scroll in sync (`data-scroll-sync`). Inactive pills are `opacity:.5; filter:saturate(0)`. A fade gradient shows when the pill bar overflows. This solves the "2+ candidates on a phone" problem without a wide table.
3. **Measure page as Support | Oppose columns (ballot measure page).** The page runs: headline restated as a verb phrase ("Borrow $11.25 billion for housing"), a plain summary paragraph, then Summary / Endorsements / Campaign finance rows each split into Support vs Oppose columns, and **the official ballot text last**, with a "Source: Secretary of State" line. Support and oppose get **two neutral non-party hues (mint / plum)**, not green and red. Our resource ladder could use the same two-column frame: sources supporting, sources opposing, neutral analysis.
4. **Key-dates list with past dates greyed (home / key dates).** H3 "OCT 19" plus a description. Rows that have passed get `.cmvg26__key-dates__row--past {color:#666; font-weight:normal}`. A **mobile bottom dock** (Key Races · Propositions · My Ballot · Help) keeps the guide's four destinations a thumb away.
   Also: a **"Why trust us?"** block on the landing page (nonpartisan, independent) with a link to About.

**How it's built.** WordPress (Newspack) with custom blocks (`wp-block-calmatters-comparison-*`) and BEM classes `cmvg26-*`. Key CSS, verbatim in spirit:
- Mobile: `.comparison-section{display:flex;gap:4vw;overflow-x:auto;scroll-snap-type:x mandatory;padding:0 5vw 1rem;width:100vw}` and `.comparison-column{flex-shrink:0;scroll-snap-align:center;scroll-snap-stop:always;width:calc(100% - 8vw)}`
- Desktop: `.comparison-section{flex-direction:row;gap:1rem;overflow:visible}` and `.comparison-column{flex:1}`
- Switch: `.comparison-switch-wrapper{position:sticky;top:75px;z-index:99}` and `.comparison-switch{border-radius:40px;border:1px solid grey-300;display:flex;overflow-x:auto;scroll-snap-type:x}`. Choice labels are `min-height:40px; gap:6px; font-size:16px`. The active choice gets a party bg plus a border.
- Card header: a 65px headshot, an H3 at 1.5rem, an "incumbent" note in small type after a 1px divider, and `border-bottom:1px solid grey-300` before the content. Content uses `text-wrap:pretty`.
- Support/oppose columns get the coloured border plus a tinted bg for the second column, and an uppercase small title.

```html
<!-- Race page: one issue row. Mobile = snap carousel; md+ = side by side -->
<h2 id="housing" class="text-h2 mt-10 mb-3">Housing</h2>
<div class="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2
            md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0" data-sync="race-123">
  <article class="w-[calc(100%-2rem)] shrink-0 snap-center rounded-lg border border-border bg-surface p-4 md:w-auto">
    <header class="flex items-center gap-3 border-b border-border pb-3">
      <img class="size-12 rounded-md object-cover" src="…" alt="">
      <div><h3 class="text-h3">Jane Doe</h3><p class="text-caption text-on-surface-muted">Republican · Incumbent</p></div>
    </header>
    <p class="mt-3 text-body text-pretty">Supports raising the homestead exemption … <a class="text-caption underline" href="#src">Source</a></p>
  </article>
  <!-- next candidate -->
</div>

<!-- Sticky switch (mobile only) -->
<div class="sticky top-2 z-20 md:hidden">
  <div role="tablist" class="mx-auto flex w-max gap-1 overflow-x-auto rounded-full border border-border bg-surface p-1">
    <button role="tab" aria-selected="true" class="flex min-h-10 items-center gap-1.5 rounded-full bg-primary-muted px-3 text-label">
      <img class="size-6 rounded-full" src="…" alt="">Jane Doe</button>
    <button role="tab" aria-selected="false" class="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-label opacity-60 grayscale">…</button>
  </div>
</div>
```

**Avoid.** Their quizzes ("which choice matches your views"), since we clipped our quiz. Newsletter and donate interstitials repeated mid-page. Party-tinted active pills (`party-bg-democratic`); our active state should be sage for every candidate.

---

## 6. Texas Tribune (2026 guides)

**Patterns worth taking**
1. **"About the elected seat" → "What's at stake" → candidates (race page).** Two labelled lead paragraphs come before any candidate. "What's at stake" is the voter-relevance hook that most guides skip.
2. **Fixed labelled fields per candidate (candidate card / profile).** Every candidate gets the same labels in the same order: name + "Republican, incumbent" → Campaign finance (cash on hand, raised, with as-of dates) → Major donors → Experience → Political ideology → links ("Campaign photo", "Campaign site"). Identical labels make cross-candidate scanning possible.
3. **Boxed "Here's what you need to know" jump list (how-to-vote / long pages).** A bordered group at the top with question-phrased anchors: "What's on the ballot?", "What dates do I need to know?", "How can I make sure my ballot is counted?"
4. **Dual timestamps on every story card (news feed).** The card shows both the published date and the updated date ("Aug. 25, 2026 · Sept. 25, 2026"). Each guide also carries an editor's note explaining coverage scope. That suits our news feed and methodology pages.

**How it's built.** WordPress. The jump box is `wp-block-group is-style-border` holding a `ul` of `#anchor` links. Candidate blocks are plain paragraphs with bold label + colon. There is a Republish (CC) modal.

```html
<nav aria-labelledby="need-to-know" class="rounded-lg border border-border-strong bg-surface p-5">
  <h2 id="need-to-know" class="text-overline text-on-surface-muted">What you need to know</h2>
  <ul class="mt-2 space-y-1 text-body"><li><a class="underline decoration-primary/40 hover:decoration-primary" href="#dates">What dates do I need to know?</a></li>…</ul>
</nav>
<!-- News card dates -->
<p class="text-caption text-on-surface-muted"><time datetime="2026-09-25">Sep 25</time> · Updated <time datetime="2026-10-02">Oct 2</time></p>
```

**Avoid.** The "Political ideology" field written as editorial characterisation; that is reporter judgement we shouldn't copy. Emoji field labels (💰). The "which candidate best fits you" quiz promo.

---

## 7. Vote Smart (justfacts.votesmart.org)

**Patterns worth taking**
1. **Position provenance key (candidate profile → stances).** Every stance is marked as one of three types. **Official**: the candidate answered directly. **Inferred**: built from the public record. **Unknown**: the candidate refused, or no answer could be found. A key at the top defines each type. This is the most important trust pattern for our stances: label each stance "From the candidate", "From their record (cited)" or "No public position found".
2. **"Entered exactly as submitted" disclaimer.** A note says candidate text is not edited for spelling or grammar. Use it wherever we show candidate-written text verbatim.
3. **Profile tab bar: BIO · VOTES · POSITIONS · RATINGS (candidate profile).** It is short, flat and all caps, and it includes the cross-link "Is X voting like he said he would?" from positions to votes.
4. **Collapsible bio sections with honest empty states.** Personal, Education, Political Experience, Committees and so on. An empty section reads "No caucus information on file." rather than disappearing.

**How it's built.** Server-rendered Bootstrap with Material Icons (`keyboard_arrow_down` collapse toggles, `stars` icon) and `#collapseOne…Seven` accordions. Stances are grouped by issue heading. Each item is an answer token (Yes/No/Pro-choice) followed by the question, then a bold free-text "additional information" paragraph. There is an "Expand All" control.

```html
<!-- Stance with provenance -->
<li class="rounded-md border border-border bg-surface p-4">
  <p class="text-overline text-on-surface-muted">Property taxes</p>
  <p class="mt-1 text-body">Wants to cap non-homestead assessment growth at 5%.</p>
  <p class="mt-2 inline-flex items-center gap-1 rounded-sm bg-primary-muted px-2 py-0.5 text-caption text-primary">
    From the candidate · campaign site, Sep 2026</p>
  <!-- variants: bg-surface-muted text-on-surface-muted "From their record · 2 cited sources" / "No public position found" -->
</li>
```

**Avoid.** The login wall ("You have 2 more free uses left") and reCAPTCHA modals on public facts. Bold-everything free text. Their AI chat ("Civic Sage") as a member perk.

---

## 8. iSideWith (patterns only, we are not a quiz)

**Patterns worth taking**
1. **Category filter chips with counts (candidate stances / news feed).** "Economic (54)", "Housing (12)", "Environmental (20)" and so on, plus a "Quick search" box. The counts tell the reader where a candidate has said a lot and where they've said little. The same idea fits our news feed's issue filter.
2. **Breadcrumb eyebrow → question → answer → source type (stance item).** "Social › Abortion", then the neutral question, then the answer, then a source-type label ("Voting record", "Public statements") and a "References" link.

**How it's built.** Legacy server HTML with hashed class names (`sec_body_group t_ t_1 i_ i_…`) and heavy ads (`show_ad`).

**Avoid (important).** Their source label "[Candidate] voterbase" assigns a stance **from what the candidate's supporters think**. That is not the candidate's position, and we must never do it. Avoid crowd "ratings" (honesty and intelligence scores), upvote/discuss threads, sorting by "what the average voter ranked important", and ad slots inside content.

---

## Cross-site notes for screens with thin coverage

- **News feed with outlet lean tags.** None of these sites tags outlet lean. Use the Texas Tribune dual timestamps, iSideWith count-chips for issue filters, and Vote Smart's "key" box pattern: one small legend at the top of the feed explaining what each lean tag means and where it comes from, linked to methodology.
- **Methodology / about.** Use the CalMatters "Why trust us?" block, the Texas Tribune editor's note on coverage scope, the Vote Smart provenance key, and the Ballotpedia readability scoring as a published method.
