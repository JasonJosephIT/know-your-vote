import "server-only";
import {
  parseAddressMatches,
  parsePlaceLocation,
  parseSuggestions,
  type AddressMatch,
  type AddressSuggestion,
  type Point,
} from "@/lib/address-lookup";
import { addressQuery } from "@/lib/address-text";

/* Google Maps Platform, reached only from the server: Places (New)
   autocomplete and details, and the Geocoding API.

   Google replaced the Census Bureau's one-line geocoder (2026-10-14), which
   refused too many real addresses ("We couldn't match that address") for
   small differences in how they were typed. Census still answers the census
   block, from the point only (census-block.ts blockForCoordinates).

   The key never goes to the browser: a referrer-restricted browser key is
   readable from any page's source, and proxying also keeps the voter's IP
   out of Google's logs. The typed text transits our server -- it lives in
   memory for one request, is passed straight on, and is never logged or
   stored.

   Two ways in, both sending Google the text the voter typed:
   - suggestAddresses then placeLocation: the voter picks a suggestion, and
     Details asks for `location` and nothing else (the Essentials SKU). One
     session token threads both, so they bill as one session.
   - geocodeAddress: the voter pressed Enter without picking. */

const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const DETAILS_URL = "https://places.googleapis.com/v1/places";
const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

const AUTOCOMPLETE_MASK =
  "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat";

/* Florida's bounding box. A restriction for suggestions (a Florida voter
   guide has no use for a Georgia address), but only a bias for geocoding,
   so an address the voter put in another state is found there and the
   field can say so. */
const FLORIDA = {
  low: { latitude: 24.3963, longitude: -87.6349 },
  high: { latitude: 31.0011, longitude: -79.9743 },
};

function apiKey(): string | null {
  return process.env.GOOGLE_MAPS_API_KEY?.trim() || null;
}

/* Whether the location field takes a street address at all. On by default:
   ADDRESS_LOOKUP_OFF (any value) is the kill switch, and so is a missing
   GOOGLE_MAPS_API_KEY, since nothing could match the address. Off, there is
   no field, only the district picker; both address routes refuse, and
   /privacy says nothing the voter chooses leaves the site. */
export function addressEntryEnabled(): boolean {
  return !process.env.ADDRESS_LOOKUP_OFF?.trim() && apiKey() !== null;
}

/* Whether the field suggests addresses as the voter types. The same switch
   as the field itself: one key covers both. */
export function geocoderConfigured(): boolean {
  return addressEntryEnabled();
}

export async function suggestAddresses(
  input: string,
  sessionToken: string
): Promise<AddressSuggestion[]> {
  const key = apiKey();
  if (!key) return [];
  try {
    const res = await fetch(AUTOCOMPLETE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": AUTOCOMPLETE_MASK,
      },
      body: JSON.stringify({
        input,
        sessionToken,
        /* Addresses only. A street or city resolves to a centroid, and a
           centroid can sit in a different district than the house does. */
        includedPrimaryTypes: ["street_address", "premise", "subpremise"],
        includedRegionCodes: ["us"],
        locationRestriction: { rectangle: FLORIDA },
        languageCode: "en",
      }),
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return [];
    return parseSuggestions(await res.json());
  } catch {
    /* Never logged: the request body is a partial home address. */
    return [];
  }
}

export async function placeLocation(
  placeId: string,
  sessionToken: string
): Promise<Point | null> {
  const key = apiKey();
  if (!key) return null;
  const url = new URL(`${DETAILS_URL}/${encodeURIComponent(placeId)}`);
  url.searchParams.set("sessionToken", sessionToken);
  try {
    const res = await fetch(url, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "location" },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    return parsePlaceLocation(await res.json());
  } catch {
    return null;
  }
}

/* null is "Google could not be asked" (timeout, transport, a refused key, a
   shape we don't know), which is ours to report; every AddressMatch is an
   answer about what the voter typed. Geocoding is a GET, so the address is
   in the outbound URL: never logged, never cached. */
export async function geocodeAddress(
  typed: string
): Promise<AddressMatch | null> {
  const key = apiKey();
  if (!key) return null;
  const url = new URL(GEOCODE_URL);
  url.searchParams.set("address", addressQuery(typed));
  url.searchParams.set("components", "country:US");
  url.searchParams.set(
    "bounds",
    `${FLORIDA.low.latitude},${FLORIDA.low.longitude}|${FLORIDA.high.latitude},${FLORIDA.high.longitude}`
  );
  url.searchParams.set("key", key);
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return parseAddressMatches(await res.json(), typed);
  } catch {
    /* Never logged: the URL carries the address and the key. */
    return null;
  }
}
