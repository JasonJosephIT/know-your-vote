import "server-only";
import { parseBlockResponse, type CensusBlock } from "@/lib/address-lookup";

/* Coordinate -> 2020 census block, from the US Census Geocoder.

   Only a coordinate goes out: no street address, no ZIP, no identifier. That is
   the whole reason the resolve route asks Google for `location` and nothing else
   (spec §8).

   The geocoder's own congressional layer is deliberately NOT used. It answers
   with the map Census has loaded -- a Miami address still comes back "116th
   Congressional District 27" -- while the November 2026 general runs on the plan
   enacted by HB 1-D. District comes from block_district instead.

   layers=Census Blocks keeps the response to a single geography, about 850 bytes
   instead of a dozen unrelated layers. */

const ENDPOINT =
  "https://geocoding.geo.census.gov/geocoder/geographies/coordinates";

export async function blockForCoordinates(
  lat: number,
  lng: number
): Promise<CensusBlock | null> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("x", String(lng));
  url.searchParams.set("y", String(lat));
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("vintage", "Census2020_Current");
  url.searchParams.set("layers", "Census Blocks");
  url.searchParams.set("format", "json");

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    return parseBlockResponse(await res.json());
  } catch {
    /* Timeout or transport failure. The caller degrades to the district picker;
       nothing is logged, because a thrown message can carry the URL and the URL
       carries a coordinate. */
    return null;
  }
}
