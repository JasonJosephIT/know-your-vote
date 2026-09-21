# Local district boundaries — county commission and school board

Fetched 2026-09-21 from each county's own GIS, in WGS84 (EPSG:4326) GeoJSON, as
returned by the service and otherwise unmodified. These are the boundaries the
17 Tier A local races in `0031_local_tier_a_2026.sql` need in order to reach a
voter.

**Nothing consumes these yet.** They are the input to a ZIP and block crosswalk
that has not been built — see "What still has to happen".

## The files

| File | County | Body | Districts | District field | Source |
|---|---|---|---|---|---|
| `ora-cc-2026.geojson` | Orange | County Commission | 1–8 | `DIST` | `services1.arcgis.com/0U8EQ1FrumPeIqDb/…/Commission_Districts_November_2026/FeatureServer/0` |
| `ora-sb.geojson` | Orange | School Board | 1–7 | `DISTRICT` | `services8.arcgis.com/KROpZDerJ9MICPIU/…/School_Board_Districts/FeatureServer/1` |
| `mdc-cc.geojson` | Miami-Dade | County Commission | 1–13 | **`ID`** | `services.arcgis.com/8Pc9XBTAsYuxx9Ny/…/CommissionDistrict_gdb/FeatureServer/0` |
| `mdc-sb.geojson` | Miami-Dade | School Board | 1–9 | **`ID`** | `services.arcgis.com/8Pc9XBTAsYuxx9Ny/…/SchoolBoardDistrict_gdb/FeatureServer/0` |
| `bro-sb.geojson` | Broward | School Board | 1–7 | `DISTRICT` | SOE elections map, `services.arcgis.com/JMAJrTsHNLrSsWf5/…/2026_SOE_GENERAL_USE_MAP___POST_CNG_WFL1/FeatureServer/254` |
| `hil-cc.geojson` | Hillsborough | County Commission | 1–4 | `District` | `services.arcgis.com/apTfC6SUmnNfnxuF/…/Commissioner_Districts_2023/FeatureServer/0` |
| `hil-sb.geojson` | Hillsborough | School Board | 1–5 | `District` | `services.arcgis.com/apTfC6SUmnNfnxuF/…/Hillsborough_County_School_Board_Electoral_Districts/FeatureServer/5` |

Every layer's bounding box was checked against its county before being kept —
the Orange school board service carries no description or copyright text and
could have been any Orange County in the country.

## Three things that will bite whoever uses these

### 1. Orange's *published* commission layer is the wrong map

The obvious open-data route — "Commission Districts of Orange County", the one
ArcGIS Hub and search surface first — returns **six** districts and was last
modified 2025-08-25. Orange expanded to **eight** for 2026, and two of our
races are for Districts 7 and 8, which do not exist on that map.

The correct 2026 layer is not published as its own dataset. It is reachable
only through the web map inside the "2026 Commission District Map Viewer"
Web Experience, as `Commission_Districts_November_2026`. That is the file kept
here. **Do not swap in the open-data layer because it is easier to find.**

### 2. Miami-Dade's district number is `ID`, not `OBJECTID`

They are unrelated: `OBJECTID` 4 is District 5. Both happen to run 1–13, so a
sanity check on *range* passes while every assignment is silently wrong.

The cross-check that settles it: the polygons carry the incumbent's name.
District `ID` 5 names Vicki L. Lopez, who is on our ballot for Miami-Dade
County Commission District 5. Any future refresh should re-run that check
rather than trusting a field name.

### 3. Five of the 17 races are countywide and have no sub-county boundary

Hillsborough elects 7 commissioners — 4 from single-member districts and 3
countywide — and its school board the same way, 5 districts plus 2 countywide.
So the `hil-cc` layer stopping at District 4 and `hil-sb` at District 5 is not
missing data; Districts 5–7 and 6–7 respectively have no boundary to fetch.

Countywide, therefore every voter in the county:

- Orange Clerk of the Courts
- Orange County Mayor
- Hillsborough County Commission, Districts 5 and 7
- Hillsborough County School Board, District 6

The other 12 races resolve through the layers above.

## What still has to happen

These are polygons. `block_district` (0024) and `zip_district` want assignments,
and the project's rule from `build-block-seed.mjs` is that an address and a ZIP
must resolve through the *same* source so the two can never disagree. So:

1. Point-in-polygon census block internal points (TIGER `tl_2020_12_tabblock20`
   carries `INTPTLAT`/`INTPTLON`) against these layers, for the four counties'
   ~89,816 blocks, producing block → local district.
2. Aggregate to ZCTA for the ZIP path, applying the same ≥5% land-area share
   rule `build-zip-seed.mjs` uses, so split ZIPs get one row per district.
3. Extend the schema: `block_district` holds a single `congressional_district`
   column, and `race.district` for these races holds a county-scoped string
   (`ORA-CC-2`) that today matches nothing on purpose.

Until that exists the 17 races stay loaded and unreachable, which is the
current deliberate state — see `0031` and the recalibration doc.

## Refreshing

Each source is a public ArcGIS FeatureServer; append
`/query?where=1=1&outFields=*&outSR=4326&f=geojson`. No key is needed. Re-run
the district-number and incumbent-name checks above afterwards, and re-read
note 1 before trusting anything Orange publishes as "commission districts".
