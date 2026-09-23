import Link from "next/link";
import { unstable_cache } from "next/cache";
import { createAnonServerClient } from "@/lib/supabase/server";
import type { ProfileAudit } from "@/types/schema";
import { ACTIVE_ELECTION_KIND } from "@/lib/election";
import { CATEGORIES } from "@/lib/news-issues";

export const revalidate = 3600;
export const metadata = { title: "How we stay fair — Know Your Vote" };

type ScrutinyRace = {
  raceId: string;
  office: string;
  rows: { name: string; audit: ProfileAudit }[];
};

const getScrutinyCounts = unstable_cache(
  async (): Promise<ScrutinyRace[]> => {
    // Degrade gracefully rather than crash the whole build when Supabase
    // isn't configured at build time — same guard the races page's
    // generateStaticParams (TASK-046) and sitemap (TASK-048) already use.
    try {
      const supabase = await createAnonServerClient();
      const [racesRes, profilesRes, candidatesRes] = await Promise.all([
        supabase
          .from("race")
          .select("race_id, office")
          .eq("election", ACTIVE_ELECTION_KIND)
          .order("race_id"),
        supabase.from("profile").select("candidate_id, race_id, audit"),
        supabase.from("candidate").select("candidate_id, legal_name"),
      ]);
      const names = new Map(
        (candidatesRes.data ?? []).map((c) => [c.candidate_id, c.legal_name])
      );
      return (racesRes.data ?? []).map((race) => ({
        raceId: race.race_id,
        office: race.office,
        rows: (profilesRes.data ?? [])
          .filter((p) => p.race_id === race.race_id)
          .map((p) => ({
            name: names.get(p.candidate_id) ?? p.candidate_id,
            audit: p.audit as ProfileAudit,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }));
    } catch {
      return [];
    }
  },
  ["scrutiny-counts"],
  { revalidate: 3600, tags: ["races"] }
);

/* The news issue categories, named from the taxonomy itself rather than
   retyped here, so a taxonomy change cannot leave this page describing a
   list that no longer exists. */
const ISSUE_CATEGORY_LIST = new Intl.ListFormat("en-US", {
  style: "long",
  type: "conjunction",
}).format(CATEGORIES.map((c) => c.label));

export default async function MethodologyPage() {
  const scrutiny = await getScrutinyCounts();

  /* Since 0033 a `listed` race is readable with no profile rows behind it
     (profile stays gated on `published`). A table of such a race would show
     no rows — or, rendered naively, zero verified facts — and either reads
     as a scrutiny RESULT about those candidates when it is only the absence
     of a brief. So a race with no profiles is named as "listed, not yet
     briefed" and never given a table; only a briefed race gets counts. */
  const briefed = scrutiny.filter((race) => race.rows.length > 0);
  const listedOnly = scrutiny
    .filter((race) => race.rows.length === 0)
    .sort((a, b) =>
      a.office.localeCompare(b.office, "en-US", { numeric: true })
    );

  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-overline uppercase tracking-[0.08em] text-accent-strong">
          How we stay fair
        </p>
        <h1 className="text-h1">Fairness you can check, not just trust</h1>
        <p className="text-body-lg text-on-surface-muted">
          Nothing is truly unbiased — so instead of asking you to trust us, we
          make fairness measurable, visible, and enforced. Here&apos;s the whole
          method, in plain language.
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Say, done, and true are kept separate</h2>
        <p className="text-body">
          Three separate systems handle three separate jobs. One captures what a
          candidate <strong>says</strong> about themselves, only from sources
          the candidate controls. One documents what they&apos;ve{" "}
          <strong>done</strong>, only from primary sources like votes and
          official records. One checks what&apos;s <strong>true</strong>,
          judging specific claims against a fixed six-value scale: Accurate,
          Mostly Accurate, Mixed, Mostly Inaccurate, Inaccurate, or
          Unverifiable. The three never blend — spin can&apos;t masquerade as
          record.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">No source, no claim</h2>
        <p className="text-body">
          Every claim you see links to the source it came from. A claim with no
          source is dropped before it ever reaches this site — that rule is
          enforced in the database itself, not by an editor&apos;s good
          intentions.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Silence is recorded, never filled in</h2>
        <p className="text-body">
          If a candidate has no stated position on a shared issue, we say
          exactly that: &quot;no stated position found.&quot; We never invent a
          position, and we never quietly drop the issue.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">The Balance Audit is a gate, not a goal</h2>
        <p className="text-body">
          Before a race can be published, an automatic audit checks that every
          candidate received comparable space and comparable scrutiny — the
          number of verified facts and fact-checks per candidate has to stay
          within fixed thresholds. If any candidate falls outside them, the race
          is <em>held back</em>, not published with a disclaimer. Equal
          treatment is structural.
        </p>
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
          Then it is <strong>briefed</strong>: what each candidate says, what
          they&apos;ve done, and what&apos;s verified appear only after the race
          passes the Balance Audit. A listed race never shows a position &mdash;
          not a partial set, and not the ones we happened to find first. Until
          the brief clears, the page says it is in review.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">The scrutiny counts, in the open</h2>
        <p className="text-body-sm text-on-surface-muted">
          For every published race: how many verified facts we hold per
          candidate, and how many fact-checks were performed. You&apos;re
          welcome to check the math.
        </p>
        {briefed.length === 0 && (
          <p className="text-body-sm text-on-surface-muted">
            No race has cleared the Balance Audit yet, so there are no counts to
            show.
          </p>
        )}
        {briefed.map((race) => (
          <div
            key={race.raceId}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <h3 className="text-h3">{race.office}</h3>
            <table className="mt-2 w-full text-body-sm">
              <thead>
                <tr className="text-left text-caption text-on-surface-muted">
                  <th className="py-1 pr-2 font-medium">Candidate</th>
                  <th className="py-1 pr-2 font-medium">Verified facts</th>
                  <th className="py-1 font-medium">Fact-checks</th>
                </tr>
              </thead>
              <tbody>
                {race.rows.map((row) => (
                  <tr key={row.name} className="border-t border-border">
                    <td className="py-1 pr-2">{row.name}</td>
                    <td className="py-1 pr-2">
                      {row.audit.verifiable_fact_count ?? "—"}
                    </td>
                    <td className="py-1">
                      {row.audit.fact_checks_performed ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {listedOnly.length > 0 && (
          <details className="rounded-lg border border-border bg-surface p-4">
            <summary className="cursor-pointer text-body-sm font-medium">
              Listed, not yet briefed ({listedOnly.length}{" "}
              {listedOnly.length === 1 ? "race" : "races"})
            </summary>
            <p className="mt-2 text-body-sm text-on-surface-muted">
              These races show who is on the ballot, but their briefs are still
              in review, so there is nothing to count yet. No count here is not
              a count of zero.
            </p>
            <ul className="mt-2 flex flex-col gap-1 text-body-sm">
              {listedOnly.map((race) => (
                <li key={race.raceId}>
                  <Link
                    href={`/races/${race.raceId}`}
                    className="text-primary underline underline-offset-2"
                  >
                    {race.office}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
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
          <Link
            href="/news/outlet"
            className="text-primary underline underline-offset-2"
          >
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
          page collects what other people have published about it and puts
          each link in one of five groups, by what kind of source it is:
        </p>
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-body">
          <li>
            <strong>Official documents</strong> &mdash; the ballot text, the
            resolution that put it there, a staff or revenue analysis.
          </li>
          <li>
            <strong>Research</strong> &mdash; studies and analyses with a
            method behind them, from universities, institutes and policy
            groups.
          </li>
          <li>
            <strong>Reporting</strong> &mdash; a newsroom explaining or
            covering it.
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
          commentary are shown under the side they argue for, in two columns
          of equal size. A ballot question is published only when both sides
          are represented; until then the page shows the ballot text alone.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">We describe. You decide.</h2>
        <p className="text-body">
          We never tell you who to vote for, never rank candidates, and never
          color-code parties. Candidate order follows one neutral rule (ballot
          order, otherwise alphabetical), applied identically everywhere. If
          anything here reads as slanted to you, use the &quot;flag this
          brief&quot; link on any candidate brief — skeptics are exactly who
          this page is for.
        </p>
      </section>
    </main>
  );
}
