import "server-only";
import { censusAddressQuery } from "@/lib/address-text";
import {
  parseAddressMatches,
  parseBlockResponse,
  type AddressMatch,
  type CensusBlock,
} from "@/lib/address-lookup";

/* Coordinate or typed address -> 2020 census block, from the US Census
   Geocoder.

   Two ways in. With Pelias configured, the voter picks a suggestion and only
   its coordinate goes out: no street address, no ZIP, no identifier
   (blockForCoordinates). Without Pelias, which is production since
   2026-10-12, the voter types the whole address and that text goes to
   Census, which matches it and answers the block in the same call
   (blockForAddress). Either way the request comes from our server, so
   Census never sees the voter's IP address, and nothing else travels with
   it.

   The geocoder's own congressional layer is deliberately NOT used. It answers
   with the map Census has loaded -- a Miami address still comes back "116th
   Congressional District 27" -- while the November 2026 general runs on the plan
   enacted by HB 1-D. District comes from block_district instead.

   layers=Census Blocks keeps the response to a single geography, about 850 bytes
   instead of a dozen unrelated layers. */

const GEOGRAPHIES = "https://geocoding.geo.census.gov/geocoder/geographies";

function censusUrl(path: string): URL {
  const url = new URL(`${GEOGRAPHIES}/${path}`);
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("vintage", "Census2020_Current");
  url.searchParams.set("layers", "Census Blocks");
  url.searchParams.set("format", "json");
  return url;
}

export async function blockForCoordinates(
  lat: number,
  lng: number
): Promise<CensusBlock | null> {
  const url = censusUrl("coordinates");
  url.searchParams.set("x", String(lng));
  url.searchParams.set("y", String(lat));

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

/* null is "Census could not be asked" (timeout, transport, a 5xx, a shape we
   don't know), which is ours to report; every AddressMatch is an answer
   about what the voter typed. Matching takes about half a second (measured
   2026-10-12), so the timeout is longer than the coordinate one's. */
export async function blockForAddress(
  typed: string
): Promise<AddressMatch | null> {
  const url = censusUrl("onelineaddress");
  url.searchParams.set("address", censusAddressQuery(typed));

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      /* Not cached, said rather than assumed: the URL holds a home
         address, and a cached response would keep it. */
      cache: "no-store",
    });
    if (!res.ok) return null;
    return parseAddressMatches(await res.json(), typed);
  } catch {
    /* Never logged: the URL carries the address. */
    return null;
  }
}
