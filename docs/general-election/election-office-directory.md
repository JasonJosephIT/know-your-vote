# County election office directory

All 67 Florida county election offices, as a checked-in table plus a public
page. Statewide by design — this is the one voter-facing surface that does not
stop at the four covered counties.

## For whoever is building the county picker

The picker does not need its own contact data. Link into this:

```
/election-office/<slug>          e.g. /election-office/miami-dade
/election-office?county=<slug>   redirects to the above
```

Or read it directly:

```ts
import { officeByFips, officeByCounty, officeBySlug } from "@/lib/election-office";

officeByFips("12086");        // zip_district.county_fips
officeByCounty("St. Johns");  // zip_district.county_name / ResolveResult.county
```

`county`, `countyFips` and `slug` all round-trip, and `countyFips` is asserted
against `COVERED_COUNTIES` by `scripts/verify-election-offices.ts`. County
names use `zip_district`'s spelling ("St. Johns", "DeSoto", "Miami-Dade").

## Why two sources

| | Florida Division of Elections | FVAP |
|---|---|---|
| Counties | 67 | 67 |
| Website | yes | **no** |
| Supervisor name | yes | no |
| PO Box + street separately | yes | one field |
| Email | general public inbox | vote-by-mail / UOCAVA desk |

The state file is primary. FVAP is the Federal Voting Assistance Program, so
its contacts route to each county's overseas/military ballot desk —
`votebymail@`, `mailballot@`, `duvaluocava@`. Correct for a deployed service
member, wrong for everyone else. The two disagree on **16 of 67 emails**, and
FVAP carries more retired domains (18 non-`.gov` vs 13; Seminole `.org`,
St. Lucie/Polk/Hardee `.com`).

So FVAP survives only as `overseasEmail`, set on the 16 counties where it
differs and shown as its own labeled line.

The four URLs previously hardcoded in `voting-info/route.ts` had also gone
stale — Orange had moved to `voteorangefl.gov`, Miami-Dade's elections page
had moved. That route now reads the table.

## Regenerating

Both sources are committed under `scripts/data/`, so the output is
reproducible without a network fetch. To refresh:

```bash
curl -o soe.xls https://dos.fl.gov/media/711276/qrycountyinfo_excel.xls
soffice --headless --convert-to csv --outdir scripts/data soe.xls   # legacy .xls
curl -o scripts/data/fvap-fl-election-offices.xml \
  https://www.fvap.gov/xml-api/Florida/election-offices.xml
node scripts/build-election-offices.mjs \
  scripts/data/fl-soe-contacts.csv scripts/data/fvap-fl-election-offices.xml
node scripts/verify-election-offices.ts
```

The `.xls` download link is versioned — check
<https://dos.fl.gov/elections/contacts/supervisor-of-elections/> for the
current one and update `DOS_REVISION` in the build script to match the
"(rev. …)" the page shows. The generator refuses to emit a partial table: not
exactly 67 counties, a name that will not join, a missing FIPS, or a blank
required field is a hard failure.

## Notes for later

- **No database.** The table is a generated module, so all 67 county pages
  prerender and the surface is unaffected by the live-DB gate. Refresh is a
  deploy, which suits data that changes once or twice a year.
- **`streetZip` is not `zip`.** 30 counties take mail at a PO Box and 21 of
  those sit in a different ZIP from their office. Use `streetAddress()` and
  `mailingAddress()` rather than composing address fields by hand.
- **`CountyPicker` used to link to `fldoe.org`** — the Department of
  *Education*. It now points at `/election-office`.
- The out-of-coverage branch in `ZipEntry` now offers the office directory
  instead of ending at "we don't cover that area yet". That path needs the ZIP
  resolver, so it cannot be exercised locally without a live DB.
