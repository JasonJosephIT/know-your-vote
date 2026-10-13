# Google Ads strategy: handoff (2026-10-13)

For ChatGPT, or anyone without access to the repo, picking up Know Your Vote's
Google Ads work. Everything you need is in this file. Items marked **verify**
are not confirmed yet; check them against an official source before an ad
relies on them.

## 1. What Know Your Vote is

Know Your Vote (KYV) is a nonpartisan civic web app for Florida voters. It
covers the **2026 Florida general election (Tuesday, November 3, 2026)**.
A voter enters an address or picks a county. The app then shows every race
on their ballot, with the candidates side by side. For each candidate it
keeps *What They Say*, *What They've Done* and *Fact-Check* separate, and
every claim links to its source. It also has pages for ballot measures, a
news section, opt-in email reminders and a downloadable election calendar
(.ics). Donations go through a Zeffy form.

Site sections: Races, Candidates, Measures, News, About, Methodology.

## 2. What's already built

- **The Google Ads tag is live, but it is opt-in.** Its ID is
  `AW-18487967912`. It loads only after a visitor presses *Accept* on the
  cookie banner; *Decline* means it never loads. Old shared links can carry a
  `?zip=` parameter, so the ZIP is stripped from the page URL and referrer
  before anything reaches Google. The privacy page promises a ZIP is never
  kept.
- **One switch controls the tag** (`ADS_TAG_ENABLED`, currently `true`).
  Keeping the tag is "recommended, pending founder confirmation", logged as
  founder decision 2 in the launch handoff of 2026-10-04. Turning it off
  removes the tag and the cookie banner, and the campaigns that rely on the
  tag would have to be paused.
- **At least one campaign is running and relies on the tag.** There is no
  written targeting, keyword, budget or creative strategy yet. Producing
  one is the job of this handoff.
- **No conversion events are defined.** The tag sends page views only.
- Plausible (cookieless analytics) is wired into the site but not turned on
  in production. That means there is **no analytics for the ~half of
  visitors who decline cookies.** Google Ads data only covers those who
  accept.

## 3. Rules every ad must follow

These come from the product's neutrality policy and apply to ad copy,
keywords, targeting and imagery alike.

1. **Never favour a party, candidate or position.** No candidate names, party
   names, party colours or issue framing that implies a side.
2. **If you bid on candidate names, bid on every candidate in that race with
   equal effort and budget,** or bid on none. Unequal search effort is a bias
   we introduce ourselves, and the policy forbids it.
3. **Describe what an office does, never how well the current holder does
   it.** "Find out who decides how fast your trains run" is fine. "Tired of
   slow trains? Vote them out" is editorialising.
4. **No fear, outrage or urgency beyond real deadlines.** Real deadlines
   (mail-ballot request cut-off, early voting, Election Day) are fair game.
5. **Privacy promises hold in ads too.** Do not build audiences from
   addresses or ZIP codes entered on the site, and never pass them into
   conversion data.
6. **Visuals follow the brand.** KYV Green and Cream lead every piece; the
   warmer "harvest" marketing tones support them. Illustrated people are
   stylised and never recognisable, and an illustration never appears beside
   a candidate. Never use colour to signal a party.

### Google policy constraints (verify)

- **US election ads.** Google requires election-advertiser verification for
  ads that feature a current federal or state officeholder, a candidate, or a
  state ballot measure. An ad that names an office ("Who is your Agriculture
  Commissioner?") without naming a person is probably not an election ad.
  Ballot-measure ads almost certainly are. **Verify** this, and decide
  whether to get verified anyway so no campaign gets blocked mid-flight.
- **Google Ad Grants.** If KYV (or the Civic Awareness Project behind it) is
  a 501(c)(3), it may qualify for up to $10k/month of free Search ads. The
  grant has its own rules (minimum CTR, conversion tracking required, limits
  on political content). **Verify** eligibility and whether nonpartisan
  voter-education content qualifies.

## 4. Ad themes

### Theme 1: Know your whole ballot before you vote (the core product)

*(Inferred from the product; the founder should confirm this is the "first"
theme they meant.)*

The promise: see every race and measure on *your* ballot, compared side by
side and sourced, in a few minutes, with no spin.

- Search intent: "what's on my ballot", "Florida sample ballot 2026",
  "[county] sample ballot", "who is running for [office] Florida",
  "Florida amendments 2026 explained".
- Angles: time saved; "no spin, every claim sourced"; "don't skip the bottom
  of the ballot".
- Landing page: the home page / ballot lookup, or the race and measure
  pages for office-specific searches.

### Theme 2: Who handles that? (local government awareness)

**The founder's idea, in their words:** people complain about everyday
things ("why are the trains so slow?") without knowing which office is
responsible. Someone next to them should be able to ask "who's our
transportation person? who's our agriculture person?" and find out.
**Focus mostly on local government.**

The ad pairs a daily-life frustration with the office that decides it, then
sends people to KYV to find that office on their ballot. It teaches civics
without taking a side, and it keeps working after Election Day.

Example pairings for Florida (**verify each against official sources**,
and check which of these seats are on 2026 ballots in the counties KYV
covers):

| Everyday issue | Who decides it | Elected or appointed? |
|---|---|---|
| Slow buses, local rail, potholes, traffic lights | County commission / city commission; transit authority boards | Commissions elected; transit boards usually appointed |
| State highways, FDOT projects | Florida Department of Transportation | Secretary appointed by the governor |
| Food safety, gas-pump accuracy, farms, consumer complaints | Commissioner of Agriculture and Consumer Services | Statewide elected (Cabinet), on the 2026 ballot |
| Your property tax bill | Property Appraiser sets values; county, city, school board set rates; Tax Collector collects | All elected |
| School calendars, boundaries, budgets | School Board | Elected, nonpartisan |
| Who runs elections and mail ballots | Supervisor of Elections | Elected |
| Policing outside city limits, county jail | Sheriff | Elected |
| Court records, marriage licences | Clerk of Court | Elected |
| Zoning, new development, flooding | County / city commission; water management districts | Commissions elected; water district boards appointed |
| Power bills | Public Service Commission | Appointed |
| Scams, price gouging | Attorney General | Statewide elected, on the 2026 ballot |
| State money, insurance-related consumer help | Chief Financial Officer | Statewide elected, on the 2026 ballot |
| Judges staying on the bench | Judicial retention votes | Voters decide yes/no |

The "appointed" rows matter: part of the lesson is that some decisions are
made by people you don't vote for directly, but whoever appoints them is on
your ballot. Say that plainly.

Copy sketches (neutral; check against the rules in §3):

- "Trains running slow? Find out who decides." → county commission
- "Who checks the gas pump is honest? It's on your ballot." → Agriculture
  Commissioner
- "Your property tax bill has four authors. Meet them." → appraiser,
  commission, school board, tax collector
- "Your school calendar was voted on. By whom?" → school board

Formats: Search for "who is responsible for…" questions, plus short YouTube
and Display pieces built on the illustrated "funk" style. A street-level
everyday scene works well here.

### Other themes to research and develop

1. **The bottom of the ballot.** Many voters skip down-ballot races (school
   board, judicial retention, special districts). Research Florida undervote
   rates as the hook.
2. **Ballot measures in plain language.** Florida amendments need 60% to
   pass. Strong search demand, but Google treats these as election ads (§3).
3. **How to vote: logistics and deadlines.** Mail-ballot request deadline,
   early voting dates, what to bring. High intent, time-sensitive. Point to
   the official county Supervisor of Elections where KYV doesn't hold the
   answer. **Verify every date** against the Florida Division of Elections
   or the county; the site's calendar file holds dates already checked.
4. **New Floridians.** People who moved in recently and don't know local
   offices. Overlaps naturally with Theme 2.
5. **First-time and young voters.** Campuses, first general election.
6. **"Every claim has a source."** A trust and transparency angle for
   people tired of partisan coverage.
7. **Reminders and the calendar file.** Low-friction opt-in conversions.
8. **After November 3: "Meet who represents you now."** Theme 2 becomes
   evergreen local-government education between elections.
9. **Other languages (Spanish, Haitian Creole).** Only if the site serves
   that language; never send an ad to a page the reader can't read. Check
   site support first.

## 5. Timing (verify all dates)

Today is 2026-10-13; Election Day is three weeks away.

- **Mail-ballot request deadline:** about Thursday 2026-10-22, 5 pm
  (12 days before the election). **Verify.**
- **Early voting:** mandatory window about 2026-10-24 to 2026-10-31; counties
  may add days from 2026-10-19 through 2026-11-01. **Verify per county.**
- **Election Day:** Tuesday 2026-11-03.
- Registration for this election closed on 2026-10-05, so don't run
  "register to vote" ads for November.

Suggested order: Theme 1 and logistics (theme 3 in the list) carry the next
three weeks. Start Theme 2 now as the long-term brand, and make it the main
theme after Election Day.

## 6. Measurement to set up

- Define conversions: ballot lookup completed, reminder sign-up, calendar
  download, donate click. None of them may carry an address or ZIP.
- Set up Google Consent Mode so measurement matches the cookie banner.
- Remember that ad data only covers visitors who accept cookies. Consider
  turning on Plausible to see total traffic.

## 7. Open decisions for the founder

1. Confirm keeping the ads tag (founder decision 2).
2. Confirm Theme 1 is the "first" theme intended.
3. Apply for Google Ad Grants? Requires nonprofit status (**verify**).
4. Get election-advertiser verification?
5. Candidate-name keywords: all candidates in a race equally, or none?
6. Budget, and the split between Theme 1, logistics and Theme 2.
7. Which counties to target. Local-office ads should only run where KYV has
   that county's local races.

## 8. What to produce next

1. A keyword list per theme, with Florida geo-targeting and negative
   keywords (party names, "best candidate", "who to vote for").
2. Five to ten responsive search ads per theme, each checked against §3.
3. A verified "issue → office" table for Theme 2, covering every county KYV
   serves, with an official source for each row.
4. A research memo on themes 1–9 in the list above: search volume, audience,
   format, risks.
5. A conversion and measurement plan for §6.
