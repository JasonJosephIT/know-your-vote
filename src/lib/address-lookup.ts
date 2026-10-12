import { z } from "zod";

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

   Four answers, because three of them need different words to the voter:
   - match: one census block, so exactly one district.
   - none: nothing in Florida matches. Census matches nationwide, so a
     Florida voter's "1 Main St, Springfield, FL" comes back as six other
     states' Springfields; those are not answers.
   - needsPlace: Florida matches exist, but the typed text names neither
     the matched city nor its ZIP. "115 S Andrews Ave, FL" matches Fort
     Lauderdale, and if the voter's own address is missing from Census's
     address ranges, the same street in another city would be matched
     instead and look just as sure. So a match counts only when the voter
     said which place they meant.
   - ambiguous: the voter named a place and it still matches more than one
     block. */
export type AddressMatch =
  | { kind: "match"; block: CensusBlock }
  | { kind: "none" }
  | { kind: "needsPlace" }
  | { kind: "ambiguous" };

const addressSchema = z.object({
  result: z.object({
    addressMatches: z
      .array(
        z.object({
          addressComponents: z
            .object({
              city: z.string().optional(),
              zip: z.string().optional(),
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

/* Abbreviations a voter writes and the Census city spells out: "Ft
   Lauderdale" is FORT LAUDERDALE, "St Petersburg" SAINT PETERSBURG. Both
   sides go through the same mapping, so "Main St" becoming "main saint"
   changes nothing: only the city phrase is looked for. */
const PLACE_WORDS: Record<string, string> = {
  ft: "fort",
  st: "saint",
  pt: "port",
  mt: "mount",
  n: "north",
  s: "south",
  e: "east",
  w: "west",
};

function placeWords(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .map((w) => PLACE_WORDS[w] ?? w);
  return ` ${words.join(" ")} `;
}

export function parseAddressMatches(
  json: unknown,
  typed: string
): AddressMatch | null {
  const parsed = addressSchema.safeParse(json);
  if (!parsed.success) return null;
  const florida = parsed.data.result.addressMatches.flatMap((m) => {
    const block = m.geographies["Census Blocks"][0];
    /* The same 15-digit rule as parseBlockResponse, and Florida only. */
    if (!block || !/^\d{15}$/.test(block.GEOID) || block.STATE !== "12") {
      return [];
    }
    return [
      {
        block: { geoid: block.GEOID, state: block.STATE },
        city: m.addressComponents?.city ?? "",
        zip: m.addressComponents?.zip ?? "",
      },
    ];
  });
  if (florida.length === 0) return { kind: "none" };

  const said = placeWords(typed);
  const named = florida.filter(
    (m) =>
      (/^\d{5}$/.test(m.zip) && said.includes(` ${m.zip} `)) ||
      (m.city.trim() !== "" && said.includes(placeWords(m.city)))
  );
  if (named.length === 0) return { kind: "needsPlace" };
  if (new Set(named.map((m) => m.block.geoid)).size > 1) {
    return { kind: "ambiguous" };
  }
  return { kind: "match", block: named[0].block };
}

/* What goes to Census. ", FL" is added unless the voter already named the
   state or ended with a ZIP, so a Florida street is looked for in Florida
   first ("601 E Kennedy Blvd, Tampa" has a Tampa elsewhere too). A
   leading five-digit number is a house number, not a ZIP, which is why
   only a trailing one counts. */
export function censusAddressQuery(typed: string): string {
  const text = typed.trim().replace(/\s+/g, " ");
  if (/\b(?:fl|fla|florida)\b/i.test(text) || /\b\d{5}(?:-\d{4})?$/.test(text)) {
    return text;
  }
  return `${text}, FL`;
}

/* The client and the route both ask this before anything is sent: an
   address Census can place has a house number and a street name. */
export function looksLikeStreetAddress(typed: string): boolean {
  const text = typed.trim();
  return text.length >= 5 && /\d/.test(text) && /[a-z]/i.test(text);
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
