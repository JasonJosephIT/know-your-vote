/* Guardrail for data-architecture.md D2 (minor parties) — party chip labels.

   Migration 0013 dropped candidate.party's CHECK so the DoE PartyCode stores
   verbatim. That moved the burden onto display logic, and two rules there are
   neutrality rules that would fail silently if broken — the page still
   renders, just dishonestly:

     1. Never an empty chip. MGT arrives from the DoE with an EMPTY
        PartyDesc, so a fallback assuming a label exists prints a blank pill,
        which reads as a value the voter is meant to interpret.
     2. WRI is not a party. It is the write-in marker occupying the PartyCode
        column; a chip reading "WRI" presents an unknown affiliation as a
        known one.

   Pure and offline. Run: node scripts/verify-party-label.ts */

import { partyLabel } from "../src/lib/party-label.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

/* Rule 1 — nothing to say means no chip, never a blank one. */
for (const empty of [null, undefined, "", "   "]) {
  check(`no chip for ${JSON.stringify(empty)}`, partyLabel(empty) === null,
    String(partyLabel(empty)));
}

/* Rule 2 — the write-in marker is not an affiliation. */
check("WRI renders no chip", partyLabel("WRI") === null, String(partyLabel("WRI")));

/* The major parties still print. */
for (const code of ["REP", "DEM", "NPA"]) {
  check(`${code} prints itself`, partyLabel(code) === code, String(partyLabel(code)));
}
check("'other' gets a readable label", partyLabel("other") === "Other");

/* D2's whole point: real minor parties on the target ballots stop being
   flattened into one bucket. */
for (const code of ["IND", "LPF", "CPF", "FFP"]) {
  check(`${code} is not flattened`, partyLabel(code) === code, String(partyLabel(code)));
  check(`${code} is not 'Other'`, partyLabel(code) !== "Other");
}

/* The case that forced the fallback: a code the DoE itself cannot label. */
check("MGT renders its raw code", partyLabel("MGT") === "MGT", String(partyLabel("MGT")));
check("an unseen code renders rather than blanking",
  partyLabel("ZZZ") === "ZZZ", String(partyLabel("ZZZ")));

/* Whitespace must not produce a chip that looks empty. */
check("surrounding whitespace is trimmed", partyLabel("  LPF  ") === "LPF",
  String(partyLabel("  LPF  ")));

/* No label is ever the empty string — that is rule 1 restated as a property
   over everything above, so a future edit cannot satisfy the cases and still
   emit a blank. */
for (const code of ["REP", "DEM", "NPA", "IND", "LPF", "CPF", "FFP", "MGT", "other", "ZZZ"]) {
  const label = partyLabel(code);
  check(`${code} has a non-empty label`, typeof label === "string" && label.trim().length > 0);
}

if (failures > 0) {
  console.error(`\nverify-party-label: ${failures} failure(s)`);
  process.exit(1);
}
console.log("verify-party-label: OK — no empty chips, WRI is not a party, minor parties keep their code");
