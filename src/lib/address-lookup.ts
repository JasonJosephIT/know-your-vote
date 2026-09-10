import { z } from "zod";

/* The address -> district path, minus the I/O.

   Pure on purpose: no network, no database, no framework, no `server-only`.
   scripts/verify-address-resolve.ts drives it directly under plain node, which
   it cannot do for a module that imports `server-only` or an @/-aliased value.
   src/lib/news-match.ts is arranged the same way and for the same reason.

   Two response shapes and one lookup live here. The fetching lives in
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
