# Address → district lookup, and a district the browser remembers

**Status:** design approved 2026-09-09. Implementation plan to follow.
**Branch:** stacks on `claude/general-election-2026-map` (PR #35), which carries
the enacted-map migrations 0018/0019. Not mergeable to `main` before that chain.

## 1. What this changes

Today a voter reaches their House race by typing a ZIP, and a ZIP is the wrong
unit: 133 of the 235 covered ZIPs moved districts under the enacted 2026 plan,
and a ZIP that spans districts can only ever end in a question ("which of these
two districts are you in?"). An address answers exactly.

Two changes, and the second is the reason the first is worth doing:

1. **A smart location field** that accepts either a street address (completed as
   you type, via Google Places) or a 5-digit ZIP, with a district picker
   underneath for anyone who already knows their district.
2. **The browser remembers the district, not the location.** One cookie holding
   `FL-27|12086` and nothing else, set only when the voter asks, shown in the
   top-right chrome, forgotten in one click. No address and no ZIP is ever
   stored, logged, or persisted anywhere.

The privacy position gets *narrower* on what is remembered and *stronger* on
what is never kept: we remember which of Florida's districts you chose; we
never learn or keep where you live.

## 2. Decisions taken

| Decision | Choice | Why |
|---|---|---|
| Autocomplete provider | **Google Places API (New)** | Founder call. Best coverage and the completion behaviour voters expect. Census has no typeahead endpoint; a self-hosted TIGER index was the only zero-vendor alternative and costs far more to build and maintain. |
| Address → district path | **Places → coordinates → Census block → enacted-plan block table** | Census never sees the street address. District comes from the same `EOGPCRP2026` block assignment that PR #35's ZIP crosswalk is built from, so ZIP and address answers cannot disagree. |
| Front door | **Smart field first, district picker underneath** | Most voters do not know their district number. The picker serves returning voters and anyone who does. |
| Cross-visit memory | **District + county in one cookie** | A district is a public electoral unit, not a location. Partially reverses TASK-070 — see §8. |
| Key handling | **Server-side proxy, key never in the browser** | Trade-off accepted: Google no longer sees the voter's IP, but the typed text transits our server. Our server neither logs nor stores it. |
| Place Details field mask | **`location` only** | The resolve step handles a coordinate and never an address. (The suggest proxy does handle address text — see §8.) Falls in the Place Details Essentials SKU. |
| `zip_district` | **Kept, demoted** | PR #35 just rebuilt it; the polling-place email still needs a ZIP the voter types. Deleting it is a separate call. |

## 3. Data flow

```
voter types "444 SW 2nd"
  → POST /api/address/suggest        { q, sessionToken }
  → Places Autocomplete (New)        input, sessionToken, FL rectangle, us, address types
  ← up to 5 { placeId, text }

voter picks one
  → POST /api/address/resolve        { placeId, sessionToken }
  → Places Details, fieldMask=location
  ←   { latitude, longitude }                      ← this step handles no address at all
  → Census geographies/coordinates, layers=Census Blocks
  ←   GEOID 120860036061055, STATE 12
  → block_district range lookup      → FL-27, county 12086
  → racesForDistrict("FL-27")        → the ballot
  → client writes kyv.district=FL-27|12086         ← the only thing persisted
```

Digits-only input never reaches Google: five digits go straight to the existing
`resolveZip`, split-ZIP confirm included.

## 4. Data: `block_district`

Three migrations, because a generated file should not carry schema — the same
split 0001/0003 and 0018 already use. Numbers claimed in `supabase/migrations/README.md` first, per that ledger's rule 2.

- `0024_block_district.sql` — table and index
- `0025_block_district_rls.sql` — grants and policy, following 0010/0011
- `0026_block_seed_2026.sql` — generated `DELETE` + `INSERT`

```sql
CREATE TABLE block_district (
  block_start            CHAR(15) PRIMARY KEY,
  block_end              CHAR(15) NOT NULL,
  county_fips            CHAR(5)  NOT NULL,
  congressional_district TEXT     NOT NULL
);
CREATE INDEX idx_block_district_range ON block_district (block_start, block_end);
```

Rows are **run-length ranges** over the sorted 15-digit block GEOIDs of the four
covered counties. Districts cluster by tract, so this compresses
hard — measured against the enacted plan on 2026-09-09, the four counties'
**89,816 blocks collapse to 982 ranges** (91.5×), a ~50 KB migration, with zero
mismatches on an exhaustive replay. Those ranges span exactly the **16
districts** `0019` widens coverage to. GEOIDs are fixed-width, so
lexicographic `BETWEEN` is numerically correct:

```sql
SELECT congressional_district, county_fips FROM block_district
WHERE block_start <= $1 AND block_end >= $1 LIMIT 1;
```

RLS mirrors `zip_district` exactly: `GRANT SELECT ... TO anon` plus
`CREATE POLICY anon_read_block_district ON block_district FOR SELECT TO anon
USING (true)`. It is public reference data — a district map — with nothing
voter-specific in it.

### Generation

`scripts/build-block-seed.mjs <block_assignment.txt>` reads the same enacted-plan
file `build-zip-seed.mjs` uses (`120860101001000,24`), keeps blocks whose GEOID
prefix is one of `12086 12011 12057 12095`, writes districts as `FL-24` to match
`zip_district`, sorts, and collapses consecutive same-district runs.

Before writing anything it **replays every kept source block through the
generated ranges and refuses to write on a single mismatch.** That exhaustive
round-trip is what makes range encoding safe rather than clever.

### What the cross-check measured

Run against the real inputs on 2026-09-09, it also quantified the problem this
feature exists to solve. `build-zip-seed.mjs` marks a ZIP `is_split` only when
two districts each cover **≥5%** of its land, so a "non-split" ZIP is not one
district everywhere — it is one district over at least 95% of the land.

Across the 160 non-split covered ZIPs, **29 contain blocks belonging to a
different district**, every one of them under that 5% line (the largest is
33308, where 20 blocks — 4.7% of the ZIP's land — are in FL-20 while the ZIP
resolves to FL-25). Both datasets are correct; the threshold is doing what it
was designed to do.

But a voter living in one of those slivers is told a district that is
confidently wrong, and today has no way to find out. That is the case for
address lookup stated in numbers rather than in principle.

### Independent verification

`scripts/verify-block-seed.mjs` checks the generated ranges against a source the
project already trusts: for every ZIP that 0022 marks `is_split = false`, every
covered block in that ZCTA must resolve to that ZIP's single district. It reuses
the ZCTA/tabblock relationship file 0018 is built from. A wrong plan file, a bad
county filter, or an off-by-one range fails loudly.

## 5. Server

Two vendor clients, both server-only, each zod-parsed with
`AbortSignal.timeout(2500)`, neither logging its input:

- **`src/lib/geocode.ts`**
  - `suggestAddresses(input, sessionToken)` → `{ placeId, text, secondary }[]`
    `POST https://places.googleapis.com/v1/places:autocomplete`, headers
    `X-Goog-Api-Key` and `X-Goog-FieldMask:
    suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat`.
    Body: `input`, `sessionToken`, `includedPrimaryTypes:
    ["street_address","premise","subpremise"]`, `includedRegionCodes: ["us"]`,
    `languageCode: "en"`, and `locationRestriction.rectangle` = Florida
    (low 24.3963/-87.6349, high 31.0011/-79.9743).
  - `placeLocation(placeId, sessionToken)` → `{ lat, lng }`
    `GET https://places.googleapis.com/v1/places/{placeId}?sessionToken=…`,
    `X-Goog-FieldMask: location`.
- **`src/lib/census-block.ts`**
  - `blockForCoordinates(lat, lng)` → `{ geoid, state } | null`
    `geographies/coordinates` with `benchmark=Public_AR_Current`,
    `vintage=Census2020_Current`, `layers=Census Blocks` — an 846-byte response.

`src/lib/resolve.ts` gains three functions beside an unchanged `resolveZip`, all
reusing `racesForDistrict`:

- `resolveBlock(geoid)` → `{ district, countyFips } | null` (null = outside coverage)
- `resolveDistrict(countyFips, district)` → `ResolveResult` — also serves
  `/candidates?view=races&district=FL-27&county=12086`, so an address result is
  refreshable and shareable with no address in the URL
- `getCoveredDistricts()` → the distinct county+district pairs behind the picker,
  wrapped in `unstable_cache` like `getStatewideRaces`

Two routes, **both POST**, so the address never reaches a URL, query string,
referrer, or access log:

| Route | Body | Limit | Degrades to |
|---|---|---|---|
| `POST /api/address/suggest` | `{ q: 5–120 chars, sessionToken: uuid }` | 30/min per IP | `503 { unavailable: true }` when no key is set |
| `POST /api/address/resolve` | `{ placeId, sessionToken }` | 20/min per IP | `502` with copy pointing at ZIP or the picker |

Both use the existing `rateLimit` / `clientKey`. Neither writes to the database.

## 6. Client

**`src/components/features/LocationEntry.tsx`** replaces `ZipEntry` (absorbing
its logic; the old file is deleted, and its two call sites updated).

One input, mode-detected on every keystroke: `/^\d+$/` is ZIP mode — no network
until submit, no Google call ever — anything else is address mode. Address mode
debounces 250 ms, requires 5 characters, and aborts the in-flight request via
`AbortController`. It is a proper ARIA 1.2 combobox: `role="combobox"`,
`aria-expanded`, `aria-controls`, `aria-activedescendant`, arrow-key navigation,
Escape to close. `autoComplete="street-address"` stays on the input so the
browser's own saved-address autofill still works.

A session token (`crypto.randomUUID()`) is minted at the first keystroke of an
address session, reused across suggest calls, spent on the resolve call, then
regenerated — which is what makes the paired calls bill as one session.

The `action="/candidates" method="get"` no-JavaScript path survives unchanged for
ZIP. Address completion needs JavaScript; the picker underneath does not.

Underneath the field: **"Or choose your district"** — a select of
`getCoveredDistricts()` pairs rendered as `FL-27 · Miami-Dade`. The existing
`CountyPicker` stays as the out-of-coverage fallback.

**`src/components/features/DistrictChip.tsx`** renders in `SectionNav` (already a
client component, already pinned top-right on `md:`; on mobile the nav sits at
the bottom, so the chip gets a slim top bar). States: `Set your district` →
`FL-27 · Miami-Dade ▾` → menu with **Change** and **Forget**.

**`src/lib/district-cookie.ts`** is the one place the cookie contract lives,
shared by client and server:

- Name `kyv.district`, value `FL-27|12086`, `path=/`, `max-age=15552000` (180
  days), `samesite=lax`, `secure`. Deliberately **not** `HttpOnly`: it holds no
  secret, and JS-readable means the chip renders and clears without a round trip.
- `parseDistrictCookie(raw)` validates the shape `/^FL-\d{1,2}\|\d{5}$/`;
  anything else is treated as absent. That regex is what keeps a ZIP or an
  address out of the cookie. Whether the county is *covered* is enforced where a
  ballot is produced — `resolveDistrict` returns `null` for an uncovered county —
  which keeps this module import-free so it can be parsed in the browser, on the
  server, and under plain `node` by the verify script.
- Written only by an explicit user action — a resolved address, a resolved ZIP,
  or a picker choice. **A shared link never writes it**, or sharing your ballot
  would silently move someone else's district.

## 7. Rendering and caching

`cookies()` is a request-time API: using it in a layout or page opts that route
into dynamic rendering (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`).
That shapes the design:

- The chip reads `document.cookie` **client-side**, so `SectionNav` and the root
  layout stay static and no route loses its caching.
- Only `/` and `/candidates` read `await cookies()` server-side, to render the
  right ballot with no flash. Their data still comes through the existing
  `unstable_cache` calls, so only the HTML shell is per-request.
- The `revalidate = 3600` detail pages (`/races/[raceId]`,
  `/candidates/[candidateId]`, `/measures/[measureId]`, `/methodology`) never
  read the cookie and are untouched.
- URL params override the cookie, so existing links keep working.

Cookies cannot be set during render, so every write happens client-side in
`district-cookie.ts`. No server action or route handler is needed for it.

## 8. Privacy

### What changes in the claim

TASK-070 deleted `kyv.location` (which held ZIP, county, district and metro) on
2026-09-07 to earn the claim in `docs/ballot-first-zip-optional.md`: *"we
remember nothing about you between visits except the candidates you choose to
save"*, verifiable in devtools. This design partially reverses that, and the
claim changes with it:

> We remember the district you chose and the candidates you save — never your
> address, never your ZIP.

What keeps that defensible, and what the implementation must preserve:

- The stored value is a **public electoral unit**, not a location. A district
  holds roughly 750,000 people and identifies nobody.
- It is written **only when the voter asks**, never accumulated by the app.
- It is **visible in the chrome at all times** — storage the voter can see beats
  storage buried in a settings page.
- **One click forgets it**, and the privacy page names the exact cookie and
  value so a skeptic can still verify the claim in devtools.
- The address goes to **Google Places only**, to complete what the voter typed.
  Only a coordinate goes to the **Census Bureau**.

Being exact about what our own server touches, because the proxy makes this
easy to overclaim:

- **Suggest** receives the fragment the voter typed and the prediction texts
  Google returns — both are address text. They live in memory for the length of
  one request, are passed straight back to the browser, and are never logged,
  never stored, and never written to the database.
- **Resolve** receives a `placeId` and a coordinate. No address, in either
  direction.
- **Nothing** persists either one. The only thing that outlives the request is
  the district the voter chose.

The privacy page's "What stays on your device" section gains the cookie as a
third item, and the "return visit asks again" paragraph is replaced. The
paragraph that says the ZIP is not stored stays true and gets stronger.

One more line goes false and must move with it: `src/app/(public)/page.tsx:63`
tells the voter *"We use it to find your district; nothing is saved on your
device."* The first half stays true, the second does not. The "No ZIP needed"
claims in the layout metadata, `/where-i-stand` and `Quiz` are unaffected.
`docs/product-roadmap.md` records the partial reversal of TASK-070 so the
decision is not silently undone.

### Enforced invariants

`scripts/verify-no-stored-location.ts` is **rewritten around the new invariant**
rather than weakened. It asserts:

- `kyv.district` is the only permitted location-ish key, in cookies or
  `localStorage`; `kyv.saved` and the install-dismiss flag remain allowed; any
  other key fails.
- The cookie writer accepts only values matching `/^FL-\d{1,2}\|\d{5}$/`.
- No ZIP or address is written to any store, and `kyv.location`, `readLocation`,
  `writeLocation`, `clearLocation` and `@/lib/location` stay absent.
- Both `src/app/api/address/*/route.ts` files export `POST` and no `GET`, and
  contain no `console.` call.
- `src/lib/analytics.ts` declares `district_set`, and its only permitted prop
  value set is `"address" | "zip" | "picker"` — never a ZIP or address value.
- The privacy page names Google Places, the Census Bureau, the cookie name, and
  the fact that only coordinates leave for Census.

`src/lib/sentry-scrub.ts` drops request bodies for `/api/address/*`. Its
existing ZIP and email redaction already covers the rest.

## 9. Failure modes

Every one of these ends with the voter still able to reach their ballot.

| Condition | Behaviour |
|---|---|
| `GOOGLE_PLACES_API_KEY` unset | Field is ZIP-only, no dropdown, picker underneath unchanged. Same pattern as the quiz behind `ANTHROPIC_API_KEY`. |
| Places timeout or error | Dropdown stays empty and silent; ZIP and picker still work. |
| Place Details fails | `502`, copy points at ZIP or the picker. |
| Census timeout or no block | Fall back to the picker with the district unset — we do **not** guess from the coordinate. |
| Block outside the four counties | Existing out-of-coverage copy plus `CountyPicker`. |
| Non-Florida address | Same out-of-coverage answer, distinguished by the Census `STATE` field for better copy. |
| Cookie present but malformed or county not covered | Treated as absent; chip shows `Set your district`. |
| Resolved district has no House race | Existing "no race yet" answer from `resolveZip`'s sibling path (PR #36's `19a2324` fix). |

## 10. Testing

The project has no test runner; checks are `scripts/verify-*` run directly with
`node`. Two new ones plus a rewrite, all the same shape:

- **`verify-block-seed.mjs`** — §4's cross-check against 0022.
- **`verify-address-resolve.ts`** — fixture-driven, no network: a Places
  autocomplete fixture, a Details fixture, the real Census coordinates response
  captured for `444 SW 2nd Ave`, and a small `block_district` fixture. Asserts
  block → district, county extraction from the GEOID prefix, out-of-coverage,
  non-Florida, and that **no response body echoes the input address**. Cookie
  parsing is asserted in `verify-no-stored-location.ts` instead, where the rest
  of the storage contract lives.
- **`verify-no-stored-location.ts`** — rewritten per §8.

Founder-run live gate, once a key exists: three real addresses inside one
`is_split = true` ZIP that the enacted plan puts in different districts must
resolve to different districts, and the ZIP path on the same ZIP must still ask
for confirmation.

## 11. Cost control

Verify current per-SKU pricing and the monthly free allowance in the Google Cloud
console before enabling in production, and set a **daily request cap there** —
that quota is the real cost guard, not application code. The design keeps calls
low by construction: digits-only input never calls Google, address mode needs 5
characters and a 250 ms pause, in-flight requests are aborted, one Details call
per resolution, session tokens pair the calls into one billed session, 30/min per
IP, and a returning voter with a district cookie calls nothing at all.

Restrict the key to **Places API (New) only**. IP restriction is not practical on
Vercel without static egress, which is why the key stays server-side and the
quota cap carries the load.

## 12. Out of scope

Named so they are not silently assumed:

- `/where-i-stand` and `/news` do not read the district cookie yet. Both are
  statewide today; wiring them up is a follow-up, not part of this change.
- `VotingInfo` keeps asking for a ZIP, because we deliberately do not keep one.
  That is the honest consequence of §8, not an oversight.
- State house and senate districts. The enacted-plan file is congressional only.
- Deleting `zip_district`.
- Statewide coverage beyond the four counties. `block_district` is seeded for
  Miami-Dade, Broward, Hillsborough and Orange, matching `COVERED_COUNTIES`.

## 13. Gates

- **Founder:** a billing-enabled Google Cloud project and a
  `GOOGLE_PLACES_API_KEY` restricted to Places API (New), in `.env.local` and in
  Vercel. Everything else degrades cleanly without it.
- **Founder:** the live-address gate in §10.
- **Sequencing:** PR #33 → #34 → #35 must merge before this reaches `main`.
  The map branch predates `19a2324` (PR #36's "a resolved ZIP has no House
  race" copy fix in `resolve.ts`), so rebase it on current `main` before
  building phase 2 — `resolveDistrict` should inherit that answer rather than
  reinvent it, and rebasing later means resolving the same `resolve.ts` twice.
- **Reachable from here:** `geocoding.geo.census.gov`, `www2.census.gov`,
  `floridaredistricting.gov` and `flsenate.gov` all answered 200 on 2026-09-09,
  so the block-assignment file and the seed can be produced without a founder
  handoff.

## 14. Work order

Four phases, each independently verifiable:

1. **Data** — `build-block-seed.mjs`, 0020, 0021, `verify-block-seed.mjs`.
2. **Server** — `geocode.ts`, `census-block.ts`, the three `resolve.ts`
   functions, both routes, `verify-address-resolve.ts`.
3. **Client** — `LocationEntry`, `DistrictChip`, `district-cookie.ts`, the
   `SectionNav` slot, cookie reads on `/` and `/candidates`, `ZipEntry` deleted.
4. **Claims** — privacy page, rewritten `verify-no-stored-location.ts`,
   `sentry-scrub.ts`, `.env.example`, roadmap note on the TASK-070 reversal.
