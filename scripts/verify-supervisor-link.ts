/* The split-ZIP prompt's "your county Supervisor of Elections" link
   (DistrictConfirm in src/components/features/CountyPicker.tsx).

   It went to https://www.fldoe.org, the Department of Education, for every
   one of the 75 ZIPs that span more than one district. It now comes from
   supervisorLink() (src/lib/supervisors.ts):

     1. Each covered county links its own Supervisor of Elections' site,
        named in the link text, and no two counties share one.
     2. An unknown, uncovered or missing county links the Division of
        Elections' list of all 67 Supervisors, with the generic text.
     3. No link anywhere in src points at fldoe.org, and DistrictConfirm
        takes its href and text from supervisorLink(), not a literal.

   What it cannot cover: that LocationEntry passes the split ZIP's county
   in (it then falls back to the statewide list, which is still right), and
   that the four sites stay up.

   Run: node scripts/verify-supervisor-link.ts */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COVERED_COUNTIES } from "../src/lib/counties.ts";
import { SUPERVISOR_LIST_URL, supervisorLink } from "../src/lib/supervisors.ts";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/* The Supervisors' own hosts. Broward, Hillsborough and Orange are the
   sites the Division of Elections' county directory
   (dos.elections.myflorida.com/supervisors) lists, read 2026-10-05; for
   Miami-Dade it lists miamidade.gov/elections, and votemiamidade.gov is the
   same Elections Department's own domain. */
const OWN_HOST: Record<string, RegExp> = {
  "Miami-Dade": /(^|\.)votemiamidade\.gov$/,
  Broward: /(^|\.)browardvotes\.gov$/,
  Hillsborough: /(^|\.)votehillsborough\.gov$/,
  Orange: /(^|\.)voteorangefl\.gov$/,
};

console.log("1. Covered counties");
const hosts = new Set<string>();
for (const county of COVERED_COUNTIES) {
  const link = supervisorLink(county.fips);
  const url = new URL(link.url);
  hosts.add(url.hostname);
  check(
    `${county.name} links its own Supervisor over https (${link.url})`,
    url.protocol === "https:" && OWN_HOST[county.name]?.test(url.hostname) === true,
    link.url
  );
  check(
    `${county.name}'s link text names the county`,
    link.label === `the ${county.name} County Supervisor of Elections`,
    link.label
  );
}
check("no two counties share a site", hosts.size === COVERED_COUNTIES.length, [...hosts].join(", "));

console.log("\n2. No county known");
for (const fips of [undefined, null, "", "12099", "not-a-fips"]) {
  const link = supervisorLink(fips);
  check(
    `${JSON.stringify(fips)} links the Division of Elections' Supervisor list`,
    link.url === SUPERVISOR_LIST_URL &&
      link.label === "your county Supervisor of Elections",
    JSON.stringify(link)
  );
}
check(
  "the list is the Division of Elections' Supervisor of Elections page",
  SUPERVISOR_LIST_URL === "https://dos.fl.gov/elections/contacts/supervisor-of-elections/"
);

console.log("\n3. Source");
const files: string[] = [];
(function walk(dir: string) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|mjs|js)$/.test(name)) files.push(p);
  }
})(path.join(root, "src"));
/* Code only: a comment may name the old link to say why it went. */
const code = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const fldoe = files.filter((f) => /fldoe\.org/i.test(code(readFileSync(f, "utf8"))));
check(
  "nothing in src links the Department of Education (fldoe.org)",
  fldoe.length === 0,
  fldoe.map((f) => path.relative(root, f)).join(", ")
);
const picker = readFileSync(path.join(root, "src/components/features/CountyPicker.tsx"), "utf8");
const confirm = picker.slice(picker.indexOf("export function DistrictConfirm"));
check(
  "DistrictConfirm takes the href and text from supervisorLink(countyFips)",
  /const supervisor = supervisorLink\(countyFips\);/.test(confirm) &&
    /href=\{supervisor\.url\}/.test(confirm) &&
    /\{supervisor\.label\}/.test(confirm) &&
    !/href="https?:/.test(confirm),
  confirm.slice(0, 400)
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nSupervisor link checks passed.");
