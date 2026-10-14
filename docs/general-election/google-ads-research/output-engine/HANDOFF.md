# Handoff: produce the top 10 Know Your Vote ads with the Output Engine

**For:** the Claude session that runs the Output Engine plugin on the machine with its tools.
**From:** the research and scripting session on PR #176 (2026-10-14).
**Goal:** take the ten scripts in `uploads/scripts/` through the full Output Engine pipeline to
finished, reviewable 9:16 videos. Nothing is published, delivered or spent without the founder's
explicit approval.

## 1. What you are starting with

This folder is a set-up Output Engine project (`engine.json`, `brief.md`). Read these first:

| File | What it gives you |
|---|---|
| `brief.md` | Objective, audience, proposition, mandatory elements. Due date, budget and approvers are TBD (founder). |
| `uploads/scripts/00-how-to-read.md` | Labels, tone rules and how to treat bracketed fields |
| `uploads/scripts/01–10-*.md` | One shot-by-shot script per video, each with a fact card, caption draft and guardrails |
| `characters/*/character.md` | Four unnamed recurring friends, `status: candidate`. Wardrobe is locked; face, build, skin token and voice are TBD (founder) |
| `settings/*/setting.md` | Eight built environments, `status: candidate` |
| `../ranked-34.md`, `../regional-listening/` | Why these ten, the evidence IDs, and the regional starting points |

No records, references, generated media or stress tests exist yet.

## 2. Creative rules that override anything in older docs

The older research files (`../individual-video-sketches.md`, `../ranked-34.md`,
`../first-layer-34.md`) still use working names (Ray, Jo, Mel, Dev) and catchphrases. **Those are
superseded:**

- **No names on screen.** Characters are never named in dialogue, captions, titles or end cards
  unless a script explicitly says the ad needs it. Keep the four characters and their wardrobe.
- **No catchphrases.**
- **Slice-of-life ads start mid-conversation.** It should feel like walking in on friends already
  talking: no setup line, no "hey guys", no talking to camera, natural overlapping speech. Only
  the creator-format videos (05 commute vlog, 08 get-ready-with-me) speak to camera, because
  that is the format.
- Dialogue may be loosened in performance or voice direction. **Factual lines and on-screen
  facts stay exact.**

## 3. Non-negotiables (from the repo and the brief)

- **Neutrality** (`AGENTS.md`, `../../google-ads-handoff-2026-10-13.md` §3): no party, candidate,
  real official or partisan colour; jokes target guessing, never a party, official, community or
  group of voters.
- **No fabricated KYV screens.** Show only live, verified KYV content, or a clearly illustrative
  mockup.
- **Every bracketed field** (`[provider]`, `[body]`, `[operator]`, `[owner]`, `[stage]`,
  `[date]`) is filled from a current official source before export, with the URL recorded in the
  continuity record and the caption. If you cannot verify one, that regional cut is blocked, not
  guessed.
- **No named business, utility, agency or official is accused of anything.** Proposals stay
  labelled as proposals.
- **Brand:** KYV Green and Cream lead, the funk palette supports (`docs/design.md`); illustrated
  skin uses exactly one of the six `illustration-skin` tokens per person.
- **Google election-ads policy:** ads about ballot measures probably need election-advertiser
  verification (handoff §3). None of these ten is a ballot-measure ad, but the review stage must
  confirm that.

## 4. The pipeline, stage by stage

Use the plugin skills. Every stage writes `records/NN-<stage>.vK.md` as a draft and **waits for
the founder** to approve, revise or skip. Never approve on their behalf.

| # | Stage | What to do for this project |
|---|---|---|
| — | `engine-setup` readiness | Run the readiness check. Needs `~/.config/output-engine/keys.env` (mode 600), NodeTool, Open Design and MiroFish. In the scripting session all were missing. |
| — | `character-creation` | With the founder, lock each friend's face, build, skin token, age range and voice. Generate references via `nodetool-bridge`; record consent and upload permission. Set `status: locked` only on their say-so. |
| — | `asset-and-setting-creation` | Add prop sheets: toy telephone, tiny inflatable float, the printed receipts, budget binder, cardboard badge, bench plaque, wall calendar, quiz bell. Lock the eight settings with references. |
| — | `idea-stress-test` | Optional but recommended for the top four (01–04) before spending generation budget. |
| 01 | `input` | Intake from `brief.md` and `uploads/`. Flag every TBD (due date, budget, approvers, cast looks). |
| 02 | `social` | The main stage for this project: 9:16, 20–35 s, captions burned in, sound-off readable. Plan Google Ads video and organic social variants. |
| 03 | `longform` | Skip unless the founder wants a compilation. |
| 04 | `director` | Tone: overheard, naturalistic, dry. Performance notes per script. |
| 05 | `producer` | Order of work. Shared cuts first (01, 02, 03, 04, 08, 09); regional cuts (05, 06, 07, 10) only after their facts are verified. |
| 06 | `strategy` | Confirm the proposition and the end-card and caption lines; no new claims. |
| 07 | `art` | Uses the locked sheets. |
| 08 | `safety` | Puddle (no wading), street scenes, any real location. |
| 09 | `camera` | Shot lists from the script tables; vertical framing. |
| 10 | `continuity` | Wardrobe and prop continuity across all ten, and **the fact log**: every factual line, its source URL and the date it was checked. |
| 11 | `generative` | Run "with tools" only when the founder asks, inside the approved cost cap. |
| 12 | `post` | Edit, captions, end cards, music (royalty-free only), mix. |
| 13 | `review` | Independent check against §2 and §3 above, each script's fact card, and Google ad policy. |
| 14 | `assets` | Organise masters, captions and source lists. |
| 15 | `output` | Delivery package. **Do not upload to Google Ads or post anywhere**; hand the package to the founder. |

## 5. Regional cuts

Four videos need a version per region, each with one verified local fact set:

| Video | Tampa Bay | Miami/South Florida | Central Florida | Jacksonville/Northeast |
|---|---|---|---|---|
| 05 Commute | HART or a road-owner question | Miami-Dade transit (Broward separate) | LYNX | JTA (tolls only as a proposal) |
| 06 Power bill | Tampa Electric / PSC | Confirm provider first | Confirm provider (OUC only where OUC serves) | JEA Board (first fit) |
| 07 Paper trail | One stadium or development record | One transit or development record | One school or infrastructure record | One transit or city-budget record |
| 10 Puddle | First candidate | Supplementary, needs a fresh check | Second candidate | Hold |

## 6. Open decisions for the founder

1. The four characters' looks, ages and voices; live action or illustrated.
2. Due date, budget and approvers (all TBD in `brief.md`).
3. Generation cost cap for the `generative` stage.
4. Which regional cuts to make first.
5. Whether to get Google election-advertiser verification before any campaign.

## 7. Done means

Ten shared masters (and the approved regional cuts) in `generated/`, every factual line traced in
the continuity fact log, a passed `review` record, and an `output` delivery package, all approved
by the founder in `records/`. Nothing published or uploaded.
