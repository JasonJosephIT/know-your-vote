import Link from "next/link";
import { MeasureCompare } from "@/components/features/MeasureCompare";
import { MeasureThreshold } from "@/components/features/MeasureThreshold";
import { Card } from "@/components/ui/Card";
import { getActiveMeasures, getMeasureListing } from "@/lib/measures";

export const revalidate = 3600;

/* Prerender every visible measure — listed or published (0033).
   getActiveMeasures reads through RLS, so draft and in-review ones are absent
   by construction rather than filtered here. */
export async function generateStaticParams() {
  try {
    const measures = await getActiveMeasures();
    return measures.map((m) => ({ measureId: m.measure_id }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ measureId: string }>;
}) {
  const { measureId } = await params;
  const listing = await getMeasureListing(measureId);
  return {
    title: listing
      ? `Amendment ${listing.measure.number}: ${listing.measure.official_title} — Know Your Vote`
      : "Ballot question in review — Know Your Vote",
  };
}

export default async function MeasurePage({
  params,
}: {
  params: Promise<{ measureId: string }>;
}) {
  const { measureId } = await params;
  const listing = await getMeasureListing(measureId);

  /* Neither listed nor published: the measure row itself is hidden by RLS.
     Same honest-degradation copy as an unpublished race. */
  if (!listing) {
    return (
      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-4 px-5 py-8">
        <h1 className="text-h1">This ballot question is still in review</h1>
        <p className="text-body text-on-surface-muted">
          We publish a ballot question only when the case for it and the case
          against it are both present and comparably sourced. This one
          hasn&apos;t cleared that yet. Check back soon.
        </p>
        <Link
          href="/candidates?view=races"
          className="text-label text-primary underline underline-offset-2"
        >
          Back to your ballot
        </Link>
      </main>
    );
  }

  /* `brief` is null for a listed measure, and for a published one that
     fails the symmetry re-check — the read layer refuses to render that one
     lopsided. Both get the ballot text and nothing else: the verbatim summary
     is the Division of Elections' own wording, so it needs no audit, while a
     case for or against is our writing and waits for both sides. */
  const { measure, brief } = listing;

  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-5 px-5 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-caption text-on-surface-muted">
          {measure.jurisdiction === "FL" ? "Statewide" : measure.jurisdiction} ·
          Placed on the ballot by{" "}
          {measure.placed_by === "legislature"
            ? "the Legislature"
            : measure.placed_by === "citizen_initiative"
              ? "citizen initiative"
              : measure.placed_by.replace("_", " ")}
        </p>
        <h1 className="text-h1">
          Amendment {measure.number}: {measure.official_title}
        </h1>
      </header>

      <MeasureThreshold pct={measure.threshold_pct} />

      <section className="flex flex-col gap-2">
        <h2 className="text-h3">What the ballot says</h2>
        {/* The official summary verbatim — this is the wording a voter meets
            in the booth, so it is quoted, never paraphrased. */}
        <blockquote className="border-l-2 border-border-strong pl-4 text-body-sm text-on-surface">
          {measure.ballot_summary}
        </blockquote>
        <a
          href={measure.full_text_url}
          target="_blank"
          rel="noreferrer"
          className="w-fit text-caption text-primary underline underline-offset-2"
        >
          Read the full official text
        </a>
      </section>

      {brief ? (
        <MeasureCompare brief={brief} />
      ) : (
        /* In place of the comparison, never beside an empty one: two blank
           YES/NO columns would read as "nobody has an argument", which is
           a claim we have not checked. */
        <Card className="flex flex-col gap-2">
          <h2 className="text-h3">The case for and against</h2>
          <p className="text-body-sm text-on-surface-muted">
            The case for and against are in review. We publish arguments only
            when both sides are present and comparably sourced — until then,
            this is the official ballot text and nothing else.
          </p>
        </Card>
      )}

      <footer className="flex flex-wrap gap-4 text-caption text-on-surface-muted">
        <Link href="/methodology" className="underline underline-offset-2">
          How we stay fair
        </Link>
        <span>
          {brief
            ? "We describe what each side argues and what the measure does. You decide."
            : "We quote the ballot as it is printed. You decide."}
        </span>
      </footer>
    </main>
  );
}
