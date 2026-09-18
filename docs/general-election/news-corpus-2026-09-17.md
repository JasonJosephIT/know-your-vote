# CAP / "Know Your Vote" — Verified News-Outlet Corpus for the 2026 Florida General Election (Nov 3, 2026)

_Prepared for the Civic Awareness Project. Access date for all URLs cited below: **September 17, 2026**. RESEARCH ONLY — no application code. Every lean value is a **PROPOSAL requiring founder sign-off**. A feed is marked **VERIFIED** only where the raw RSS/Atom XML was actually fetched this cycle and a newest-item date observed; all others are **UNVERIFIED** and excluded from the clean list per CAP rule 1._

## TL;DR
- **Six feed endpoints were fetched and confirmed live** this cycle — Florida Phoenix, WFLA, Florida Daily, Central Florida Public Media, WFTV (via sitemap), and WLRN (via its South Florida Roundup podcast RSS); **every other feed is UNVERIFIED and must be fetched before it enters the clean list.**
- **Broward is now the acute gap, and it just got worse:** per the AP (via WLRN, Sep 14, 2026), the September 10 Miami Herald cuts eliminated "all reporters covering an entire South Florida county, Broward." Adding Florida Bulldog, OutSFL, The Westside Gazette, and South Florida Times widens the county, but none carry an independent bias rating, so slot-selection breadth cannot yet be certified.
- **The single most material change since the current 23 were compiled** is the September 10, 2026 elimination of el Nuevo Herald's writing staff (see Key Findings) — removing the largest Spanish-language original-reporting source in Miami-Dade and raising the stakes for every remaining Spanish and Haitian Creole outlet.

## Key Findings
- **Feeds actually verified (fetched, parsed, newest item seen):** floridaphoenix.com/feed/ (newest Sep 17, 2026 04:05Z); wfla.com/news/florida/feed/ (newest Sep 17, 2026 09:14Z); floridadaily.com/feed/ (newest Sep 16, 2026 21:20Z); cfpublic.org/podcast/engage/rss.xml (newest Sep 16, 2026 18:01 ET); wftv.com/arc/outboundfeeds/sitemap/?outputType=xml (lastmod Sep 16, 2026); wlrn.org/podcast/the-south-florida-roundup/rss.xml (newest Sep 11, 2026).
- **The el Nuevo Herald / Miami Herald cuts (Sep 10, 2026):** Per AP reporter Jocelyn Noveck (via WLRN, Sep 14, 2026), Miami Herald Media Company cut 32 jobs ("28 lost jobs and four positions that were frozen"), and the layoffs "included the entire writing staff of El Nuevo Herald, the Spanish-language publication," per Herald deputy investigations editor Carol Marbin Miller. NewsGuild-CWA said the cuts left the Herald without a City Hall reporter and eliminated "all reporters covering an entire South Florida county, Broward." More than one-third of the Herald's editorial staff was affected; across McClatchy, NewsGuild-CWA reported 90+ unionized journalists laid off at 17 publications (about 30% of McClatchy's NewsGuild-CWA members), and the New York Times reported McClatchy revenues "had dropped 41% over the past five years."
- **Independent bias ratings only exist (and were citable) for the four legacy dailies** — Miami Herald, Sun Sentinel, Orlando Sentinel, Tampa Bay Times. Raters disagree on three of the four (see flagged list), so none can be treated as settled.
- **The overwhelming majority of local TV, public radio, Spanish, and Haitian outlets carry NO independent bias rating.** Per CAP rules these are recorded as "no independent rating found," not reasoned to a value.
- **Pink-slime risk is real in Florida but none of the proposed outlets are pink-slime.** CJR/Tow Center (Bengani, Dec 2019) found "Fifteen of these sites, all registered in 2018, belong to a single network in a single state: Florida." NewsGuard (Nov 2022) counted 1,202 pink-slime outlets nationally, most run by "the right-leaning Metric Media group, a network of 1,079 locally branded websites," with a January 2024 count of 1,177 sites. Two political-insider sites below (Florida's Voice, The Floridian) are widely described as partisan but carry no formal rating and must not be labeled in CAP's own voice.

## Details

### TABLE 1 — LOCAL (grouped by county)

#### MIAMI-DADE (12086)
| domain | publisher | type | countyFips | leanTag (PROPOSED) | feed | leanBasis | retrieval | access | robots | volume | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| miamiherald.com | Miami Herald | factual_reporting | 12086 | center-left | UNVERIFIED — no clean root RSS confirmed (McClatchy migrated; try Arc/section/sitemap) | MBFC "Left-Center (-3.4), High," notes "a moderate liberal bias in story selection and policy preferences" and that it "has endorsed Democratic Presidential candidates since 2000" (mediabiasfactcheck.com/miami-herald/); AllSides "Lean Left," low confidence Sep 2026 (allsides.com); Ad Fontes "Middle/Reliable" (adfontesmedia.com) — **raters disagree** | news sitemap | hard/metered paywall; headlines readable | not retrieved | high | McClatchy-owned; shared newsroom with el Nuevo Herald; cut 32 jobs Sep 10, 2026 |
| miamiherald.com (opinion) | Miami Herald Editorial Board | opinion | 12086 | center-left | UNVERIFIED | MBFC (above): editorials favor left | news sitemap | hard/metered | not retrieved | low-moderate | separate row per CAP rule |
| elnuevoherald.com | el Nuevo Herald | factual_reporting | 12086 | no independent rating found | UNVERIFIED — McClatchy CMS, no clean root RSS confirmed | none found | news sitemap | hard/metered | not retrieved | sharply reduced | Spanish-language; McClatchy; **entire writing staff eliminated Sep 10, 2026** (AP via WLRN) — weigh near-zero original output |
| wlrn.org | WLRN Public Media | factual_reporting | 12086 | no independent rating found | Main news RSS wlrn.org/tags/news.rss UNVERIFIED; **South Florida Roundup podcast RSS VERIFIED (newest Sep 11, 2026)** | none found | RSS | none (public media) | not retrieved | moderate | NPR/PBS; had shared newsroom space with el Nuevo Herald |
| local10.com | WPLG Local 10 | factual_reporting | 12086 | no independent rating found | UNVERIFIED — local10.com/arc/outboundfeeds/rss/?outputType=xml (Arc path; not fetched) | none found | RSS (Arc) | none; metered app | not retrieved | moderate | ABC affiliate; Berkshire Hathaway-owned |
| wsvn.com | WSVN 7News | factual_reporting | 12086 | no independent rating found | UNVERIFIED — wsvn.com/feed/ | none found | RSS | none | not retrieved | moderate | Fox affiliate; Sunbeam Television |
| nbcmiami.com | NBC 6 South Florida | factual_reporting | 12086 | no independent rating found | UNVERIFIED — nbcmiami.com/?rss=y returned HTML on fetch | none found | RSS | none | permissive meta-robots observed on homepage | moderate | NBCUniversal owned-and-operated |
| miaminewtimes.com | Miami New Times | factual_reporting | 12086 | no independent rating found | UNVERIFIED — /rss or /miami/Rss.xml | none found | RSS | none | not retrieved | low-moderate | alt-weekly; Voice Media Group |
| miaminewtimes.com (opinion) | Miami New Times | opinion | 12086 | no independent rating found | UNVERIFIED | none found | RSS | none | not retrieved | low | separate row |
| diariolasamericas.com | Diario Las Américas | factual_reporting | 12086 | no independent rating found | UNVERIFIED — diariolasamericas.com/contenidos/rss.html | none found | RSS | none/metered | not retrieved | moderate | Spanish daily; Américas Multimedia Group (Mezerhane) |
| americateve.com | América TeVé | factual_reporting | 12086 | no independent rating found | UNVERIFIED — americateve.com/rss | none found | RSS | none | not retrieved | low-moderate | Spanish-language TV (Canal 41) |
| lefloridien.com | Le Floridien | factual_reporting | 12086 | no independent rating found | UNVERIFIED — lefloridien.com/feed/ (WordPress) | none found | RSS | none | not retrieved | low (biweekly print + web) | Bilingual English/French, Haitian diaspora; North Miami base; **runs clearly labeled political advertisements** — weigh for reviewer |
| lefloridien.com (opinion) | Le Floridien | opinion | 12086 | no independent rating found | UNVERIFIED | none found | RSS | none | not retrieved | low | editorials in French/English |
| miamitimesonline.com | The Miami Times | factual_reporting | 12086 | no independent rating found | UNVERIFIED — BLOX/TownNews CMS; WordPress /feed/ likely invalid | none found | news sitemap / HTML | metered | not retrieved | low (weekly) | Black-owned weekly, founded 1923 |
| haitiantimes.com | The Haitian Times | factual_reporting | 12086 (see note) | no independent rating found | UNVERIFIED — haitiantimes.com/feed/; homepage blocks automated access | none found | RSS | none/metered | homepage disallows automated access (observed) | low-moderate | HQ Brooklyn NY; maintains a Florida desk — founder to decide whether NY base disqualifies county placement |

#### BROWARD (12011) — most urgent to widen
| domain | publisher | type | countyFips | leanTag (PROPOSED) | feed | leanBasis | retrieval | access | robots | volume | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| sun-sentinel.com | South Florida Sun Sentinel | factual_reporting | 12011 | center | UNVERIFIED — sun-sentinel.com/feed/ | AllSides "Center," low confidence Apr 2026 (allsides.com); MBFC "Least Biased, High" (mediabiasfactcheck.com); Ad Fontes recorded as leanLeft by Ground News — **mild disagreement** | RSS | hard/metered; headlines readable | not retrieved | high | Tribune Publishing / Alden Global Capital |
| sun-sentinel.com (opinion) | Sun Sentinel Editorial Board | opinion | 12011 | center | UNVERIFIED — sun-sentinel.com/opinion/feed/ | MBFC: opinion "skews left minimally"; endorsed 5 R / 5 D over 40 years | RSS | hard/metered | not retrieved | low | separate row |
| cbsnews.com/miami | CBS News Miami | factual_reporting | 12011 (see note) | no independent rating found | UNVERIFIED — cbsnews.com/miami/*/rss | none found | news sitemap | none | not retrieved | moderate | CBS-owned (WFOR). **Flag reclassification to 12086:** the Doral media hub is where the Herald was based before it "moved to an office in Miami" (AP/WLRN caption); confirm WFOR's actual newsroom county |
| floridabulldog.org | Florida Bulldog | factual_reporting | 12011 | no independent rating found | UNVERIFIED — floridabulldog.org/feed/; flagged as low-frequency/possibly stale | none found | RSS | none | not retrieved | low (investigative cadence) | Fort Lauderdale nonprofit investigative newsroom |
| outsfl.com | OutSFL | factual_reporting | 12011 | no independent rating found | UNVERIFIED — outsfl.com/?format=feed&type=rss (Joomla) | none found | RSS | none | not retrieved | low (weekly) | Wilton Manors; formerly South Florida Gay News; LGBTQ coverage |
| thewestsidegazette.com | The Westside Gazette | factual_reporting | 12011 | no independent rating found | UNVERIFIED — thewestsidegazette.com/feed/ (WordPress) | none found | RSS | none | not retrieved | low (weekly) | Fort Lauderdale Black weekly, founded 1971; oldest African-American paper in region |
| sfltimes.com | South Florida Times | factual_reporting | 12011 | no independent rating found | UNVERIFIED — sfltimes.com/feed | none found | RSS | none | not retrieved | low (weekly) | Black-community paper serving Broward/Miami-Dade |

#### HILLSBOROUGH (12057)
| domain | publisher | type | countyFips | leanTag (PROPOSED) | feed | leanBasis | retrieval | access | robots | volume | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| tampabay.com | Tampa Bay Times | factual_reporting | 12057 | center | UNVERIFIED — native RSS appears deprecated; use news sitemap | AllSides "Center," low confidence Aug 2026 (allsides.com) — **single rater only** | news sitemap | hard/metered | not retrieved | high | Owned by the nonprofit Poynter Institute |
| tampabay.com (opinion) | Tampa Bay Times Editorial Board | opinion | 12057 | center | UNVERIFIED | none outlet-specific | news sitemap | hard/metered | not retrieved | low | separate row |
| wusf.org | WUSF Public Media | factual_reporting | 12057 | no independent rating found | UNVERIFIED — wusf.org/tags/local-news.rss (Brightspot) | none found | RSS | none | not retrieved | moderate | NPR; University of South Florida |
| wfla.com | WFLA News Channel 8 | factual_reporting | 12057 | no independent rating found | **VERIFIED — wfla.com/news/florida/feed/ (RSS 2.0; newest item Sep 17, 2026 09:14Z)** | none found | RSS | none | not retrieved | moderate-high | NBC affiliate; Nexstar Media Group |
| wtsp.com | WTSP 10 Tampa Bay | factual_reporting | 12057 | no independent rating found | UNVERIFIED — wtsp.com/feeds/syndication/rss/news (TEGNA) | none found | RSS | none | not retrieved | moderate | CBS affiliate; TEGNA |
| cltampa.com | Creative Loafing Tampa Bay | factual_reporting | 12057 | no independent rating found | UNVERIFIED — cltampa.com/tampa/Rss.xml | none found | RSS | none | not retrieved | low-moderate | alt-weekly; Chava Communications |
| cltampa.com (opinion) | Creative Loafing Tampa Bay | opinion | 12057 | no independent rating found | UNVERIFIED | none found | RSS | none | not retrieved | low | separate row |

#### ORANGE (12095)
| domain | publisher | type | countyFips | leanTag (PROPOSED) | feed | leanBasis | retrieval | access | robots | volume | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| orlandosentinel.com | Orlando Sentinel | factual_reporting | 12095 | center-left | UNVERIFIED — orlandosentinel.com/feed/ | MBFC "Left-Center (-2.8), High" (mediabiasfactcheck.com); Ad Fontes "Skews Left/Reliable" (adfontesmedia.com); AllSides "Center," low confidence Aug 2026 (allsides.com) — **raters disagree** | RSS | hard/metered; geo-blocked in EU | not retrieved | high | Tribune Publishing / Alden Global Capital |
| orlandosentinel.com (opinion) | Orlando Sentinel Editorial Board | opinion | 12095 | center-left | UNVERIFIED | see above | RSS | hard/metered | not retrieved | low | separate row |
| cfpublic.org | Central Florida Public Media | factual_reporting | 12095 | no independent rating found | **VERIFIED — cfpublic.org/podcast/engage/rss.xml (newest Sep 16, 2026 18:01 ET)**; main /tags/*.rss UNVERIFIED | none found | RSS | none | not retrieved | moderate | NPR; formerly WMFE |
| wftv.com | WFTV Channel 9 | factual_reporting | 12095 | no independent rating found | **VERIFIED via sitemap — wftv.com/arc/outboundfeeds/sitemap/?outputType=xml (lastmod Sep 16, 2026)**; RSS path arc/outboundfeeds/rss UNVERIFIED | none found | news sitemap (verified) | none | not retrieved | moderate | ABC affiliate; Cox Media Group |
| wesh.com | WESH 2 | factual_reporting | 12095 | no independent rating found | UNVERIFIED — wesh.com/topstories-rss (Hearst) | none found | RSS | none | not retrieved | moderate | NBC affiliate; Hearst Television |
| orlandoweekly.com | Orlando Weekly | factual_reporting | 12095 | no independent rating found | UNVERIFIED — orlandoweekly.com/orlando/Rss.xml | none found | RSS | none | not retrieved | low-moderate | alt-weekly; Chava Communications |
| orlandoweekly.com (opinion) | Orlando Weekly | opinion | 12095 | no independent rating found | UNVERIFIED | none found | RSS | none | not retrieved | low | separate row |

### TABLE 2 — STATEWIDE (Tier 2)
| domain | publisher | type | countyFips | leanTag (PROPOSED) | feed | leanBasis | retrieval | access | robots | volume | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| floridaphoenix.com | Florida Phoenix | factual_reporting | null | center-left | **VERIFIED — floridaphoenix.com/feed/ (RSS 2.0, WordPress 6.9.7; newest item Sep 17, 2026 04:05Z)** | no outlet-specific rating captured; part of States Newsroom network — founder to confirm | RSS | none (Creative Commons republish) | not retrieved | high | Nonprofit; States Newsroom |
| floridaphoenix.com (opinion) | Florida Phoenix | opinion | null | center-left | VERIFIED (same feed carries commentary) | none captured | RSS | none | not retrieved | moderate | separate row |
| newsserviceflorida.com | News Service of Florida | factual_reporting | null | no independent rating found | UNVERIFIED — BLOX CMS; /feed/ likely invalid; exact RSS path unknown | none found | HTML listing / sitemap | subscription wire; some free | not retrieved | high | Largest capitol news bureau |
| wfsu.org | WFSU Public Media | factual_reporting | null | no independent rating found | UNVERIFIED — news.wfsu.org/podcast/wfsu-local-news/rss.xml | none found | RSS | none | not retrieved | moderate | NPR, Tallahassee; capital coverage |
| floridapolitics.com | Florida Politics | factual_reporting | null | no independent rating found | UNVERIFIED — floridapolitics.com/feed/ (site confirmed publishing daily through Sep 16–17, 2026; XML not read) | none found | RSS | metered | not retrieved | very high | Publisher Peter Schorsch / Extensive Enterprises Media; Wikipedia notes Schorsch is a registered Republican (publisher fact, not a rating) |
| floridapolitics.com (opinion) | Florida Politics | opinion | null | no independent rating found | UNVERIFIED | none found | RSS | metered | not retrieved | high | separate row |
| apnews.com | Associated Press | factual_reporting | null | center | UNVERIFIED — no native public RSS; use hub/sitemap | ratings exist (AllSides/Ad Fontes/MBFC) but no page fetched this session — founder to confirm | news sitemap | none | not retrieved | high (FL slice smaller) | Wire; feeds many local outlets |
| floridadaily.com | Florida Daily | factual_reporting | null | no independent rating found | **VERIFIED — floridadaily.com/feed/ (RSS 2.0, WordPress 7.0.4; newest item Sep 16, 2026 21:20Z)** | none found | RSS | none | not retrieved | moderate | Described by some as conservative-leaning; no independent rating found — do not assert |
| flvoicenews.com | Florida's Voice | factual_reporting | null | no independent rating found | UNVERIFIED — flvoicenews.com/feed/ | none found | RSS | none | not retrieved | moderate | Widely described as conservative; no formal rating found — do not label in CAP voice |
| floridianpress.com | The Floridian | factual_reporting | null | no independent rating found | UNVERIFIED — floridianpress.com/feed/ | none found | RSS | none | not retrieved | moderate | Publisher Javier Manjarres; Fort Lauderdale base; statewide/national political focus |

### TABLE 3 — NATIONAL (Tier 3; max 8; spectrum span; each with coverage/access rationale)
_All national `leanBasis` entries are **FLAGGED**: these outlets are known to carry AllSides/Ad Fontes/MBFC ratings, but no rating page was fetched this session, so the specific rating text and date must be confirmed by the founder before any tag is set. All feeds UNVERIFIED pending a fetch._
| domain | publisher | type | countyFips | leanTag (PROPOSED) | feed | leanBasis | retrieval | access | robots | volume | rationale |
|---|---|---|---|---|---|---|---|---|---|---|---|
| reuters.com | Reuters | factual_reporting | null | center | UNVERIFIED | rating exists; not fetched — confirm | news sitemap | metered | not retrieved | high | Neutral wire; national context for FL Senate/House races |
| apnews.com | Associated Press | factual_reporting | null | center | UNVERIFIED | rating exists; not fetched — confirm | news sitemap | none | not retrieved | high | Authoritative wire; also listed statewide |
| thehill.com | The Hill | factual_reporting | null | center | UNVERIFIED — thehill.com/feed/ | rating exists; not fetched — confirm | RSS | none | not retrieved | high | Congressional beat; covers FL delegation |
| politico.com | POLITICO | factual_reporting | null | center-left | UNVERIFIED | rating exists; not fetched — confirm | RSS | metered | not retrieved | high | Deep congressional + FL delegation coverage |
| nytimes.com | The New York Times | factual_reporting | null | center-left | UNVERIFIED | rating exists; not fetched — confirm | news sitemap | hard | not retrieved | high | National Senate-race analysis incl. Florida |
| wsj.com | The Wall Street Journal (news) | factual_reporting | null | center-right | UNVERIFIED | rating exists; not fetched — confirm | news sitemap | hard | not retrieved | high | Center-right newsroom; balances the set |
| washingtonexaminer.com | Washington Examiner | factual_reporting | null | right | UNVERIFIED — washingtonexaminer.com/feed | rating exists; not fetched — confirm | RSS | none | not retrieved | moderate | Conservative congressional coverage for balance |
| foxnews.com | Fox News (Politics) | factual_reporting | null | right | UNVERIFIED — foxnews.com/politics/rss | rating exists; not fetched — confirm | RSS | none | not retrieved | high | Right-leaning national coverage of FL federal races |

## Per-County Lean Coverage (representation vs. gaps for slot selection)
- **Miami-Dade:** Proposed leans anchor at center-left (Miami Herald) only; every non-daily is "no rating found." **GAP:** no center-right or right outlet with any rating exists in-county; slot selection would draw repeatedly from unrated outlets.
- **Broward:** Anchored by Sun Sentinel (proposed center); all added community outlets are unrated. **GAP:** no rated left, center-left, or right outlet. Compounded by the loss of all Herald Broward reporters (Sep 10, 2026), verifiable lean diversity here is currently the weakest of the four counties.
- **Hillsborough:** Tampa Bay Times (proposed center, single rater) is the only rated outlet. **GAP:** no rated left or right.
- **Orange:** Orlando Sentinel (proposed center-left) is the only rated outlet. **GAP:** no rated center or right.
- **Cross-cutting:** Because slot selection takes the newest item per distinct lean before a second item from any lean, the unrated majority means most county leans are effectively "unknown," which collapses the intended spectrum rotation. This is the finding the founder most needs to weigh before the per-candidate coverage-variance number is published.

## Outlets Considered and Rejected
- **clickorlando.com** (WKMG News 6, Graham Media) — strong candidate; rejected for now only because the feed was not fetched. Recommend adding after verification.
- **fox35orlando.com** (WOFL) — same; not yet verified.
- **baynews9.com** (Spectrum Bay News 9) — Charter/Spectrum cable; base St. Petersburg (Pinellas), not Hillsborough — rejected on base-county rule.
- **browardpalmbeach.com** (New Times Broward-Palm Beach) — appears largely folded into Miami New Times; likely dormant — rejected pending proof of active original reporting.
- **communitynewspapers.com** (Miami's Community Newspapers) — hyperlocal chain incl. a Fort Lauderdale edition; low political volume — not added.
- **wptv.com** (WPTV NewsChannel 5) — base West Palm Beach (Palm Beach County) — rejected on county rule.
- **WSRF / WAVS** (Haitian Creole radio, Broward) — no text/web original-reporting feed found — rejected as unusable for a headline sweep, despite their community importance.
- **Any outlet outside the four counties / FL-statewide / national tiers, and all pink-slime-style sites** — rejected on scope/quality.

## Flagged for Founder Sign-off (lean uncited or raters disagree)
1. **Miami Herald** — raters disagree (AllSides Lean Left vs. Ad Fontes Middle vs. MBFC Left-Center).
2. **Sun Sentinel** — mild disagreement (AllSides/MBFC Center/Least-Biased vs. Ad Fontes leanLeft per Ground News).
3. **Orlando Sentinel** — raters disagree (MBFC/Ad Fontes left-of-center vs. AllSides Center).
4. **Tampa Bay Times** — single rater (AllSides Center, low confidence); no corroboration.
5. **Florida Phoenix** — proposed center-left with no outlet-specific rating captured.
6. **All local TV, public radio, Spanish, Haitian, and community outlets** — "no independent rating found."
7. **Florida Politics, Florida Daily, Florida's Voice, The Floridian** — commonly described as partisan but no formal rating; must not be labeled in CAP's voice.
8. **All eight national outlets** — `leanBasis` not fetched this session.
9. **County-placement flags:** Haitian Times (Brooklyn HQ) and CBS News Miami (WFOR newsroom county — note the Herald itself moved out of Doral to Miami, per AP/WLRN, so do not infer WFOR's county from the Doral hub).

## Summary of Changes vs. the Current 23
- **Verified feeds (fetched, live) — move from feed:null to VERIFIED:** wlrn.org (via South Florida Roundup podcast RSS), wfla.com, cfpublic.org, wftv.com (via sitemap), floridaphoenix.com, and the newly added floridadaily.com.
- **Still feed:null / UNVERIFIED among the existing 23 — need a fetch before use:** miamiherald.com, local10.com, wsvn.com, nbcmiami.com, miaminewtimes.com, sun-sentinel.com, cbsnews.com/miami, tampabay.com, wusf.org, wtsp.com, cltampa.com, orlandosentinel.com, wesh.com, orlandoweekly.com, newsserviceflorida.com, wfsu.org, floridapolitics.com, apnews.com.
- **Recommended retirements/reclassifications:** consider reclassifying cbsnews.com/miami from Broward to Miami-Dade pending confirmation of WFOR's newsroom county; treat elnuevoherald.com as effectively reduced to near-zero original reporting after the Sep 10, 2026 elimination of its writing staff, but keep it listed for auditability with a clear note.
- **New candidates added (all UNVERIFIED pending fetch, plus separate opinion rows for dailies/alt-weeklies):** Miami-Dade — elnuevoherald.com, diariolasamericas.com, americateve.com, lefloridien.com, miamitimesonline.com, haitiantimes.com; Broward — floridabulldog.org, outsfl.com, thewestsidegazette.com, sfltimes.com; Statewide — floridadaily.com (verified), flvoicenews.com, floridianpress.com.

## Recommendations
1. **Fetch-verify the highest-value UNVERIFIED feeds first, in this order:** sun-sentinel.com/feed/ and sun-sentinel.com/opinion/feed/ (Broward anchor); local10.com, wsvn.com, nbcmiami.com (Miami-Dade TV); wtsp.com, wusf.org (Hillsborough); wesh.com, clickorlando.com (Orange). **Promotion threshold:** XML parses **and** contains an item dated within the last 7 days.
2. **Broward breadth:** verify floridabulldog.org, outsfl.com, thewestsidegazette.com, and sfltimes.com. If Florida Bulldog's feed proves stale (>30 days), keep it but set retrieval to news sitemap and mark low-volume. Given that the Herald now has zero Broward reporters, treat any working Broward feed as high-priority.
3. **Spanish/Haitian priority given the el Nuevo Herald cuts:** verify diariolasamericas.com, americateve.com, and lefloridien.com. If a native feed fails, fall back to a news sitemap before dropping the outlet — these are now the primary in-language originators in the market.
4. **Do NOT set any leanTag** until (a) at least two independent raters are cited per outlet, or (b) the founder explicitly signs off on a single-rater or "no rating" designation. **Threshold to change a proposed tag:** a second rater agreeing, or a rater update post-dating this report.
5. **National tier:** before launch, fetch the AllSides/Ad Fontes/MBFC pages for all eight to lock `leanBasis`; if any cannot be corroborated by two raters, replace it with a spectrum-equivalent that can, preserving left-to-right span.
6. **Fill the robots column for every outlet before automated sweeping** — it is currently "not retrieved" for all, which is a launch blocker for a bulk sweep.

## Caveats
- **"VERIFIED" means the raw feed was fetched and a newest-item date observed**; "UNVERIFIED" means the path is plausible (often confirmed by aggregators or the outlet's CMS pattern) but was not fetched — these must stay off the clean list per CAP rule 1. A feed you did not fetch is worse than no feed.
- **robots.txt was not retrieved for any domain this cycle**; the robots column is "not retrieved" and must be completed before automated sweeping, including any AI/crawler user-agent and crawl-delay directives.
- **Bias ratings change**; all cited ratings carry AllSides/MBFC "as of" dates in 2026 and should be re-checked near launch. AllSides currently lists "low or initial confidence" for the Miami Herald, Sun Sentinel, Orlando Sentinel, and Tampa Bay Times ratings.
- **Ownership/closure facts** (notably the el Nuevo Herald layoffs) come from AP reporting carried by WLRN and corroborated by Editor & Publisher; the AP figures were attributed to Herald deputy investigations editor Carol Marbin Miller. Confirm against a primary McClatchy statement before publication.
- **CMS families to exploit during verification:** WordPress `/feed/` (Florida Politics, Phoenix, WFLA, Florida Daily, WSVN, NBC Miami, Floridian, Florida's Voice, Westside Gazette, Le Floridien, Haitian Times); Arc XP `/arc/outboundfeeds/rss/?outputType=xml` (Local 10, WFTV, and increasingly McClatchy/Herald); NPR/Brightspot `/tags/{tag}.rss` + `/podcast/{show}/rss.xml` (WLRN, WUSF, WFSU, CF Public Media); BLOX/TownNews (News Service of Florida, Miami Times — need BLOX-specific path); TEGNA `/feeds/syndication/rss/{section}` (WTSP); Chava/Voice Media `/{market}/Rss.xml?section=` (cltampa, Orlando Weekly, Miami New Times). **No native RSS / use sitemap workaround:** apnews.com, tampabay.com, miamiherald.com, elnuevoherald.com.
- **Volume figures are rough placeholders** pending a one-week sampling window per outlet.

## Sources (with access date September 17, 2026)
- El Nuevo Herald / Miami Herald layoffs (AP via WLRN; Latin Times): latintimes.com/why-mcclatchys-miami-layoffs-are-warning-sign-latino-news-coverage-nationwide-599209
- Miami Herald bias: mediabiasfactcheck.com/miami-herald/ ; allsides.com/news-source/miami-herald-media-bias ; adfontesmedia.com/miami-herald-bias-and-reliability/
- Sun Sentinel bias: mediabiasfactcheck.com/south-florida-sun-sentinel/ ; allsides.com/news-source/sun-sentinel-media-bias ; adfontesmedia.com/sun-sentinel-bias-and-reliability/ ; ground.news/interest/sun-sentinel
- Orlando Sentinel bias: mediabiasfactcheck.com/orlando-sentinel/ ; adfontesmedia.com/orlando-sentinel-bias-and-reliability/ ; allsides.com/news-source/orlando-sentinel-media-bias ; ground.news/interest/orlando-sentinel
- Tampa Bay Times bias: allsides.com/news-source/tampa-bay-times-media-bias
- Verified feeds: floridaphoenix.com/feed/ ; wfla.com/news/florida/feed/ ; floridadaily.com/feed/ ; cfpublic.org/podcast/engage/rss.xml ; wftv.com/arc/outboundfeeds/sitemap/?outputType=xml ; wlrn.org/podcast/the-south-florida-roundup/rss.xml
- Feed path discovery (aggregator listings): rss.feedspot.com/florida_news_rss_feeds/ ; rss.feedspot.com/florida_politics_rss_feeds/ ; rss.feedspot.com/sunsentinel_rss_feeds/ ; rss.feedspot.com/tampa_bay_times_rss_feeds/
- Spanish/Haitian outlets: en.wikipedia.org/wiki/El_Nuevo_Herald ; en.wikipedia.org/wiki/Diario_Las_Américas ; carta.fiu.edu/slj/miami/ ; lefloridien.com/ ; haitiantimes.com/florida-news/ ; en.wikipedia.org/wiki/WSRF_(AM)
- Broward outlets: en.wikipedia.org/wiki/The_Westside_Gazette ; broward.org/Library/Research/Pages/Newspapers.aspx
- Florida Politics ownership: en.wikipedia.org/wiki/Florida_Politics
- Pink-slime background: cjr.org/tow_center_reports/hundreds-of-pink-slime-local-news-outlets-are-distributing-algorithmic-stories-conservative-talking-points.php ; cjr.org/tow_center/pink-slime-partisan-journalism-and-the-future-of-local-news.php ; editorandpublisher.com/stories/unmasking-pink-slime...,248657
- Arc XP feed structure (for verification): dev.arcxp.com/arc-io/developer-docs/setting-up-standard-rss-with-outbound-feeds/