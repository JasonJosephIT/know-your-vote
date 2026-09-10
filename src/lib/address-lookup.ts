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

export interface PlaceLocation {
  lat: number;
  lng: number;
}

export interface AddressSuggestion {
  placeId: string;
  text: string;
  secondary: string | null;
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
            text: z.object({ text: z.string() }),
            structuredFormat: z
              .object({
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
  return parsed.data.suggestions.flatMap((s) => {
    /* Query predictions carry no placePrediction. They are search strings, not
       addresses, and cannot be resolved to a block. */
    if (!s.placePrediction) return [];
    return [
      {
        placeId: s.placePrediction.placeId,
        text: s.placePrediction.text.text,
        secondary:
          s.placePrediction.structuredFormat?.secondaryText?.text ?? null,
      },
    ];
  });
}

const detailsSchema = z.object({
  location: z
    .object({ latitude: z.number(), longitude: z.number() })
    .optional(),
});

export function parsePlaceLocation(json: unknown): PlaceLocation | null {
  const parsed = detailsSchema.safeParse(json);
  if (!parsed.success || !parsed.data.location) return null;
  return {
    lat: parsed.data.location.latitude,
    lng: parsed.data.location.longitude,
  };
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
