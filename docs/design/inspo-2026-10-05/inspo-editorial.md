# UI inspiration: editorial, news-bias and data-journalism sites

For Know Your Vote (knowyour.vote). Research only; no repo files were edited.
Scraped 2026-10-05 with curl and the Jina reader, plus WebFetch/WebSearch. Quotes are kept under 15 words.

Token check (read-only, `src/app/globals.css`): there are surface, border, primary, accent and `verdict-*` tokens. **There are no lean (left/center/right) color tokens**, and none should be added in blue and red (see risks).

## Coverage

| Site | Reached? | What it gave us |
|---|---|---|
| ground.news (home, article, /rating-system) | Yes (raw HTML + Jina) | Coverage bar markup, source list, "Untracked bias", how ratings are averaged |
| allsides.com (balanced news, The Hill rating page) | Yes | Inline lean chip, From the Left/Center/Right trio, rating history, "Center doesn't mean better" |
| adfontesmedia.com | Partly. The chart is a JS app and the source page returned 404 | Scale ranges (bias -42..42, reliability 0..64), politically balanced analyst pods (methodology page) |
| politifact.com (home, one fact-check) | Yes | Claim card, "If your time is short" box, "Our Sources" list |
| propublica.org / projects.propublica.org | Yes. **Represent is retired** (archive page only) | Nonprofit Explorer: "Source:" line under each section, honest empty state |
| nytimes.com voter guide | **Blocked by CAPTCHA.** Not bypassed; skipped | n/a |
| washingtonpost.com voter guide | 404 (2024 guide gone, no 2026 guide found) | n/a |
| calmatters.org 2026 voter guide (substitute) | Yes | Race page anatomy, mobile Support/Oppose switch, measure hero |
| semafor.com | Yes | Article anatomy with section icons and a jump list |
| ourworldindata.org (grapher page) | Yes | `dl` key-data box, "with major processing by", how to cite |
| axios.com | Raw HTML blocked by Cloudflare; Jina worked | Bold lead-in labels |
| texastribune.org | 429 rate-limited | n/a |

---

## Ranked patterns (impact for our screens)

### 1. Claim card with "said on DATE in VENUE" provenance (PolitiFact)

**What it is.** Each fact-check card stacks four things: the speaker (avatar and name), the line "stated on September 21, 2026 in an X post:", the quote, and the Truth-O-Meter image. A byline and date sit at the bottom.
Markup: `.pf-statement-person`, `.pf-statement-date`, `.pf-statement-quote.pf-statement-quote-false` (the quote also takes a class per verdict), and `<img alt="False">` at 120px wide.

**Fits.** Candidate profile: one card per issue stance. Race page: comparison cells.

**How to build it.**
- Provenance comes *before* the claim: who, when, where. The verdict comes after it.
- The meter is an image with alt text. We should do better and use a text label plus a color dot.
- Change for us: replace "stated on" with the source type, e.g. "Said in a debate, Oct 1, 2026 · WPLG".
- The verdict is shown only when a fact-check exists. Our `verdict-*` tokens already require a text label alongside the color.

```tsx
<article className="rounded-md border border-border bg-surface p-4">
  <p className="text-caption text-on-surface-muted">
    Said in a <span className="font-semibold">televised debate</span> · <time dateTime="2026-10-01">Oct 1, 2026</time>
  </p>
  <blockquote className="mt-2 text-body text-on-surface">“…exact quote, trimmed…”</blockquote>
  <div className="mt-3 flex items-center justify-between gap-3">
    <a href="#src-3" className="text-body-sm text-primary underline underline-offset-2">Source: WPLG debate transcript</a>
    {verdict && (
      <span className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2 py-0.5 text-caption">
        <span aria-hidden className="size-2 rounded-full bg-verdict-mostly-accurate" />
        Mostly accurate <span className="sr-only">per PolitiFact, Oct 3</span>
      </span>
    )}
  </div>
</article>
```

**Risks.**
- A verdict sits next to only some candidates' stances. If one candidate has more fact-checked claims, a page full of red badges reads as an editorial verdict.
- Show the verdict only as "Checked by [outlet]: [label]", linked to the source.
- Never aggregate verdicts per candidate, and never show a "% false" figure.

### 2. Mobile comparison switch with scroll-synced columns (CalMatters 2026 guide)

**What it is.**
- Proposition pages use `comparison-wrapper` with the attribute `data-scroll-sync-group`.
- On mobile, a segmented control (`.comparison-switch` with buttons "Support" and "Oppose") swaps the visible column. On desktop, the columns sit side by side.
- Each section (Summary, Endorsements, Commentary, Campaign finance) repeats the pair.

Race pages use a fixed order:
1. A one-paragraph explainer of the office.
2. Candidates: name, an "Incumbent" badge, a party chip ("D Democratic"), the ballot designation, and a short bio.
3. Endorsements, side by side.
4. Campaign finance. Each chart has a plain-language explanation above it and a "Difference to opponent" toggle.

**Fits.** Race page (compare candidates) above all. Measure page, for endorsements and finance only (see risk).

**How to build it.** A segmented control on small screens and a CSS grid at `md:`. The control should be a real button group with `aria-pressed`, or a tablist. Keep the same row order in every column so readers can compare across them.

```tsx
<div className="md:hidden inline-flex rounded-md border border-border bg-surface-muted p-1" role="group" aria-label="Show candidate">
  {cands.map(c => (
    <button key={c.id} aria-pressed={active===c.id} onClick={()=>setActive(c.id)}
      className="rounded-sm px-3 py-1.5 text-body-sm aria-pressed:bg-surface aria-pressed:text-on-surface aria-pressed:shadow-sm text-on-surface-muted">
      {c.lastName}
    </button>))}
</div>
<div className="mt-4 grid gap-4 md:grid-cols-2">
  {cands.map(c => (
    <section key={c.id} className={`${active===c.id ? '' : 'hidden'} md:block rounded-md border border-border bg-surface p-4`}>
      <h3 className="text-h3">{c.name}</h3>
      <p className="text-caption text-on-surface-muted">{c.partyLabel}{c.incumbent && ' · Incumbent'}</p>
      {/* same row order for every candidate: Experience, Stances, Endorsements, Money */}
    </section>))}
</div>
```

**Risks.**
- On mobile, whoever is selected by default gets seen first. Default to ballot order and say so ("Listed in ballot order").
- Endorsements and money are factual. CalMatters' written "Supporters argue / Opponents say" summaries are a **case for/against, which our founder retired (2026-09-23)**. Do not copy those rows to the measure page.
- Show party as text, not as party colors.

### 3. Outlet lean chip that links to its rationale, plus an honest "not rated" state (AllSides + Ground News)

**What it is.**
- AllSides writes the lean in the running text, e.g. "Politico (Lean Left bias)". It also shows a 72×12 lean image with alt text "AllSides Media Bias Rating: Lean Left" (`.news-source-bias-image`).
- Ground News puts a "Lean Right" link above each source's headline. The link goes to `/interest/<outlet>#bias-ratings`.
- The Ground News article page shows a count of sources it could not rate, under "Untracked bias".

**Fits.** News feed (every item) and candidate profile related news. Also relevant to the **C7-a gate**: leanTag is 0/37, and LeanTag has no `unrated` value.

**How to build it.**
- A text chip: `Lean: Center` or `Lean: Not yet rated`. It links to the outlet's row on the methodology page.
- Use neutral styling for every lean. Mark position with a small 5-step track, not with hue.
- `title` alone is not accessible. Put the full sentence in the link's accessible name.

```tsx
<a href={`/methodology#outlet-${o.slug}`}
   className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface-muted px-1.5 py-0.5 text-caption text-on-surface-muted hover:border-border-strong">
  <LeanTrack pos={o.lean} />  {/* 5 ticks, one filled; aria-hidden */}
  {o.lean ? `Lean: ${LABEL[o.lean]}` : 'Lean: not yet rated'}
  <span className="sr-only">, rated by {o.rater} — see how</span>
</a>
```

**Risks.**
- Blue and red fills read as party colors and as a verdict. Keep lean colors identical across the scale.
- Without a rater name, the label looks like our own judgment. Always attribute it ("rated by AllSides") or say "not yet rated". This argues for adding the `unrated` LeanTag value.

### 4. "Short on time" summary, a jump link to sources, and an annotated "Our Sources" list (PolitiFact)

**What it is.**
- A callout headed "If your time is short" holds 3 bullets (`.m-callout`, `.short-on-time`).
- Below it, a centered link reads "See the sources for this fact-check" and points to `#sources`.
- The end of the page has a full-bleed `bg-light` "Our Sources" block. Each entry follows one format: Outlet, "Title," date, with a note when it was updated.

**Fits.** Measure page (plain summary first, then the source ladder) and candidate profile (summary of stances, then sources). Methodology page.

**How to build it.** An `aside` with a heading, a `ul` of at most 3 items, and a link to `#sources`. The sources list is an `ol` so in-text `[n]` markers can point at `#src-n`. Each entry: outlet in `font-semibold`, title in quotes, date, and a "primary document" tag where it applies.

```tsx
<aside aria-labelledby="tldr" className="rounded-md border border-border bg-primary-muted p-4">
  <h2 id="tldr" className="text-overline uppercase text-primary">If you only have a minute</h2>
  <ul className="mt-2 list-disc space-y-1 pl-5 text-body-sm">{bullets}</ul>
  <a href="#sources" className="mt-3 inline-block text-body-sm font-semibold text-primary underline">See all {n} sources</a>
</aside>
…
<section id="sources" className="mt-10 rounded-md bg-surface-muted p-4">
  <h2 className="text-h3">Sources</h2>
  <ol className="mt-3 space-y-2 text-body-sm">
    <li id="src-1"><span className="font-semibold">FL Division of Elections</span>, “Amendment 2 ballot text,” <time>Sep 4, 2026</time> <span className="text-caption text-on-surface-muted">· primary document</span></li>
  </ol>
</section>
```

**Risks.** The summary bullets are the riskiest copy on the site. Each bullet must trace to a cited source, and the bullets need the same neutrality review as the measure text.

### 5. "About this data" key-value box and processing disclosure (Our World in Data + ProPublica)

**What it is.**
- OWID uses a `dl.metadata-box-key-data` with these rows: Source, Date range, Last updated, Next expected update, and **Managed by** (a named person).
- Each citation is marked either "prior to any processing" by OWID or "with major processing by Our World in Data".
- ProPublica Nonprofit Explorer puts a line like "Source: Form 990 tax filings from 2011 to 2024" under each section.
- When ProPublica has no extracted data, it says so and links to the original filing instead.

**Fits.**
- Methodology page.
- A footer on every candidate profile and race: "Roster from FL DoE, pulled Sep 21; next check weekly".
- The measure page: sources ladder with a last-checked date. This matches the weekly re-check routine that already exists.

**How to build it.** Use a semantic `dl` in a 2-column grid. Write "Next check" as a commitment we actually keep. Each row says whether we copied, summarized or computed the value.

```tsx
<dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 rounded-md border border-border bg-surface p-4 text-body-sm">
  <dt className="text-on-surface-muted">Candidate list</dt><dd>FL Division of Elections qualifying file</dd>
  <dt className="text-on-surface-muted">Last checked</dt><dd><time dateTime="2026-10-05">Oct 5, 2026</time></dd>
  <dt className="text-on-surface-muted">Next check</dt><dd>Weekly, Mondays</dd>
  <dt className="text-on-surface-muted">What we did</dt><dd>Copied as published; no edits</dd>
</dl>
```

**Risks.** Low. A "Next check" date in the past erodes trust faster than having no date, so drive it from the actual cron job.

### 6. Labeled-section anatomy with an icon jump list (Semafor + Axios)

**What it is.**
- Semafor articles open with a list of section links, each with an icon: "Garrison's view", "Room for Disagreement", "Notable". The sections follow: The Scoop / The News, then the reporter's view, Room for Disagreement, Notable.
- Axios uses bold lead-ins: "Why it matters:", "Zoom in:", "Zoom out:", "Between the lines:", "What they're saying:".

**Fits.** Measure explainer, methodology page, and the race page intro. The labels become the skeleton of the page.

**How to build it.**
- Use fixed `h2`s with short labels, the same on every measure: **What it does · What changes if it passes · What stays the same if it fails · Who put it on the ballot · Read the sources**.
- A sticky `nav` lists the sections as anchor links. Set `aria-current` on the section in view.

```tsx
<nav aria-label="On this page" className="sticky top-0 z-10 -mx-4 overflow-x-auto border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
  <ul className="flex gap-4 whitespace-nowrap text-body-sm">
    {sections.map(s => <li key={s.id}><a href={`#${s.id}`} className="text-on-surface-muted hover:text-primary aria-[current=true]:text-primary aria-[current=true]:font-semibold">{s.label}</a></li>)}
  </ul>
</nav>
<p className="text-body"><strong className="font-semibold">What changes:</strong> …</p>
```

**Risks.**
- "X's view" and "Between the lines" are opinion and analysis slots. **Do not copy those slots.**
- "Room for Disagreement" is tempting, but it amounts to a case for/against, which is retired. Use only factual labels.

### 7. Coverage-mix bar with an honest unrated segment (Ground News)

**What it is.**
- The bar is a flex row of three divs whose widths come from inline style, e.g. `style="width:33%"`, with labels like "Left 33%". Left and right segments carry `data-bias-color-scheme`.
- Heights: 1rem on mobile, 1.5rem on tablet. A compact 5rem×8px version on cards adds a caption such as "40% Center coverage: 270 sources".
- The article page adds All / Left / Center / Right filter tabs with counts, and a line such as "Total News Sources 631".
- Ground News averages AllSides, Ad Fontes and MBFC. Outlets with no rating are **left out of the bar**.

**Fits.** At most: candidate profile related news ("12 articles from 7 outlets") and the news feed filter tabs. **Optional; lowest priority.**

**How to build it.** If we build it:
- Give unrated outlets their own segment, so the bar's total is all outlets, not just rated ones.
- Use neutral tones (`bg-on-surface-muted/…` steps) with text labels always visible.
- Add a text equivalent, e.g. "7 outlets: 2 rated Center, 1 Lean Right, 4 not yet rated".

```tsx
<figure>
  <div className="flex h-2 overflow-hidden rounded-sm bg-surface-muted" aria-hidden>
    {segs.map(s => <div key={s.k} style={{width:`${s.pct}%`}} className={s.cls} />)}
  </div>
  <figcaption className="mt-1 text-caption text-on-surface-muted">{n} outlets · {summary} · <a href="/methodology#lean" className="underline">how leans are rated</a></figcaption>
</figure>
```

**Risks (high).**
- Ground News sells the bar as finding bias, a "Blindspot". On a candidate page, a lopsided bar suggests the candidate is "the left's" or "the right's" candidate.
- Our corpus is thin (14 live news rows, 0 candidate-scoped, leanTag 0/37), so the bar would be mostly noise and mostly unrated.
- **Recommendation:** skip it until C7-a closes. Even then, show it only on the feed, never per candidate.

### 8. Rating provenance, rating history, and "a center rating doesn't mean better" (AllSides + Ad Fontes + Ground News)

**What it is.**
- AllSides outlet pages carry a dated log, e.g. "The Hill Rated Center in April 2026 Editorial Review". Each entry gives a numeric score, and the log keeps the rating it replaced.
- AllSides adds a short callout: "Center doesn't mean better!"
- Ad Fontes says each article is rated by a balanced pod: one left, one center, one right analyst. Its scales run from -42 to 42 for bias and 0 to 64 for reliability.
- Ground News explains that its rating averages three raters.

**Fits.** Methodology page: an outlet table with the rater, the date rated, and a link to the rater's page. Also a disclaimer next to the lean chips.

**How to build it.** A methodology table with columns for Outlet, Lean, Rated by, As of, and Link. Use `<details>` for history. Put one callout above the table.

```tsx
<div role="note" className="rounded-md border-l-4 border-accent bg-accent-muted p-3 text-body-sm">
  A lean label describes an outlet's typical slant, as rated by others. It is not a measure of accuracy, and “Center” doesn’t mean “better.”
</div>
```

**Risks.**
- We should not produce our own lean ratings. Cite an outside rater for each label.
- Do not copy Ad Fontes' 2-axis scatter chart. It implies a reliability ranking of outlets that we do not make.

---

## Smaller patterns worth noting

- **Correction affordance** (Ground News "Does this summary seem wrong?"; AllSides "Suggest an improvement"). Put a "Report an error" link under each stance, summary and measure explainer, prefilled with the item ID. Fits a non-partisan guide's credibility. Low effort.
- **Order rotation** (AllSides). Within the Left/Center/Right trio, the order changes from story to story (Right first on one, Left first on the next), so no side is always on top. For us: list candidates in **official ballot order** and state the rule. Do not rotate randomly, because then the order cannot be explained.
- **Human-authorship line** (AllSides: written by staff, "of humans"). Methodology and footer can say plainly which text is machine-assisted and which is human-reviewed.
- **Who put a measure on the ballot** (CalMatters prop hero ends with a sentence on who placed the measure on the ballot). This is factual and useful, and fits our ladder as a "Sponsor" row sourced from the DoS initiative filing.
- **Bilingual switch at the top of guide pages** (CalMatters `cmvg26-language-switcher`, "Leer en español"). Highly relevant for Miami-Dade.
- **"My Ballot" in the guide nav** (CalMatters). This matches our ZIP-to-ballot flow, and it is good to see it as a first-class nav item.
- **Get notified when data changes** (ProPublica: "email when new data is available"). Fits the existing PWA reminder subscription. A per-race "notify me if this changes" option could build on it later.

## What not to borrow

- Party or lean as blue/red fills anywhere.
- "Blindspot" framing. It tells readers what they are missing politically, which is an editorial stance.
- Per-candidate verdict tallies (PolitiFact personality scorecards).
- Opinion slots ("X's view", "Between the lines", "Room for disagreement", "Supporters argue / Opponents say").
- Reliability rankings of outlets (Ad Fontes vertical axis).
