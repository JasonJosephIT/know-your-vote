/* The whole cookie contract in one file: name, value shape, parse, write, clear.

   What is stored is a district and the county it sits in -- FL-27|12086 -- and
   nothing else. Not the address, not the ZIP, not a coordinate. A congressional
   district holds roughly 750,000 people: it is a public electoral unit that
   identifies nobody, and it is exactly what the app needs to show a ballot.

   The county travels with it because a district cannot yield one -- districts
   span counties and counties span districts -- and county is what news scoping
   and the county elections-office links key on.

   This reverses part of TASK-070 knowingly. What makes it defensible is that the
   value is written only when the voter asks, is visible in the chrome at all
   times, and is forgettable in one click. See the spec §8.

   No imports, deliberately: the chip parses this in the browser, the ballot
   pages parse it on the server, and verify-no-stored-location.ts parses it under
   plain node. Three readers, one definition. Shape is checked here; whether the
   county is covered is enforced by resolveDistrict, which returns null and so
   produces no ballot from a stale or hand-edited value. */

export const DISTRICT_COOKIE = "kyv.district";
export const DISTRICT_COOKIE_MAX_AGE = 15_552_000; // 180 days

/* The shape is the guarantee. Anything that is not a district and a county FIPS
   cannot be stored here, so a ZIP or an address cannot arrive by accident. */
const VALUE_RE = /^FL-\d{1,2}\|\d{5}$/;

export interface DistrictChoice {
  district: string;
  countyFips: string;
}

export function parseDistrictCookie(
  raw: string | undefined | null
): DistrictChoice | null {
  if (!raw || !VALUE_RE.test(raw)) return null;
  const [district, countyFips] = raw.split("|");
  return { district, countyFips };
}

export function formatDistrictCookie(choice: DistrictChoice): string {
  const value = `${choice.district}|${choice.countyFips}`;
  if (!VALUE_RE.test(value)) {
    throw new Error(
      "refusing to store a value that is not a district and county"
    );
  }
  return value;
}

/* Written client-side. Cookies cannot be set during render, and this needs no
   server round trip: the value is not a secret, and the chip has to be able to
   change or clear it instantly. */
export function writeDistrictCookie(choice: DistrictChoice): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${DISTRICT_COOKIE}=${formatDistrictCookie(choice)}; path=/; max-age=${DISTRICT_COOKIE_MAX_AGE}; samesite=lax${secure}`;
  notify();
}

export function readDistrictCookie(): DistrictChoice | null {
  return parseDistrictCookie(districtCookieSnapshot());
}

export function clearDistrictCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DISTRICT_COOKIE}=; path=/; max-age=0; samesite=lax`;
  notify();
}

/* The chip reads this through useSyncExternalStore, because document.cookie is
   exactly what that hook is for: an external store React does not own. Reading
   it in an effect and calling setState works, but it is the cascading-render
   pattern React 19 lints against, and it cannot express "not known yet" without
   a second state variable.

   Snapshots are strings so they compare by value -- returning a fresh parsed
   object each call would re-render forever. `null` means "server, or not yet
   hydrated", which is how the chip renders nothing rather than flashing "Set
   your district" and then swapping in a district. */

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeDistrictCookie(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The raw cookie value, or "" when absent. Client-only. */
export function districtCookieSnapshot(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )kyv\.district=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

/** On the server nothing is known yet -- deliberately not "absent". */
export function districtCookieServerSnapshot(): null {
  return null;
}
