import { unstable_cache } from "next/cache";
import { createAnonServerClient } from "@/lib/supabase/server";
import type { ProfileAudit } from "@/types/schema";
import { ACTIVE_ELECTION_KIND } from "@/lib/election";

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

export default async function MethodologyPage() {
  const scrutiny = await getScrutinyCounts();

  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-overline uppercase tracking-[0.08em] text-accent-strong">
          How we stay fair
        </p>
        <h1 className="text-h1">Fairness you can check, not just trust</h1>
        <p className="text-body-lg text-on-surface-muted">
          Nothing is truly unbiased — so instead of asking you to trust us, we
          make fairness measurable, visible, and enforced. Here&apos;s the
          whole method, in plain language.
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Say, done, and true are kept separate</h2>
        <p className="text-body">
          Three separate systems handle three separate jobs. One captures what
          a candidate <strong>says</strong> about themselves, only from sources
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
          within fixed thresholds. If any candidate falls outside them, the
          race is <em>held back</em>, not published with a disclaimer. Equal
          treatment is structural.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">The scrutiny counts, in the open</h2>
        <p className="text-body-sm text-on-surface-muted">
          For every published race: how many verified facts we hold per
          candidate, and how many fact-checks were performed. You&apos;re
          welcome to check the math.
        </p>
        {scrutiny.map((race) => (
          <div key={race.raceId} className="rounded-lg border border-border bg-surface p-4">
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
                    <td className="py-1 pr-2">{row.audit.verifiable_fact_count ?? "—"}</td>
                    <td className="py-1">{row.audit.fact_checks_performed ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
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
