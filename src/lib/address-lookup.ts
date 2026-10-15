import { z } from "zod";
import {
  namesOtherState,
  routeParts,
  sameStreet,
  streetIfPlaceNamed,
  typedZip,
  type MatchedStreet,
} from "./address-text.ts";

/* The address -> district path, minus the I/O.

   Pure on purpose: no network, no database, no framework, no `server-only`.
   scripts/verify-address-resolve.ts drives it directly under plain node, which
   it cannot do for a module that imports `server-only` or an @/-aliased value.
   src/lib/news-match.ts is arranged the same way and for the same reason.

   Four response shapes and one lookup live here. The fetching lives in
   census-block.ts and geocode.ts, which are thin by design. */

export interface CensusBlock {
  geoid: string;
  state: string;
}

/* A Google Places suggestion. It carries no coordinate: picking one asks
   Place Details for the point (geocode.ts placeLocation), with the same
   session token, so the pair bills as one session. */
export interface AddressSuggestion {
  id: string;
  text: string;
  secondary: string | null;
}

export interface Point {
  lat: number;
  lon: number;
}

const blockSchema = z.object({
  result: z.object({
    geographies: z.object({
      "Census Blocks": z
        .array(z.object({ GEOID: z.string(), STATE: z.string() }))
        .default([]),
    }),
  }),
});

export function parseBlockResponse(json: unknown): CensusBlock | null {
  const parsed = blockSchema.safeParse(json);
  if (!parsed.success) return null;
  const block = parsed.data.result.geographies["Census Blocks"][0];
  /* A GEOID that is not 15 digits is not a 2020 census block, and guessing from
     a partial one would silently answer the wrong district. */
  if (!block || !/^\d{15}$/.test(block.GEOID)) return null;
  return { geoid: block.GEOID, state: block.STATE };
}

const autocompleteSchema = z.object({
  suggestions: z
    .array(
      z.object({
        placePrediction: z
          .object({
            placeId: z.string(),
            text: z.object({ text: z.string() }).optional(),
            structuredFormat: z
              .object({
                mainText: z.object({ text: z.string() }).optional(),
                secondaryText: z.object({ text: z.string() }).optional(),
              })
              .optional(),
          })
          .optional(),
      })
    )
    .default([]),
});

export function parseSuggestions(json: unknown): AddressSuggestion[] {
  const parsed = autocompleteSchema.safeParse(json);
  if (!parsed.success) return [];
  return parsed.data.suggestions.flatMap(({ placePrediction: p }) => {
    if (!p) return [];
    const text = p.structuredFormat?.mainText?.text ?? p.text?.text;
    if (!text) return [];
    return [
      {
        id: p.placeId,
        text,
        secondary: p.structuredFormat?.secondaryText?.text ?? null,
      },
    ];
  });
}

/* Place Details asked for `location` only. */
const placeSchema = z.object({
  location: z.object({ latitude: z.number(), longitude: z.number() }),
});

export function parsePlaceLocation(json: unknown): Point | null {
  const parsed = placeSchema.safeParse(json);
  if (!parsed.success) return null;
  return { lat: parsed.data.location.latitude, lon: parsed.data.location.longitude };
}

/* A typed address -> a point, from Google's Geocoding API (geocode.ts
   geocodeAddress); census-block.ts then turns the point into a block.

   Google corrects what it is given and still answers with one confident
   result (partial_match is its only hint), so every result is checked
   against the voter's own words before it counts (address-text.ts has the
   cases). The answers, each needing different words to the voter:
   - match: one point.
   - ambiguous: the voter's words fit more than one point. The route
     answers anyway when every point gives the same district.
   - checkStreet: Google found the place but a different street: another
     direction (SW for NW), type (Ave for St) or house number, or no house
     at all (a street-level result).
   - placeConflict: the voter typed a ZIP, and no result is in that ZIP
     and their city. In Broward's repeated street grids the city's match is
     another city's street (review 2026-10-12), so the answer is to check
     both, never the city's match.
   - needsPlace: Google found the street, but not in the city the voter
     named, or they named none. "115 S Andrews Ave, FL" matches Fort
     Lauderdale, and the same street in another city would look just as
     sure.
   - outOfState: Google found it, in the other state the voter named.
   - none: nothing matches in Florida. */
export type AddressMatch =
  | { kind: "match"; point: Point }
  | { kind: "ambiguous"; points: Point[] }
  | { kind: "checkStreet" }
  | { kind: "placeConflict" }
  | { kind: "needsPlace" }
  | { kind: "outOfState" }
  | { kind: "none" };

const geocodeSchema = z.object({
  status: z.string(),
  results: z
    .array(
      z.object({
        address_components: z
          .array(
            z.object({
              long_name: z.string(),
              short_name: z.string(),
              types: z.array(z.string()),
            })
          )
          .default([]),
        geometry: z.object({
          location: z.object({ lat: z.number(), lng: z.number() }),
        }),
      })
    )
    .default([]),
});

/* The names a voter might give for the place: Google's city, and the
   unincorporated community or neighbourhood it sits in ("Kendall" is
   Miami to the Postal Service and neither to Google's locality). */
const PLACE_TYPES = [
  "locality",
  "sublocality",
  "neighborhood",
  "administrative_area_level_3",
];

export function parseAddressMatches(
  json: unknown,
  typed: string
): AddressMatch | null {
  const parsed = geocodeSchema.safeParse(json);
  if (!parsed.success) return null;
  /* OK and ZERO_RESULTS are answers; anything else (REQUEST_DENIED,
     OVER_QUERY_LIMIT) is a failure of ours, not about what was typed. */
  if (parsed.data.status === "ZERO_RESULTS") return { kind: "none" };
  if (parsed.data.status !== "OK") return null;

  const results = parsed.data.results.map((r) => {
    const part = (type: string) =>
      r.address_components.find((c) => c.types.includes(type));
    const route = part("route");
    const number = part("street_number")?.short_name ?? "";
    const point = { lat: r.geometry.location.lat, lon: r.geometry.location.lng };
    const parts = route
      ? routeParts(route.short_name, route.long_name)
      : { preDirection: "", streetName: "", suffixType: "", suffixDirection: "" };
    const cities = PLACE_TYPES.flatMap((t) => part(t)?.long_name ?? []);
    const streets: MatchedStreet[] = (cities.length ? cities : [""]).map((city) => ({
      /* sameStreet reads the house number as the first word. A result with
         no street_number is a street, not a house, so it never matches. */
      matchedAddress: `${number || "-"} ${route?.short_name ?? ""}`,
      ...parts,
      city,
      zip: part("postal_code")?.short_name ?? "",
    }));
    return { point, streets, state: part("administrative_area_level_1")?.short_name ?? "" };
  });

  const florida = results.filter((r) => r.state === "FL");
  if (florida.length === 0) {
    return results.length > 0 &&
      namesOtherState(typed, results.map((r) => r.state))
      ? { kind: "outOfState" }
      : { kind: "none" };
  }

  const placed = florida.flatMap((r) =>
    r.streets.flatMap((street) => {
      const typedStreet = streetIfPlaceNamed(typed, street);
      return typedStreet ? [{ point: r.point, street, typedStreet }] : [];
    })
  );
  if (placed.length === 0) {
    return typedZip(typed) !== null
      ? { kind: "placeConflict" }
      : { kind: "needsPlace" };
  }

  const same = placed.filter((m) => sameStreet(m.typedStreet, m.street));
  if (same.length === 0) return { kind: "checkStreet" };

  const points = [
    ...new Map(same.map((m) => [`${m.point.lat},${m.point.lon}`, m.point])).values(),
  ];
  return points.length === 1
    ? { kind: "match", point: points[0] }
    : { kind: "ambiguous", points };
}

/* The range lookup's own logic, so it can be tested without a database.
   Boundaries are inclusive, matching the SQL the query builder emits. */
export function districtFromBlockRows(
  rows: Array<{
    block_start: string;
    block_end: string;
    county_fips: string;
    congressional_district: string;
  }>,
  blockGeoid: string
): { district: string; countyFips: string } | null {
  const row = rows.find(
    (r) => r.block_start <= blockGeoid && blockGeoid <= r.block_end
  );
  if (!row) return null;
  return { district: row.congressional_district, countyFips: row.county_fips };
}
