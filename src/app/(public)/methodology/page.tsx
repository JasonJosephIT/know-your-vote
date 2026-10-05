import Link from "next/link";
import { unstable_cache } from "next/cache";
import { createAnonServerClient } from "@/lib/supabase/server";
import type { ProfileAudit } from "@/types/schema";
import { ACTIVE_ELECTION_KIND } from "@/lib/election";
import { CATEGORIES, SUB_ISSUES } from "@/lib/news-issues";
import { COVERED_COUNTIES } from "@/lib/counties";
import { CONTACT_EMAIL } from "@/lib/contact";

export const revalidate = 3600;
export const metadata = { title: "How we stay fair — Know Your Vote" };

/* REWRITTEN 2026-10-04 (launch handoff §1, founder decision 1: approve the
   methodology rewrite — RECOMMENDED, pending founder confirmation).

   The old page described the system the CAP specs plan — three agents for
   what a candidate says, has done and what is true, a Balance Audit gating on
   verified facts and fact-checks, and a table of both per candidate. What
   shipped is one of the three: stated positions, quoted verbatim from the
   candidate's own site. Every published profile has verifiable_fact_count = 0
   and fact_checks_performed = 0 (live, 2026-10-04), and the audit's word_count
   gate runs at 150, which no race can breach. A trust page that promises more
   than the briefs do is the single biggest launch risk, so every sentence
   below describes what is live. Counts are read from the database; the
   numbers that can change on a refresh or a founder call are named constants
   below; the fixed settings written into the prose come from these, all
   under docs/general-election/brief-runs/ unless noted:
     - the 8-page cap, links read from the homepage only, and the About page
       read on 56 of 90 readable sites (ingest-jev-2026-09-29.md totals);
     - the 0.85 threshold on both commitment gates AND on the issue match
       (src/lib/policy-noul.ts readVerdict: one threshold for all three);
     - a passage that clears both gates but matches no issue is dropped
       (brief-rows.ts, reason "no_issue_matched"); in the two-gate run 878
       passages passed both gates and 482 also matched an issue, so about
       45% were not shown (gate2-2026-09-30.md);
     - the 15% stated-position flag (audit-2026-10-04.py);
     - "about 1 in 7 missed": the ONE-candidate, ONE-gate pilot, where a
       reviewer found 11 spine commitments the gate rejected beside 65 it
       passed (docs/general-election/pilot-run-2026-09-27.md, step 2 and
       finding 5). Recall with both gates has never been measured, and the
       second gate costs real commitments too (review-2026-09-30.md), so the
       copy says exactly that and no more.

     apply-2026-10-04.md, step4-2026-10-03.md, spine-proposal-2026-10-03.md,
     gate2-2026-09-30.md, review-2026-09-29.md, review-2026-09-30.md,
     audit-2026-10-04.py, FL-GOV/decisions.md, FL-GOV/profiler-review-prompt.md;
     src/lib/brief-rows.ts, scripts/candidate-site-ingest.ts (robots.txt,
     bot challenges, page cap); "Civic Awareness (Know Your Vote)/
     CAP_Balance_Audit_Spec_v1.md" and balance_audit_core.py. */

/* The day the candidate sites behind every published brief were read: the
   2026-09-29 Jev-link ingest (brief-runs/ingest-jev-2026-09-29.md), which
   FL-GOV was re-ingested in too (FL-GOV/decisions.md, 2026-09-29).

   UPDATE THIS ON A REFRESH. A re-ingest and re-apply (launch handoff §3,
   founder decision 7) leaves every "as of" line on this page wrong until this
   changes. It is a constant, not a query, because no table records the
   ingest date: source.retrieved_at keeps the FIRST time a URL was seen
   (ON CONFLICT DO NOTHING), so it reads 2026-09-27 for FL-GOV's pages. */
const BRIEF_SNAPSHOT_DATE = "2026-09-29";

/* The Balance Audit's word_count threshold as it is actually run: a per-call
   override of balance_audit_core in brief-runs/audit-2026-10-04.py and in
   FL-GOV's audit (FL-GOV/decisions.md, D2; spine-proposal Decision 2). The
   audit is a script, not app code, so this page cannot read it — change the
   two together. The copy below derives "can this gate hold a race back?" from
   the number, so lowering it under 100 rewrites that sentence by itself. */
const AUDIT_WORD_COUNT_PCT = 150;

/* RECOMMENDED (pending founder confirmation), launch handoff §1: the scrutiny
   table shows only what the audit really measures. Verified facts and
   fact-checks are 0 for every published candidate because no Record or
   Fact-Checker agent has run (brief-rows.ts rule 2), and a column of zeros
   reads as a finding about the candidates when it is a fact about us.

   TO FLIP: set this to true and the two columns come back, labelled "Not
   collected" rather than 0. If those agents ever run, replace the label with
   the real counts (audit.verifiable_fact_count, audit.fact_checks_performed)
   instead of flipping this. */
const SHOW_UNCOLLECTED_COLUMNS = false;

type ScrutinyColumn = {
  header: string;
  cell: (audit: ProfileAudit) => string;
};

/* What balance_audit_core actually reads from a profile today. A quote filed
   under two issues is two claims and renders twice, so it counts twice here,
   as it does in the audit (brief-rows.ts, wordCount). */
const MEASURED_COLUMNS: readonly ScrutinyColumn[] = [
  {
    header: "Quotes shown",
    cell: (a) => String(a.stated_position_count ?? 0),
  },
  {
    header: "Shared issues addressed",
    cell: (a) =>
      a.spine_issue_count
        ? `${a.spine_issues_covered ?? 0} of ${a.spine_issue_count}`
        : "—",
  },
  {
    header: "Words quoted",
    cell: (a) => (a.word_count ?? 0).toLocaleString("en-US"),
  },
];

const UNCOLLECTED_COLUMNS: readonly ScrutinyColumn[] = [
  { header: "Verified facts", cell: () => "Not collected" },
  { header: "Fact-checks", cell: () => "Not collected" },
];

const SCRUTINY_COLUMNS = SHOW_UNCOLLECTED_COLUMNS
  ? [...MEASURED_COLUMNS, ...UNCOLLECTED_COLUMNS]
  : MEASURED_COLUMNS;

/* The shared issues ("spine") each office is compared on, fixed by office,
   not by which issues the runs covered — founder decision 2026-10-03, Option
   2 in spine-proposal-2026-10-03.md; FL-GOV's is its D1. Both were chosen
   AFTER candidate sites had been read: FL-GOV's D1 (2026-09-27) after its
   2026-09-25 ingest, the rest on 2026-10-03 after the 2026-09-29 ingest and
   2026-09-30 scoring, with fill counts in front of the founder. So the copy
   must never say "before anyone's site is read"; what is true is that the
   rule is per office, the same for every race for it. Checked against the live
   `issue` rows (tier = 'spine') of every published race on 2026-10-04. The
   labels are read from the taxonomy, not retyped, for the same reason as
   ISSUE_CATEGORY_LIST below. */
const SPINE_BY_OFFICE: readonly { office: string; ids: readonly string[] }[] = [
  { office: "U.S. Senate and U.S. House", ids: ["B1", "B2", "B3", "B4"] },
  { office: "Governor", ids: ["A1", "A3", "A2", "A4"] },
  { office: "Chief Financial Officer", ids: ["A1", "A3", "B1", "A4"] },
  { office: "Attorney General", ids: ["B7", "KYV1", "B3", "A1"] },
  { office: "Commissioner of Agriculture", ids: ["A5", "KYV5", "KYV3", "A4"] },
  {
    office: "County commission and county mayor",
    ids: ["A2", "KYV3", "KYV4", "B7"],
  },
  { office: "School board", ids: ["A6", "KYV9", "KYV10"] },
];

const issueLabel = (id: string) =>
  SUB_ISSUES.find((s) => s.id === id)?.label ?? id;

const SNAPSHOT_LABEL = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
}).format(new Date(`${BRIEF_SNAPSHOT_DATE}T12:00:00Z`));

/* Variance is (max − min) / max, so it can never exceed 100% (CAP Balance
   Audit spec §3). A threshold at or above 100 is a gate that cannot close. */
const WORD_GATE_CAN_HOLD = AUDIT_WORD_COUNT_PCT < 100;

const COUNTY_LIST = new Intl.ListFormat("en-US", {
  style: "long",
  type: "disjunction",
}).format(COVERED_COUNTIES.map((c) => c.name));

type ScrutinyRace = {
  raceId: string;
  /* What the card is headed with. The 16 U.S. House races all share the
     office "United States Representative" and differ only in `district`
     (FL-7 … FL-28), so a federal race with a district is labelled with it;
     county offices already name their district ("…, District 2"), and their
     `district` column is an internal code (BRO-CC-2), so it is not added. */
  label: string;
  rows: { name: string; audit: ProfileAudit }[];
};

const raceLabel = (race: {
  office: string;
  level: string | null;
  district: string | null;
}) =>
  race.level === "federal" && race.district
    ? `${race.office}, ${race.district}`
    : race.office;

type ProfileRow = {
  candidate_id: string;
  race_id: string;
  audit: ProfileAudit;
  candidate: { legal_name?: string } | { legal_name?: string }[] | null;
};

const getScrutinyCounts = unstable_cache(
  async (): Promise<ScrutinyRace[]> => {
    // Degrade gracefully rather than crash the whole build when Supabase
    // isn't configured at build time — same guard the races page's
    // generateStaticParams (TASK-046) and sitemap (TASK-048) already use.
    try {
      const supabase = await createAnonServerClient();
      /* Two reads, in parallel. The candidate's name is embedded in the
         profile read rather than fetched as all 299 candidate rows; RLS
         returns profiles for published races only, so this is the brief
         population and nothing else. */
      const [racesRes, profilesRes] = await Promise.all([
        supabase
          .from("race")
          .select("race_id, office, level, district")
          .eq("election", ACTIVE_ELECTION_KIND),
        supabase
          .from("profile")
          .select("candidate_id, race_id, audit, candidate(legal_name)"),
      ]);
      const profiles = (profilesRes.data ?? []) as ProfileRow[];
      return (racesRes.data ?? []).map((race) => ({
        raceId: race.race_id,
        label: raceLabel(race),
        rows: profiles
          .filter((p) => p.race_id === race.race_id)
          .map((p) => {
            const c = Array.isArray(p.candidate) ? p.candidate[0] : p.candidate;
            return {
              name: c?.legal_name ?? p.candidate_id,
              audit: p.audit,
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name)),
      }));
    } catch {
      return [];
    }
  },
  /* Bump on any change to the cached shape (v3: `label` replaced `office`),
     so an entry cached by an older deploy is never read as the new one. */
  ["scrutiny-counts-v3"],
  { revalidate: 3600, tags: ["races"] }
);

/* The news issue categories, named from the taxonomy itself rather than
   retyped here, so a taxonomy change cannot leave this page describing a
   list that no longer exists. */
const ISSUE_CATEGORY_LIST = new Intl.ListFormat("en-US", {
  style: "long",
  type: "conjunction",
}).format(CATEGORIES.map((c) => c.label));

/* By label, numerically, so FL-7 sorts before FL-10; race_id breaks any tie
   so the order never depends on what order the database returned. */
const byLabel = (a: ScrutinyRace, b: ScrutinyRace) =>
  a.label.localeCompare(b.label, "en-US", { numeric: true }) ||
  a.raceId.localeCompare(b.raceId, "en-US", { numeric: true });

const linkClass = "text-primary underline underline-offset-2";

export default async function MethodologyPage() {
  const scrutiny = await getScrutinyCounts();

  /* Since 0033 a `listed` race is readable with no profile rows behind it
     (profile stays gated on `published`). A table of such a race would show
     no rows — or, rendered naively, zero quotes — and either reads as a
     result about those candidates when it is only the absence of a brief.
     So a race with no profiles is named as "listed, no brief" and never
     given a table; only a briefed race gets counts. */
  const briefed = scrutiny.filter((race) => race.rows.length > 0).sort(byLabel);
  const listedOnly = scrutiny
    .filter((race) => race.rows.length === 0)
    .sort(byLabel);
  const candidateCount = briefed.reduce((n, r) => n + r.rows.length, 0);
  const quoteCount = briefed.reduce(
    (n, r) =>
      n +
      r.rows.reduce((m, row) => m + (row.audit.stated_position_count ?? 0), 0),
    0
  );

  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-overline uppercase tracking-[0.08em] text-accent-strong">
          How we stay fair
        </p>
        <h1 className="text-h1">Fairness you can check, not just trust</h1>
        <p className="text-body-lg text-on-surface-muted">
          Nothing is truly unbiased, so instead of asking you to trust us, we
          show you the whole method in plain language: what we publish, the
          checks it passes, and the same rules every candidate gets.
        </p>
        <p className="text-body-sm text-on-surface-muted">
          Where it falls short is here too:{" "}
          <a href="#limits" className={linkClass}>
            known limits
          </a>{" "}
          and{" "}
          <a href="#not-covered" className={linkClass}>
            what we don&apos;t cover
          </a>
          .
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Candidates in their own words</h2>
        <p className="text-body">
          A brief shows one thing: what each candidate says about the issues,
          quoted word for word from their own official campaign website. We
          don&apos;t summarize, paraphrase or rewrite, and no one edits a quote
          by hand. The website is one we have opened and confirmed names the
          candidate and the office.
        </p>
        <p className="text-body">
          We quote nothing else: not news coverage, not opponents, not parties,
          advocacy groups or endorsers. A quote shows what a candidate says. It
          is not a fact we have checked, and we don&apos;t rate whether it is
          true.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">No source, no quote</h2>
        <p className="text-body">
          Every quote links to the page it came from, so you can read it in
          context. The step that writes a brief stores each quote together with
          its page, and the page that shows a brief only shows quotes that have
          one. A quote without a source never reaches you.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">How a quote gets here</h2>
        <p className="text-body">
          Every candidate goes through the same steps, with the same settings.
        </p>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-body">
          <li>
            <strong>We read the site.</strong> The homepage, then up to 8 more
            pages linked from it that are most likely to hold the
            candidate&apos;s positions, plus their About page when the site has
            one we can find. The site is split into passages, each kept exactly
            as written.
          </li>
          <li>
            <strong>Two questions for every passage, then its issue.</strong> An
            AI model asks whether the passage commits the candidate to something
            they will do, support, oppose, fund or change, and whether that
            commitment is the candidate&apos;s own, rather than biography, a
            past record, someone else&apos;s endorsement or criticism of an
            opponent. It also asks which of our{" "}
            <a href="#issue-list" className={linkClass}>
              {SUB_ISSUES.length} issues
            </a>{" "}
            the passage is about. A passage is quoted only if the model is at
            least 85% sure of both questions and also at least 85% sure it is
            about one of those issues. It sorts passages; it never writes a word
            you read.
          </li>
          <li>
            <strong>A second review.</strong> A separate review checks every
            candidate&apos;s results against one fixed checklist: every passage
            comes from the candidate&apos;s own site, every quote matches the
            site character for character, nothing that is only biography or a
            past record is counted as a position, and silence is recorded rather
            than filled. That review is also done by an AI model, with the same
            written instructions for every candidate. Where it flagged a
            passage, a person decided by one rule for everyone: a passage that
            only describes a past record, with no commitment, is left out.
          </li>
          <li>
            <strong>The audit, then a person.</strong> The race goes through the
            Balance Audit below, and a person approves it before it is
            published. A problem is fixed by running the same steps again, never
            by editing the result.
          </li>
        </ol>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">
          Every race for an office asks the same questions
        </h2>
        <p className="text-body">
          Each brief lines the candidates up side by side on a few shared
          issues. Those issues are set by the office, the same for every race
          for that office, rather than picked from what the candidates happened
          to write about, so no candidate&apos;s emphasis, or the length of
          their website, decides what everyone is compared on:
        </p>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-body">
          {SPINE_BY_OFFICE.map(({ office, ids }) => (
            <li key={office}>
              <strong>{office}:</strong> {ids.map(issueLabel).join("; ")}.
            </li>
          ))}
          <li>
            <strong>Clerk of the Courts:</strong> none of our issues fits the
            office, so a clerk race has no shared issues.
          </li>
        </ul>
        {/* brief-rows.ts: a passage that clears both gates is still dropped
            ("no_issue_matched") unless it matches one of the SUB_ISSUES at the
            same 0.85. So the shared issues decide what is compared side by
            side, and the full list decides what can be shown at all. The list
            below is SUB_ISSUES, the taxonomy the runs asked (tax-7, ASKABLE in
            policy-noul.ts); a taxonomy change shows here at once, so it is
            true of the briefs only after a re-run under it. */}
        <p className="text-body">
          A position on one of our other issues still appears, under that issue,
          so the shared issues decide only what is compared side by side. But we
          show a position only when it fits one of our {SUB_ISSUES.length}{" "}
          issues. A position on anything outside that list isn&apos;t shown (see{" "}
          <a href="#limits" className={linkClass}>
            known limits
          </a>
          ).
        </p>
        <details
          id="issue-list"
          className="rounded-lg border border-border bg-surface p-4"
        >
          <summary className="cursor-pointer text-body-sm font-medium">
            All {SUB_ISSUES.length} issues
          </summary>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-body-sm">
            {SUB_ISSUES.map((s) => (
              <li key={s.id}>{s.label}</li>
            ))}
          </ul>
        </details>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Silence is recorded, never filled in</h2>
        <p className="text-body">
          If a candidate has no stated position on a shared issue, we say
          exactly that: &quot;No stated position found.&quot; We never invent a
          position, never fill the gap from another source, and never quietly
          drop the issue.
        </p>
        <p className="text-body">
          It can mean several things, and we don&apos;t guess which: the
          candidate&apos;s site doesn&apos;t state a position on it; it does,
          but our two questions missed it or we didn&apos;t match it to this
          issue; it does, on a page we didn&apos;t read (see{" "}
          <a href="#limits" className={linkClass}>
            known limits
          </a>
          ); or we could not read the site at all, because there isn&apos;t one,
          it blocked us, or it asked not to be read.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">How we read campaign sites</h2>
        <p className="text-body">
          We read a campaign site the way a polite visitor would: a handful of
          pages, one at a time, with a pause between them. If a site&apos;s
          robots.txt file asks crawlers to stay out, whether all crawlers, ours
          by name, or Anthropic&apos;s AI crawlers, we don&apos;t read it.
        </p>
        <p className="text-body">
          Our reader says who it is and never poses as anything else. Some sites
          show an automatic &quot;checking your browser&quot; screen; we let
          that check run, as any visitor&apos;s browser does. We never solve a
          captcha and never work around a block. If a site still won&apos;t let
          us in, we quote nothing from it.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        {/* The thresholds as run, not as the spec defaults them
            (CAP_Balance_Audit_Spec_v1.md §2): word_count is overridden per
            race to AUDIT_WORD_COUNT_PCT, everything else is the default. */}
        <h2 className="text-h2">The Balance Audit, as it is actually set</h2>
        <p className="text-body">
          Before a race is published, an automatic audit compares its
          candidates. It is plain arithmetic, with no AI in it, over counts like
          the ones in the table below. For each count it measures the gap
          between the candidate with the most and the candidate with the least,
          as a share of the most. If one candidate&apos;s quotes add up to 1,000
          words and another&apos;s to 250, the gap is 75%. A gap can never be
          more than 100%.
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-body">
          <li>
            <strong>Words quoted</strong> is the check meant to hold a race back
            when one candidate gets far more space than another. Its limit is
            set at {AUDIT_WORD_COUNT_PCT}%.{" "}
            {WORD_GATE_CAN_HOLD ? (
              <>
                A race whose gap is wider than that is held back, not published
                with a note.
              </>
            ) : (
              <>
                No gap can reach that, so in practice it never holds a race
                back. That is a deliberate choice: campaign sites differ hugely
                in length, some candidates have no site at all, and holding a
                race back for that would mean publishing nothing about what any
                of its candidates say. The difference is shown instead of
                hidden: every candidate&apos;s word count is in the table below.
              </>
            )}
          </li>
          <li>
            <strong>Verified facts and fact-checks</strong> have checks of the
            same kind, but we don&apos;t collect either yet. Every candidate has
            zero of both, so those two checks pass without measuring anything.
          </li>
          <li>
            <strong>Quotes shown</strong> and{" "}
            <strong>shared issues addressed</strong> never hold a race back. A
            gap of more than 15% in quotes, or any gap at all in shared issues
            addressed, is flagged for a person to see, and the race is then
            published as it is. We never even it out by adding words for a
            quieter candidate.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">The audit&apos;s numbers, in the open</h2>
        <p className="text-body-sm text-on-surface-muted">
          For every published race, what the audit measured for each candidate.
          A quote filed under two issues appears twice in the brief, so it
          counts twice here. You&apos;re welcome to check the math against any
          brief.
        </p>
        {briefed.length === 0 ? (
          <p className="text-body-sm text-on-surface-muted">
            No race has cleared the Balance Audit yet, so there are no numbers
            to show.
          </p>
        ) : (
          <p className="text-body-sm text-on-surface-muted">
            {briefed.length} published {briefed.length === 1 ? "race" : "races"}
            , {candidateCount}{" "}
            {candidateCount === 1 ? "candidate" : "candidates"},{" "}
            {quoteCount.toLocaleString("en-US")} quotes, all as of{" "}
            {SNAPSHOT_LABEL}.
          </p>
        )}
        {briefed.map((race) => (
          <div
            key={race.raceId}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <h3 id={`scrutiny-${race.raceId}`} className="text-h3">
              <Link
                href={`/races/${race.raceId}`}
                className="underline decoration-border-strong underline-offset-4 hover:decoration-current"
              >
                {race.label}
              </Link>
            </h3>
            {/* Scrolls inside its card, never the page, if a long name and
                four numbers outgrow a phone. */}
            <div className="mt-2 overflow-x-auto">
              <table
                aria-labelledby={`scrutiny-${race.raceId}`}
                className="w-full text-body-sm"
              >
                <thead>
                  <tr className="text-left text-caption text-on-surface-muted">
                    <th scope="col" className="py-1 pr-2 font-medium">
                      Candidate
                    </th>
                    {SCRUTINY_COLUMNS.map((col) => (
                      <th
                        key={col.header}
                        scope="col"
                        className="py-1 pr-2 text-right font-medium last:pr-0"
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {race.rows.map((row) => (
                    <tr key={row.name} className="border-t border-border">
                      <th
                        scope="row"
                        className="py-1 pr-2 text-left font-normal"
                      >
                        {row.name}
                      </th>
                      {SCRUTINY_COLUMNS.map((col) => (
                        <td
                          key={col.header}
                          className="py-1 pr-2 text-right tabular-nums last:pr-0"
                        >
                          {col.cell(row.audit)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {listedOnly.length > 0 && (
          <details className="rounded-lg border border-border bg-surface p-4">
            <summary className="cursor-pointer text-body-sm font-medium">
              Listed, no brief ({listedOnly.length}{" "}
              {listedOnly.length === 1 ? "race" : "races"})
            </summary>
            <p className="mt-2 text-body-sm text-on-surface-muted">
              These races show who is on the ballot but have no brief, so there
              is nothing to count. No count here is not a count of zero.
            </p>
            <ul className="mt-2 flex flex-col gap-1 text-body-sm">
              {listedOnly.map((race) => (
                <li key={race.raceId}>
                  <Link href={`/races/${race.raceId}`} className={linkClass}>
                    {race.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Listed before briefed</h2>
        <p className="text-body">
          A race reaches this site in two steps. First it is{" "}
          <strong>listed</strong>: we show who is on the ballot and nothing
          more. That means the names printed on the ballot &mdash; from the
          Florida Division of Elections&apos; general-election candidate list
          for state and federal races, and from each county Supervisor of
          Elections&apos; candidate list for county seats &mdash; each
          candidate&apos;s party as they filed it, their official campaign site
          where we have opened the page and confirmed it names the candidate and
          the office, and whether the seat was already decided. All of that is
          public record, and every candidate in the race gets the same card.
        </p>
        <p className="text-body">
          Then it is <strong>briefed</strong>: what each candidate says, quoted
          from their own site, appears only after the race passes the Balance
          Audit and a person approves it. A listed race never shows a position
          &mdash; not a partial set, and not the ones we happened to find first.
        </p>
        <p className="text-body">
          A race stays listed, with no brief, when there is nothing to compare:
          when we read its candidates&apos; sites, none of them stated a
          position that passed our checks, or none had a site we could read. A
          page that said &quot;No stated position found&quot; for every
          candidate on every issue would add nothing to the list of names, and
          could read as a judgment on them. A race can also be listed for a
          short time while its brief is rebuilt.
        </p>
      </section>

      <section id="limits" className="flex flex-col gap-2">
        <h2 className="text-h2">Known limits</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-body">
          <li>
            <strong>Some real positions are missed.</strong> The two questions
            are strict on purpose, to keep biography and past records out, and
            that costs some real commitments. When we checked the first question
            against one candidate&apos;s site, it missed about 1 in 7 of the
            positions a reviewer found. The second question, added later, turns
            away more, and we have not measured how many. So &quot;No stated
            position found&quot; means we found none that passed our checks, not
            that the candidate has none.
          </li>
          <li>
            <strong>
              Positions outside our list of issues aren&apos;t shown.
            </strong>{" "}
            A commitment that fits none of our{" "}
            <a href="#issue-list" className={linkClass}>
              {SUB_ISSUES.length} issues
            </a>{" "}
            closely enough is left out, even when it passed both questions.
            Across every site we read, that was about 45 of every 100 passages
            that passed both.
          </li>
          <li>
            <strong>We read at most 8 pages of each site</strong>, besides the
            homepage and About page, and only pages the homepage links to. A
            position stated only deeper in a site can be missed.
          </li>
          <li>
            <strong>Briefs are a snapshot.</strong> We read the candidates&apos;
            sites on {SNAPSHOT_LABEL}. Anything added or changed since then
            isn&apos;t here yet.
          </li>
          <li>
            <strong>Some races have no brief.</strong> When no candidate in a
            race had a stated position we could quote, we list who is on the
            ballot instead.
          </li>
          <li>
            <strong>Some candidates could not be read.</strong> A candidate with
            no campaign site, a site that blocked our reader, or a site that
            opted out in its robots.txt shows &quot;No stated position
            found&quot; on every shared issue.
          </li>
          <li>
            <strong>Length is shown, not evened out.</strong> A candidate who
            writes more about their positions gets more space.
          </li>
        </ul>
      </section>

      <section id="not-covered" className="flex flex-col gap-2">
        <h2 className="text-h2">What we don&apos;t cover</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-body">
          <li>
            <strong>Records and votes.</strong> We don&apos;t cover what a
            candidate has done in office, how they voted, or what they passed.
          </li>
          <li>
            <strong>Fact-checks.</strong> We don&apos;t rate whether what a
            candidate says is true.
          </li>
          <li>
            <strong>Biographies.</strong> There is no bio section. We quote a
            candidate&apos;s About page only where it states a position.
          </li>
          <li>
            <strong>Judicial retention.</strong> The questions on whether to
            keep a Florida Supreme Court justice or an appeals court judge in
            office are on Florida ballots, but we don&apos;t cover them.
          </li>
          <li>
            <strong>Races outside our area.</strong> We cover the statewide
            races and amendments, the U.S. House districts that include part of{" "}
            {COUNTY_LIST} County, and the county commission, school board,
            Orange County mayor and Orange County clerk races in those four
            counties. We don&apos;t cover Florida House or Florida Senate seats,
            other judicial races, county or city ballot questions, city races,
            or local races anywhere else.
          </li>
        </ul>
        <p className="text-body">
          For your official sample ballot, and for anything this site
          doesn&apos;t cover, check with your county Supervisor of Elections or
          the{" "}
          <a href="https://dos.fl.gov/elections/" className={linkClass}>
            Florida Division of Elections
          </a>
          .
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">We show the ballot, not the filing list</h2>
        <p className="text-body">
          The state&apos;s filing list includes everyone who ever ran for a
          seat, not everyone who will appear on Election Day. We show only the
          candidates with a printed line on the ballot &mdash; those marked
          Qualified (QUA) or Unopposed (UNO). We leave out candidates who were
          Defeated in the primary (DEF), who Did Not Qualify (DNQ), who Withdrew
          (WIT), or who were Removed (REM). We also leave out qualified write-in
          candidates: a write-in has no printed name on the ballot, only a blank
          line for voters to fill in themselves, so there is nothing on the
          ballot itself for us to show. This page shows the ballot as it will
          look in the booth, not every name that was ever in the race.
        </p>
        <p className="text-body">
          Some seats are settled before November, and we list them rather than
          leave a gap &mdash; a voter whose seat was decided should be able to
          see who holds it and why it isn&apos;t on the ballot. They come in two
          kinds, and we keep them apart. A seat is <strong>unopposed</strong>{" "}
          when nobody filed against the candidate: Florida law (F.S. 101.151(7))
          then keeps the contest off the ballot, and the candidate takes the
          office. A seat was <strong>decided in the primary</strong> when a
          candidate won it outright in August, as Florida&apos;s nonpartisan
          county races, such as school board, do when someone clears half the
          vote. Both are missing from the November ballot, for opposite reasons:
          in one, no one ran against the winner; in the other, people did, and
          an election was held. Saying &quot;no one filed&quot; about a seat
          that was won in a contested election would be untrue, so we never
          merge the two.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">How we label the news</h2>
        <p className="text-body">
          Every news card shows its publisher and whether the piece is reporting
          or opinion, so you always know what kind of writing you&apos;re
          looking at, and opinion pieces are set apart visually from reporting
          rather than left to blend in.
        </p>
        <p className="text-body">
          A card does not carry the outlet&apos;s political lean; the
          outlet&apos;s own page does, next to where the rating came from.{" "}
          <Link href="/news/outlet" className={linkClass}>
            Every outlet we draw from
          </Link>{" "}
          has a page that says one of three things:
        </p>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-body">
          <li>
            <strong>A rating</strong>, when an independent rating agency such as
            AllSides has published one &mdash; shown as they published it. It
            describes where the outlet sits, not the story; we never score
            articles, and we never correct or offset a lean.
          </li>
          <li>
            <strong>No independent rating</strong>, when no rating agency covers
            the outlet. That is true of most local newsrooms &mdash; the
            agencies rate national and large-metro outlets &mdash; and we say so
            rather than guess one.
          </li>
          <li>
            <strong>Lean does not apply</strong>, for sources that are primary
            documents rather than journalism, such as a government filing or an
            official record.
          </li>
        </ul>
        <p className="text-body-sm text-on-surface-muted">
          An outlet whose ratings exist but have not been reviewed yet says
          &quot;Not yet reviewed&quot; &mdash; a gap on our side, not a fact
          about the outlet.
        </p>
        <p className="text-body">
          Stories are also tagged with the issues they cover, from one fixed
          list of {CATEGORIES.length} categories: {ISSUE_CATEGORY_LIST}. A model
          does the tagging, and only after a story is already stored. Whether a
          story is stored is settled before any model sees it: it has to come
          from an outlet on our list, name a candidate on the ballot, and be
          approved by a person. Tagging adds a label and never decides what is
          stored, and a story without a tag still appears &mdash; just without
          an issue label.
        </p>
        <p className="text-body">
          Every candidate on the ballot gets the same number of news slots as
          every other candidate in their race, so heavier press coverage for one
          candidate never crowds the others off the page. That number comes from
          measuring how much coverage candidates actually get, and we have not
          measured it yet &mdash; until we do, every sourced story from the last
          30 days is shown, ordered by the same rule for every candidate. If we
          can&apos;t fill a candidate&apos;s slots with sourced stories, we say
          so plainly &mdash; a shortfall is stated, never padded with unrelated
          or unsourced items.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">
          How we order what people say about a ballot question
        </h2>
        <p className="text-body">
          We write no case for or against an amendment. Each ballot question
          page collects what other people have published about it and puts each
          link in one of five groups, by what kind of source it is:
        </p>
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-body">
          <li>
            <strong>Official documents</strong> &mdash; the ballot text, the
            resolution that put it there, a staff or revenue analysis.
          </li>
          <li>
            <strong>Research</strong> &mdash; studies and analyses with a method
            behind them, from universities, institutes and policy groups.
          </li>
          <li>
            <strong>Reporting</strong> &mdash; a newsroom explaining or covering
            it.
          </li>
          <li>
            <strong>Positions</strong> &mdash; a named person or organisation
            making the case: editorials, the sponsor, an advocacy group.
          </li>
          <li>
            <strong>Commentary</strong> &mdash; takes from people speaking for
            themselves: a video channel, a podcast, a blog.
          </li>
        </ol>
        <p className="text-body">
          The group decides where a link sits on the page, most established
          first. Nothing else does &mdash; not the outlet&apos;s lean, not
          whether it is a video or an article, and never our opinion of it. A
          video can sit in any group depending on who made it. Official
          documents and reporting are shown to everyone first; positions and
          commentary are shown under the side they argue for, in two columns of
          equal size. A ballot question is published only when both sides are
          represented. Until then its page shows the ballot text and any
          official documents, research and reporting, but no positions or
          commentary from either side.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">We describe. You decide.</h2>
        {/* Names the founder mailbox directly. The "flag this brief" link in
            CandidateBrief mails the same address (it pointed at a placeholder,
            flag@knowyourvote.example, until 2026-10-04). */}
        <p className="text-body">
          We never tell you who to vote for, never rank candidates, and never
          color-code parties. Candidate order follows one neutral rule (ballot
          order, otherwise alphabetical), applied identically everywhere. If
          anything here reads as slanted to you, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
            {CONTACT_EMAIL}
          </a>
          . Skeptics are exactly who this page is for.
        </p>
      </section>
    </main>
  );
}
