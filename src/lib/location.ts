/* Device-local location memory (no accounts — PRD § 9). */

export interface StoredLocation {
  zip?: string;
  county: string;
  district?: string;
  metro?: string | null;
}

const KEY = "kyv.location";

/* readLocation doubles as a useSyncExternalStore getSnapshot, which requires
   a referentially stable result while the stored value is unchanged — hence
   the raw-string cache. Callers must not mutate the returned object. */
let cache: { raw: string; location: StoredLocation } | null = null;

export function readLocation(): StoredLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return null;
    if (!cache || cache.raw !== raw) {
      cache = { raw, location: JSON.parse(raw) as StoredLocation };
    }
    return cache.location;
  } catch {
    return null;
  }
}

export function writeLocation(location: StoredLocation) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(location));
  } catch {
    /* Private-mode storage failures are fine — the URL still carries it. */
  }
}

export function clearLocation() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function locationQuery(location: StoredLocation): string {
  const params = new URLSearchParams();
  if (location.zip) params.set("zip", location.zip);
  if (location.district) params.set("district", location.district);
  if (!location.zip && location.county) params.set("county", location.county);
  return params.toString();
}
