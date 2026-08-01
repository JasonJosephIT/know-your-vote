# CAP Incumbent Official-Account Verification (2026)

**Date:** 2026-07-15
**Purpose:** Lock the split between each officeholder's **campaign** accounts and their **official government** accounts, so the pipeline routes them to the right lane:

- Campaign accounts feed **Where They Stand** (`stated_position`).
- Official government accounts feed **Who They Are** (`verifiable_fact`).

**Method note:** The US Digital Registry API was unreachable from this environment (HTTP 403 `blocked-by-allowlist`; its search UI is JavaScript-rendered and returned no content). Verification ran instead against each officeholder's official `.gov` page, which is authoritative for official accounts. When the registry is wired in as a tool wrapper, add its domain to the fetch allowlist. It is federal-focused, so it will cover the five US House members, not the state officials.

---

## Federal officeholders (US House)

| Officeholder | Campaign account (stated_position) | Official gov account (verifiable_fact) | Source | Confidence |
|---|---|---|---|---|
| Maxwell Frost (FL-10) | @MaxwellFrostFL | @RepMaxwellFrost; FB/IG RepMaxwellFrost | frost.house.gov | High |
| Laurel Lee (FL-15) | @vote_laurel | @RepLaurelLee; FB/IG RepLaurelLee | laurellee.house.gov | High |
| Lois Frankel (FL-23 per DoE file) | @loisfrankel | @RepLoisFrankel; FB/IG reploisfrankel | frankel.house.gov | High |
| Carlos Gimenez (FL-28) | @CarlosGimenezFL | @RepCarlos; FB RepCarlosGimenez; IG repcarlosfl | gimenez.house.gov | High |
| Byron Donalds (FL-19, running Gov) | @byrondonalds | @RepDonaldsPress; FB/IG RepDonaldsPress | donalds.house.gov | High |

All five official accounts are confirmed distinct from the campaign handles.

---

## State officeholders

| Officeholder | Campaign account (stated_position) | Official gov account (verifiable_fact) | Source | Confidence |
|---|---|---|---|---|
| Jay Collins (Lt. Gov, running Gov) | @JayCollinsFL | @LtGovJayCollins (likely; not confirmed on a .gov page) | X profile bio; flgov.com would not render | Medium |
| Dotie Joseph (FL House 108, running Gov) | @dotieforflorida | none (FL House gives members no individual official account) | flhouse.gov member page | High |
| James Uthmeier (Attorney General) | @jamesuthmeierfl | @AGJamesUthmeier (X confirmed; official FB/IG not confirmed) | myfloridalegal.com | High for X |
| Blaise Ingoglia (CFO) | @govgonewild | agency @FLDFS (no personal official account) | myfloridacfo.com | High |
| Wilton Simpson (Ag Commissioner) | @WiltonSimpson (personal/political) | agency @FDACS (no personal official account) | fdacs.gov / FDACS X | Medium-High |

---

## Flags to resolve

- **Frankel district.** Her house.gov page states Florida's 22nd District (her current seat). The FL DoE 2026 qualifying file lists her under district 023. Confirm the correct 2026 district number before publishing; the DoE file is the source of truth for the race, but the mismatch is worth a manual check.
- **Byron Donalds nuance.** Only @RepDonaldsPress is the official government account. His personal political @ByronDonalds is not a government account and should not be tagged as `verifiable_fact`.
- **Agency vs person for CFO and Ag Commissioner.** Ingoglia and Simpson have no personal official government account. Their official presence is the department account (@FLDFS, @FDACS). Decide whether "Who They Are" links the agency account or omits an official social entirely for these two.
- **US Digital Registry access.** Unreachable from this sandbox. Confirm registry integration during the tool-wrapper build, with the registry domain allowlisted.
