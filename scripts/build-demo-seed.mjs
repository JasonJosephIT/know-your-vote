/* Generates scripts/demo-seed.sql + scripts/demo-teardown.sql — clearly
   FICTIONAL development fixtures shaped exactly like CAP pipeline output,
   so the app (a pure reader) can be built and verified before the real
   pipeline produces audited briefs.

   Honesty guarantees baked in:
   - every id is prefixed demo-, every source URL is under example.org/demo,
     every publisher is prefixed "Demo Fixture", candidate names are invented;
   - race_publication.note marks each row as demo data;
   - scrutiny counts are symmetric per race (the shape the Balance Audit
     enforces); FL-10 is deliberately left in_review with a failed gate to
     exercise the unpublished path;
   - teardown removes every demo- row.

   Run: node scripts/build-demo-seed.mjs */

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const KEY_DATES = {
  primary_date: "2026-08-18",
  general_date: "2026-11-03",
  registration_deadline: "2026-10-05",
};

/* Verdict rotation keeps every candidate's fact-check MIX comparable without
   being identical: same count, similar spread, no candidate singled out. */
const VERDICTS = [
  ["accurate", "mixed", "mostly_accurate"],
  ["mostly_accurate", "accurate", "mixed"],
  ["mixed", "mostly_accurate", "accurate"],
];

const RACES = [
  {
    id: "demo-fl-governor",
    office: "Governor of Florida",
    level: "state",
    district: null,
    published: true,
    spine: ["Economy & Affordability", "Education", "Environment & Water"],
    candidates: [
      { id: "demo-cand-boone", name: "Gregory Boone", party: "REP", skipIssue: 2 },
      { id: "demo-cand-villanueva", name: "Marta Villanueva", party: "DEM" },
      { id: "demo-cand-okafor", name: "Simone Okafor", party: "NPA", extraIssue: "Government Transparency" },
      { id: "demo-cand-frank", name: "Wesley Frank", party: "other" },
    ],
  },
  {
    id: "demo-fl-attorney-general",
    office: "Attorney General of Florida",
    level: "state",
    district: null,
    published: true,
    spine: ["Public Safety & Crime", "Consumer Protection", "Government Accountability"],
    candidates: [
      { id: "demo-cand-crane", name: "Thomas Crane", party: "REP" },
      { id: "demo-cand-vargas", name: "Elena Vargas", party: "DEM" },
      { id: "demo-cand-lin", name: "Grace Lin", party: "NPA" },
    ],
  },
  {
    id: "demo-fl-cfo",
    office: "Chief Financial Officer of Florida",
    level: "state",
    district: null,
    published: true,
    spine: ["Insurance & Property Costs", "State Budget & Spending", "Financial Transparency"],
    candidates: [
      { id: "demo-cand-bell", name: "Raymond Bell", party: "REP" },
      { id: "demo-cand-foster", name: "Diane Foster", party: "DEM" },
      { id: "demo-cand-haddad", name: "Omar Haddad", party: "NPA" },
    ],
  },
  {
    id: "demo-fl-agriculture",
    office: "Commissioner of Agriculture of Florida",
    level: "state",
    district: null,
    published: true,
    spine: ["Farming & Rural Economy", "Water & Land Use", "Consumer Services"],
    candidates: [
      { id: "demo-cand-sutter", name: "Hank Sutter", party: "REP" },
      { id: "demo-cand-mora", name: "Cecilia Mora", party: "DEM" },
      { id: "demo-cand-kowalski", name: "Ruth Kowalski", party: "other" },
    ],
  },
  {
    id: "demo-fl-us-senate",
    office: "U.S. Senate (Florida)",
    level: "federal",
    district: null,
    published: true,
    spine: ["Economy & Affordability", "Healthcare", "Immigration"],
    candidates: [
      { id: "demo-cand-reyes", name: "Daniel Reyes", party: "REP" },
      { id: "demo-cand-chen", name: "Priscilla Chen", party: "DEM" },
      { id: "demo-cand-pruitt", name: "Victor Pruitt", party: "NPA" },
      { id: "demo-cand-schmidt", name: "Lena Schmidt", party: "other" },
    ],
  },
  {
    id: "demo-fl-house-28",
    office: "U.S. House — District 28",
    level: "federal",
    district: "FL-28",
    published: true,
    spine: ["Economy & Affordability", "Healthcare", "Housing"],
    candidates: [
      { id: "demo-cand-marsh", name: "Alejandro Marsh", party: "REP" },
      { id: "demo-cand-pierce", name: "Yolanda Pierce", party: "DEM" },
      { id: "demo-cand-torres", name: "Isabel Torres", party: "NPA" },
    ],
  },
  {
    id: "demo-fl-house-23",
    office: "U.S. House — District 23",
    level: "federal",
    district: "FL-23",
    published: true,
    spine: ["Economy & Affordability", "Healthcare", "Housing"],
    candidates: [
      { id: "demo-cand-alvarado", name: "Nina Alvarado", party: "REP" },
      { id: "demo-cand-kessler", name: "Robert Kessler", party: "DEM" },
      { id: "demo-cand-patel", name: "Dev Patel", party: "other" },
    ],
  },
  {
    id: "demo-fl-house-15",
    office: "U.S. House — District 15",
    level: "federal",
    district: "FL-15",
    published: true,
    spine: ["Economy & Affordability", "Healthcare", "Housing"],
    candidates: [
      { id: "demo-cand-delgado", name: "Trish Delgado", party: "REP" },
      { id: "demo-cand-webb", name: "Marcus Webb", party: "DEM" },
      { id: "demo-cand-nguyen", name: "Fred Nguyen", party: "NPA" },
    ],
  },
  {
    id: "demo-fl-house-10",
    office: "U.S. House — District 10",
    level: "federal",
    district: "FL-10",
    published: false,
    spine: ["Economy & Affordability", "Healthcare", "Housing"],
    candidates: [
      { id: "demo-cand-strand", name: "Carol Strand", party: "REP" },
      { id: "demo-cand-ortiz", name: "Jamal Ortiz", party: "DEM" },
      { id: "demo-cand-sanders", name: "Gloria Sanders", party: "NPA" },
    ],
  },
];

const SAY = {
  "Economy & Affordability": (n) =>
    `${n} says they will lower everyday costs by expanding the state's fictional Homestead Relief Program and capping utility connection fees.`,
  Education: (n) =>
    `${n} pledges to raise starting teacher pay and expand the fictional Sunshine Apprenticeship Program to every county.`,
  "Environment & Water": (n) =>
    `${n} says they will fund the fictional Everglades Water Quality Compact and tighten runoff standards for new development.`,
  Healthcare: (n) =>
    `${n} says they will expand community clinic funding and cap out-of-pocket insulin costs under the fictional Access First plan.`,
  Immigration: (n) =>
    `${n} says they support the fictional Orderly Entry Act pairing border staffing increases with faster legal-status processing.`,
  Housing: (n) =>
    `${n} pledges to streamline permitting and fund the fictional First Key down-payment assistance program.`,
  "Government Transparency": (n) =>
    `${n} says they will publish every state contract over $100,000 in a searchable public ledger.`,
  "Public Safety & Crime": (n) =>
    `${n} says they will expand the fictional Regional Task Force Grants and add prosecution resources for violent and organized crime.`,
  "Consumer Protection": (n) =>
    `${n} says they will grow the fictional Scam Shield unit to pursue robocall and elder-fraud operations statewide.`,
  "Government Accountability": (n) =>
    `${n} pledges to publish public-records response times and audit state settlement spending under the fictional Sunshine Ledger plan.`,
  "Insurance & Property Costs": (n) =>
    `${n} says they will use the fictional Rate Review Board to challenge unjustified property-insurance increases.`,
  "State Budget & Spending": (n) =>
    `${n} pledges to post every state contract to the fictional Open Ledger portal within 30 days of signing.`,
  "Financial Transparency": (n) =>
    `${n} says they will expand the fictional Taxpayer Receipt tool showing where each state dollar goes.`,
  "Farming & Rural Economy": (n) =>
    `${n} says they will expand the fictional Farm Resilience Grant program for small growers hit by storms.`,
  "Water & Land Use": (n) =>
    `${n} pledges to enforce the fictional Best Management Practices Compact on fertilizer runoff.`,
  "Consumer Services": (n) =>
    `${n} says they will cut licensing and inspection wait times in half under the fictional Fast Lane services plan.`,
};

const DONE = {
  "Economy & Affordability": (n) =>
    `${n} voted for the fictional 2024 Small Business Fee Reduction Act and served two terms on a county budget commission.`,
  Education: (n) =>
    `${n} sponsored the fictional 2023 Classroom Supplies Grant and voted for the state's teacher-pay increase that year.`,
  "Environment & Water": (n) =>
    `${n} co-sponsored the fictional 2022 Springs Restoration Bond and voted to fund septic-to-sewer conversions.`,
  Healthcare: (n) =>
    `${n} voted for the fictional 2023 Rural Clinic Expansion Act and chaired a county health advisory board.`,
  Immigration: (n) =>
    `${n} voted for the fictional 2024 Visa Processing Modernization Act and toured processing facilities on a bipartisan delegation.`,
  Housing: (n) =>
    `${n} voted for the fictional 2024 Permit Simplification Act and helped launch a county land-trust pilot.`,
  "Government Transparency": (n) =>
    `${n} published their office's full expense ledger quarterly while in local office.`,
  "Public Safety & Crime": (n) =>
    `${n} voted to fund the fictional 2023 Regional Task Force Grants and served on a county public-safety board.`,
  "Consumer Protection": (n) =>
    `${n} supported the fictional 2024 Robocall Enforcement Compact and led an elder-fraud restitution initiative.`,
  "Government Accountability": (n) =>
    `${n} backed the fictional 2023 Records Modernization Act and published quarterly office expense ledgers.`,
  "Insurance & Property Costs": (n) =>
    `${n} voted for the fictional 2024 Reinsurance Stability Act and served on a county rate-review commission.`,
  "State Budget & Spending": (n) =>
    `${n} backed the fictional 2023 Open Ledger Act and chaired a county budget oversight panel.`,
  "Financial Transparency": (n) =>
    `${n} launched a fictional county-level Taxpayer Receipt pilot and voted for annual audit funding.`,
  "Farming & Rural Economy": (n) =>
    `${n} voted for the fictional 2024 Farm Resilience Grant expansion and served on a rural development council.`,
  "Water & Land Use": (n) =>
    `${n} backed the fictional 2022 Runoff Standards Compact and funded county soil-testing programs.`,
  "Consumer Services": (n) =>
    `${n} cut permit backlogs on a fictional county services board and voted for fuel-inspection modernization.`,
};

const CHECK = {
  "Economy & Affordability": (n) =>
    `${n} claimed the fictional relief program saved the average family $600 per year.`,
  Education: (n) =>
    `${n} claimed teacher vacancies fell 40% after the fictional apprenticeship pilot.`,
  "Environment & Water": (n) =>
    `${n} claimed water-quality violations dropped by half under the fictional compact.`,
  Healthcare: (n) =>
    `${n} claimed the fictional clinic program served 200,000 new patients last year.`,
  Immigration: (n) =>
    `${n} claimed processing backlogs fell 30% after the fictional modernization act.`,
  Housing: (n) =>
    `${n} claimed the fictional permitting reform cut approval times from 18 months to 6.`,
  "Government Transparency": (n) =>
    `${n} claimed their ledger disclosures covered 100% of contracts over the threshold.`,
  "Public Safety & Crime": (n) =>
    `${n} claimed violent crime fell 15% in counties using the fictional task-force grants.`,
  "Consumer Protection": (n) =>
    `${n} claimed the fictional Scam Shield unit returned $40 million to consumers last year.`,
  "Government Accountability": (n) =>
    `${n} claimed their office answered 95% of records requests within ten days.`,
  "Insurance & Property Costs": (n) =>
    `${n} claimed the fictional Rate Review Board saved homeowners $300 per policy on average.`,
  "State Budget & Spending": (n) =>
    `${n} claimed the fictional Open Ledger portal covers every contract over $50,000.`,
  "Financial Transparency": (n) =>
    `${n} claimed the fictional Taxpayer Receipt tool was used by a million Floridians last year.`,
  "Farming & Rural Economy": (n) =>
    `${n} claimed the fictional resilience grants kept 200 family farms operating after the last hurricane.`,
  "Water & Land Use": (n) =>
    `${n} claimed fertilizer runoff dropped 25% under the fictional compact.`,
  "Consumer Services": (n) =>
    `${n} claimed licensing wait times fell from six weeks to three under the fictional plan.`,
};

const STANCE = {
  stated: (n, issue) =>
    `Stated positions on ${issue.toLowerCase()} center on the specific fictional programs ${n} has named publicly; see the sourced claims below.`,
};

/* --only=race-id,race-id emits demo-seed-delta.sql containing just those
   races' rows — for additively seeding new races into a live database. */
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const onlyIds = onlyArg ? onlyArg.slice(7).split(",").filter(Boolean) : null;
const ACTIVE_RACES = onlyIds ? RACES.filter((r) => onlyIds.includes(r.id)) : RACES;

/* --candidates=id,id emits scripts/demo-candidates-delta.sql: ONLY those
   candidates' rows plus an idempotent UPDATE appending each to its race's
   candidate_ids — for adding new candidates to an already-seeded live DB
   without touching existing rows. Existing races/issues are left as-is. */
const candArg = process.argv.find((a) => a.startsWith("--candidates="));
const candFilter = candArg
  ? new Set(candArg.slice("--candidates=".length).split(",").filter(Boolean))
  : null;
const raceUpdates = [];

const sql = [];
const sources = [];
const sourceId = (id, publisher, type, lean, slug) => {
  sources.push(
    `(${q(id)}, ${q(`https://example.org/demo/${slug}`)}, ${q(`example.org/demo/${slug}`)}, ${q(publisher)}, ${q(type)}, ${q(lean)}, NOW())`
  );
  return id;
};

const races = [];
const candidates = [];
const issues = [];
const claims = [];
const claimSources = [];
const positions = [];
const profiles = [];
const socials = [];
const publications = [];

for (const race of ACTIVE_RACES) {
  const candIds = race.candidates.map((c) => c.id);
  /* In candidate-delta mode the race, its publication, and its spine issues
     already exist in the DB — don't re-insert them. */
  if (!candFilter) {
    races.push(
      `(${q(race.id)}, ${q(race.office)}, ${q(race.level)}, ${race.district ? q(race.district) : "NULL"}, 'general', true, NULL, ARRAY[${candIds.map(q).join(",")}]::text[], ${q(JSON.stringify(KEY_DATES))}::jsonb)`
    );
    publications.push(
      race.published
        ? `(${q(race.id)}, 'published', NOW(), 'DEMO DATA — fictional candidates and claims for development; not real people.')`
        : `(${q(race.id)}, 'in_review', NULL, 'DEMO DATA — held in review: verifiable_fact scrutiny variance breached the 15% gate (scrutiny_halt).')`
    );

    race.spine.forEach((title, i) => {
      issues.push(
        `(${q(`${race.id}-issue-${i + 1}`)}, ${q(race.id)}, 'spine', NULL, ${q(title)}, NULL, NULL, ${i + 1})`
      );
    });
  }

  race.candidates.forEach((cand, ci) => {
    /* Skip candidates outside the delta filter — but keep ci as the true
       index so verdict rotation + audit shape match the full seed exactly. */
    if (candFilter && !candFilter.has(cand.id)) return;
    if (candFilter) {
      raceUpdates.push(
        `UPDATE race SET candidate_ids = candidate_ids || ARRAY[${q(cand.id)}]::text[] WHERE race_id = ${q(race.id)} AND NOT (${q(cand.id)} = ANY(candidate_ids));`
      );
    }
    const first = cand.name.split(" ")[0];
    const slug = cand.id.replace("demo-cand-", "");
    candidates.push(
      `(${q(cand.id)}, ${q(cand.name)}, ${q(cand.party)}, ${q(race.office)}, false, 'qualified', ARRAY[]::text[], ${q(`https://example.org/demo/${slug}`)}, NULL)`
    );

    const selfSrc = sourceId(
      `demo-src-${slug}-self`,
      "Demo Fixture (Candidate Campaign Site)",
      "candidate_self",
      "N/A",
      `${slug}/platform`
    );
    const recordSrc = sourceId(
      `demo-src-${slug}-record`,
      "Demo Fixture (State Records Office)",
      "primary_doc",
      "N/A",
      `${slug}/record`
    );
    const checkSrc = sourceId(
      `demo-src-${slug}-check`,
      "Demo Fixture (Fictional Gazette Fact Desk)",
      "factual_reporting",
      "center",
      `${slug}/factcheck`
    );

    /* One verified handle per candidate; one unverified extra for the first
       candidate of each race (must never render). */
    socials.push(
      `(${q(cand.id)}, 'twitter', ${q(`@${slug}_demo`)}, ${q(`${slug}_demo`)}, ${q(`https://x.com/${slug}_demo`)}, 'linked_from_official_site', ${q(selfSrc)}, 'verified', NOW())`
    );
    if (ci === 0) {
      socials.push(
        `(${q(cand.id)}, 'instagram', ${q(`@${slug}_unofficial`)}, ${q(`${slug}_unofficial`)}, NULL, 'doe_filing', NULL, 'unverified', NULL)`
      );
    }

    let factCount = 0;
    let sayCount = 0;
    race.spine.forEach((title, i) => {
      const issueId = `${race.id}-issue-${i + 1}`;
      const base = `demo-claim-${slug}-${i + 1}`;
      const skip = cand.skipIssue === i;

      if (!skip) {
        sayCount++;
        claims.push(
          `(${q(`${base}-say`)}, ${q(cand.id)}, ${q(race.id)}, ${q(issueId)}, ${q(SAY[title](cand.name))}, 'stated_position', true, NULL, NULL, 'single_source')`
        );
        claimSources.push(`(${q(`${base}-say`)}, ${q(selfSrc)})`);
      }

      factCount += 2;
      claims.push(
        `(${q(`${base}-done`)}, ${q(cand.id)}, ${q(race.id)}, ${q(issueId)}, ${q(DONE[title](cand.name))}, 'verifiable_fact', false, NULL, 'accurate', 'verified')`
      );
      claimSources.push(`(${q(`${base}-done`)}, ${q(recordSrc)})`);

      const verdict = VERDICTS[ci % VERDICTS.length][i % 3];
      claims.push(
        `(${q(`${base}-check`)}, ${q(cand.id)}, ${q(race.id)}, ${q(issueId)}, ${q(CHECK[title](cand.name))}, 'verifiable_fact', true, ${skip ? "NULL" : q(`${base}-say`)}, ${q(verdict)}, 'verified')`
      );
      claimSources.push(`(${q(`${base}-check`)}, ${q(checkSrc)})`);

      const posClaims = skip
        ? [`${base}-done`, `${base}-check`]
        : [`${base}-say`, `${base}-done`, `${base}-check`];
      positions.push(
        `(${q(`demo-pos-${slug}-${i + 1}`)}, ${q(cand.id)}, ${q(race.id)}, ${q(issueId)}, ${q(skip ? "" : STANCE.stated(cand.name, title))}, ARRAY[${posClaims.map(q).join(",")}]::text[], ${!skip}, ${skip ? "'no_stated_position_found'" : "'stated'"})`
      );
    });

    if (cand.extraIssue) {
      const extraId = `${race.id}-issue-x-${slug}`;
      issues.push(
        `(${q(extraId)}, ${q(race.id)}, 'candidate', ${q(cand.id)}, ${q(cand.extraIssue)}, NULL, NULL, 99)`
      );
      sayCount++;
      claims.push(
        `(${q(`demo-claim-${slug}-x-say`)}, ${q(cand.id)}, ${q(race.id)}, ${q(extraId)}, ${q(SAY[cand.extraIssue](cand.name))}, 'stated_position', true, NULL, NULL, 'single_source')`
      );
      claimSources.push(`(${q(`demo-claim-${slug}-x-say`)}, ${q(selfSrc)})`);
      positions.push(
        `(${q(`demo-pos-${slug}-x`)}, ${q(cand.id)}, ${q(race.id)}, ${q(extraId)}, ${q(STANCE.stated(cand.name, cand.extraIssue))}, ARRAY[${q(`demo-claim-${slug}-x-say`)}]::text[], true, 'stated')`
      );
    }

    /* Balance Audit shape: identical fact/check counts per candidate in a
       race; the unpublished FL-10 race carries a deliberate failure. */
    const failed = !race.published && ci === 0;
    const audit = {
      word_count: 600 + ci * 7,
      verifiable_fact_count: failed ? Math.round(factCount * 0.6) : factCount,
      stated_position_count: sayCount,
      fact_checks_performed: failed ? 1 : race.spine.length,
      spine_issue_count: race.spine.length,
      spine_issues_covered: sayCount >= race.spine.length ? race.spine.length : sayCount,
      balance_check_passed: !failed,
      flag_reason: failed ? "scrutiny_halt" : null,
      flagged_at: failed ? "2026-06-30T12:00:00Z" : null,
    };
    profiles.push(
      `(${q(cand.id)}, ${q(race.id)}, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ${q(JSON.stringify(audit))}::jsonb)`
    );
  });
}

const header = `-- FICTIONAL demo fixtures for development (generated by
-- scripts/build-demo-seed.mjs). Every id is demo- prefixed; every person,
-- program, act, and statistic here is invented. Remove with
-- scripts/demo-teardown.sql.
`;

const part1 = `${header}
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
${sources.join(",\n")}
ON CONFLICT (source_id) DO NOTHING;

INSERT INTO race (race_id, office, level, district, election, is_open_seat, incumbent_id, candidate_ids, key_dates) VALUES
${races.join(",\n")};

INSERT INTO candidate (candidate_id, legal_name, party, office_sought, is_incumbent, qualifying_status, prior_offices, official_site, fec_id) VALUES
${candidates.join(",\n")};

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
${issues.join(",\n")};
`;

const part2 = `${header}
INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
${claims.join(",\n")};
`;

const part3 = `${header}
INSERT INTO claim_source (claim_id, source_id) VALUES
${claimSources.join(",\n")};

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
${positions.join(",\n")};

INSERT INTO candidate_social_account (candidate_id, platform, handle, handle_norm, url, provenance, provenance_source_id, status, verified_at) VALUES
${socials.join(",\n")};

INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
${profiles.join(",\n")};

INSERT INTO race_publication (race_id, status, published_at, note) VALUES
${publications.join(",\n")};
`;

const seed = part1 + "\n" + part2 + "\n" + part3;

const teardown = `-- Removes every fictional demo- fixture row (reverse dependency order).
DELETE FROM race_publication WHERE race_id LIKE 'demo-%';
DELETE FROM candidate_social_account WHERE candidate_id LIKE 'demo-%';
DELETE FROM position WHERE position_id LIKE 'demo-%';
DELETE FROM claim_source WHERE claim_id LIKE 'demo-%';
DELETE FROM claim WHERE claim_id LIKE 'demo-%';
DELETE FROM issue WHERE issue_id LIKE 'demo-%';
DELETE FROM profile WHERE candidate_id LIKE 'demo-%';
DELETE FROM candidate WHERE candidate_id LIKE 'demo-%';
DELETE FROM race WHERE race_id LIKE 'demo-%';
DELETE FROM news_item WHERE title LIKE 'DEMO:%' OR race_id LIKE 'demo-%';
DELETE FROM source WHERE source_id LIKE 'demo-%';
`;

if (candFilter) {
  const blocks = [header.trim()];
  const add = (cols, rows, tail = ";") => {
    if (rows.length) blocks.push(`INSERT INTO ${cols} VALUES\n${rows.join(",\n")}${tail}`);
  };
  add(
    "source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at)",
    sources,
    "\nON CONFLICT (source_id) DO NOTHING;"
  );
  add("issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order)", issues);
  add("candidate (candidate_id, legal_name, party, office_sought, is_incumbent, qualifying_status, prior_offices, official_site, fec_id)", candidates);
  add("claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification)", claims);
  add("claim_source (claim_id, source_id)", claimSources);
  add("position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage)", positions);
  add("candidate_social_account (candidate_id, platform, handle, handle_norm, url, provenance, provenance_source_id, status, verified_at)", socials);
  add("profile (candidate_id, race_id, facts, positions, opinions, audit)", profiles);
  if (raceUpdates.length) blocks.push(raceUpdates.join("\n"));
  const delta = `BEGIN;\n\n${blocks.join("\n\n")}\n\nCOMMIT;\n`;
  writeFileSync(path.join(root, "scripts", "demo-candidates-delta.sql"), delta);
  console.log(
    `demo-candidates-delta.sql: ${candidates.length} candidates, ${claims.length} claims, ${raceUpdates.length} race updates`
  );
} else if (onlyIds) {
  writeFileSync(path.join(root, "scripts", "demo-seed-delta.sql"), seed);
  console.log(
    `demo-seed-delta.sql (${onlyIds.join(",")}): ${races.length} races, ${candidates.length} candidates, ${claims.length} claims`
  );
} else {
  writeFileSync(path.join(root, "scripts", "demo-seed.sql"), seed);
  writeFileSync(path.join(root, "scripts", "demo-seed-1.sql"), part1);
  writeFileSync(path.join(root, "scripts", "demo-seed-2.sql"), part2);
  writeFileSync(path.join(root, "scripts", "demo-seed-3.sql"), part3);
  writeFileSync(path.join(root, "scripts", "demo-teardown.sql"), teardown);
  console.log(
    `demo-seed.sql: ${races.length} races, ${candidates.length} candidates, ${claims.length} claims, ${positions.length} positions`
  );
}
