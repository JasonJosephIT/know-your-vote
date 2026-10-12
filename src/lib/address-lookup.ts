import { z } from "zod";
import {
  namesOtherState,
  sameStreet,
  streetIfPlaceNamed,
  type MatchedStreet,
} from "./address-text.ts";

/* The address -> district path, minus the I/O.

   Pure on purpose: no network, no database, no framework, no `server-only`.
   scripts/verify-address-resolve.ts drives it directly under plain node, which
   it cannot do for a module that imports `server-only` or an @/-aliased value.
   src/lib/news-match.ts is arranged the same way and for the same reason.

   Three response shapes and one lookup live here. The fetching lives in
   census-block.ts and geocode.ts, which are thin by design. */

export interface CensusBlock {
  geoid: string;
  state: string;
}

export interface AddressSuggestion {
  id: string;
  text: string;
  secondary: string | null;
  /* Pelias returns the coordinate with the suggestion, so picking one needs no
     second call to anybody. This is the whole reason the Google two-step
     (autocomplete -> place details) is gone. */
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

/* Pelias answers in GeoJSON: a FeatureCollection whose features carry the
   coordinate in `geometry` and the address parts in `properties`. */
const peliasSchema = z.object({
  features: z
    .array(
      z.object({
        geometry: z
          .object({
            /* GeoJSON order is [longitude, latitude]. Reversing these puts a
               Miami address in the Indian Ocean, and the failure is silent
               because both are plausible numbers -- so the tuple is destructured
               by position exactly once, here. */
            coordinates: z.tuple([z.number(), z.number()]),
          })
          .optional(),
        properties: z
          .object({
            gid: z.string().optional(),
            layer: z.string().optional(),
            name: z.string().optional(),
            label: z.string().optional(),
            locality: z.string().optional(),
            region_a: z.string().optional(),
            postalcode: z.string().optional(),
          })
          .optional(),
      })
    )
    .default([]),
});

export function parseSuggestions(json: unknown): AddressSuggestion[] {
  const parsed = peliasSchema.safeParse(json);
  if (!parsed.success) return [];
  return parsed.data.features.flatMap((f, i) => {
    const p = f.properties;
    const coords = f.geometry?.coordinates;
    if (!p || !coords) return [];
    /* `layers=address` is already on the request, but a street or locality
       centroid that slipped through would resolve to whichever district the
       midpoint of the street happens to sit in -- the exact ambiguity this
       feature exists to remove. Refuse it rather than answer confidently. */
    if (p.layer !== "address") return [];
    const text = p.name ?? p.label;
    if (!text) return [];
    const [lon, lat] = coords;
    const secondary =
      [p.locality, p.region_a, p.postalcode].filter(Boolean).join(", ") || null;
    return [{ id: p.gid ?? `${text}:${i}`, text, secondary, lat, lon }];
  });
}

/* A typed address -> census block, from the Census Bureau's one-line address
   geocoder (census-block.ts blockForAddress). This is the path when no
   Pelias is configured, which is production: the voter types the whole
   address and presses Enter, with no suggestions.

   Census corrects what it is given and still answers with one confident
   match (address-text.ts has the cases), so every match is checked against
   the voter's own words before it counts. The answers, each needing
   different words to the voter:
   - match: one census block, so exactly one district.
   - ambiguous: the voter's words fit more than one block. The route
     answers anyway when every block gives the same district.
   - checkStreet: Census found the place but a different street: another
     direction (SW for NW), type (Ave for St) or house number.
   - needsPlace: Census found the street, but not in the city or ZIP the
     voter named, or they named none. "115 S Andrews Ave, FL" matches Fort
     Lauderdale, and if the voter's own address is missing from Census's
     address ranges, the same street in another city would be matched
     instead and look just as sure.
   - outOfState: Census found it, in the other state the voter named.
   - none: nothing matches in Florida. */
export type AddressMatch =
  | { kind: "match"; block: CensusBlock }
  | { kind: "ambiguous"; blocks: CensusBlock[] }
  | { kind: "checkStreet" }
  | { kind: "needsPlace" }
  | { kind: "outOfState" }
  | { kind: "none" };

const component = z.string().optional().default("");
const addressSchema = z.object({
  result: z.object({
    addressMatches: z
      .array(
        z.object({
          matchedAddress: component,
          addressComponents: z
            .object({
              preDirection: component,
              streetName: component,
              suffixType: component,
              suffixDirection: component,
              city: component,
              zip: component,
              state: component,
            })
            .optional(),
          geographies: z.object({
            "Census Blocks": z
              .array(z.object({ GEOID: z.string(), STATE: z.string() }))
              .default([]),
          }),
        })
      )
      .default([]),
  }),
});

export function parseAddressMatches(
  json: unknown,
  typed: string
): AddressMatch | null {
  const parsed = addressSchema.safeParse(json);
  if (!parsed.success) return null;
  const matches = parsed.data.result.addressMatches;
  const florida = matches.flatMap((m) => {
    const block = m.geographies["Census Blocks"][0];
    /* The same 15-digit rule as parseBlockResponse, and Florida only. */
    if (!block || !/^\d{15}$/.test(block.GEOID) || block.STATE !== "12") {
      return [];
    }
    const c = m.addressComponents;
    const street: MatchedStreet = {
      matchedAddress: m.matchedAddress,
      preDirection: c?.preDirection ?? "",
      streetName: c?.streetName ?? "",
      suffixType: c?.suffixType ?? "",
      suffixDirection: c?.suffixDirection ?? "",
      city: c?.city ?? "",
      zip: c?.zip ?? "",
    };
    return [{ block: { geoid: block.GEOID, state: block.STATE }, street }];
  });
  if (florida.length === 0) {
    const states = matches.map((m) => m.addressComponents?.state ?? "");
    return matches.length > 0 && namesOtherState(typed, states)
      ? { kind: "outOfState" }
      : { kind: "none" };
  }

  const placed = florida.flatMap((m) => {
    const street = streetIfPlaceNamed(typed, m.street);
    return street ? [{ ...m, typedStreet: street }] : [];
  });
  if (placed.length === 0) return { kind: "needsPlace" };

  const same = placed.filter((m) => sameStreet(m.typedStreet, m.street));
  if (same.length === 0) return { kind: "checkStreet" };

  const blocks = [
    ...new Map(same.map((m) => [m.block.geoid, m.block])).values(),
  ];
  return blocks.length === 1
    ? { kind: "match", block: blocks[0] }
    : { kind: "ambiguous", blocks };
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
