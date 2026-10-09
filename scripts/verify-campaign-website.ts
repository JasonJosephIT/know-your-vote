/* The campaign-website slot (spec
   docs/superpowers/specs/2026-10-08-roster-completeness-design.md §3.7 and
   §6; D7, Recommended pending founder confirmation).

   Every candidate card, on all five surfaces, carries one slot that reads
   "Campaign website: <host>" or "Campaign website: none listed". Before it,
   an "Official site" link appeared only where a site was stored, which is a
   label some candidates got and others did not. This checks:

   1. The helper, campaignSite: the host drops "www."; a value safeHttpUrl
      refuses gives null, which the slot prints as "none listed".
   2. The component prints the label once, then the host link (with the
      candidate's name hidden after it) or "none listed".
   3. Each of the five surfaces renders <CampaignWebsite> exactly once, never
      behind a condition, from the row's official_site, and prints no site
      link of its own.
   4. "Official site" appears nowhere under src/components or src/app,
      comments included.
   5. Each guard above catches the change it exists for (mutations).

   Run: node scripts/verify-campaign-website.ts */

import { campaignSite } from "../src/lib/campaign-website.ts";
import { checker, edit, importVariant, read, sourceFiles, stripComments } from "./source-checks.ts";

const { check, mutation, done } = checker("campaign-website");

/* 1. The helper. */
type SiteModule = typeof import("../src/lib/campaign-website.ts");

function helperProblems(site: SiteModule["campaignSite"]): string[] {
  const problems: string[] = [];
  const cases: Array<[string | null, string | null]> = [
    ["https://www.cynthiaforbrowardschools.com/about", "cynthiaforbrowardschools.com"],
    ["http://WWW.Example.org", "example.org"],
    ["https://wwwexample.com/", "wwwexample.com"],
    ["https://shop.www.example.com/", "shop.www.example.com"],
    ["https://example.com", "example.com"],
    [null, null],
    ["", null],
    ["javascript:alert(1)", null],
    ["data:text/html,hi", null],
    ["mailto:team@example.com", null],
    ["ftp://example.com/", null],
    ["not a url", null],
  ];
  for (const [url, want] of cases) {
    let got: string | null;
    try {
      got = site(url)?.host ?? null;
    } catch (err) {
      problems.push(`campaignSite(${JSON.stringify(url)}) throws: ${String(err)}`);
      continue;
    }
    if (got !== want) {
      problems.push(`campaignSite(${JSON.stringify(url)}) host is ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
    }
  }
  if (site("https://www.example.com/a?b=1")?.href !== "https://www.example.com/a?b=1") {
    problems.push("the link's href must be the stored URL, unchanged");
  }
  return problems;
}

const helper = helperProblems(campaignSite);
check('campaignSite: the host without "www.", null for anything safeHttpUrl refuses', helper.length === 0, helper.join("; "));

/* 2. The component. */
const COMPONENT = "src/components/features/CampaignWebsite.tsx";

function componentProblems(code: string): string[] {
  const c = stripComments(code);
  const problems: string[] = [];
  if ((c.match(/\{"Campaign website: "\}/g) ?? []).length !== 1) {
    problems.push('the label {"Campaign website: "} must appear exactly once');
  }
  if ((c.match(/"none listed"/g) ?? []).length !== 1) problems.push('"none listed" must appear exactly once');
  if (!/const site = campaignSite\(url\);/.test(c)) problems.push("the link must come from campaignSite(url)");
  if (!/\{site \? \(/.test(c) || !/\) : \(\s*"none listed"\s*\)\}/.test(c)) {
    problems.push('the slot must print the link when there is a site and "none listed" otherwise');
  }
  if (!/<span className="sr-only">: \{name\}<\/span>/.test(c)) {
    problems.push("the link must keep the candidate's name as a visually hidden suffix");
  }
  if (/official_site/.test(c)) problems.push("the component takes the URL as a prop and reads no row");
  return problems;
}

const component = componentProblems(read(COMPONENT));
check(`${COMPONENT} prints "Campaign website: " then the host link or "none listed"`, component.length === 0, component.join("; "));

/* 3. The five surfaces. `row` is the name each card gives the candidate. */
const SURFACES = [
  { file: "src/components/features/CandidateBrief.tsx", row: "candidate" },
  { file: "src/components/features/RaceListing.tsx", row: "candidate" },
  { file: "src/components/features/RaceCompare.tsx", row: "candidate" },
  { file: "src/components/features/CandidateBrowser.tsx", row: "c" },
  { file: "src/components/features/SavedCandidates.tsx", row: "c" },
] as const;

/** The slot exactly as every card writes it, on one line. */
const slot = (row: string) => `<CampaignWebsite url={${row}.official_site} name={${row}.legal_name} />`;

function surfaceProblems(code: string, row: string): string[] {
  const c = stripComments(code);
  const problems: string[] = [];
  const exact = c.split(slot(row)).length - 1;
  const all = (c.match(/<CampaignWebsite\b/g) ?? []).length;
  if (exact !== 1 || all !== 1) {
    problems.push(`renders ${slot(row)} ${exact} time(s), <CampaignWebsite> ${all} time(s) in all; want exactly once`);
  }
  if (/(&&|\?|:)\s*\(?\s*<CampaignWebsite\b/.test(c)) problems.push("<CampaignWebsite> sits behind a condition; every card gets the slot");
  if (!/import\s*\{\s*CampaignWebsite\s*\}\s*from\s*["']@\/components\/features\/CampaignWebsite["']/.test(c)) {
    problems.push("must import CampaignWebsite from @/components/features/CampaignWebsite");
  }
  const rest = c.split(slot(row)).join("").replace(/official_site:\s*string\s*\|\s*null;/g, "");
  if (/official_site/.test(rest)) problems.push("reads official_site outside the slot (a second site link?)");
  return problems;
}

for (const { file, row } of SURFACES) {
  const problems = surfaceProblems(read(file), row);
  check(`${file} renders the slot once, unconditionally, from ${row}.official_site`, problems.length === 0, problems.join("; "));
}

/* 4. The old label is gone, comments included. */
const OLD_LABEL = /Official\s+site/;
function oldLabelOffenders(files: ReadonlyMap<string, string>): string[] {
  return [...files].filter(([, text]) => OLD_LABEL.test(text)).map(([file]) => file);
}
const ui = new Map(sourceFiles("src/components", "src/app").map((f) => [f, read(f)] as const));
const offenders = oldLabelOffenders(ui);
check(`"Official site" appears nowhere under src/components or src/app (${ui.size} files)`, offenders.length === 0, offenders.join(", "));

/* 5. Mutations. */
await mutation('the host keeps "www."', async () => {
  const m = await importVariant<SiteModule>("src/lib/campaign-website.ts", [['.replace(/^www\\./i, "")', ""]]);
  return helperProblems(m.campaignSite);
});
await mutation("a javascript: URL becomes a link (safeHttpUrl skipped)", async () => {
  const m = await importVariant<SiteModule>("src/lib/campaign-website.ts", [
    ["const href = safeHttpUrl(url);", "const href = url ? url : null;"],
  ]);
  return helperProblems(m.campaignSite);
});
await mutation('the component prints nothing instead of "none listed"', () =>
  componentProblems(edit(read(COMPONENT), /\) : \(\s*"none listed"\s*\)\}/, ") : null}")),
);
await mutation("the link loses the candidate's hidden name", () =>
  componentProblems(edit(read(COMPONENT), '<span className="sr-only">: {name}</span>', "")),
);
const brief = SURFACES[0];
await mutation("a card shows the slot only where a site is stored", () =>
  surfaceProblems(
    edit(read(brief.file), slot(brief.row), `{${brief.row}.official_site && ${slot(brief.row)}}`),
    brief.row,
  ),
);
await mutation("a card drops the slot", () => surfaceProblems(edit(read(brief.file), slot(brief.row), ""), brief.row));
await mutation("a card renders the slot twice", () =>
  surfaceProblems(edit(read(brief.file), slot(brief.row), `${slot(brief.row)}${slot(brief.row)}`), brief.row),
);
const saved = SURFACES[4];
await mutation("a card adds its own site link beside the slot", () =>
  surfaceProblems(
    edit(read(saved.file), slot(saved.row), `${slot(saved.row)}<a href={c.official_site ?? undefined}>site</a>`),
    saved.row,
  ),
);
await mutation('"Official site" comes back on one surface', () => {
  const copy = new Map(ui);
  copy.set(saved.file, `${read(saved.file)}\n// Official site\n`);
  return oldLabelOffenders(copy);
});

done();
