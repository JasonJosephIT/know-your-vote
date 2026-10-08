/* Guardrail for src/lib/official-sources.ts, the official-source list (spec
   docs/superpowers/specs/2026-10-08-news-source-integrity-design.md §3.2.1, D6).

   What it pins:
     1. The list is exactly the 17 entries D6 recommends, and the hosts D6
        leaves off resolve to nothing.
     2. No official entry matches any outlet, and no outlet matches any
        official entry, so no URL can be both a swept story and an official
        notice.
     3. The four county Supervisor hosts are supervisors.ts's, without `www.`.
     4. The six official_link URLs resolve as §3.2.4 needs, and the Miami-Dade
        county release pages that 0014 and 0042 attribute resolve to nothing.
     5. Publisher strings equal 0014's and 0042's for every page of theirs on
        a listed host.
     6. officialSourceRow has outletSourceRow's shape, and its url_norm is
        brief-rows.ts urlNorm of its url.

   Pure and offline. Run: node scripts/verify-official-sources.ts */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { urlNorm } from "../src/lib/brief-rows.ts";
import { COVERED_FIPS } from "../src/lib/candidate-leads.ts";
import { outletSourceRow } from "../src/lib/news-enqueue.ts";
import { OUTLETS, outletForUrl } from "../src/lib/news-sources.ts";
import {
  OFFICIAL_SOURCES,
  officialForUrl,
  officialSourceIdFor,
  officialSourceRow,
} from "../src/lib/official-sources.ts";
import { supervisorSite } from "../src/lib/supervisors.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

/* ---- 1. the list D6 recommends ------------------------------------------ */
const EXPECTED: Record<string, [publisher: string, countyFips: string | null]> = {
  "dos.fl.gov/elections": ["Florida Dept. of State, Division of Elections", null],
  "dos.elections.myflorida.com": ["Florida Dept. of State, Division of Elections", null],
  "constitutionalinitiatives.dos.fl.gov": ["Florida Dept. of State, Division of Elections", null],
  "files.floridados.gov": ["Florida Dept. of State", null],
  "registertovoteflorida.gov": ["Florida Dept. of State", null],
  "flsenate.gov": ["Florida Senate", null],
  "myfloridahouse.gov": ["Florida House of Representatives", null],
  "flhouse.gov": ["Florida House of Representatives", null],
  "leg.state.fl.us": ["Florida Legislature", null],
  "flcourts.gov": ["Florida State Courts", null],
  "uscourts.gov": ["U.S. Courts", null],
  "votemiamidade.gov": ["Miami-Dade County Supervisor of Elections", "12086"],
  "miamidade.gov/elections": ["Miami-Dade County Supervisor of Elections", "12086"],
  "browardvotes.gov": ["Broward County Supervisor of Elections", "12011"],
  "votehillsborough.gov": ["Hillsborough County Supervisor of Elections", "12057"],
  "voteorangefl.gov": ["Orange County Supervisor of Elections", "12095"],
  "ocfelections.gov": ["Orange County Supervisor of Elections", "12095"],
};
check("the list has 17 entries", OFFICIAL_SOURCES.length === 17, String(OFFICIAL_SOURCES.length));
check("every domain is listed once",
  new Set(OFFICIAL_SOURCES.map((s) => s.domain)).size === OFFICIAL_SOURCES.length);
for (const s of OFFICIAL_SOURCES) {
  const want = EXPECTED[s.domain];
  check(`${s.domain} is one of D6's entries`, want !== undefined);
  if (!want) continue;
  check(`${s.domain} is published as "${want[0]}"`, s.publisher === want[0], s.publisher);
  check(`${s.domain} is scoped to ${want[1] ?? "statewide"}`, s.countyFips === want[1], String(s.countyFips));
  check(`${s.domain}'s county is a covered county`, s.countyFips === null || COVERED_FIPS.has(s.countyFips));
}
for (const url of [
  "https://www.courtlistener.com/opinion/1/x/",
  "https://www.congress.gov/bill/119th-congress/house-bill/1",
  "https://www.flgov.com/2026/10/01/executive-order/",
  "https://apnews.com/article/x",
  "https://ballotpedia.org/Florida_2026_ballot_measures",
  "https://news.ballotpedia.org/2026/06/03/x/",
  "https://justfacts.votesmart.org/x",
  "https://www.politifact.com/x",
  "https://www.factcheck.org/x",
  "https://www.opensecrets.org/x",
  "https://www.dos.fl.gov/cultural/",
  "https://www.miamidade.gov/global/release.page?Mduid_release=rel1",
]) {
  check(`${url} is not an official source (D6 leaves it off)`, officialForUrl(url) === null,
    JSON.stringify(officialForUrl(url)));
}

/* ---- 2. no URL is both an outlet's and an official body's --------------- */
const probes = (domain: string) => [
  `https://${domain}`,
  `https://${domain}/probe`,
  `https://www.${domain}/probe`,
];
for (const s of OFFICIAL_SOURCES) {
  for (const url of probes(s.domain)) {
    check(`official ${s.domain}: ${url} matches no outlet`, outletForUrl(url, OUTLETS) === null,
      outletForUrl(url, OUTLETS)?.domain);
  }
}
for (const o of OUTLETS) {
  for (const url of probes(o.domain)) {
    check(`outlet ${o.domain}: ${url} matches no official entry`, officialForUrl(url) === null,
      officialForUrl(url)?.domain);
  }
}

/* Every entry's own URL resolves to that entry, so no broader entry shadows
   a narrower one. */
for (const s of OFFICIAL_SOURCES) {
  for (const url of probes(s.domain)) {
    check(`${url} resolves to ${s.domain}`, officialForUrl(url)?.domain === s.domain, officialForUrl(url)?.domain);
  }
}

/* ---- 3. the Supervisor hosts come from supervisors.ts ------------------- */
for (const fips of COVERED_FIPS) {
  const site = supervisorSite(fips);
  check(`supervisorSite(${fips}) is set`, site !== null);
  if (!site) continue;
  const host = new URL(site).hostname.replace(/^www\./, "");
  const entry = OFFICIAL_SOURCES.find((s) => s.domain === host);
  check(`${host} (supervisorSite ${fips}) is an official entry for ${fips}`, entry?.countyFips === fips, JSON.stringify(entry));
}
check("supervisorSite is null for an uncovered county", supervisorSite("12099") === null);

/* ---- 4. the six official_link URLs and the county release pages -------- */
for (const [url, domain] of [
  ["https://www.ocfelections.gov", "ocfelections.gov"],
  ["https://www.browardvotes.gov", "browardvotes.gov"],
  ["https://www.votehillsborough.gov", "votehillsborough.gov"],
  ["https://registertovoteflorida.gov", "registertovoteflorida.gov"],
  ["https://dos.fl.gov/elections/", "dos.fl.gov/elections"],
  ["https://www.miamidade.gov/global/elections/home.page", null],
  ["https://www.miamidade.gov/global/release.page?Mduid_release=rel1780088950968276", null],
  ["https://www.miamidade.gov/global/release.page?Mduid_release=rel1788204670102232", null],
  ["https://constitutionalinitiatives.dos.fl.gov/initdetail.asp?account=83993&seqnum=1", "constitutionalinitiatives.dos.fl.gov"],
  ["https://www.flhouse.gov/Sections/Bills/billsdetail.aspx?BillId=1", "flhouse.gov"],
  ["https://www.miamidade.gov/elections/early-voting.asp", "miamidade.gov/elections"],
  ["https://www.votemiamidade.gov/", "votemiamidade.gov"],
  /* Matches two entries: dos.fl.gov/elections (a subdomain of dos.fl.gov,
     under /elections) and constitutionalinitiatives.dos.fl.gov. The longest
     domain wins, so the more specific entry decides. */
  ["https://constitutionalinitiatives.dos.fl.gov/elections/x", "constitutionalinitiatives.dos.fl.gov"],
] as const) {
  check(`${url} resolves to ${domain ?? "no entry"}`, (officialForUrl(url)?.domain ?? null) === domain,
    officialForUrl(url)?.domain);
}
check("the longest domain wins whatever the list order",
  officialForUrl("https://constitutionalinitiatives.dos.fl.gov/elections/x", [...OFFICIAL_SOURCES].reverse())?.domain ===
    "constitutionalinitiatives.dos.fl.gov");

/* ---- 5. publisher strings match 0014 and 0042 --------------------------- */
const MIGRATIONS = resolve(import.meta.dirname, "..", "supabase", "migrations");
const tuple = /\('(src_[^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)/g;
let compared = 0;
for (const file of ["0014_news_fairness.sql", "0042_news_source_backfill.sql"]) {
  const sql = readFileSync(resolve(MIGRATIONS, file), "utf8");
  for (const [, id, url, , publisher] of sql.matchAll(tuple)) {
    const entry = officialForUrl(url);
    if (!entry) continue;
    compared++;
    check(`${file} ${id}: publisher "${publisher}" equals the list's "${entry.publisher}"`,
      entry.publisher === publisher);
  }
}
check("0014 and 0042 give five pages on listed hosts to compare", compared === 5, String(compared));

/* ---- 6. the row builder ------------------------------------------------- */
const outletRow = outletSourceRow(OUTLETS.find((o) => o.leanTag !== null)!);
for (const s of OFFICIAL_SOURCES) {
  const row = officialSourceRow(s);
  check(`officialSourceRow(${s.domain}) has outletSourceRow's keys`,
    JSON.stringify(Object.keys(row)) === JSON.stringify(Object.keys(outletRow ?? {})), JSON.stringify(Object.keys(row)));
  check(`officialSourceRow(${s.domain}) is official:<domain>, primary_doc / N/A`,
    row.source_id === officialSourceIdFor(s.domain) && row.source_id === `official:${s.domain}` &&
      row.url === `https://${s.domain}` && row.url_norm === s.domain && row.publisher === s.publisher &&
      row.type === "primary_doc" && row.lean_tag === "N/A", JSON.stringify(row));
  check(`officialSourceRow(${s.domain}).url_norm is urlNorm of its url`, urlNorm(row.url) === row.url_norm,
    String(urlNorm(row.url)));
}

if (failures > 0) {
  console.error(`\nverify-official-sources: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  `verify-official-sources: OK — ${OFFICIAL_SOURCES.length} official entries, none overlaps the ${OUTLETS.length} outlets, the Supervisor hosts are supervisors.ts's and publishers match 0014 and 0042`,
);
