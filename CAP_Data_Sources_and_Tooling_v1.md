# CAP Data Sources and Tooling

**Date:** 2026-07-15
**Purpose:** Record the concrete data sources for the CAP pipeline, map each to the agent that uses it and the schema object it fills, and set access and secret-handling rules. Every source here becomes an MCP tool wrapper (PRD §9). Agents never call these directly.

---

## Security first

- **Never commit keys.** All credentials live in `.env.local` (gitignored). Reference them by name in code and in this doc. This file names no raw secrets.
- **Rotate the MBFC key now.** The RapidAPI key was shared in plaintext in chat, so treat it as compromised. Regenerate it on RapidAPI and store the new value as `MBFC_RAPIDAPI_KEY` in `.env.local`.
- **Store the FEC credential as a secret.** Hold the FEC identifier as `FEC_API_KEY` (or, if it is a Claude connector UUID, connect it through connector settings rather than pasting it into code).

---

## Source registry

### 1. Florida candidate file (Division of Elections)

- **File:** `CandidateList.txt`, tab-delimited, 1,142 candidate rows for election `20261103-GEN`.
- **Pipeline stage:** Intake and Resolution (deterministic layer).
- **Fills:** `Candidate` objects, and seeds `Race` membership.
- **Columns:** AcctNum, VoterID, ElectionID, OfficeCode, OfficeDesc, Juris1num, Juris2num, StatusCode, StatusDesc, PartyCode, PartyDesc, NameLast, NameFirst, NameMiddle, SuppressAddress, address block, County, Phone, Treasurer name, Email.
- **Filter for MVP (ballot candidates only):** keep `StatusDesc` in {Qualified, Unopposed}, exclude `PartyCode = WRI` (write-ins), and keep office in {GOV, ATG, CFO, AGR} or (`USR` with Juris1num in {010, 015, 023, 028}). That yields the 46-candidate roster in `CAP_Target_Race_Candidates_2026_v1.csv`.
- **Why include Unopposed:** unopposed candidates are on the ballot (or win automatically) and still need a brief. FL-10 has only one ballot candidate, Maxwell Frost (Unopposed), so a Qualified-only filter would drop the entire race.
- **Why exclude write-ins:** write-in candidates are not printed on the ballot, rarely have sourced material, and unbalance the audit against printed candidates. Removed from MVP scope.
- **Notes:** `SuppressAddress = Y` means the candidate's address is withheld; do not surface it. Statewide offices carry a blank Juris1num. The file lists primary and general qualifiers together, so a race can hold several candidates per party.
- **Office codes seen:** STR, USR, CTJ, STS, GOV, DCA, USS, AGR, CFO, ATG, plus local districts and judicial seats outside MVP scope.

### 2. Florida election dates (Department of State)

- **URL:** https://dos.fl.gov/elections/for-voters/election-dates/
- **Pipeline stage:** Intake and Resolution.
- **Fills:** `Race.key_dates` (primary date, general date, registration deadline).
- **Access:** page fetch. Re-pull before publishing, since dates and deadlines are the kind of fact that changes.

### 3. FEC (federal campaign finance)

- **Credential:** `FEC_API_KEY` (identifier provided; store as a secret, do not commit).
- **Pipeline stage:** Agent execution, Background Agent ("Who They Are").
- **Fills:** `verifiable_fact` claims and their `Source` objects, for the four US House candidates (FL-10, 15, 23, 28).
- **Use:** candidate committee filings, receipts, and disbursements. Primary source, so it is allowed in the Background lane.
- **Scope note:** federal only. State-office finance comes from the FL Division of Elections finance system, not FEC.

### 4. GovTrack (federal voting records)

- **URL:** https://www.govtrack.us/congress/votes
- **Pipeline stage:** Background Agent.
- **Fills:** `verifiable_fact` for federal incumbents' votes and sponsorships.
- **Scope note:** covers Congress only. State legislators (STR, STS) need the FL Legislature bill and vote system instead. Among MVP US House candidates, only sitting members have a federal voting record here; challengers will not.

### 5. MBFC ratings API (outlet vetting)

- **Credential:** `MBFC_RAPIDAPI_KEY` (rotate, then store as a secret).
- **Endpoint:** `https://media-bias-fact-check-ratings-api2.p.rapidapi.com/fetch-data` on RapidAPI.
- **Hard limit:** 3 requests per month on the current plan.
- **Pipeline stage:** supports the Related News lane and the outlet allowlist.
- **Design rule that follows from the limit:** do not call this per outlet or per article. Pull the dataset in one request, store it, and read the stored copy. Refresh at most a couple times a month, well inside the cap.
- **Role in the two-gate standard:** MBFC is a third rater. The locked gate is still AllSides Center plus Ad Fontes green box. Use MBFC to widen or sanity-check the allowlist, not to replace the two gates.

### 6. Ballotpedia (race and legislation context)

- **URL:** https://ballotpedia.org/Legislation_Trackers
- **Pipeline stage:** issue discovery (Stage 1) and race context.
- **Fills:** background for `Race` context and the issue list. Not a Related News source, and not a primary source for the Background lane.
- **Access:** page fetch, since there is no official MCP.

### 7. US Digital Registry (official government accounts)

- **URL:** https://catalog.data.gov/dataset/us-digital-registry-api (GSA).
- **Pipeline stage:** enrichment and verification for incumbents.
- **Fills:** verifies which social accounts and mobile apps are the *official government* channels for a sitting officeholder. Primary source.
- **Use:** confirm an incumbent's official handles and separate them from campaign accounts. Frost's `@RepMaxwellFrost` and Gimenez's `@RepCarlos` are official government accounts; their campaign handles differ. The registry settles which is which.
- **Scope note:** covers government accounts only. It does not list campaign sites or challenger socials, so it verifies incumbents, not the full field. For "Where They Stand," the candidate's campaign channels still come from the campaign site, not here.

---

## Source-to-lane map

- **Where They Stand** (`stated_position`): candidate sites and official socials, discovered from the candidate file's email and name fields. Sources 1 seeds identity.
- **Who They Are** (`verifiable_fact`): FEC (3), GovTrack (4) for federal; FL Legislature and FL DoE finance for state. Source 1 seeds the biographical record.
- **Related News** (`outside_opinion`): outlets that pass the two gates, with MBFC (5) as a third check. Ballotpedia (6) informs context, not the feed.
- **Race scaffolding:** candidate file (1) and election dates (2) fill `Race` and `Candidate`.

---

## Build order

1. Wrap the candidate file loader and the election-dates fetch first. These fill `Race` and `Candidate` and unblock everything downstream.
2. Wrap FEC and GovTrack for the Background lane on the four US House races.
3. Pull the MBFC dataset once, store it, and merge with the AllSides and Ad Fontes gate to produce the outlet allowlist.
4. Point Stage 1 and Stage 2 research at the allowlist.

Use the `mcp-builder` skill for each wrapper so the tool layer stays consistent with PRD §9.

---

## Open items

- Confirm whether the FEC identifier is an API key or a Claude connector UUID. If a connector, connect it in settings; if a key, store as `FEC_API_KEY`.
- Locate the FL Legislature bill and vote endpoint for the state-office Background lane (STR, STS candidates).
- Locate the FL Division of Elections campaign-finance endpoint for state offices.
- Resolved: MVP includes ballot candidates only (Qualified and Unopposed, write-ins excluded). Minor-party ballot candidates stay in scope (e.g., an NPA candidate in FL-28).
