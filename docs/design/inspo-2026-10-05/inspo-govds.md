# Civic design-system inspiration for Know Your Vote

Research only. Sources scraped 2026-10-05: GOV.UK Design System pages + govuk-frontend v5 SCSS (unpkg), GOV.UK live step-by-step (`gov.uk/learn-to-drive-a-car`) + `govuk_publishing_components` `_step-by-step-nav.scss`, USWDS component pages + `uswds/packages/*/src/styles` SCSS, NHS service manual pages + nhsuk-frontend v9 SCSS, vote.gov `/register/florida` (via Jina; vote.gov home is behind a Cloudflare challenge), Elections Canada home, Canada.ca design patterns, GetCalFresh home.

## Token notes (read from `src/app/globals.css`)

Snippets use the real tokens. Two things to keep in mind:

- **Spacing is custom.** `--spacing-4` = 16px, `--spacing-5` = 24px, `--spacing-6` = 32px, `--spacing-7` = 48px. So `p-5` is 24px, not Tailwind's default 20px. GOV.UK's "spacing(3)" (15px) maps to our `3`/`4`. "spacing(4)" (20px) maps to `4`/`5`.
- **Contrast traps** (computed):
  - `warning` #b07a1e is 3.35:1 on cream and 3.72:1 on white. Use it for icons, borders and large bold text only. Callout body text stays `text-on-surface`.
  - `accent` #b26836 is 4.26:1 on white, so it fails for small text. Use `accent-strong` (5.41:1 on `accent-muted`) for text.
  - `border` #e4ded2 (1.34:1) and `border-strong` #cfc7b6 (1.68:1) are decorative only. Any boundary that defines a control (inputs, checkboxes, a clickable card's only affordance) needs `border-border-input` #857e6e (4.03:1) to pass WCAG 1.4.11.
  - Good: `primary` on `primary-muted` is 5.33:1, `on-surface-muted` on `surface-muted` is 5.58:1, `primary` on cream is 5.68:1.

## General "de-governmenting" moves (apply everywhere)

GOV.UK, USWDS and NHS read as government because of a few repeated choices:
- 0px radius
- heavy black 5–10px left rules
- all-bold 19px+ type
- the pure #0b0c0c/#1d70b8 palette
- yellow `#fd0` focus blocks
- crests and flags
- "Start now ▸" chevron buttons

Keep their structure and a11y semantics, and swap the skin:

1. Use `rounded-md`/`rounded-lg` on containers. Keep rules thin (2–4px) and in `primary`/`accent` tints, never black.
2. Use Figtree for headings only. Body stays Inter at regular weight. GOV.UK bolds whole warning sentences, so we bold only the key fact (date, deadline).
3. Use warm surfaces (`bg-surface` on `bg-background` cream, `bg-surface-muted` for insets) instead of grey `#f3f2f1`.
4. Use the focus ring `--color-focus-ring` (sage) with a 2px offset, not the yellow block. Keep it at 3px or more so it stays obvious for older users.
5. Use first-person, warm microcopy: "Your ballot", "We checked this on…". Government says "You must…".
6. Keep the honesty and transparency patterns (banner, identifier, review date) but invert their message: "Independent. Not affiliated with any government or party."

---

## 1. Step by step navigation (GOV.UK) + Process list (USWDS): "How to vote in Florida"

**Screens:**
- Home, below the ZIP box, as a "How voting works in Florida" timeline
- Methodology, as "How we build each guide"
- A dedicated `/how-to-vote` page

**What it is:**
- GOV.UK: a numbered, vertical timeline of an end-to-end journey. Each step expands to show tasks (links) and short context. It supports **"and"/"or" sub-steps** for parallel or alternative routes. That fits voting exactly: *Step 3 is one of three options: vote by mail, OR vote early, OR vote on Election Day.*
- USWDS process list: the static (non-collapsible) version.

**Markup specifics (GOV.UK live markup):**
- `<ol class="gem-c-step-nav__steps">` holds `<li class="gem-c-step-nav__step" id="slug">`, then a header `<h2>` containing a number circle and the title.
- Inside the circle: `<span class="visuallyhidden">Step</span> 1<span class="visuallyhidden" aria-hidden="true">:</span>`. Screen readers hear "Step 1 Check you're allowed to drive". The guidance says to make the step number readable when focus lands on the step's button.
- The panel holds an optional `<p>` and then an `<ol class="gem-c-step-nav__list">` of links. Costs go after the link text ("– £34").
- The "and"/"or" steps are **nested `<h3>` sub-headings inside a step**, not new numbered steps. They use a different circle (a small "and"/"or" pill instead of a number).
- Show all / Hide all is a JS toggle (`data-show-all-text="Show all steps"`). Each header becomes a `<button aria-expanded aria-controls>`.
- CSS:
  - `$number-circle-size: 30px`, or `35px` on large variants
  - 1px `border-left` vertical line positioned at `circle/2 − stroke/2`
  - title 19px bold on mobile, 24px from tablet
  - the dashed line under the last step is "help" content
- USWDS process list:
  - `counter-reset: usa-numbered-list` on the `<ol>`
  - `::before` with `content: counter(...)` makes a **40px circle** with a 4px border and a `box-shadow` "gap ring" in the background colour, which lets the circle sit cleanly over the connector line
  - an 8px `border-left` connector on each `<li>` (the last one is transparent)
  - `padding-bottom: 32px` between items

**Tailwind v4 sketch (no JS, native `<details>` per step):**
```tsx
<ol className="relative [counter-reset:step] space-y-0">
  {steps.map((s, i) => (
    <li key={s.id} id={s.id}
        className="relative pl-12 pb-6 [counter-increment:step]
                   before:absolute before:left-0 before:top-0 before:size-8 before:rounded-full
                   before:bg-surface before:border-2 before:border-primary before:text-primary
                   before:font-heading before:font-bold before:grid before:place-items-center
                   before:content-[counter(step)] before:shadow-[0_0_0_4px_var(--color-background)]
                   after:absolute after:left-[15px] after:top-8 after:bottom-0 after:w-0.5 after:bg-border-strong
                   last:after:hidden">
      <details className="group" open={i === 0}>
        <summary className="cursor-pointer list-none text-h3 font-heading text-on-surface
                            rounded-md focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
          <span className="sr-only">Step {i + 1}: </span>{s.title}
          <span className="ml-2 text-body-sm text-primary underline group-open:hidden">Show</span>
        </summary>
        <div className="mt-2 text-body text-on-surface-muted">
          {s.context && <p>{s.context}</p>}
          {s.options?.map((o, j) => (           /* "or" sub-steps */
            <section key={o.id} className="mt-4">
              {j > 0 && <p className="text-overline uppercase text-accent-strong">or</p>}
              <h3 className="text-label text-on-surface">{o.title}</h3>
              <ul className="mt-1 space-y-1">{/* links; deadline after the link text */}</ul>
            </section>
          ))}
        </div>
      </details>
    </li>
  ))}
</ol>
```
- The `before:` circle uses `aria-hidden` behaviour automatically because it is generated content. Keep the sr-only "Step N:" in the summary.
- Put the "or" label as **text in the DOM**, not just a visual pill, so screen readers hear the alternative.

**Less governmental:**
- Sage circles with a cream gap ring, instead of a black outline on white.
- Steps phrased as the voter's moments ("Check you're registered", "Pick how you'll vote", "Look at your ballot", "Vote") rather than bureaucratic tasks.
- Optional: a small dated chip on each step ("by Oct 24") in `bg-accent-muted text-accent-strong rounded-full`.

---

## 2. Summary list and summary card (GOV.UK): "at a glance" facts

**Screens:**
- Candidate profile header facts: party as listed on the ballot, office sought, incumbent?, occupation, website, social links
- Race page: office, term length, seats, district, candidates count
- Ballot measure page: "Type: constitutional amendment", "Needs 60% to pass", "Placed on ballot by"
- The "check answers" review of a saved ballot plan

**Markup specifics:**
- `<dl class="govuk-summary-list">` holds a row wrapper `<div class="govuk-summary-list__row">` containing `<dt class="…__key">`, `<dd class="…__value">` and an optional `<dd class="…__actions">`.
- An action link carries a hidden noun: `Change<span class="govuk-visually-hidden"> date of birth</span>`.
- CSS:
  - mobile: rows stack (key above value), 15px gap after each value
  - from tablet: `display: table`, key `width: 30%`, actions `width: 20%`, cells `padding: 10px 20px 10px 0`, `border-bottom: 1px solid $border`, key is bold
- Summary card wraps the list:
  - 1px border
  - title bar on light grey with `padding: 15px 20px`
  - `<h2 class="govuk-summary-card__title">`
  - card-level actions; the hidden text includes the card name ("Change age (Lead tenant)")

**Tailwind sketch:**
```tsx
<section aria-labelledby="facts-h" className="rounded-lg border border-border bg-surface shadow-elevation-1">
  <h2 id="facts-h" className="px-5 py-3 text-label font-heading text-on-surface bg-surface-muted rounded-t-lg">
    At a glance
  </h2>
  <dl className="px-5 divide-y divide-border">
    {facts.map(f => (
      <div key={f.key} className="py-3 sm:grid sm:grid-cols-[minmax(8rem,30%)_1fr] sm:gap-4">
        <dt className="text-body-sm font-semibold text-on-surface-muted">{f.label}</dt>
        <dd className="mt-1 sm:mt-0 text-body text-on-surface">{f.value}
          {f.source && <a href={f.source.href} className="ml-2 text-body-sm text-primary underline underline-offset-2">
            Source<span className="sr-only"> for {f.label.toLowerCase()}</span></a>}
        </dd>
      </div>
    ))}
  </dl>
</section>
```
- Use grid, not `display: table`. Stacking on mobile is free.
- Our "actions" column becomes **"Source"** links, using the same hidden-noun trick so the link announces as "Source for party". This fits the sources-first brand.

**Less governmental:**
- A muted, regular-weight key in `text-on-surface-muted` with a stronger value, the reverse of GOV.UK's bold key.
- Rounded card on white over the cream page.
- `divide-border` hairlines.

---

## 3. Task list and "check answers" (GOV.UK): "Your ballot checklist"

**Screens:** the ballot page after ZIP lookup, where the list of races and measures has a per-row status. Later, a printable "My ballot plan" review.

**Markup specifics (task list):**
- `<ul class="govuk-task-list">` holds `<li class="govuk-task-list__item govuk-task-list__item--with-link">`.
- `<a class="govuk-task-list__link" aria-describedby="X-hint X-status">` links to the race.
- `<div id="X-hint" class="…__hint">` is secondary text.
- `<div id="X-status" class="…__status">` holds either plain text ("Completed") or a tag (`<strong class="govuk-tag govuk-tag--blue">Incomplete</strong>`).
- CSS:
  - each item `display: table; width: 100%; padding: 10px 0; border-bottom: 1px solid`; the first child also has a `border-top`
  - hover background is light grey
  - **the link's `::after` is absolutely positioned over the whole row, which makes the entire row clickable while only the link is in the tab order**
  - "cannot start yet" status uses the secondary text colour
- Check answers uses the summary list with `Change<span hidden> name</span>`, grouped under `h2` sections, then a final confirm button.

**Our adaptation:**
- Status values are things the voter controls, stored in localStorage only:
  - "Not looked at yet"
  - "Read up"
  - "Uncontested", shown in muted text and not a link-worthy action
  - "Write-in only"
- This gives older and first-time voters a sense of progress through a 15–25 item ballot without any account.

```tsx
<ul className="rounded-lg border border-border bg-surface divide-y divide-border">
  {races.map(r => (
    <li key={r.id} className="relative flex items-start justify-between gap-4 px-4 py-3 hover:bg-surface-muted
                              has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-focus-ring">
      <div>
        <a href={`/race/${r.slug}`} aria-describedby={`${r.id}-hint ${r.id}-status`}
           className="text-body font-semibold text-on-surface underline-offset-2 hover:underline
                      after:absolute after:inset-0 focus-visible:outline-none">
          {r.office}
        </a>
        <p id={`${r.id}-hint`} className="text-body-sm text-on-surface-muted">{r.candidateCount} candidates · {r.scope}</p>
      </div>
      <span id={`${r.id}-status`}
            className={r.seen ? "text-body-sm text-on-surface-muted"
                              : "shrink-0 rounded-full bg-primary-muted px-2.5 py-0.5 text-caption text-primary"}>
        {r.seen ? "Read up" : "Not looked at yet"}
      </span>
    </li>
  ))}
</ul>
```
- Move the focus ring to the row with `has-[a:focus-visible]` so the ring shows the whole clickable area, not just the text.

**Less governmental:** pill status chips in sage or cream, and no "Completed" or "Incomplete" bureaucratese. Group rows by "Federal / State / County / Ballot measures" with `text-overline` headings.

---

## 4. Collection (USWDS): news feed with outlet lean tags

**Screens:** the news feed and the "In the news" module on candidate profiles.

**Markup specifics:**
- `<ul class="usa-collection">` holds `<li class="usa-collection__item">`.
- Each item has an `<h4 class="usa-collection__heading"><a>…</a></h4>` and a `<p class="usa-collection__description">`.
- **Two separate meta lists, each with its own `aria-label`:**
  - `<ul class="usa-collection__meta" aria-label="More information">` holds author plus `<time datetime="2020-09-30T12:00:00+01:00">September 30, 2020</time>`
  - `<ul class="usa-collection__meta" aria-label="Topics">` holds tags; `usa-tag--new` is an emphasised variant
- CSS:
  - items have a 1px top border, `margin-y: 16px` and `padding-top: 16px`
  - type is "sm"
  - meta items are inline with `margin-right: 8px`
  - optional thumbnail is 64px on mobile and 80px from tablet, with a 16px gap
  - the calendar variant has a date block with a primary top and an outlined bottom

**Our adaptation:**
- Meta list 1, "Source": outlet name, the **lean tag**, and the date.
- Meta list 2, "Mentions": candidate and issue chips.
- The lean tag must say what it means in text ("Lean: Center-left · rated by AllSides"), never colour alone. Use neutral hues (not red/blue) to stay non-partisan, for example `bg-surface-muted` with a 5-dot scale glyph.

```tsx
<ul className="divide-y divide-border">
  {items.map(n => (
    <li key={n.id} className="py-4">
      <h3 className="text-h3 font-heading">
        <a href={n.url} className="text-on-surface hover:text-primary underline-offset-2 hover:underline">
          {n.title}<span className="sr-only"> (opens {n.outlet})</span>
        </a>
      </h3>
      <p className="mt-1 text-body text-on-surface-muted line-clamp-3">{n.summary}</p>
      <ul aria-label="Source" className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-on-surface-muted">
        <li className="font-semibold text-on-surface">{n.outlet}</li>
        <li><span className="rounded-full border border-border-strong px-2 py-0.5 text-caption">Lean: {n.leanLabel}</span></li>
        <li><time dateTime={n.publishedAt}>{fmt(n.publishedAt)}</time></li>
      </ul>
      <ul aria-label="Mentions" className="mt-2 flex flex-wrap gap-2">{/* candidate/issue chips */}</ul>
    </li>
  ))}
</ul>
```
- An "Unrated" lean should still render as a labelled chip ("Lean: not rated"), never as an empty one.

**Less governmental:** a calm editorial list (Figtree headline, Inter summary), no thumbnails by default (they invite partisan imagery), and quiet chips.

---

## 5. Banner + Identifier (USWDS), "You can't apply here" (GetCalFresh), Report a problem (Canada.ca): trust and "who we are" chrome

**Screens:** the global header strip, the footer, and the home hero.

**What they are:**
- USWDS banner:
  - `<section class="usa-banner" aria-label="Official website of the United States government">` with a 16×11px flag and "An official website…"
  - a `<button class="usa-accordion__button" aria-expanded="false" aria-controls="gov-banner-default">Here's how you know</button>` that expands two media-block explanations (.gov, HTTPS)
- Identifier: the footer block with domain, an "official website of <agency>" disclaimer, and a **required-links `<nav aria-label="Important links">`** list (About, Accessibility statement, Privacy policy…).
- GetCalFresh hero: a non-government helper is explicit about what it is not: "You can't apply on this website. When you're ready, visit BenefitsCal, the state's official benefits site." followed by a primary button to the state site.
- vote.gov FL page: every outbound state link is `class="usa-link--external" target="_blank"` with an external-link icon.
- Canada.ca: every page ends with "Report a problem or mistake on this page" plus "Date modified".

**Our adaptation, which inverts the gov banner:**
- **Top strip:** "Independent and non-partisan. Not a government website." plus a `Here's how we work` disclosure. It expands to 2–3 media blocks:
  - who funds us
  - how candidates are covered equally
  - where official info lives (FL Division of Elections, your county Supervisor of Elections)
- **Footer identifier:** knowyour.vote · "An independent voter guide. Not affiliated with any party, candidate or government agency." It also carries a required-links nav: About · Methodology · Corrections · Funding · Accessibility · Privacy.
- **Hand-off callout** wherever the voter must act officially: "You can't register or request a mail ballot here. Florida's official site does that." with a button to `registertovoteflorida.gov`.

```tsx
<section aria-label="About this website" className="bg-primary-muted text-body-sm">
  <details className="mx-auto max-w-5xl px-4">
    <summary className="flex cursor-pointer list-none items-center gap-2 py-2 text-on-surface">
      Independent and non-partisan. Not a government website.
      <span className="text-primary underline underline-offset-2">Here's how we work</span>
    </summary>
    <div className="grid gap-4 pb-4 sm:grid-cols-3">{/* 3 short media blocks with icon + bold lead + 1 sentence */}</div>
  </details>
</section>
```
- External links: use visible icon plus `<span class="sr-only">(opens in a new tab)</span>`. Do not rely on `title=` the way vote.gov does, because title is not reliably announced.

**Less governmental:** no flag or seal. The strip is sage-tinted, not grey, and states independence rather than authority. This is the single clearest signal that we are "never governmental" while borrowing the trust mechanism.

---

## 6. Review date (NHS "Know that a page is up to date") + vote.gov "Last updated": source freshness

**Screens:** the bottom of candidate profile, race, measure and methodology pages. A compact version goes on each stance ("Checked Oct 3").

**Markup specifics:**
- NHS: `<p class="nhsuk-body-s nhsuk-u-secondary-text-colour nhsuk-u-margin-top-7 nhsuk-u-margin-bottom-0">Page last reviewed: 15 March 2025<br>Next review due: 15 March 2028</p>`
- It is placed at the **bottom** ("not a high priority for users"), with a 48px top margin and secondary colour.
- Guidance: only use it when the whole page was reviewed, not for a single edit.
- vote.gov: `<p class="vote-date--updated">Last updated: November 17, 2025</p>`.

**Our adaptation:**
- Use `<time>` for both dates.
- Add the Canada.ca "Spot a mistake? Tell us" link.
- The "Next check" date matters for us because of the weekly re-check routine. It turns our methodology into a visible promise.

```tsx
<footer className="mt-7 border-t border-border pt-4 text-body-sm text-on-surface-muted">
  <p>Last checked <time dateTime={checkedAt}>{fmt(checkedAt)}</time>
     <span aria-hidden="true"> · </span>Next check by <time dateTime={nextAt}>{fmt(nextAt)}</time></p>
  <p className="mt-1"><a href={`/corrections?page=${path}`} className="text-primary underline underline-offset-2">
    Spot a mistake? Tell us</a></p>
</footer>
```

**Less governmental:** say "checked" (an active, human verb) rather than "reviewed", and link straight to the methodology section describing the check.

---

## 7. Details + Inset text (GOV.UK), Summary box (USWDS): plain-English explainers

**Screens:**
- Ballot measure page: the "In plain English" summary box, the official ballot language as inset text, and "What is a constitutional amendment?" as details
- Race page: "What does a County Commissioner do?" as details
- Candidate stances: "How we sourced this" as details

**Markup specifics:**
- **Details:**
  - native `<details class="govuk-details"><summary class="govuk-details__summary"><span class="govuk-details__summary-text">Help with nationality</span></summary><div class="govuk-details__text">…</div></details>`
  - the summary is link-coloured and underlined, `width: fit-content`, with a 14px CSS triangle `::before` that rotates when `[open]`; `::-webkit-details-marker { display:none }`
  - the content has `padding: 15px 15px 15px 20px` and a **5px left border** in the border colour
  - the summary text is short, phrased as the user's question
- **Inset text:** `<div class="govuk-inset-text">`, `padding: 15px`, `border-left: 10px solid $border`, 30px margin top and bottom. Use it for a quotation or important aside, not a warning.
- **Summary box:**
  - `<div class="usa-summary-box" role="region" aria-labelledby="summary-box-key-information">` with `<h4 id=…>Key information</h4>`
  - `padding: 24px`, a 1px border in an info-light colour on an info-lighter background, `md` radius
  - links inside get contrast-checked colours against the box background

```tsx
{/* Summary box: plain-English */}
<section role="region" aria-labelledby="plain-h" className="rounded-lg border border-primary/20 bg-primary-muted p-5">
  <h2 id="plain-h" className="text-h3 font-heading text-on-surface">In plain English</h2>
  <ul className="mt-2 list-disc pl-5 space-y-1 text-body text-on-surface">{/* 2–4 bullets */}</ul>
</section>

{/* Inset: official ballot text */}
<figure className="mt-6 border-l-4 border-border-strong pl-4">
  <figcaption className="text-overline uppercase text-on-surface-muted">Exact wording on your ballot</figcaption>
  <blockquote className="mt-1 text-body text-on-surface">{measure.ballotText}</blockquote>
</figure>

{/* Details */}
<details className="group mt-4">
  <summary className="inline-flex cursor-pointer list-none items-center gap-2 text-body text-primary underline underline-offset-2
                      [&::-webkit-details-marker]:hidden">
    <svg aria-hidden="true" className="size-3 transition-transform group-open:rotate-90">…</svg>
    What is a constitutional amendment?
  </summary>
  <div className="mt-2 border-l-2 border-primary/30 pl-4 text-body text-on-surface-muted">…</div>
</details>
```

**Less governmental:** use a 2–4px tinted rule instead of the 10px grey bar, a rounded sage summary box, and the overline label on the ballot quote, which makes it read like an editorial pull-quote.

---

## 8. Warning text (GOV.UK) + Care cards (NHS): deadlines and "act now" notices

**Screens:**
- Home and ballot page: "Mail ballot request deadline: Thursday, Oct 22 at 5pm"
- Day-before and day-of states
- Measure page: "This amendment needs 60% yes to pass"

**Markup specifics:**
- **GOV.UK warning:**
  - `<div class="govuk-warning-text"><span class="govuk-warning-text__icon" aria-hidden="true">!</span><strong class="govuk-warning-text__text"><span class="govuk-visually-hidden">Warning</span> You can be fined…</strong></div>`
  - icon is a 35px circle with a 3px border, filled text-colour, and a 30px "!"
  - text is all bold with `padding-left: 45px`
  - `forced-color-adjust: none` plus a `forced-colors: active` override so the icon survives Windows High Contrast mode
- **NHS care card** (3 urgency tiers: non-urgent blue, urgent red, emergency black):
  - heading container is a coloured band whose heading is `<span role="text"><span class="nhsuk-u-visually-hidden">Non-urgent advice: </span>See a GP if:</span>`
  - a CSS arrow (`__arrow`, aria-hidden) points down into the white content area
  - the tier is spoken via the hidden prefix, never colour alone

**Our adaptation:** two tiers only, to avoid alarm:
- **"Coming up"** (cream/accent): a deadline more than 3 days away
- **"Today" / "Last day"** (stronger accent band): `role="text"` keeps the hidden prefix and heading read as one phrase in VoiceOver

```tsx
<div className="flex gap-3 rounded-lg border border-accent/40 bg-accent-muted p-4">
  <svg aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-accent-strong forced-colors:text-[CanvasText]">{/* calendar/clock, not "!" */}</svg>
  <p className="text-body text-on-surface">
    <span className="sr-only">Important: </span>
    Request a mail ballot by <strong className="font-semibold">Thursday, October 22, 5pm</strong>.{" "}
    <a href="/how-to-vote#mail" className="text-accent-strong underline underline-offset-2">How to request one</a>
  </p>
</div>
```
- Do not use `text-warning`/`text-accent` for the sentence. They fail AA as body text (3.35 and 4.26). The icon may use `text-warning` (it passes 3:1 for graphics) or `accent-strong`.

**Less governmental:** a calendar or clock icon instead of a black "!", bold only on the date, and a rounded warm card. Calm urgency fits "trustworthy".

---

## Honourable mentions

**9. Contents list (NHS) / In-page nav (USWDS via vote.gov "Jump to registration options")**
- Fits: candidate profile ("Jump to: Economy · Housing · Education…"), methodology, how-to-vote.
- NHS:
  - `<nav class="nhsuk-contents-list" role="navigation" aria-label="Pages in this guide">` with a visually hidden `<h2>Contents</h2>`
  - an `<ol>` of `<li>`s; the current page `<li aria-current="page">` holds a bold `<span>` (not a link)
  - each item has a 16–19px **em-dash marker** (an SVG background, `#aeb7bd`) with `padding-left: 24px`
- vote.gov: `usa-in-page-nav` builds the list from page `h2`s with scroll-spy (IntersectionObserver `rootMargin: "48px 0px -90% 0px"`) and a sticky sidebar on desktop.
- Sketch:
  ```
  <nav aria-label="On this page"><ol className="space-y-1 text-body-sm">
    <li className="pl-6 relative before:absolute before:left-0 before:top-[0.7em] before:w-4 before:h-px before:bg-border-strong">
  ```
  The active item gets `aria-current="location"` plus `font-semibold text-on-surface`. Use a horizontal scroll chip row on mobile and a sticky sidebar at `lg`.

**10. ZIP lookup with escape hatch (Elections Canada Voter Information Service)**
- A labelled single input ("Type your postal code:"), a `pattern` with a friendly custom validity message, `maxlength`, and **always** a visible fallback link: "Find an electoral district without a postal code."
- For us:
  - `<label for="zip">Your ZIP code</label>`
  - `inputMode="numeric" autoComplete="postal-code" maxLength={5}`
  - errors in an `aria-describedby` message, not `setCustomValidity` (which is poorly announced)
  - fallback "Use your street address instead" for the 133 split ZIPs
- Elections Canada's home also uses **question-as-button with a hint line** ("Am I registered to vote?" with a smaller "Are you 18 or older? Register or update your address here."). This is a good shape for home secondary CTAs: "Am I registered?", "Where do I vote?", "What's on my ballot?".

**11. Text size + contrast presets (vote.gov)**
- Two buttons above the banner:
  - `data-ui-switch-id="scale" data-values="default,large,x-large"`
  - `data-ui-switch-id="theme" data-values="default,contrast"`
  - each with sr-only labels ("Switch font size preset")
- Valuable for older voters. Implement as `html[data-scale="large"] { font-size: 112.5% }` (all our type is rem). Persist in localStorage. Expose as labelled toggle buttons with `aria-pressed`, not cycling icon-only buttons.

**12. Step indicator (USWDS)**
- `<ol class="usa-step-indicator__segments">` with `<li class="…--complete">Label <span class="usa-sr-only">completed</span></li>`; the current item has `aria-current="true"`.
- The header is `<h4><span class="usa-sr-only">Step</span> <span>3</span> <span>of 5</span> Supporting documents</h4>`.
- Segments are 8px bars, and 1 unit tall on mobile.
- Use it lightly: "Race 4 of 18" on race pages with prev/next links. A counter-only variant is enough. Skip the segment bar, because a ballot is not a form.

**13. Do and Don't lists (NHS)**
- `nhsuk-card--feature` with a heading that overlaps the top edge.
- `<ul class="nhsuk-list nhsuk-list--tick" role="list">` with inline SVG ticks/crosses. `role="list"` restores semantics Safari drops when `list-style:none`.
- Fit: the "What to bring to the polls" page (bring photo + signature ID; don't wear campaign gear within 150 ft).
- **Do NOT use tick/cross for measure "Yes means / No means"**, because it implies a recommendation. Use two neutral, equally styled panels labelled "A YES vote means" / "A NO vote means".

## Sources
- GOV.UK: design-system.service.gov.uk/components/{summary-list,details,inset-text,warning-text,task-list}, /patterns/{check-answers,step-by-step-navigation,start-using-a-service}; gov.uk/learn-to-drive-a-car; unpkg govuk-frontend@5 SCSS; github alphagov/govuk_publishing_components `_step-by-step-nav.scss`
- USWDS: designsystem.digital.gov/components/{step-indicator,process-list,summary-box,collection,identifier,banner}; github uswds/uswds packages SCSS
- NHS: service-manual.nhs.uk/design-system/components/{care-cards,do-and-dont-lists,contents-list,review-date→patterns/reassure-users-that-a-page-is-up-to-date}; unpkg nhsuk-frontend@9 SCSS
- vote.gov/register/florida (Jina; home page blocked by a Cloudflare challenge, 1 attempt plus 1 UA retry)
- elections.ca/home.aspx (the ways-to-vote deep link returned a 500)
- design.canada.ca/common-design-patterns (Date modified / report problem)
- getcalfresh.org
