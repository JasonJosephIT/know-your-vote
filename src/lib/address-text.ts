/* Text rules for a typed street address, with no zod and no I/O.

   LocationEntry imports looksLikeStreetAddress from here. Importing it from
   address-lookup.ts put all of zod (about 69 KB gzipped) into the JavaScript
   of every page with the field (review 2026-10-12), so the text rules live
   apart from the response schemas.

   The rest is what parseAddressMatches (address-lookup.ts) uses to decide
   whether a Census match is the address the voter typed. Census's one-line
   geocoder corrects as it matches: "6000 SW 7th Ave, Miami" comes back as
   6000 NW 7TH AVE (Liberty City, another district), "North Miami" as MIAMI,
   "18605 NW 27th St" as NW 27TH AVE, all as single confident matches with no
   quality score. So a match is kept only when the voter's own words agree
   with it: the place (city or ZIP), the house number, the street's
   directions, its type and its name. Anything else is asked about, never
   guessed. */

/* An address Census can place has a house number and a street name. */
export function looksLikeStreetAddress(typed: string): boolean {
  const text = typed.trim();
  return text.length >= 5 && /\d/.test(text) && /[a-z]/i.test(text);
}

/* What goes to Census. ", FL" is added unless the voter already named the
   state or ended with a ZIP, so a Florida street is looked for in Florida
   ("601 E Kennedy Blvd, Tampa" has a Tampa elsewhere too). A leading
   five-digit number is a house number, not a ZIP, which is why only a
   trailing one counts. */
export function censusAddressQuery(typed: string): string {
  const text = typed.trim().replace(/\s+/g, " ");
  if (/\b(?:fl|fla|florida)\b/i.test(text) || /\b\d{5}(?:-\d{4})?$/.test(text)) {
    return text;
  }
  return `${text}, FL`;
}

const DIRECTIONS: Record<string, string> = {
  n: "north",
  s: "south",
  e: "east",
  w: "west",
  ne: "northeast",
  nw: "northwest",
  se: "southeast",
  sw: "southwest",
  north: "north",
  south: "south",
  east: "east",
  west: "west",
  northeast: "northeast",
  northwest: "northwest",
  southeast: "southeast",
  southwest: "southwest",
};

/* Street types, by their USPS abbreviation (what Census returns) and the
   word a voter might type instead. */
const STREET_TYPES: Record<string, string> = {
  aly: "alley", alley: "alley",
  ave: "avenue", av: "avenue", avenue: "avenue",
  bnd: "bend", bend: "bend",
  blvd: "boulevard", boulevard: "boulevard",
  cir: "circle", circle: "circle",
  ct: "court", court: "court",
  cv: "cove", cove: "cove",
  cres: "crescent", crescent: "crescent",
  cswy: "causeway", causeway: "causeway",
  dr: "drive", drive: "drive",
  expy: "expressway", expressway: "expressway",
  hwy: "highway", highway: "highway",
  ln: "lane", lane: "lane",
  loop: "loop",
  pass: "pass",
  path: "path",
  pkwy: "parkway", parkway: "parkway",
  pl: "place", place: "place",
  plz: "plaza", plaza: "plaza",
  pt: "point", point: "point",
  rd: "road", road: "road",
  row: "row",
  run: "run",
  sq: "square", square: "square",
  st: "street", str: "street", street: "street",
  ter: "terrace", terr: "terrace", terrace: "terrace",
  trce: "trace", trace: "trace",
  trl: "trail", trail: "trail",
  walk: "walk",
  way: "way",
  xing: "crossing", crossing: "crossing",
};

/* Where an apartment or suite starts: nothing after it is street. */
const UNIT_WORDS = new Set([
  "apt", "apartment", "unit", "ste", "suite", "lot", "bldg", "building",
  "rm", "room", "trlr", "spc", "space",
]);

const STATE_WORDS = new Set(["fl", "fla", "florida"]);

/* Abbreviations a voter writes and the Census city spells out: "Ft
   Lauderdale" is FORT LAUDERDALE, "St Petersburg" SAINT PETERSBURG. */
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

const words = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/#/g, " unit ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

const placeWords = (tokens: string[]): string =>
  tokens.map((w) => PLACE_WORDS[w] ?? w).join(" ");

/* "7th" and "7" are the same street; Census writes the ordinal. */
const streetWord = (w: string): string =>
  DIRECTIONS[w] ?? STREET_TYPES[w] ?? w.replace(/^(\d+)(?:st|nd|rd|th)$/, "$1");

const isDirection = (w: string) => w in DIRECTIONS;

/* The typed text split into the street and what follows it. Commas are the
   voter's own boundaries: "444 SW 2nd Ave, Miami, FL 33130" is a street, a
   place, a state and a ZIP. A trailing state and ZIP are taken off first. */
interface Typed {
  street: string[];
  /* The last comma segment, or null when there is no comma ("601 E
     Kennedy Blvd Tampa": the place, if any, ends the street). */
  place: string[] | null;
  zip: string | null;
}

function splitTyped(typed: string): Typed {
  const segments = typed.split(",").map(words).filter((s) => s.length > 0);
  let zip: string | null = null;
  for (;;) {
    const last = segments[segments.length - 1];
    if (!last) break;
    const tail = last[last.length - 1];
    /* The first token of the first segment is the house number, never a
       ZIP or a state. */
    if (segments.length === 1 && last.length === 1) break;
    if (/^\d{4}$/.test(tail) && /^\d{5}$/.test(last[last.length - 2] ?? "")) {
      last.pop();
    } else if (/^\d{5}$/.test(tail)) {
      zip ??= tail;
      last.pop();
    } else if (STATE_WORDS.has(tail)) {
      last.pop();
    } else {
      break;
    }
    if (last.length === 0) segments.pop();
  }
  /* The place is the last segment: one between it and the street is an
     apartment or suite ("123 Main St, Apt 4, Tampa"). */
  return {
    street: segments[0] ?? [],
    place: segments.length > 1 ? segments[segments.length - 1] : null,
    zip,
  };
}

/* The parts of a Census match the comparison needs. */
export interface MatchedStreet {
  matchedAddress: string;
  preDirection: string;
  streetName: string;
  suffixType: string;
  suffixDirection: string;
  city: string;
  zip: string;
}

/* Does the place the voter named (city or ZIP) belong to this match? If so,
   the street words that remain once the place is taken off; if not, null.

   The city must be the whole place, not a part of it: "North Miami" does not
   name MIAMI, and "North Miami Beach" does not name MIAMI BEACH, though
   Census matches both that way. */
export function streetIfPlaceNamed(
  typed: string,
  match: Pick<MatchedStreet, "city" | "zip">
): string[] | null {
  const { street, place, zip } = splitTyped(typed);
  const city = placeWords(words(match.city));
  const zipNamed = zip !== null && zip === match.zip;
  if (place !== null) {
    return zipNamed || (city !== "" && placeWords(place) === city)
      ? street
      : null;
  }
  /* No comma: the city, if typed, ends the street. */
  const cityTokens = city === "" ? [] : city.split(" ");
  const n = cityTokens.length;
  const tail = placeWords(street.slice(-n));
  const before = street[street.length - n - 1];
  const endsWithCity =
    n > 0 &&
    street.length > n + 1 &&
    tail === city &&
    !(before !== undefined && isDirection(before) && !/^(?:ne|nw|se|sw)$/.test(before));
  if (endsWithCity) return street.slice(0, street.length - n);
  return zipNamed ? street : null;
}

/* Is the typed street this match's street? The house number, the set of
   directions (wherever they sit: Census puts Miami-Dade's quadrant inside
   streetName, "NW 7TH", and Tampa's after it, "TAMPA ST N"), the street
   type, and at least one word of the name must all agree. */
export function sameStreet(street: string[], match: MatchedStreet): boolean {
  const unitAt = street.findIndex((w, i) => i > 0 && UNIT_WORDS.has(w));
  const own = unitAt > 0 ? street.slice(0, unitAt) : street;
  const [number, ...rest] = own;
  const matchedNumber = words(match.matchedAddress)[0];
  if (!number || !/^\d+[a-z]?$/.test(number) || number !== matchedNumber) {
    return false;
  }
  const typedWords = rest.map(streetWord);

  const matchedParts = [match.preDirection, match.streetName, match.suffixDirection]
    .flatMap(words)
    .map(streetWord);
  const directions = (ws: string[]) =>
    [...new Set(ws.filter((w) => Object.values(DIRECTIONS).includes(w)))].sort().join(" ");
  if (directions(typedWords) !== directions(matchedParts)) return false;

  const type = words(match.suffixType).map(streetWord)[0];
  if (type) {
    const typedTypes = typedWords.filter((w) => Object.values(STREET_TYPES).includes(w));
    if (typedTypes[typedTypes.length - 1] !== type) return false;
  }

  const name = words(match.streetName)
    .map(streetWord)
    .filter((w) => !Object.values(DIRECTIONS).includes(w));
  return name.length === 0 || name.some((w) => typedWords.includes(w));
}

/* A trailing state that is not Florida: "…, Washington, DC 20500". Census
   found the address, in another state, so the answer is "not in Florida",
   not "not found". Only a state Census itself matched counts, so a street
   word that happens to spell a state code doesn't. */
export function namesOtherState(typed: string, matchedStates: string[]): boolean {
  const tokens = words(typed);
  while (/^\d{4,5}$/.test(tokens[tokens.length - 1] ?? "")) tokens.pop();
  const last = tokens[tokens.length - 1];
  return (
    last !== undefined &&
    !STATE_WORDS.has(last) &&
    matchedStates.some((s) => s.toLowerCase() === last)
  );
}
