/* The methodology page's snapshot and freeze copy (src/lib/snapshot-copy.ts;
   ballot-content-completion §3.4 and §3.6.4, founder decisions BC1, BC3 and
   BC11, all recommended pending founder confirmation).

   1. Each of the three paths renders the §3.6.4 bullet: no refresh (the
      09-29 sentence, no carry-forward sentence), 1c (the re-read sentence,
      or the plain one when no re-read race was re-applied, and no
      carry-forward sentence) and the full refresh (its exception, and the
      carry-forward sentence). Every path ends with the corrections-only and
      how-to-report sentences, sends reports to CONTACT_EMAIL, and drops
      "isn't here yet".
   2. The scrutiny summary keeps "all as of" unless the bullet names an
      exception (§3.4).
   3. The settings that ship are consistent with their path, so a half-made
      switch fails here instead of reaching voters.
   4. The methodology page renders the module's copy and no longer carries
      its own snapshot date or the old "yet" sentence.

   Run: node scripts/verify-freeze-copy.ts */

import { readFileSync } from "node:fs";
import { CONTACT_EMAIL } from "../src/lib/contact.ts";
import {
  BRIEF_SNAPSHOT_DATE,
  SNAPSHOT,
  SNAPSHOT_LABEL,
  scrutinyAsOf,
  snapshotBullet,
  type SnapshotSettings,
} from "../src/lib/snapshot-copy.ts";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const full = (b: { beforeEmail: string; email: string }) => `${b.beforeEmail} ${b.email}.`;
const TAIL =
  "Anything added or changed on a site since then isn’t here. From October 18 through Election Day we change a brief only to correct an error. To report one, email";
const CARRY =
  "Where a page said the same thing as when we read it on September 29, 2026, we kept that reading’s result, and we kept reading the same pages as then unless a homepage’s links had changed.";

const base: SnapshotSettings = {
  path: "no-refresh",
  date: "2026-09-29",
  fullRefreshException: "",
  rereadNames: [],
  rereadDate: "",
};

/* ---- 1. the three paths --------------------------------------------------- */

const none = snapshotBullet(base);
check(
  "no refresh: the 09-29 sentence, no carry-forward sentence, then the freeze sentences",
  full(none) === `We read the candidates’ sites on September 29, 2026. ${TAIL} ${CONTACT_EMAIL}.`,
  full(none)
);
check("no refresh: names no exception", none.namesException === false);

const c1 = snapshotBullet({
  ...base,
  path: "1c",
  rereadNames: ["Ana Example", "Ben Sample", "Cy Test"],
  rereadDate: "2026-10-12",
});
check(
  "1c: the re-read sentence, in the given order, and no carry-forward sentence",
  full(c1) ===
    `We read the candidates’ sites on September 29, 2026, and read Ana Example, Ben Sample, and Cy Test again on October 12, 2026, because on September 29 we could not read their sites, or a page of them. ${TAIL} ${CONTACT_EMAIL}.`,
  full(c1)
);
check("1c with re-reads: names an exception", c1.namesException === true);
const c1none = snapshotBullet({ ...base, path: "1c" });
check(
  "1c with no re-read race re-applied: the sentence is unchanged (same as no refresh)",
  full(c1none) === full(none) && c1none.namesException === false,
  full(c1none)
);

const fr = snapshotBullet({
  ...base,
  path: "full-refresh",
  date: "2026-10-12",
  fullRefreshException:
    " (September 29 for Ana Example, whose site, or a page of it, we could not read again)",
});
check(
  "full refresh: the new date, its exception, then the carry-forward sentence",
  full(fr) ===
    `We read the candidates’ sites on October 12, 2026 (September 29 for Ana Example, whose site, or a page of it, we could not read again). ${CARRY} ${TAIL} ${CONTACT_EMAIL}.`,
  full(fr)
);
check("full refresh with an exception: names an exception", fr.namesException === true);
const frClean = snapshotBullet({ ...base, path: "full-refresh", date: "2026-10-12" });
check(
  "full refresh, no exception: carry-forward sentence, no exception named",
  full(frClean) === `We read the candidates’ sites on October 12, 2026. ${CARRY} ${TAIL} ${CONTACT_EMAIL}.` &&
    frClean.namesException === false,
  full(frClean)
);

for (const [name, b] of [["no refresh", none], ["1c", c1], ["full refresh", fr]] as const) {
  check(`${name}: "isn't here yet" is gone`, !/\byet\b/.test(full(b)), full(b));
  check(`${name}: reports go to CONTACT_EMAIL`, b.email === CONTACT_EMAIL);
}

/* ---- 2. the scrutiny summary ---------------------------------------------- */

check(
  "scrutiny summary: 'all as of' when no exception is named",
  scrutinyAsOf(base) === "all as of September 29, 2026",
  scrutinyAsOf(base)
);
check(
  "scrutiny summary: points to the snapshot bullet when an exception is named",
  scrutinyAsOf({ ...base, path: "1c", rereadNames: ["Ana Example"], rereadDate: "2026-10-12" }) ===
    "from the sites as read on September 29, 2026, except as listed under “Briefs are a snapshot”",
  scrutinyAsOf({ ...base, path: "1c", rereadNames: ["Ana Example"], rereadDate: "2026-10-12" })
);

/* ---- 3. what ships -------------------------------------------------------- */

const ISO = /^\d{4}-\d{2}-\d{2}$/;
check("shipped: BRIEF_SNAPSHOT_DATE is SNAPSHOT.date", BRIEF_SNAPSHOT_DATE === SNAPSHOT.date);
check("shipped: the date is YYYY-MM-DD", ISO.test(SNAPSHOT.date), SNAPSHOT.date);
check(
  "shipped: SNAPSHOT_LABEL is the date in words",
  SNAPSHOT_LABEL ===
    new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(
      new Date(`${SNAPSHOT.date}T12:00:00Z`)
    )
);
if (SNAPSHOT.path === "full-refresh") {
  check("shipped full refresh: the date moved past 2026-09-29", SNAPSHOT.date > "2026-09-29", SNAPSHOT.date);
  check("shipped full refresh: no 1c names", SNAPSHOT.rereadNames.length === 0);
} else {
  check(`shipped ${SNAPSHOT.path}: the date stays 2026-09-29`, SNAPSHOT.date === "2026-09-29", SNAPSHOT.date);
  check(`shipped ${SNAPSHOT.path}: no full-refresh exception`, SNAPSHOT.fullRefreshException === "");
}
if (SNAPSHOT.path === "1c") {
  check("shipped 1c: at most the five re-read candidates", SNAPSHOT.rereadNames.length <= 5);
  check(
    "shipped 1c: a re-read date when names are given",
    SNAPSHOT.rereadNames.length === 0 || (ISO.test(SNAPSHOT.rereadDate) && SNAPSHOT.rereadDate > "2026-09-29"),
    SNAPSHOT.rereadDate
  );
} else {
  check(`shipped ${SNAPSHOT.path}: no 1c names or date`, SNAPSHOT.rereadNames.length === 0 && SNAPSHOT.rereadDate === "");
}
if (SNAPSHOT.path === "no-refresh") {
  check("shipped no refresh: the bullet names no exception", snapshotBullet().namesException === false);
}

/* ---- 4. the page ------------------------------------------------------------ */

const page = readFileSync(
  new URL("../src/app/(public)/methodology/page.tsx", import.meta.url),
  "utf8"
)
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s+/g, " ");
check("methodology page renders snapshotBullet()", /snapshotBullet\(\)/.test(page));
check("methodology page renders scrutinyAsOf()", /scrutinyAsOf\(\)/.test(page));
check(
  "methodology page links the report address",
  /href=\{`mailto:\$\{snapshot\.email\}`\}/.test(page)
);
check(
  "methodology page no longer defines its own snapshot date",
  !/const BRIEF_SNAPSHOT_DATE\b/.test(page) && !/const SNAPSHOT_LABEL\b/.test(page)
);
check("methodology page no longer says the snapshot isn't here yet", !/here yet/.test(page));
check(
  "methodology page keeps the bullet's heading",
  page.includes("<strong>Briefs are a snapshot.</strong>")
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nverify-freeze-copy: all checks passed.");
