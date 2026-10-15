/* Text rules for a typed street address, with no zod and no I/O.

   LocationEntry imports looksLikeStreetAddress from here. Importing it from
   address-lookup.ts put all of zod (about 69 KB gzipped) into the JavaScript
   of every page with the field (review 2026-10-12), so the text rules live
   apart from the response schemas.

   The rest is what parseAddressMatches (address-lookup.ts) uses to decide
   whether a geocoder's match is the address the voter typed. Geocoders
   correct as they match (Google flags it only as partial_match), and the
   Census one-line geocoder we used before Google showed how far: "6000 SW 7th Ave, Miami" comes back as
   6000 NW 7TH AVE (Liberty City, another district), "North Miami" as MIAMI,
   "18605 NW 27th St" as NW 27TH AVE, all as single confident matches with no
   quality score. So a match is kept only when the voter's own words agree
   with it: the place (city or ZIP), the house number, the street's
   directions, its type and its name. Anything else is asked about, never
   guessed. */

/* An address a geocoder can place has a house number and a street name. */
export function looksLikeStreetAddress(typed: string): boolean {
  const text = typed.trim();
  return text.length >= 5 && /\d/.test(text) && /[a-z]/i.test(text);
}

/* What goes to the geocoder. ", FL" is added unless the voter already named the
   state or ended with a ZIP, so a Florida street is looked for in Florida
   ("601 E Kennedy Blvd, Tampa" has a Tampa elsewhere too). A leading
   five-digit number is a house number, not a ZIP, which is why only a
   trailing one counts. */
export function addressQuery(typed: string): string {
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
  /* Alternates USPS Publication 28 accepts, and the types Census returns
     for Florida's subdivision streets (review 2026-10-12: "N America Wy",
     "George J Bean Pky" were refused). */
  wy: "way",
  pky: "parkway", pkway: "parkway", parkwy: "parkway",
  ctr: "center", center: "center",
  crk: "creek", creek: "creek",
  gln: "glen", glen: "glen",
  grv: "grove", grove: "grove",
  hl: "hill", hill: "hill",
  holw: "hollow", hollow: "hollow",
  hts: "heights", heights: "heights",
  isle: "isle",
  lndg: "landing", landing: "landing",
  mnr: "manor", manor: "manor",
  park: "park",
  rdg: "ridge", ridge: "ridge",
  vw: "view", view: "view",
  vis: "vista", vista: "vista",
};

/* "Tr" is TRL to some voters and TER to others, so it counts as either
   only when Census's own type is one of the two. */
const TRAIL_OR_TERRACE = new Set(["trail", "terrace"]);

/* Spelled ordinals ("Eighth Street South" in Naples, "SW Eighth St" for
   Calle Ocho) are the number Census writes (8TH). "Twenty-First" is 21,
   never 1: an ordinal after another number word that isn't a tens word
   ("One Hundred First") is left as typed, so it matches nothing and is
   asked about. */
const ORDINAL_WORDS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7,
  eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13,
  fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17,
  eighteenth: 18, nineteenth: 19, twentieth: 20, thirtieth: 30,
  fortieth: 40, fiftieth: 50, sixtieth: 60, seventieth: 70, eightieth: 80,
  ninetieth: 90,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
};
const NUMBER_WORDS = new Set([
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "hundred", "thousand", ...Object.keys(TENS),
]);

function spelledOrdinals(ws: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i];
    const next = ORDINAL_WORDS[ws[i + 1]];
    if (w in TENS && next !== undefined && next < 10) {
      out.push(String(TENS[w] + next));
      i++;
    } else if (w in ORDINAL_WORDS && !NUMBER_WORDS.has(ws[i - 1] ?? "")) {
      out.push(String(ORDINAL_WORDS[w]));
    } else {
      out.push(w);
    }
  }
  return out;
}

/* "N W" and "North West" typed as two words are the quadrant NW. Joined on
   the typed side only, as a second way to agree: Census's own parts are
   never joined, so its S WEST SHORE stays south plus a name. */
const QUADRANTS: Record<string, string> = {
  "north east": "northeast",
  "north west": "northwest",
  "south east": "southeast",
  "south west": "southwest",
};
const joinQuadrants = (ws: string[]): string[] =>
  ws.reduce<string[]>((out, w) => {
    const q = QUADRANTS[`${out[out.length - 1]} ${w}`];
    if (q) out[out.length - 1] = q;
    else out.push(w);
    return out;
  }, []);

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

/* Dotted single letters are one word: "N.W." is NW, "U.S." is US (which
   split apart would read as north-west and south). "N. W." with a space
   stays two words, which joinQuadrants handles on the typed side. */
const words = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/#/g, " unit ")
    .replace(/\b([a-z])\.(?=[a-z]\b)/g, "$1")
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

/* Trailing words that are never the place: a country ("…, USA", what map
   apps add when an address is copied), a state, a ZIP or ZIP+4, and a ZIP
   run into the state ("FL33128"). */
function stripTail(last: string[]): { zip: string | null } | null {
  const tail = last[last.length - 1];
  const joined = /^(?:fl|fla|florida)(\d{5})$/.exec(tail);
  if (/^\d{4}$/.test(tail) && /^\d{5}$/.test(last[last.length - 2] ?? "")) {
    last.pop();
  } else if (/^\d{5}$/.test(tail) || joined) {
    last.pop();
    return { zip: joined ? joined[1] : tail };
  } else if (tail === "usa" || tail === "us") {
    last.pop();
  } else if (last.slice(-4).join(" ") === "united states of america") {
    last.splice(-4);
  } else if (last.slice(-2).join(" ") === "united states") {
    last.splice(-2);
  } else if (STATE_WORDS.has(tail)) {
    last.pop();
  } else {
    return null;
  }
  return { zip: null };
}

function splitTyped(typed: string): Typed {
  const segments = typed.split(",").map(words).filter((s) => s.length > 0);
  /* A unit typed after the ZIP ("…, FL 33128, Suite 2220") is not the
     place. */
  while (segments.length > 1 && UNIT_WORDS.has(segments[segments.length - 1][0])) {
    segments.pop();
  }
  let zip: string | null = null;
  for (;;) {
    const last = segments[segments.length - 1];
    if (!last) break;
    /* The first token of the first segment is the house number, never a
       ZIP or a state. */
    if (segments.length === 1 && last.length === 1) break;
    const stripped = stripTail(last);
    if (!stripped) break;
    zip ??= stripped.zip;
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

/* The parts of a geocoder's match the comparison needs. */
export interface MatchedStreet {
  matchedAddress: string;
  preDirection: string;
  streetName: string;
  suffixType: string;
  suffixDirection: string;
  city: string;
  zip: string;
}

/* Google's route in those parts. Its short name is USPS style ("SW 2nd
   Ave", "Tampa St N"): a trailing direction comes off first, then the
   street type. The type is a word we know, or one Google shortened (long
   "Palm Estates", short "Palm Ests"), which is how a type we don't list
   still counts as one. A leading direction is the pre-direction, so "N
   West Shore Blvd" keeps WEST SHORE whole for sameStreet's run-together
   rule ("Westshore"). */
export function routeParts(
  short: string,
  long: string
): Pick<MatchedStreet, "preDirection" | "streetName" | "suffixType" | "suffixDirection"> {
  const ws = words(short);
  const longWords = words(long);
  const suffixDirection = ws.length > 1 && isDirection(ws[ws.length - 1]) ? ws.pop()! : "";
  if (suffixDirection) longWords.pop();
  const last = ws[ws.length - 1];
  const suffixType =
    ws.length > 1 && (last in STREET_TYPES || last !== longWords[longWords.length - 1])
      ? ws.pop()!
      : "";
  const preDirection = ws.length > 1 && isDirection(ws[0]) ? ws.shift()! : "";
  return { preDirection, streetName: ws.join(" "), suffixType, suffixDirection };
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
  /* The ZIP is the voter's word too. When they typed one and it is not
     Census's, the city alone does not place the match (review 2026-10-12):
     Broward's beach cities restart the street grid, so "600 NE 13th Ave,
     Fort Lauderdale, FL 33060" matched Fort Lauderdale's copy of the
     street (33304, FL-20) while 33060 is Pompano Beach's (FL-25), and
     "1611 SW 12th Ave, Miami, FL 33136" matched the SW street in 33129. */
  const zipDisagrees = zip !== null && match.zip !== "" && !zipNamed;
  if (place !== null) {
    return zipNamed ||
      (!zipDisagrees && city !== "" && placeWords(place) === city)
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
  if (endsWithCity && !zipDisagrees) return street.slice(0, street.length - n);
  return zipNamed ? street : null;
}

/* The ZIP the voter typed, if any: when no match names their place and
   they gave one, their own city and ZIP disagree with what Census found,
   which needs different words than "add your ZIP". */
export function typedZip(typed: string): string | null {
  return splitTyped(typed).zip;
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
  /* "Westshore" is Census's WEST SHORE: a typed word that is the whole
     street name run together reads as the name's own words, exactly as if
     the voter had typed the space. An exact match of the whole name, never
     a part of one. */
  const nameWords = spelledOrdinals(words(match.streetName)).map(streetWord);
  const joinedName = nameWords.join("");
  const typedWords = spelledOrdinals(rest)
    .map(streetWord)
    .flatMap((w) => (nameWords.length > 1 && w === joinedName ? nameWords : [w]));

  const matchedParts = [match.preDirection, match.streetName, match.suffixDirection]
    .flatMap(words)
    .map(streetWord);
  const directions = (ws: string[]) =>
    [...new Set(ws.filter((w) => Object.values(DIRECTIONS).includes(w)))].sort().join(" ");
  const matchedDirections = directions(matchedParts);
  if (
    directions(typedWords) !== matchedDirections &&
    directions(joinQuadrants(typedWords)) !== matchedDirections
  ) {
    return false;
  }

  const type = words(match.suffixType).map(streetWord)[0];
  if (type) {
    /* A typed word counts as a type when it is one we know, or Census's
       own type; the last one typed must be Census's. "Tr" is either TRL
       or TER, so it is Census's when Census's is one of those. */
    const typedTypes = typedWords
      .map((w) => (w === "tr" && TRAIL_OR_TERRACE.has(type) ? type : w))
      .filter((w) => w === type || Object.values(STREET_TYPES).includes(w));
    if (typedTypes[typedTypes.length - 1] !== type) return false;
  }

  const name = nameWords.filter((w) => !Object.values(DIRECTIONS).includes(w));
  return name.length === 0 || name.some((w) => typedWords.includes(w));
}

/* A trailing state that is not Florida: "…, Washington, DC 20500". Census
   found the address, in another state, so the answer is "not in Florida",
   not "not found". Only a state Census itself matched counts, so a street
   word that happens to spell a state code doesn't. */
export function namesOtherState(typed: string, matchedStates: string[]): boolean {
  const tokens = words(typed);
  for (;;) {
    const tail = tokens[tokens.length - 1] ?? "";
    if (/^\d{4,5}$/.test(tail) || tail === "usa") tokens.pop();
    else if (tokens.slice(-2).join(" ") === "united states") tokens.splice(-2);
    else break;
  }
  const last = tokens[tokens.length - 1];
  return (
    last !== undefined &&
    !STATE_WORDS.has(last) &&
    matchedStates.some((s) => s.toLowerCase() === last)
  );
}
