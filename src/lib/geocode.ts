import "server-only";
import { parseSuggestions, type AddressSuggestion } from "@/lib/address-lookup";

/* Pelias (https://pelias.io), reached only from the server.

   Pelias replaced Google Places, and the reason is structural rather than
   ideological: `/v1/autocomplete` returns the coordinate *with* each
   suggestion, so picking an address needs no second call. The Google path was
   autocomplete -> place details -> coordinate, with a session token threaded
   through both to make the billing work. That entire step is gone.

   WHERE IT RUNS IS CONFIGURATION, NOT CODE. `PELIAS_BASE_URL` points either at
   an instance we host -- in which case no third party ever sees a voter's
   address -- or at Geocode Earth, the hosted Pelias run by its maintainers, in
   which case a geocoding company does. The API is identical; only the privacy
   claim differs, which is why the privacy page reads the configured host rather
   than asserting one (see `geocoderHost`).

   Unlike the Google client this one issues a GET, because that is the only
   shape Pelias offers. The typed fragment is therefore in the URL of the
   OUTBOUND request. Inbound from the browser it stays a POST, so it never
   reaches our own access log, Referer or history. */

/* Florida's bounding box. Restriction, not bias: a Florida voter guide has no
   use for a Georgia address. */
const FLORIDA_RECT = {
  "boundary.rect.min_lat": "24.3963",
  "boundary.rect.max_lat": "31.0011",
  "boundary.rect.min_lon": "-87.6349",
  "boundary.rect.max_lon": "-79.9743",
};

function baseUrl(): string | null {
  const raw = process.env.PELIAS_BASE_URL?.trim();
  return raw ? raw.replace(/\/+$/, "") : null;
}

export function geocoderConfigured(): boolean {
  return baseUrl() !== null;
}

/* The privacy page states who sees an address, and that is a deployment fact,
   not a constant. Returning the host keeps the page honest across both
   deployments without anyone remembering to edit prose. */
export function geocoderHost(): string | null {
  const base = baseUrl();
  if (!base) return null;
  try {
    return new URL(base).host;
  } catch {
    return null;
  }
}

export async function suggestAddresses(
  input: string
): Promise<AddressSuggestion[]> {
  const base = baseUrl();
  if (!base) return [];

  const url = new URL(`${base}/v1/autocomplete`);
  url.searchParams.set("text", input);
  url.searchParams.set("boundary.country", "USA");
  /* Addresses only. A street or locality result would resolve to a centroid,
     and a centroid can sit in a different district than the house does. */
  url.searchParams.set("layers", "address");
  url.searchParams.set("size", "5");
  for (const [k, v] of Object.entries(FLORIDA_RECT)) url.searchParams.set(k, v);
  /* Geocode Earth authenticates by query parameter; a self-hosted instance
     usually needs nothing, so an absent key is normal rather than an error. */
  const key = process.env.PELIAS_API_KEY?.trim();
  if (key) url.searchParams.set("api_key", key);

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return [];
    return parseSuggestions(await res.json());
  } catch {
    /* Never logged: the request carries a partial home address. */
    return [];
  }
}
