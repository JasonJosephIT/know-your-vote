# Google Ads research and campaign drafts — 2026-10-13

Continuation of [PR #176](https://github.com/JasonJosephIT/know-your-vote/pull/176) and [the handoff](../google-ads-handoff-2026-10-13.md). Research checked on October 13, 2026; repository baseline `b8cbfb8`. This package supplies the five requested deliverables. It does not activate campaigns, change production tracking, select a budget, or resolve founder decisions.

## Read this before using the drafts

**Replace “know your whole ballot” with “prepare for your Florida ballot.”** `src/lib/scope-copy.ts` explicitly excludes judges, Florida House/Senate, city races, local questions and special districts. KYV covers statewide contests, state amendments, U.S. House and selected county contests in **Miami-Dade, Broward, Hillsborough and Orange** (`src/lib/counties.ts`). Direct people to their county's official sample ballot for the complete ballot. Do not promise every race, an official sample ballot, a guaranteed lookup time, or every office on this year's ballot.

Source code and migrations establish implemented scope, not live publication. County rows can be seeded but unpublished; `race_publication` and current candidate status must be checked in production before buying traffic to a particular race. No database credentials or Google Ads account access were available. Existing campaign settings, spend, conversion labels, production environment variables and nonprofit status are unverified.

Files:

| Deliverable | File |
|---|---|
| Policy, dates, nine-theme research, rollout and founder decisions | This memo |
| Keyword seeds, match types, destinations and launch conditions for all 11 themes | [keywords.csv](keywords.csv) |
| Campaign-level negative keywords and exceptions | [negative-keywords.csv](negative-keywords.csv) |
| Five responsive search ad drafts per theme: 55 total | [responsive-search-ads.csv](responsive-search-ads.csv) |
| Sourced issue → office table and four-county election applicability | [issue-office.md](issue-office.md) |
| Conversion definitions, consent behavior and verification | [measurement.md](measurement.md) |
| Empty account-data fields for a reproducible demand export | [volume-export-template.csv](volume-export-template.csv) |
| Thirty individual social/comedy video drafts with a recurring cast | [individual-video-sketches.md](individual-video-sketches.md) |

## Google policy findings

US election-ad verification covers ads featuring federal/state/territory candidates or officeholders, those levels' parties, or qualified state/territory ballot measures. Generic office education is not explicitly listed. **That is an interpretation, not preapproval:** submit the exact ad and destination to Google; neutral copy does not guarantee acceptance. Election-ad targeting permits geography excluding radius targeting, age, gender and context. Verified election ads need payer disclosure. [Google political-content policy](https://support.google.com/adspolicy/answer/6014595?hl=en).

**Ad Grants accounts cannot run election ads or apply for election-ad verification.** A separate paid account is needed for any campaign classified that way. [Google verification application](https://support.google.com/adspolicy/troubleshooter/9973345?hl=en). Generic civic education may be suitable for a grant only after account, destination and policy review; do not camouflage election content to qualify. Recommend paid-account verification now because KYV destinations contain covered candidates and measures; do not assume a generic headline exempts the destination.

US Google for Nonprofits eligibility requires IRS 501(c)(3) recognition or qualifying group-exempt affiliation; fiscal sponsorship alone without the organization's own status is excluded. KYV/Civic Awareness Project status was not established; ask for the legal entity, EIN and IRS determination evidence. [Eligibility](https://support.google.com/nonprofits/answer/3215869?hl=en). Eligible organizations can receive up to $10,000/month in Search advertising; this is ad credit, not cash or guaranteed delivery. [Program overview](https://support.google.com/nonprofits/answer/1614581?hl=en).

Grant account rules include appropriate geography, two unique sitelinks, 5% monthly account CTR, meaningful conversion tracking and applicable conversion-based bidding requirements. Page visits alone should not be primary conversions. Accounts under the stated newer-account requirements must record at least one meaningful conversion monthly. [Account management](https://support.google.com/nonprofits/answer/117827?hl=en). Keywords must match the nonprofit's mission, and broad single-word terms are restricted with specific exceptions. [Mission policy](https://support.google.com/nonprofits/answer/4410314?hl=en), [single-word policy](https://support.google.com/nonprofits/answer/7587473?hl=en).

Draft campaigns use contextual Search keywords and broad, inclusive geography. Do not use remarketing, Customer Match, political-interest segments, inferred ethnicity, newcomer lists or student audiences. “New Floridians” and “first-time voters” describe useful content and query intent; they are not lists of people to target. Election-ad treatment also applies to relevant YouTube/Display proposals. Start with Search; defer those creative formats until destinations and review are ready.

## Verified voting dates and rollout

The state confirms registration closed **October 5**, the mailed-ballot request date is **October 22**, mandatory early voting is **October 24–31**, and Election Day is **November 3, 2026**. [Florida election dates](https://dos.fl.gov/elections/for-voters/election-dates/).

The deadline for a ballot to be mailed is **October 22 at 5 p.m.**; this is not the ballot-return deadline. Domestic voted mail ballots must reach the Supervisor by **7 p.m. Election Day**, not merely be postmarked. Separate rules apply to eligible overseas ballots and to signature curing; send those questions to the Supervisor rather than compressing exceptions into an ad. [State vote-by-mail guidance](https://dos.fl.gov/elections/for-voters/voting/vote-by-mail/).

All four supported counties offer **October 19–November 1**, inclusive:

| County | Daily hours | Official source opened |
|---|---|---|
| Miami-Dade | 7 a.m.–7 p.m. | [2026 schedule PDF](https://www.miamidade.gov/elections/library/early-voting/2026-11-03-general-election-early-voting-schedule.pdf) |
| Broward | 7 a.m.–7 p.m. | [Early voting](https://browardvotes.gov/voters/early-voting-ballot-return) |
| Hillsborough | 7 a.m.–7 p.m. | [Early voting](https://www.votehillsborough.gov/EarlyVoting) |
| Orange | 8 a.m.–8 p.m. | [Early voting](https://voteorangefl.gov/vote-early/) |

Use **America/New_York** for these counties and configure schedules in the Ads account's actual timezone. Florida-wide ads must not assign these four counties' optional dates or hours to everyone. Early voting is available at designated locations within the voter's county; Election Day requires the assigned precinct. In-person voters should bring current photo/signature identification; lack of acceptable ID does not automatically prevent voting, because provisional voting is available. [Hillsborough guidance](https://www.votehillsborough.gov/EarlyVoting).

| Period | Action after campaign approval |
|---|---|
| Oct 13–18 | Launch corrected core-product Search and logistics; verify every linked race is public. Pilot office education only if its explainer destination exists. No registration-for-November claims. |
| Oct 19–22 | Four county-specific early-voting groups. Mailed-ballot request message expires at 5 p.m. Oct 22. |
| Oct 23–Nov 1 | Pause mailed-ballot request ads. Keep early-voting information through the county closing hour Nov 1. |
| Nov 2 | Pause early-voting ads; show Election Day precinct guidance and official ballot-return information. |
| Nov 3 | Election Day messages expire at 7 p.m. local time. Avoid suggesting postal return will arrive in time. |
| Nov 4 onward | Pause 2026 voting-action copy, reminder acquisition and deadline assets. Use office education after updating its destination; distinguish incumbent, winner, certified result and officeholder after swearing-in. |

Suggested allocation **for founder review only**: core ballot preparation 60%, logistics 30%, office education 10%; held themes receive zero. This is a product-fit judgment, not a forecast. If no civic-office destination is ready, allocate its pilot share to core. Let approved total daily budget be B; allocations are 0.6B/0.3B/0.1B. Do not create an implied dollar commitment. Campaign-level shares are not candidate-level favoritism.

## Demand research method and limits

**No authenticated keyword-volume, CPC, competition or campaign performance data was available.** Numeric search volume for every theme is **not measured**, not zero. Public results demonstrate available information, not how frequently people search. Priorities below are hypotheses based on task urgency and destination fit, not measured rankings.

Export Keyword Planner historical metrics for the exact seed list, Google Search, English, Florida and each covered county separately. Save location IDs, network, export date, last 12 complete months and individual monthly values; compare prior election-season months where the account offers them. Export bid ranges/competition separately from forecasts for Oct 13–Nov 3 with the approved budget. Monthly averages include close variants and depend on settings. Do not add statewide and county estimates or overlapping close variants into a claimed unique audience. [Google's metrics definitions](https://support.google.com/google-ads/answer/3022575?hl=en).

Populate [volume-export-template.csv](volume-export-template.csv), preserving ranges if that is what the account returns. Also export existing search terms, cost, clicks, geography and conversions for the last 30 days. Use observed results to replace the hypotheses below. Google Trends, if later used, supplies a relative index rather than monthly search counts.

## Core themes

**C1 — Prepare for your Florida ballot:** election-driven intent, especially county sample-ballot and candidate-comparison questions. Search is the primary format. Use the home page, published race pages and official complete-ballot links. Main risk is overstating coverage; describe sourced candidate comparisons and disclose omissions. A sample-ballot query is useful only if the landing clearly offers an unofficial guide plus the official sample ballot, not an imitation official lookup.

**C2 — Who handles that?:** everyday office-responsibility queries. Strong educational fit, but search demand is unmeasured and the current app is not a general service directory. Prefer schools, county budgets and clearly owned local transit examples. Search first; illustrated contextual video can follow. Use the [county table](issue-office.md). A dedicated sourced explainer with an onward link to the relevant covered races is required; the proposed page is not implemented in this research task.

## Research on the nine additional themes

Labels R1–R9 follow the handoff's “Other themes” list; they are distinct from C1/C2. All nine have keyword seeds and five creative concepts in the CSVs. Held drafts are review material, not approved inventory.

| Theme | Search volume | Audience defined by need | Format and landing | Assessment and risk |
|---|---|---|---|---|
| R1 Bottom of the ballot | Not measured; test county office terms | Anyone seeking local-contest information | Search; home/local published race. Later short office explainer | Pilot selected commission/school-board contests. Judicial/special-district comparisons are outside KYV scope; do not buy those queries for unsupported pages. No unsupported “X% skip local races” claim. |
| R2 Measures in plain language | Not measured; likely election-season intent, hypothesis | People asking what a numbered measure changes | Search; exact published measure page, with balanced explanation and source links | Prioritize after verification. Neither copy nor targeting recommends yes/no. Check final 2026 text and displayed measure IDs; never reuse a 2024 amendment number. |
| R3 How to vote | Not measured; time-sensitive query fit, hypothesis | Registered voters needing deadlines, ID or voting locations | Search; actual home voting-info section plus prominent official county links | Highest urgency with C1. Keep request/return deadlines separate. The app does not substitute for a precinct finder. Expire assets, including sitelinks, on local deadlines. |
| R4 New Floridians | Not measured; narrower educational queries | People unfamiliar with Florida offices or rules | Search; office explainer, with official registration/update guidance | Evergreen education. Registration for this election has closed; existing Florida voters updating an address are a different case. Hold generic “new voter registration” acquisition for November. No audience inferred from moves or address inputs. |
| R5 First-time/young voters | Not measured; first-vote questions overlap R3 | People learning voting steps for the first time | Search; first-vote explainer plus official county assistance | Do not target campus radii or political/student behavioral segments. Do not assume all young people are new voters. Explain steps to anyone asking; registration and eligibility claims must reflect the deadline. |
| R6 Every claim has a source | Not measured; evaluate alongside C1 rather than assuming a separate large market | People looking for source-backed comparisons | Search; methodology → published race/candidate brief | Use as core ad variation. Demonstrate provenance without claiming perfect truth, exhaustive fact-checking or a “bias-free” guarantee. No candidate score/ranking. |
| R7 Reminders/calendar | Not measured; likely a supporting CTA, hypothesis | People who want dates in their calendar or email | Search variant; home CTA and working county calendar | Calendar file requires no email. Email opt-in and Ads consent are independent. Calendar click is secondary; confirmed signup is meaningful. Verify actual stamped event rows before advertising date completeness. |
| R8 After Nov 3 | Not measured; test evergreen office questions later | People wanting to understand government responsibilities | Search/illustrated contextual video; updated office explainer | Hold until post-election content exists. “Meet who represents you now” must not confuse a winner with a current officeholder. Do not promise live results or comprehensive representative lookup that the app lacks. |
| R9 Other languages | Not measured; research Spanish/Creole separately after readiness | People requesting information in a supported language | Native-language Search and complete equivalent destination; official multilingual resources meanwhile | **Hold.** Repository root is `lang="en"`; inspected public routes have no Spanish/Creole locale implementation. English drafts are editorial concepts, not translated ads. Translation, native review, full flow and Google's supported-language check precede launch. Do not infer ethnicity from geography or names. |

Florida constitutional amendments require at least **60% of votes cast on the measure** for approval, not 60% of everyone who cast an election ballot. This is the constitutional-amendment rule, not a universal rule for every local referendum. [Florida Constitution, Art. XI §5(e)](https://www.flsenate.gov/Laws/Constitution).

### What the undervote research actually establishes

Florida's 2024 statewide summary reports **0.53% presidential undervotes** and **0.08% overvotes**. Its statistical section concerns the top contest, so neither is a local-race or judicial-retention skip rate. [Official 2024 summary, p. 12](https://dos.fl.gov/media/708892/2024-ge-consolidated-post-election-reports_final-1.pdf). This evidence does **not** validate the handoff's proposed quantitative down-ballot hook.

Those two rates and the page reference were available in the official report's indexed extraction; the full PDF could not be opened in the browser on this run. They are research context only and are not used in any ad draft.

The official [precinct-data directory](https://dos.fl.gov/elections/data-statistics/elections-data/precinct-level-election-results/) provides a 2024 general-election ZIP; its [field definitions](https://dos.fl.gov/media/709209/final-precinct-level-elections-data-definitions-and-field-codes_20250624.pdf) distinguish candidate totals, code 901 overvotes and 902 undervotes. Browser extraction could not parse the ZIP and the executor download returned HTTP 403. Thus no county/local-contest rate is claimed here.

For a reproducible follow-up, obtain that published archive or county certified precinct exports. Group by county, election, contest code and district; remove superseded recount versions. Sum undervotes once per precinct/contest, not once per candidate. Denominator = valid contest votes (including write-ins) + overvotes + undervotes. Preserve each county/contest rate; never divide by registered voters or include precincts outside a district. Report original counts and chosen certification version. Undervotes do not prove confusion, apathy or a wish to vote in that contest. R1 can use a qualitative educational message now; a numeric hook remains unsupported.

## Campaign structure and keyword safeguards

`keywords.csv` uses exact and phrase seeds, not broad match, with Florida modifiers. County-local groups are restricted to the corresponding covered county. Statewide groups can serve Florida only if their destination accurately limits local coverage. Select the **presence** location setting, not the default presence-or-interest expansion; locations are Google estimates, not a verified voter registration. No radius targeting. Keep county selection inside the product out of Google event properties.

Use distinct ad groups for intent, not dozens of near-identical active RSAs. Five drafts per theme provide choices; start with one or two approved variations per ad group, keep the remaining drafts paused. Every row includes three headlines and two descriptions. All headlines must fit 30 characters and descriptions 90; the CSV was checked programmatically against these limits. [RSA specifications](https://support.google.com/google-ads/answer/7684791?hl=en).

Disable text customization, dynamic keyword insertion and automatically generated political/candidate wording until manually reviewed. Brand colors/imagery follow the handoff. Exclude candidate-name bids by default; if the founder later selects equal candidate coverage, audit each race's complete current field and equivalent effort before changing exclusions. Equal budgets cannot guarantee equal auction impressions.

Negative keywords include recommendation-seeking phrases, party names, opponent/slander searches and unsupported service transactions. Scope exclusions to appropriate campaigns: do not globally block `school`, `tax`, `deadline`, `register`, `amendment`, `calendar`, or `vote`. These would suppress intended queries. Negative matching does not automatically cover every variant; review search terms daily and add explicit variants. Neutral civic queries containing a party name will also be lost under party exclusions; that is a deliberate draft tradeoff, not evidence of bias in the visitor.

## Founder/account decisions still open

1. Keep the Ads tag (launch decision 2), and approve a consent-preserving measurement implementation.
2. Confirm corrected C1 positioning and whether C2 deserves a new office explainer.
3. Identify the nonprofit entity and establish Google for Nonprofits eligibility; do not assume a Zeffy donation form proves status.
4. Complete paid-account election-ad verification and exact-destination review where required.
5. Retain the recommended no-candidate-name keyword policy or explicitly choose complete equal-effort coverage.
6. Set the total budget and county allocation after the account export; approve the proposed theme split or change it.
7. Confirm live race publication and destination readiness per county. Read current official sample ballots before claiming a district's race appears in November.

The account-only metrics, inaccessible local-undervote dataset, production publication checks and untranslated destinations remain plainly bounded gaps. They do not prevent delivery of this research package, but they prevent describing every draft as ready to launch.
