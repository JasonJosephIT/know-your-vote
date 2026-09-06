import Link from "next/link";
import { MeasureCompare } from "@/components/features/MeasureCompare";
import { MeasureThreshold } from "@/components/features/MeasureThreshold";
import { getActiveMeasures, getMeasureBrief } from "@/lib/measures";

export const revalidate = 3600;

/* Prerender every published measure; getActiveMeasures reads through RLS, so
   unpublished ones are absent by construction rather than filtered here. */
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
  const brief = await getMeasureBrief(measureId);
  return {
    title: brief
      ? `Amendment ${brief.measure.number}: ${brief.measure.official_title} — Know Your Vote`
      : "Ballot question in review — Know Your Vote",
  };
}

export default async function MeasurePage({
  params,
}: {
  params: Promise<{ measureId: string }>;
}) {
  const { measureId } = await params;
  const brief = await getMeasureBrief(measureId);

  /* Unpublished, or published but lopsided — the read layer refuses both.
     Same honest-degradation copy as an unpublished race. */
  if (!brief) {
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

  const { measure } = brief;

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

      <MeasureCompare brief={brief} />

      <footer className="flex flex-wrap gap-4 text-caption text-on-surface-muted">
        <Link href="/methodology" className="underline underline-offset-2">
          How we stay fair
        </Link>
        <span>
          We describe what each side argues and what the measure does. You
          decide.
        </span>
      </footer>
    </main>
  );
}
