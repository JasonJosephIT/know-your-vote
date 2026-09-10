import "server-only";
import {
  parseSuggestions,
  parsePlaceLocation,
  type AddressSuggestion,
  type PlaceLocation,
} from "@/lib/address-lookup";

/* Google Places (New), reached only from the server.

   The key never goes to the browser: a referrer-restricted browser key is
   readable from any page's source, and proxying also keeps the voter's IP out of
   Google's logs. The trade-off, stated plainly in the spec §8, is that the typed
   fragment transits our server -- it lives in memory for one request, is passed
   straight back, and is never logged or stored.

   Details asks for `location` and nothing else. Not formattedAddress, not
   addressComponents: we do not need the address, so we do not receive it. That
   also keeps the call in the Place Details Essentials SKU. */

const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const DETAILS_URL = "https://places.googleapis.com/v1/places";

const AUTOCOMPLETE_MASK =
  "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat";

/* Florida's bounding box. Restriction, not bias: a Florida voter guide has no
   use for a Georgia address, and a suggestion we never ask for is one we never
   pay for. */
const FLORIDA = {
  rectangle: {
    low: { latitude: 24.3963, longitude: -87.6349 },
    high: { latitude: 31.0011, longitude: -79.9743 },
  },
};

export function placesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

export async function suggestAddresses(
  input: string,
  sessionToken: string
): Promise<AddressSuggestion[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
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
        includedPrimaryTypes: ["street_address", "premise", "subpremise"],
        includedRegionCodes: ["us"],
        locationRestriction: FLORIDA,
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
): Promise<PlaceLocation | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
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
