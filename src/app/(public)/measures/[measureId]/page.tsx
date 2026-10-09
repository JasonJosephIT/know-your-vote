import Link from "next/link";
import {
  MeasureNeutralBlock,
  MeasureResourceLadder,
} from "@/components/features/MeasureResourceLadder";
import { MeasureVoteMeaning } from "@/components/features/MeasureVoteMeaning";
import { Card } from "@/components/ui/Card";
import { getActiveMeasures, getMeasureListing } from "@/lib/measures";
import { heldNote } from "@/lib/measure-held-copy";

export const revalidate = 3600;

function formatNoteDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

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
      : "Ballot question not published — Know Your Vote",
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
     Same copy rule as an unpublished race. */
  if (!listing) {
    return (
      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-4 px-5 py-8">
        {/* Same reasoning as the race page's: RLS hides a measure in review
            and an ID that doesn't exist alike, so the copy can't promise it
            is coming. The old line ("only when what people say for it and
            against it are both collected") also predated the listed tier,
            under which a measure is visible before its sides are. */}
        <h1 className="text-h1">This ballot question isn&rsquo;t published</h1>
        <p className="text-body text-on-surface-muted">
          It may still be in review, or the link may be out of date.
        </p>
        <Link
          href="/"
          className="text-label text-primary underline underline-offset-2"
        >
          See the ballot questions we cover
        </Link>
      </main>
    );
  }

  /* `brief` is null for a listed measure, and for a published one that
     fails the symmetry re-check — the read layer refuses to render that one
     lopsided. A listed measure gets the ballot text plus its neutral rows
     (stance 'neutral': official documents, research and reporting that take
     no side; readable on a listed measure since 0041), and nothing that
     argues a side — sided research waits with the positions and commentary.
     The methodology page says the same. A published measure that fails the
     re-check gets no neutral rows (fetchMeasureListing takes them from the
     brief, which is null), so it shows the ballot text alone and the card
     below says so. The verbatim summary is the Division of Elections' own
     wording, so it needs no audit. */
  const { measure, brief, neutral = [] } = listing;
  const note = heldNote(measure.measure_id);

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
        {/* Official titles are long and all capitals (6–10 lines on a
            phone), so this h1 gets prose leading and neutral tracking
            instead of the short-heading 1.15 / −0.02em (interface review
            2026-10-05). */}
        <h1 className="text-h1 leading-[1.4] tracking-normal">
          Amendment {measure.number}: {measure.official_title}
        </h1>
      </header>

      {/* Mechanics only, the same for every amendment; the threshold lives
          inside it (MeasureVoteMeaning). Before the ballot text, which its
          YES box points down to. */}
      <MeasureVoteMeaning pct={measure.threshold_pct} />

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">What the ballot says</h2>
        {/* The official summary verbatim — this is the wording a voter meets
            in the booth, so it is quoted, never paraphrased. */}
        {/* Body size at a reading width (interface review 2026-10-05): this is
            the exact wording on the ballot, the hardest text on the page,
            and at 14px across the full 1120px column it ran ~154 characters
            a line. design.md caps prose at ~680px, as the race page does. */}
        <blockquote className="max-w-[680px] border-l-2 border-border-strong pl-4 text-body text-on-surface">
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
        <MeasureResourceLadder brief={brief} />
      ) : (
        /* In place of the ladder, never beside an empty one: two blank
           YES/NO columns would read as "nobody has an argument", which is
           a claim we have not checked. */
        <>
          <MeasureNeutralBlock items={neutral} />
          <Card className="flex flex-col gap-2">
            <h2 className="text-h3">What people say for and against it</h2>
            {note ? (
              <>
                {note.paragraphs.map((p) => (
                  <p key={p} className="max-w-[680px] text-body-sm text-on-surface-muted">
                    {p}
                  </p>
                ))}
                {/* The freeze (ballot-content-completion §3.5, BC8): nothing
                    is added to a measure page after 2026-10-17, so the
                    caption no longer promises a weekly look. */}
                <p className="max-w-[680px] text-caption text-on-surface-muted">
                  We stopped adding sources to this page on October 17, 2026,
                  for this election. This note was last updated{" "}
                  {formatNoteDate(note.updated)}.
                </p>
              </>
            ) : (
              /* A listed measure with no held note (§3.6.4, BC11). Through
                 Nov 3 only a measure taken down for a correction reaches
                 this branch, where "being collected" would be false; this
                 wording is true there and for any future listed measure. */
              <p className="max-w-[680px] text-body-sm text-on-surface-muted">
                This page shows no for or against columns right now. We show
                them only when the sources on both sides meet our rules, which
                the methodology page explains. Until then, this page shows{" "}
                {neutral.length > 0
                  ? "the official ballot text and the explainers above, and no case for either side."
                  : "the official ballot text and nothing else."}
              </p>
            )}
          </Card>
        </>
      )}

      <footer className="flex flex-wrap gap-4 text-caption text-on-surface-muted">
        <Link href="/methodology" className="underline underline-offset-2">
          How we stay fair
        </Link>
        <span>
          {brief
            ? "We collect what each side says and order it by the kind of source. We write none of it. You decide."
            : neutral.length > 0
              ? "We collect what others publish and order it by the kind of source. We write none of it. You decide."
              : "We quote the ballot as it is printed. You decide."}
        </span>
      </footer>
    </main>
  );
}
