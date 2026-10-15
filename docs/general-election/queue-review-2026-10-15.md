# Queue review 2026-10-15: drafted verdicts for the whole pending queue (615 rows)

Working file for `queue-review-2026-10-15.console.js`. The session drafts.
**The founder makes every approve and reject in /admin.** Nothing here has been
written to the database. Method, rules and safety are the 10-09 ones
(`handoff-backfill-review-2026-10-09.md` §3–4, founder answers in
`backfill-review-2026-10-09.md` §2); this file only records what is new.

## 1. Queue re-read (SELECT only, 2026-10-15)

| Group | Rows | Drafted |
|---|---|---|
| 10-09 backfill (batch B) + the CBS AG preview `58851a16` | 361 | 10-09, unchanged: 196 approve, 165 reject |
| Daily-sweep `agent:R1` rows queued 10-08 to 10-15 (incl. today's 49) | 253 | this file: 122 approve, 126 reject, 5 left pending |
| R5 candidate lead (`candidate_lead`) | 1 | left pending |

- `review_item`: 615 pending, 0 with `apply_error`. `news_item`: 97 rows.
- **Sign-in:** `auth.users` has 0 users with `last_sign_in_at` set. The founder
  has still never signed in to /admin (checklist A2). Nothing can be sent until
  that happens; an agent cannot sign in.
- Every one of the 318 approvals in the loop resolves to a listed outlet source
  (`planSourceAttribution` → `given`, checked offline). None trips the
  approve-time neutrality lint.

## 2. Rules applied to the 253 new rows

The 10-09 rules and founder answers, plus these precedents already in the
database (decision notes from 10-06 and 10-11):

- **Election news (no candidate)** is approved when it is about Florida's
  Nov 3 ballot or voting in Florida: amendments, voting logistics, local races
  and ballot questions *in the county the row is shown to*. Rejected: national
  or foreign stories that only mention an election (10-06/10-11), a local story
  about another county than the row's `county_fips` (10-06 SPLC precedent;
  applied to Pinellas, Broward and Coral Springs/Hollywood stories),
  elections not on the Nov 3 ballot (Tampa's March charter vote), non-election
  local news, and polls in the home column (founder 10-11).
- **Same story, different county audiences** (e.g. the Trump voter-file story
  in WLRN for Miami-Dade and Orlando Weekly for Orange) is not a duplicate. A
  statewide copy makes a county copy a `[DUP]` (WFSU vs WUSF canvassing boards).
- **Wording the lint misses:** `06af64a6` (Moody ad, "is touting") is rejected
  as a form of the banned "touts".
- Everything else as on 10-09: roundups `[A2/P2]`, opinion `[AUDIT] P1`,
  lint `[AUDIT]`, subject test, one card per candidate per event `[DUP]`
  keeping the earliest-published copy, polls approved when on-subject.

| Verdict | Rows |
|---|---|
| approve | 122 |
| reject: national story | 34 |
| reject: `[DUP]` same event or syndicated | 25 |
| reject: `[A2/P2]` Floridian roundup | 24 |
| reject: another country's election | 10 |
| reject: `[AUDIT]` lint (aims to ×3, hoping to ×2, seeking to, momentum, claims, + "is touting" by hand) | 9 |
| reject: `[AUDIT]` subject | 8 |
| reject: `[AUDIT]` scope (another county, FL-13 not covered) | 6 |
| reject: not election / not on the Nov 3 ballot / poll in home column | 7 |
| reject: `[AUDIT]` P1 opinion | 3 |
| left pending (§3) | 6 |

## 3. Left pending: founder questions

| id | Story | Question |
|---|---|---|
| `28193c6a` | Floridian: resurfaced image of Singer with a Qatari official | The dek speculates voters may question "his loyalty to Israel's security". Reporting, or opinion shown as reporting (P1)? |
| `e6242d3b` | CBS Miami: House candidate Bernadette Greene-Placentia on her rape allegation | Which district, and is she on the roster? If so it belongs under her name, not the home column. |
| `03c2a5f4` | Floridian: Taddeo ad accuses Ingoglia (CFO) | Pipeline gap: Taddeo is on the roster and in the headline, but the row was queued as election news. Re-queue under Taddeo (10-11 precedent), then reject this copy? |
| `2ff3d4f9` | WLRN: Taddeo's CFO campaign gets state dollars | Same as above. |
| `bf9db277` | Local 10: FL-22 candidates talk high prices | Same gap: Dandiya and Askar are not in the title or dek. Re-queue under both? |
| `f3c0233c` | R5 lead: Palm Beach Clerk of the Court (Caruso) | Worth researching the clerk race, or reject? |

**Pipeline gap to fix, not a skew:** three rows above are candidate stories
the matcher filed as election news (names in the body, or a matcher miss on
"Annette Taddeo"). Worth a look at the CFO roster match before the next sweep.

## 4. After the loop: counts and the source check

Live `named` candidate_news published since 09-15, plus the approvals in this
loop (what R4's flag counts once sent):

| Race | Candidate | Live | + loop | Total |
|---|---|---|---|---|
| FL-GOV | Donalds / Jolly | 8 / 6 | 48 / 39 | 56 / 45 |
| FL-SEN | Nixon / Moody | 7 / 1 | 27 / 22 | 34 / 23 |
| FL-ATG | Uthmeier / J.J. Rodríguez | 2 / 1 | 26 / 5 | 28 / 6 |
| FL-27 / FL-22 / FL-25 | Salazar 9 · Dandiya 8, Askar 5 · Moskowitz 6, Singer 6 | | | |

FL-ATG crosses R4's 3× line (28 vs 6). Most Uthmeier rows are official acts
(lawsuits, arrests) by a sitting AG, which reads as a real-world skew, but per
`news-fairness.md` §2 the source check is owed before it is labelled. The
candidate page shows N = 3 either way (PR #157).

## 5. New verdicts (248 sent + 6 pending)

Notes in the loop start `Queue review 10-15:` and carry the full reason.

| id | Candidate | Published | Outlet | Verdict | Tag | Title |
|---|---|---|---|---|---|---|
| `7f57def2` | Angie Nixon | 2026-10-08 | thewestsidegazette.com | **reject** | AUDIT lint | ‘This is a lot’: Angie Nixon recaps various attacks on her as Senate campaign ga |
| `e008fba5` | Angie Nixon | 2026-10-08 | flvoicenews.com | **approve** |  | Deegan won’t back Nixon, saying it’s ‘federal’ despite endorsing Kamala Harris i |
| `1e42fd4e` | Angie Nixon | 2026-10-09 | floridianpress.com | **approve** |  | Angie Nixon Slams 'Coked Out' Pete Hegseth for Okaying Public Execution of Fort  |
| `0394d9c8` | Angie Nixon | 2026-10-09 | floridianpress.com | **reject** | A2/P2 | Last Squeeze🍊— 10.9.2026 — Latest Poll Sees Donalds Ahead of Jolly by 10 Points  |
| `843f18db` | Angie Nixon | 2026-10-11 | local10.com | **approve** |  | Florida Rep. Angie Nixon to campaign at Mi Pueblo restaurant in Miami-Dade |
| `d881a03e` | Angie Nixon | 2026-10-11 | cltampa.com | **approve** |  | Bernie Sanders is coming to Ybor City to boost Angie Nixon’s US Senate campaign |
| `424c439c` | Angie Nixon | 2026-10-11 | local10.com | **reject** | DUP | Diputada de Florida Angie Nixon hará campaña en el restaurante Mi Pueblo en Miam |
| `21337d1d` | Angie Nixon | 2026-10-11 | cbsnews.com/miami | **approve** |  | New polls show GOP Byron Donalds with narrow lead over Democrat David Jolly in F |
| `cd69573a` | Angie Nixon | 2026-10-12 | floridianpress.com | **reject** | A2/P2 | JUICE🍊— 10.12.2026 — Rubio Announces Tangible Progress in Venezuela — Rubio Anno |
| `98151ec2` | Angie Nixon | 2026-10-12 | orlandoweekly.com | **approve** |  | Rep. Ro Khanna to join Maxwell Frost, Angie Nixon at UCF town hall |
| `a316c8e0` | Angie Nixon | 2026-10-12 | floridianpress.com | **reject** | A2/P2 | Last Squeeze🍊— 10.12.2026 — 'Cornell 7' Student Allegedly Reportedly Florida Atl |
| `c8ed7bcd` | Angie Nixon | 2026-10-12 | flvoicenews.com | **approve** |  | Angie Nixon’s Senate campaign hit with repeated FEC violations, nearly $79,000 u |
| `e9c0c28b` | Angie Nixon | 2026-10-13 | wlrn.org | **reject** | DUP | Bernie Sanders and other progressives are coming to Florida to campaign with Dem |
| `4d2387f5` | Angie Nixon | 2026-10-13 | cfpublic.org | **approve** |  | PolitiFact FL: Angie Nixon said Trump has deported ‘over 13,000’ Cubans. That's  |
| `0baf1487` | Angie Nixon | 2026-10-13 | flvoicenews.com | **approve** |  | Florida GOP demands answers from Angie Nixon over FEC campaign finance violation |
| `c83d51d8` | Angie Nixon | 2026-10-13 | floridianpress.com | **reject** | AUDIT subject | National Federation of Independent Business Endorses Republican Challengers For  |
| `2010effd` | Angie Nixon | 2026-10-14 | floridianpress.com | **reject** | A2/P2 | JUICE🍊— 10.14.2026 — Trump Warns Houthis Over Recent Attacks — Colombian Preside |
| `3306b76c` | Angie Nixon | 2026-10-14 | floridianpress.com | **approve** |  | Angie Nixon Receives On-The-Ground Support From Democratic Lawmakers |
| `0efcb1b2` | Angie Nixon | 2026-10-14 | flvoicenews.com | **approve** |  | Florida GOP: National Democrats want to bring socialist agenda to Florida |
| `0afdae5f` | Angie Nixon | 2026-10-14 | floridianpress.com | **approve** |  | Ashley Moody Puts 'Tough on Crime' Resume Against Angie Nixon's 'Radical' Approa |
| `8ba32cfd` | Annette Taddeo | 2026-10-07 | floridianpress.com | **reject** | AUDIT lint | Climate Organization genCLEO Endorses Annette Tadeo For CFO |
| `c1f9e16e` | Ashley Moody | 2026-10-07 | flvoicenews.com | **approve** |  | POLL: Donalds, Moody hold clear leads over Democratic rivals |
| `88120370` | Ashley Moody | 2026-10-09 | flvoicenews.com | **approve** |  | POLL: Donalds, Moody hold matching 10-point leads in new JMI survey |
| `0647404d` | Ashley Moody | 2026-10-09 | flvoicenews.com | **reject** | AUDIT subject | Uber offers free evacuation shelter rides ahead of Hurricane Isaias |
| `2b25bc3c` | Ashley Moody | 2026-10-11 | cbsnews.com/miami | **approve** |  | New polls show GOP Byron Donalds with narrow lead over Democrat David Jolly in F |
| `0c98f0d0` | Ashley Moody | 2026-10-12 | flvoicenews.com | **reject** | AUDIT subject | DeSantis issues recovery updates for northwest Florida following Category 2 Hurr |
| `06af64a6` | Ashley Moody | 2026-10-12 | floridianpress.com | **reject** | AUDIT lint | Ashley Moody Highlights Helping Workers With No Tax on Tips, Social Security |
| `01f56222` | Ashley Moody | 2026-10-12 | floridianpress.com | **reject** | A2/P2 | Last Squeeze🍊— 10.12.2026 — 'Cornell 7' Student Allegedly Reportedly Florida Atl |
| `8797af1e` | Ashley Moody | 2026-10-13 | wlrn.org | **approve** |  | Bernie Sanders and other progressives are coming to Florida to campaign with Dem |
| `81c84d5b` | Ashley Moody | 2026-10-13 | flvoicenews.com | **approve** |  | NFIB endorses Moody, 23 congressional candidates in Florida, citing small-busine |
| `b1b0bb07` | Ashley Moody | 2026-10-13 | floridianpress.com | **approve** |  | National Federation of Independent Business Endorses Republican Challengers For  |
| `074b2a63` | Ashley Moody | 2026-10-13 | flvoicenews.com | **approve** |  | POLL: Donalds, Moody hold commanding double-digit leads in new polls |
| `358d71ea` | Ashley Moody | 2026-10-14 | floridianpress.com | **approve** |  | Ashley Moody Puts 'Tough on Crime' Resume Against Angie Nixon's 'Radical' Approa |
| `44a9d270` | Ashley Moody | 2026-10-14 | floridianpress.com | **approve** |  | Florida Lawmakers Request Florida National Guardsmen Increase in Response to Hur |
| `199e8160` | Bale Dalton | 2026-10-14 | flvoicenews.com | **approve** |  | Ryan Elijah ad targets Bale Dalton over investments in Communist China-linked co |
| `8aae4b22` | Byron Donalds | 2026-10-06 | floridianpress.com | **approve** |  | Everglades Trust Endorses Byron Donalds for Governor |
| `abe9e5fb` | Byron Donalds | 2026-10-06 | wlrn.org | **approve** |  | Byron Donalds unveils proposal to protect Florida waterways |
| `625a81b8` | Byron Donalds | 2026-10-06 | floridianpress.com | **reject** | A2/P2 | Last Squeeze🍊— 10.6.2026 — Donalds Says Jolly Will Undo DeSantis' Agenda — Everg |
| `e9c99cce` | Byron Donalds | 2026-10-06 | nbcmiami.com | **approve** |  | Decision 2026: Donalds leads Jolly in exclusive NBC6/Telemundo 51 Florida Poll.  |
| `a7a3a1ee` | Byron Donalds | 2026-10-07 | diariolasamericas.com | **approve** |  | Donalds lanza ofensiva publicitaria ante avance de Jolly en Florida |
| `5815a260` | Byron Donalds | 2026-10-07 | flvoicenews.com | **reject** | DUP | POLL: Donalds, Moody hold clear leads over Democratic rivals |
| `d4b90704` | Byron Donalds | 2026-10-07 | floridianpress.com | **reject** | DUP | (POLL) Byron Donalds With 7-Point Lead Over David Jolly in Governor's Race |
| `a94c610a` | Byron Donalds | 2026-10-07 | floridianpress.com | **approve** |  | Byron Donalds Attacks David Jolly for 'Welcoming Democrats' on Campaign Trail |
| `44cf77cc` | Byron Donalds | 2026-10-07 | floridianpress.com | **reject** | A2/P2 | Last Squeeze🍊— DeSantis Declares State of Emergency Over Tropical Storm Isaias — |
| `81625d56` | Byron Donalds | 2026-10-08 | floridianpress.com | **approve** |  | Bryan Avila Steps Off Campaign Trail For Hurricane Response |
| `72b2e501` | Byron Donalds | 2026-10-08 | flvoicenews.com | **approve** |  | Donalds tells Largo crowd the Florida dream is on the ballot in 26 days |
| `7f8256af` | Byron Donalds | 2026-10-09 | cltampa.com | **approve** |  | Rick Scott says a vote for Donalds, who is currently tied with Jolly in the poll |
| `f8bf6052` | Byron Donalds | 2026-10-09 | floridadaily.com | **approve** |  | Byron Donalds, David Jolly in Statistical Dead Heat in Two Different Polls |
| `f3de6df6` | Byron Donalds | 2026-10-09 | floridianpress.com | **approve** |  | (POLL) Byron Donalds With 10-Point Advantage Over David Jolly in Governor's Race |
| `3eb9d19d` | Byron Donalds | 2026-10-09 | flvoicenews.com | **reject** | DUP | POLL: Donalds, Moody hold matching 10-point leads in new JMI survey |
| `7e009827` | Byron Donalds | 2026-10-09 | floridianpress.com | **reject** | A2/P2 | Last Squeeze🍊— 10.9.2026 — Latest Poll Sees Donalds Ahead of Jolly by 10 Points  |
| `6570ecda` | Byron Donalds | 2026-10-11 | cbsnews.com/miami | **approve** |  | New polls show GOP Byron Donalds with narrow lead over Democrat David Jolly in F |
| `6e8eeed9` | Byron Donalds | 2026-10-13 | wlrn.org | **reject** | AUDIT subject | David Jolly: Governor’s race likely comes down to undecided Black Floridians |
| `b38c499b` | Byron Donalds | 2026-10-13 | wusf.org | **reject** | AUDIT subject | David Jolly: Governor’s race likely comes down to undecided Black Floridians |
| `a922f16d` | Byron Donalds | 2026-10-13 | floridianpress.com | **approve** |  | Pro-Jolly Advertisement Rips Byron Donalds as 'Puppet' to Data Centers, Special  |
| `65f0aca7` | Byron Donalds | 2026-10-13 | floridianpress.com | **reject** | A2/P2 | Last Squeeze🍊— Pro-Jolly Advertisement Rips 'Puppet' Donalds — Parents Welcome M |
| `f159a85b` | Byron Donalds | 2026-10-13 | flvoicenews.com | **approve** |  | POLL: Donalds, Moody hold commanding double-digit leads in new polls |
| `6a4d6fd0` | Byron Donalds | 2026-10-13 | flvoicenews.com | **approve** |  | Donalds tells St. Cloud crowd Floridians largely want affordability and a state  |
| `65ef6a9a` | Byron Donalds | 2026-10-14 | floridianpress.com | **reject** | A2/P2 | JUICE🍊— 10.14.2026 — Trump Warns Houthis Over Recent Attacks — Colombian Preside |
| `87a6b057` | Byron Donalds | 2026-10-14 | floridianpress.com | **reject** | DUP | Stetson Poll Shows Donalds, Moody Leading Florida Races |
| `add73737` | Byron Donalds | 2026-10-14 | floridianpress.com | **reject** | A2/P2 | Last Squeeze🍊— 10.14.2026 — DeSantis Awards $27M in Infrastructure Upgrades — Fl |
| `f6b32958` | Casey Askar | 2026-10-07 | floridianpress.com | **approve** |  | Democrats Pour Whopping $9.7 Million into Dandiya vs. Askar Congressional Race i |
| `88421205` | Casey Askar | 2026-10-09 | cbsnews.com/miami | **approve** |  | Previewing the District 22 congressional Race: Democrat Pia Dandiya takes on GOP |
| `1bde0633` | David Jolly | 2026-10-06 | floridianpress.com | **reject** | A2/P2 | Last Squeeze🍊— 10.6.2026 — Donalds Says Jolly Will Undo DeSantis' Agenda — Everg |
| `e5fdf1e1` | David Jolly | 2026-10-06 | nbcmiami.com | **approve** |  | Decision 2026: Donalds leads Jolly in exclusive NBC6/Telemundo 51 Florida Poll.  |
| `4ec64708` | David Jolly | 2026-10-07 | diariolasamericas.com | **approve** |  | Donalds lanza ofensiva publicitaria ante avance de Jolly en Florida |
| `1e0b4c59` | David Jolly | 2026-10-07 | floridianpress.com | **reject** | DUP | (POLL) Byron Donalds With 7-Point Lead Over David Jolly in Governor's Race |
| `7a5a5a90` | David Jolly | 2026-10-07 | floridianpress.com | **approve** |  | Byron Donalds Attacks David Jolly for 'Welcoming Democrats' on Campaign Trail |
| `a3aa0511` | David Jolly | 2026-10-07 | floridianpress.com | **reject** | A2/P2 | Last Squeeze🍊— DeSantis Declares State of Emergency Over Tropical Storm Isaias — |
| `bf848503` | David Jolly | 2026-10-09 | cltampa.com | **approve** |  | Rick Scott says a vote for Donalds, who is currently tied with Jolly in the poll |
| `ba125860` | David Jolly | 2026-10-09 | floridadaily.com | **approve** |  | Byron Donalds, David Jolly in Statistical Dead Heat in Two Different Polls |
| `8b8d088f` | David Jolly | 2026-10-09 | floridianpress.com | **approve** |  | (POLL) Byron Donalds With 10-Point Advantage Over David Jolly in Governor's Race |
| `65bccdcc` | David Jolly | 2026-10-09 | flvoicenews.com | **reject** | DUP | POLL: Donalds, Moody hold matching 10-point leads in new JMI survey |
| `64846578` | David Jolly | 2026-10-09 | floridianpress.com | **reject** | A2/P2 | Last Squeeze🍊— 10.9.2026 — Latest Poll Sees Donalds Ahead of Jolly by 10 Points  |
| `e5f0ba7b` | David Jolly | 2026-10-11 | cbsnews.com/miami | **approve** |  | New polls show GOP Byron Donalds with narrow lead over Democrat David Jolly in F |
| `668c477a` | David Jolly | 2026-10-12 | floridianpress.com | **approve** |  | Florida Planned Parenthood Endorses David Jolly, José Javier Rodríguez |
| `ea7d2d84` | David Jolly | 2026-10-12 | wlrn.org | **approve** |  | Democrat David Jolly pitches trust and pragmatism in governor’s race |
| `c0e1e6d0` | David Jolly | 2026-10-13 | wlrn.org | **approve** |  | David Jolly: Governor’s race likely comes down to undecided Black Floridians |
| `8a74c4f7` | David Jolly | 2026-10-13 | wlrn.org | **reject** | DUP | Florida Planned Parenthood PAC backs Jolly, Rodríguez, and slate of legislative  |
| `98989425` | David Jolly | 2026-10-13 | wusf.org | **reject** | DUP | David Jolly: Governor’s race likely comes down to undecided Black Floridians |
| `fd1f5e8c` | David Jolly | 2026-10-13 | cltampa.com | **reject** | DUP | David Jolly: Governor’s race likely comes down to undecided Black Floridians |
| `41568c49` | David Jolly | 2026-10-14 | floridianpress.com | **approve** |  | Stetson Poll Shows Donalds, Moody Leading Florida Races |
| `0c16dce7` | David Jolly | 2026-10-14 | flvoicenews.com | **reject** | AUDIT lint | EXCLUSIVE: Campaign manager sounds alarm on Sen. Brian Nathan and Nikki Fried fa |
| `5b972dda` | Eliott Rodriguez | 2026-10-08 | floridianpress.com | **reject** | A2/P2 | JUICE🍊— 10.8.2026 — DeSantis Knocks Anthropic Over Chatbots — Democrats Drop Who |
| `ff007591` | Gus Michael Bilirakis | 2026-10-07 | floridianpress.com | **approve** |  | Family of Baseball Legend, Humanitarian Roberto Clemente Endorses Gus Bilirakis  |
| `e6bf0cd3` | James Uthmeier | 2026-10-07 | flvoicenews.com | **approve** |  | Florida AG seeks court order to ban kids under 14 from Meta platforms, cites ‘dr |
| `296356c6` | James Uthmeier | 2026-10-07 | wftv.com | **reject** | DUP | Florida AG seeks to ban users under 14 from Meta platforms |
| `659e43e1` | James Uthmeier | 2026-10-07 | cbsnews.com/miami | **approve** |  | Previewing the race for Florida's Attorney General: Jose Javier Rodriguez vs Jam |
| `637fc0f2` | James Uthmeier | 2026-10-08 | floridianpress.com | **reject** | A2/P2 | JUICE🍊— 10.8.2026 — DeSantis Knocks Anthropic Over Chatbots — Democrats Drop Who |
| `f2a518e9` | James Uthmeier | 2026-10-08 | cltampa.com | **approve** |  | Court erases Hope Florida grand jury report, after an appeal that had no one on  |
| `d1750a2c` | James Uthmeier | 2026-10-08 | floridianpress.com | **approve** |  | Attorney General James Uthmeier Launches Lawsuit Against Router Company |
| `0e7dd515` | James Uthmeier | 2026-10-08 | flvoicenews.com | **reject** | DUP | DeSantis proclaims ‘total victory’ for Hope Florida after appeals court orders f |
| `1aef614b` | James Uthmeier | 2026-10-08 | flvoicenews.com | **approve** |  | 21 arrested in Osceola County child predator sting, Uthmeier announces |
| `79bd9afc` | James Uthmeier | 2026-10-08 | floridianpress.com | **reject** | DUP | James Uthmeier Announces Arrest of 21 Child Predators in 'Operation Cooked' |
| `d22b5eaa` | James Uthmeier | 2026-10-08 | floridianpress.com | **reject** | DUP | AG Uthmeier Continues Fight to Protect Florida Children Online As Parents Call f |
| `d726b7d6` | James Uthmeier | 2026-10-09 | floridadaily.com | **approve** |  | Florida Attorney General Activates Price Gouging Hotline Ahead of Hurricane Isai |
| `1171d8d2` | James Uthmeier | 2026-10-09 | floridadaily.com | **approve** |  | Florida’s Meta Case Leaves a Gap on Teen Safety |
| `c58c57a7` | James Uthmeier | 2026-10-09 | flvoicenews.com | **reject** | DUP | Uthmeier urges Floridians to report price gouging during storm emergency |
| `191e4845` | James Uthmeier | 2026-10-09 | fox35orlando.com | **reject** | DUP | Florida AG warns looters, scammers ahead of Hurricane Isaias |
| `55adb150` | James Uthmeier | 2026-10-13 | flvoicenews.com | **approve** |  | Multi-agency bust dismantles South Florida cocaine and fentanyl ring, 25 suspect |
| `e9e5cd49` | James Uthmeier | 2026-10-13 | floridianpress.com | **reject** | DUP | James Uthmeier Announces Arrest of 20 in Drug Trafficking, Racketeering Bust |
| `9d971211` | Jared Moskowitz | 2026-10-08 | floridianpress.com | **reject** | A2/P2 | Last Squeeze🍊— 10.8.2026 — 🚨 Hurricane Isaias Update 🚨 — Democrats Pour $9.7M In |
| `40355af3` | Jared Moskowitz | 2026-10-09 | floridadaily.com | **approve** |  | South Florida Democrat Criticizes NYC Mayor Mamdani Over Oct. 7 Anniversary Comm |
| `b66165d0` | Jared Moskowitz | 2026-10-13 | floridianpress.com | **reject** | A2/P2 | Last Squeeze🍊— Pro-Jolly Advertisement Rips 'Puppet' Donalds — Parents Welcome M |
| `70076d6c` | Jared Moskowitz | 2026-10-13 | cbsnews.com/miami | **approve** |  | Incumbant Jared Moskowitz takes on ex-Boca Raton mayor Scott Singer in Florida's |
| `8c31c1d2` | Jared Moskowitz | 2026-10-14 | local10.com | **approve** |  | Ad targeting Moskowitz cites up to $8 million in stock trades, but actual earnin |
| `edc97cd6` | Jennifer Jenkins | 2026-10-07 | floridianpress.com | **approve** |  | Mike Haridopolos & Jennifer Jenkins Face Off in FL CD 8 Debate |
| `78789f28` | Jose Javier Rodriguez | 2026-10-07 | cbsnews.com/miami | **approve** |  | Previewing the race for Florida's Attorney General: Jose Javier Rodriguez vs Jam |
| `57ca85a3` | Jose Javier Rodriguez | 2026-10-08 | floridianpress.com | **reject** | A2/P2 | JUICE🍊— 10.8.2026 — DeSantis Knocks Anthropic Over Chatbots — Democrats Drop Who |
| `799d70e8` | Jose Javier Rodriguez | 2026-10-12 | floridianpress.com | **approve** |  | Florida Planned Parenthood Endorses David Jolly, José Javier Rodríguez |
| `815acf20` | Jose Javier Rodriguez | 2026-10-13 | wlrn.org | **reject** | DUP | Florida Planned Parenthood PAC backs Jolly, Rodríguez, and slate of legislative  |
| `1523e9bd` | Kathy Castor | 2026-10-13 | floridianpress.com | **approve** |  | Mike Beltran Calls Out Kathy Castor For Her Role on The Economy |
| `ab80e5e1` | Maria Elvira Salazar | 2026-10-08 | diariolasamericas.com | **approve** |  | María Corina Machado da su apoyo electoral a María Elvira Salazar por su defensa |
| `1affd02f` | Maria Elvira Salazar | 2026-10-09 | floridianpress.com | **reject** | A2/P2 | JUICE🍊— 10.9.2026 — DeSantis Finds Vindication in Latest Hope Florida Ruling — B |
| `168ed2eb` | Maria Elvira Salazar | 2026-10-13 | floridianpress.com | **approve** |  | Colombian President Abelardo de la Espriella Endorses María Elvira Salazar For C |
| `5155efbd` | Maria Elvira Salazar | 2026-10-14 | floridianpress.com | **reject** | A2/P2 | JUICE🍊— 10.14.2026 — Trump Warns Houthis Over Recent Attacks — Colombian Preside |
| `79bf0670` | Mario Diaz-Balart | 2026-10-07 | flvoicenews.com | **reject** | AUDIT subject | Florida lawmakers remember Oct. 7 attacks, honor victims and hostages |
| `0b4fceca` | Maxwell Alejandro Frost | 2026-10-12 | floridianpress.com | **reject** | A2/P2 | JUICE🍊— 10.12.2026 — Rubio Announces Tangible Progress in Venezuela — Rubio Anno |
| `b8ca34a1` | Maxwell Alejandro Frost | 2026-10-12 | orlandoweekly.com | **approve** |  | Rep. Ro Khanna to join Maxwell Frost, Angie Nixon at UCF town hall |
| `dd3c50da` | Maxwell Alejandro Frost | 2026-10-14 | orlandoweekly.com | **reject** | AUDIT subject | Queer-led punk band The Pheromones to join Rep. Maxwell Frost at Come Out With P |
| `58a72786` | Mike Beltran | 2026-10-13 | floridianpress.com | **approve** |  | Mike Beltran Calls Out Kathy Castor For Her Role on The Economy |
| `90ecb6f6` | Mike Beltran | 2026-10-14 | floridianpress.com | **reject** | A2/P2 | Last Squeeze🍊— 10.14.2026 — DeSantis Awards $27M in Infrastructure Upgrades — Fl |
| `920ed2ab` | Mike Haridopolos | 2026-10-07 | floridianpress.com | **approve** |  | Mike Haridopolos & Jennifer Jenkins Face Off in FL CD 8 Debate |
| `30ad30c0` | Oliver G. Gilbert III | 2026-10-12 | cbsnews.com/miami | **approve** |  | Florida's 24th congressional district race sees GOP Te Brown facing Democrat Oli |
| `07ea71d0` | Oliver G. Gilbert III | 2026-10-12 | cbsnews.com/miami | **reject** | DUP | Gilbert and Brown outline views on affordability, housing, immigration in Florid |
| `7538518d` | Pia Dandiya | 2026-10-07 | floridianpress.com | **approve** |  | Democrats Pour Whopping $9.7 Million into Dandiya vs. Askar Congressional Race i |
| `b19ab871` | Pia Dandiya | 2026-10-09 | cbsnews.com/miami | **approve** |  | Previewing the District 22 congressional Race: Democrat Pia Dandiya takes on GOP |
| `9f5222c6` | Pia Dandiya | 2026-10-11 | cbsnews.com/miami | **approve** |  | Full 1-on-1 interview: Pia Dandiya |
| `734d62d9` | Pia Dandiya | 2026-10-11 | cbsnews.com/miami | **reject** | DUP | 1-on-1: Pia Dandiya discusses her Congressional run |
| `78f46f47` | Pia Dandiya | 2026-10-11 | cbsnews.com/miami | **reject** | DUP | Pia Dandiya explains why she is running for Florida's Congressional District 22 |
| `e5f4a0db` | Pia Dandiya | 2026-10-11 | floridianpress.com | **reject** | AUDIT p1 | CBS News Deletes Damaging Interview Segment of Progressive Lobbyist Pia Dandiya  |
| `8956b746` | Ryan Elijah | 2026-10-07 | floridianpress.com | **approve** |  | (AD) Ryan Elijah Teams Up With Sheriffs to Reinforce His Commitment to Public Sa |
| `a578a58b` | Ryan Elijah | 2026-10-07 | flvoicenews.com | **reject** | DUP | Ryan Elijah highlights support from Chitwood, Lemma and Ivey; 2 appear in new ad |
| `29e19302` | Ryan Elijah | 2026-10-13 | floridianpress.com | **approve** |  | Cory Mills Questions Ryan Elijah's Stance on Insider Trading Amid Reports Of Eli |
| `f11431d3` | Ryan Elijah | 2026-10-14 | flvoicenews.com | **approve** |  | Ryan Elijah ad targets Bale Dalton over investments in Communist China-linked co |
| `8b06e673` | Scott Singer | 2026-10-13 | floridianpress.com | **reject** | A2/P2 | Last Squeeze🍊— Pro-Jolly Advertisement Rips 'Puppet' Donalds — Parents Welcome M |
| `8317625d` | Scott Singer | 2026-10-13 | cbsnews.com/miami | **approve** |  | Incumbant Jared Moskowitz takes on ex-Boca Raton mayor Scott Singer in Florida's |
| `7fff6068` | Te Mayonna Brown | 2026-10-12 | cbsnews.com/miami | **approve** |  | Florida's 24th congressional district race sees GOP Te Brown facing Democrat Oli |
| `006ffae1` | Te Mayonna Brown | 2026-10-12 | cbsnews.com/miami | **reject** | DUP | Gilbert and Brown outline views on affordability, housing, immigration in Florid |
| `50a4f4bd` | Wilton Simpson | 2026-10-08 | flvoicenews.com | **approve** |  | Simpson details Florida’s hurricane preparations as Gulf Coast braces for impact |
| `2fda7721` | Wilton Simpson | 2026-10-12 | flvoicenews.com | **reject** | AUDIT subject | DeSantis issues recovery updates for northwest Florida following Category 2 Hurr |
| `94718301` | Wilton Simpson | 2026-10-12 | flvoicenews.com | **approve** |  | Commissioner Wilton Simpson announces $500K interest-free loans for Florida farm |
| `e33c9657` | *(election news)* | 2026-10-06 | wlrn.org | **approve** |  | Florida removes Trump’s personal information from voter files, after president w |
| `bf9fd01e` | *(election news)* | 2026-10-06 | orlandoweekly.com | **approve** |  | Florida removes Trump’s personal information from voter files, after president w |
| `55202e6f` | *(election news)* | 2026-10-07 | cfpublic.org | **approve** |  | Newest voters in Central Florida skewed blue ahead of Oct. 5 deadline |
| `5f5e064c` | *(election news)* | 2026-10-07 | cltampa.com | **approve** |  | Tampa Bay’s community radio station, WMNF, is providing free air time to candida |
| `d599e89d` | *(election news)* | 2026-10-07 | floridadaily.com | **approve** |  | Elected Officials Holding More Open Town Hall Meetings On Property Tax Amendment |
| `6e47d54b` | *(election news)* | 2026-10-07 | cltampa.com | **approve** |  | St. Pete’s League of Women Voters explains the 2026 general election’s three Flo |
| `4d4dc169` | *(election news)* | 2026-10-07 | wtsp.com | **approve** |  | Tampa mayor warns dengue response could be limited if Amendment 3 passes |
| `b9e0f342` | *(election news)* | 2026-10-08 | local10.com | **approve** |  | 3 candidates vie for mayor in Palmetto Bay |
| `b3aca517` | *(election news)* | 2026-10-08 | local10.com | **approve** |  | Miami voters to decide fate of $80M Virginia Key redevelopment |
| `41586489` | *(election news)* | 2026-10-08 | wtsp.com | **reject** | AUDIT scope | Advocates push for early voting site in South St. Pete |
| `bc4867ea` | *(election news)* | 2026-10-08 | local10.com | **approve** |  | Florida gubernatorial candidates make South Florida stops ahead of election day |
| `dc24c6cb` | *(election news)* | 2026-10-08 | wusf.org | **approve** |  | 10 Tampa Bay area school board races go to runoffs in the midterms |
| `b17692fe` | *(election news)* | 2026-10-09 | local10.com | **reject** | AUDIT lint | 4 candidates vie to become Cutler Bay’s next mayor |
| `3a41f734` | *(election news)* | 2026-10-09 | wusf.org | **approve** |  | Hillsborough School Board suggests voters say no to making superintendent an ele |
| `7a44e780` | *(election news)* | 2026-10-09 | wusf.org | **approve** |  | WUSF's Voter Guide helps you compare the candidates for the 2026 elections |
| `83579c61` | *(election news)* | 2026-10-09 | lefloridien.com | **approve** |  | North Miami Election: Could Mayor Desulme lose his place on the ballot over how  |
| `9fdaccb4` | *(election news)* | 2026-10-09 | local10.com | **approve** |  | Competitor wants North Miami mayor off ballot, arguing he didn’t properly qualif |
| `78fb9316` | *(election news)* | 2026-10-09 | wusf.org | **approve** |  | Breaking down Amendment 3, court orders Hope Florida report expunged, weekly new |
| `6f04c834` | *(election news)* | 2026-10-09 | local10.com | **reject** | AUDIT scope | Incumbent mayor, challenger on ballot in Coral Springs |
| `6367a685` | *(election news)* | 2026-10-09 | cbsnews.com/miami | **approve** |  | Palmetto Bay mayoral candidates detail how they would handle budget if Amendment |
| `7e78790e` | *(election news)* | 2026-10-10 | local10.com | **reject** | foreign | A small-town Alaska fisherman has Republicans on the defensive as they try to ke |
| `2eddd2b1` | *(election news)* | 2026-10-10 | local10.com | **reject** | foreign | Mahmoud Abbas postpones Palestinian legislative elections another year |
| `e4af5c59` | *(election news)* | 2026-10-11 | local10.com | **reject** | national | Trump urges Sen. John Fetterman to switch parties and become a Republican |
| `cb44ad2d` | *(election news)* | 2026-10-11 | local10.com | **reject** | foreign | Czech opposition outpaced the ruling party in first round of Senate election |
| `ee0edc95` | *(election news)* | 2026-10-11 | local10.com | **reject** | national | Nonpartisan state Supreme Court elections are being put to the test in Montana |
| `48b19641` | *(election news)* | 2026-10-11 | local10.com | **reject** | foreign | India's 'Cockroach' protest movement leaders freed from detention, vow to contin |
| `d2b25fb2` | *(election news)* | 2026-10-11 | local10.com | **reject** | national | Republicans want Abdul El-Sayed to be the main character of the midterms. He's h |
| `49f05d73` | *(election news)* | 2026-10-11 | local10.com | **reject** | national | Republicans face midterm backlash from factory workers squeezed out of jobs by T |
| `dce08d62` | *(election news)* | 2026-10-11 | local10.com | **reject** | national | Trump sticks with tariffs even as US voters turn against them before the midterm |
| `34f9694a` | *(election news)* | 2026-10-11 | local10.com | **reject** | foreign | France's far-left presidential candidate cheers Gen Z school protests |
| `33a8bc2e` | *(election news)* | 2026-10-11 | local10.com | **reject** | foreign | UK prime minister say it is 'clear' Russia interfered in 2016 Brexit referendum |
| `25f8013d` | *(election news)* | 2026-10-12 | local10.com | **reject** | national | A Spanish-language radio show overflows with voters' frustration in Pennsylvania |
| `b4e6b4c8` | *(election news)* | 2026-10-12 | wusf.org | **approve** |  | How Amendment 3 may affect Florida's public libraries |
| `0107f3cb` | *(election news)* | 2026-10-12 | wlrn.org | **approve** |  | No Kings grassroots movement to host day of action to promote early voting in So |
| `14aa3f6f` | *(election news)* | 2026-10-12 | local10.com | **reject** | national | Many GOP states have imposed new voting rules this year, some mirroring Trump's  |
| `8963956a` | *(election news)* | 2026-10-12 | wlrn.org | **reject** | AUDIT lint | After losing ground with Latino voters, Democrats are turning to influencers for |
| `378b2d64` | *(election news)* | 2026-10-12 | cfpublic.org | **approve** |  | 2026 Voter Insight Panel: Elections, Immigration, and Family |
| `1b2cd79e` | *(election news)* | 2026-10-12 | local10.com | **reject** | national | Elon Musk quietly becomes biggest known donor in midterm contests as he tries to |
| `47e85751` | *(election news)* | 2026-10-12 | floridianpress.com | **reject** | national | Many GOP states have imposed new voting rules this year, some mirroring Trump's  |
| `85bd8843` | *(election news)* | 2026-10-12 | wlrn.org | **approve** |  | How Amendment 3 may affect Florida's public libraries |
| `de5d6396` | *(election news)* | 2026-10-12 | flvoicenews.com | **reject** | national | Trump heads to Ohio, Alaska this week as Senate races tighten ahead of midterms |
| `694d424f` | *(election news)* | 2026-10-12 | flvoicenews.com | **reject** | national | Elon Musk becomes top midterm donor with more than $276 million to Republican gr |
| `c4640d2a` | *(election news)* | 2026-10-12 | floridianpress.com | **reject** | national | Elon Musk quietly becomes biggest known donor in midterm contests as he tries to |
| `e5a7b7f8` | *(election news)* | 2026-10-12 | wlrn.org | **approve** |  | NAACP launches election protection war room, get-out-the vote campaign ahead of  |
| `956298fe` | *(election news)* | 2026-10-12 | local10.com | **approve** |  | Outsider challenging 23-year incumbent in Virginia Gardens mayor race |
| `b53b8d4f` | *(election news)* | 2026-10-12 | cbsnews.com/miami | **reject** | AUDIT lint | Pembroke Park mayor on trial for debate on if he lives in the town or not |
| `8fe18799` | *(election news)* | 2026-10-12 | cbsnews.com/miami | **reject** | national | Data center boom puts Republicans in a bind before midterm elections |
| `52573924` | *(election news)* | 2026-10-13 | local10.com | **reject** | national | Trump attacks immigrants from Somalia and Haiti while rallying in Ohio for Repub |
| `73718d0a` | *(election news)* | 2026-10-13 | cltampa.com | **reject** | AUDIT p1 | Op-ed: Vote ‘No’ on retaining Florida Supreme Court Justice Carlos Muñiz |
| `4090ab2f` | *(election news)* | 2026-10-13 | wusf.org | **reject** | DUP | Is trust eroding in elections? Florida counties' canvassing boards work to ensur |
| `7b97576a` | *(election news)* | 2026-10-13 | wfsu.org | **approve** |  | Is trust in elections eroding? Florida canvassing boards work to ensure integrit |
| `a2a4da8d` | *(election news)* | 2026-10-13 | flvoicenews.com | **reject** | national | New White House press secretary Katie Zacharia announces Guilfoyle resignation,  |
| `3f4e3486` | *(election news)* | 2026-10-13 | floridianpress.com | **reject** | not election | Trump Warns The Houthis Over Their Recent String Of Attacks: 'I Will Never Forge |
| `369da328` | *(election news)* | 2026-10-13 | wlrn.org | **reject** | foreign | More than 119 million Brazilians voted in the Oct. 4 election – including about  |
| `3710bd80` | *(election news)* | 2026-10-13 | wtsp.com | **approve** |  | How to see your sample ballot for Election Day 2026 / Tampa Bay county-by-county |
| `a0594007` | *(election news)* | 2026-10-13 | floridianpress.com | **approve** |  | Florida Democrats Set to Receive Attacks from PAC Funded by AI Investor |
| `90d3e54c` | *(election news)* | 2026-10-13 | wtsp.com | **approve** |  | Election Day 2026: Important dates and deadlines for Tampa Bay voters |
| `f9fe1bec` | *(election news)* | 2026-10-13 | wusf.org | **approve** |  | Democrats are ready to 'shock the world' in Florida, says DNC chair |
| `93172f0c` | *(election news)* | 2026-10-13 | wusf.org | **reject** | foreign | More than 119 million Brazilians voted in the Oct. 4 election – including about  |
| `d6580d6e` | *(election news)* | 2026-10-13 | wftv.com | **reject** | AUDIT lint | Oviedo homeowners still undecided as voting for Amendment 3 begins |
| `3e528bc5` | *(election news)* | 2026-10-13 | wtsp.com | **approve** |  | Is it too late to request a mail-in ballot in Florida? |
| `28f63066` | *(election news)* | 2026-10-13 | wtsp.com | **approve** |  | When does early voting begin? County-by-county guide for Election Day 2026 |
| `bfc9f422` | *(election news)* | 2026-10-13 | local10.com | **reject** | national | Supreme Court refuses to toss out fees for lawyers who sought hand count in Ariz |
| `d160d1ec` | *(election news)* | 2026-10-13 | wtsp.com | **approve** |  | What you can and can't bring to the Florida polls on Election Day |
| `fa5ac8b7` | *(election news)* | 2026-10-13 | floridadaily.com | **reject** | AUDIT p1 | Floridians Are Being Squeezed. Amendment 3 Offers Relief |
| `e8f78923` | *(election news)* | 2026-10-13 | local10.com | **approve** |  | Former Sunny Isles Beach mayor wants old job back; current mayor seeks to keep i |
| `8c393696` | *(election news)* | 2026-10-13 | wtsp.com | **reject** | national | 2026 midterm elections / What voters are searching ahead of Election Day |
| `1fc4c17d` | *(election news)* | 2026-10-14 | local10.com | **reject** | national | Battle lines shift in House races as Republicans retreat from front-line distric |
| `0a904b59` | *(election news)* | 2026-10-14 | local10.com | **reject** | national | Iowa faces a reckoning over water quality and cancer rates in midterm campaigns |
| `15d28ceb` | *(election news)* | 2026-10-14 | local10.com | **reject** | national | House Democrats plan a first 100-days agenda if they sweep to power in midterm e |
| `18d9ebbf` | *(election news)* | 2026-10-14 | local10.com | **reject** | foreign | 'Cockroach' movement leaders jailed for 5 days after scaling barricades at New D |
| `b840ff8e` | *(election news)* | 2026-10-14 | local10.com | **reject** | national | Kamala Harris adds stops to her final midterm campaign stretch. Her decision abo |
| `ec1bc43e` | *(election news)* | 2026-10-14 | wusf.org | **approve** |  | Is healthcare on Florida's ballot? Many voters say it's a top priority |
| `31451de4` | *(election news)* | 2026-10-14 | local10.com | **reject** | national | More expensive gas, semiconductors likely pushed up inflation last month |
| `e14616a3` | *(election news)* | 2026-10-14 | wlrn.org | **approve** |  | Is healthcare on Florida's ballot? Voters say it's a top priority |
| `4f5a40c8` | *(election news)* | 2026-10-14 | floridadaily.com | **reject** | not election | Report: Some Florida Businesses May Pause Expansion Plans Until After the Electi |
| `385668b2` | *(election news)* | 2026-10-14 | floridianpress.com | **approve** |  | National Democratic Organizations Weigh in on Florida's 2026 Midterm Elections |
| `b911c7d2` | *(election news)* | 2026-10-14 | wlrn.org | **reject** | national | Civil rights advocates plan to send thousands of observers to midterm polling pl |
| `cbda54ea` | *(election news)* | 2026-10-14 | wlrn.org | **approve** |  | FL’s Amendment 3 would cut property taxes. Could it gut local police, fire, emer |
| `794c021f` | *(election news)* | 2026-10-14 | wsvn.com | **reject** | national | Inflation worsened last month to 3.7% in sign that prices remain elevated as mid |
| `bba0ca2e` | *(election news)* | 2026-10-14 | floridianpress.com | **reject** | national | House Democrats plan a first 100-days agenda if they sweep to power in midterm e |
| `20f0f0c5` | *(election news)* | 2026-10-14 | wsvn.com | **reject** | national | Kamala Harris adds stops to her final midterm campaign stretch. Her decision abo |
| `02e43c36` | *(election news)* | 2026-10-14 | orlandoweekly.com | **approve** |  | Group that lobbied to ban rent control in Florida wants you to vote ‘yes’ on Ame |
| `89555d68` | *(election news)* | 2026-10-14 | wlrn.org | **reject** | national | How Trump’s disaster aid delays and FEMA cuts could galvanize the ‘movable middl |
| `1353977c` | *(election news)* | 2026-10-14 | wtsp.com | **approve** |  | Where to find your polling place for Election Day 2026 |
| `cd4bc063` | *(election news)* | 2026-10-14 | wtsp.com | **reject** | national | Justice Department threatens California with legal action over claim of noncitiz |
| `c673f0d8` | *(election news)* | 2026-10-14 | floridadaily.com | **reject** | national | Voters View Healthcare Affordability as a Top Issue in the Midterm Elections |
| `493d3882` | *(election news)* | 2026-10-14 | wsvn.com | **reject** | not election | Broward Teachers Union accuses school board of due process violations in employe |
| `b5d39a3c` | *(election news)* | 2026-10-14 | local10.com | **reject** | not election | Broward Teachers Union president plans to file lawsuit over removal from school  |
| `f7880eef` | *(election news)* | 2026-10-14 | wusf.org | **approve** |  | What nonprofits are thinking about Amendment 3, and a new film finds Florida's u |
| `c2fa44f6` | *(election news)* | 2026-10-14 | wtsp.com | **reject** | AUDIT scope | Luna vs. Gray: Meet the candidates running for Congress in Florida's District 13 |
| `60d8fcbf` | *(election news)* | 2026-10-14 | floridianpress.com | **reject** | poll (home) | Poll Finds Amendment 3 Failing to Pass When Voters Informed of Language |
| `e20ef1b0` | *(election news)* | 2026-10-14 | wtsp.com | **approve** |  | Who does DeSantis endorse for governor? |
| `de324e33` | *(election news)* | 2026-10-14 | wftv.com | **reject** | AUDIT lint | Osceola County voters will weigh school property tax hike in November |
| `e4bc7900` | *(election news)* | 2026-10-14 | wtsp.com | **approve** |  | Election Day 2026: Florida voter's guide to key races, candidates and voting inf |
| `5b3b7866` | *(election news)* | 2026-10-14 | cltampa.com | **reject** | not on ballot | Tampa voters could change the city’s constitution in March, here’s how the proce |
| `9581c7b8` | *(election news)* | 2026-10-14 | local10.com | **reject** | national | Speaker Johnson dismisses skeptics as he campaigns for House GOP in Maine battle |
| `6481edf8` | *(election news)* | 2026-10-14 | cltampa.com | **reject** | not on ballot | Tampa City Council and the mayor chose who reviewed the city charter this year—b |
| `bc295f4a` | *(election news)* | 2026-10-14 | wusf.org | **reject** | AUDIT scope | St. Petersburg City Council candidates agreed on most issues, except unplugging  |
| `1b6cc8fa` | *(election news)* | 2026-10-14 | cbsnews.com/miami | **reject** | AUDIT scope | Hollywood residents meet with city to learn more about Amendment 3 aimed at slas |
| `f9c8a67d` | *(election news)* | 2026-10-15 | cbsnews.com/miami | **reject** | AUDIT scope | Hollywood officials warn Amendment 3 could cost city $34 million and force cuts  |
| `d9c857fa` | *(election news)* | 2026-10-15 | local10.com | **reject** | foreign | Brazil's Senate approves a shorter workweek in major win for Lula ahead of runof |
| `9e3bbe84` | *(election news)* | 2026-10-15 | local10.com | **reject** | national | Justice Department threatens California with legal action over claim of noncitiz |
| `2cf44a35` | *(election news)* | 2026-10-15 | local10.com | **reject** | national | Trump defends gifted Air Force One from Qatar and makes 2nd Amendment pitch as h |
| `934cffda` | *(election news)* | 2026-10-15 | local10.com | **reject** | national | With anger spreading over Iran war, Democrats hope to flip Republican seats with |
| `4d6306e2` | *(election news)* | 2026-10-15 | local10.com | **reject** | national | Everyone has the same question in the midterms — where's the beef? (And how much |
