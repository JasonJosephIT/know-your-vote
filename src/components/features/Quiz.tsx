"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QuizResults } from "@/components/features/QuizResult";
import { track } from "@/lib/analytics";
import { readLocation } from "@/lib/location";
import { QUIZ_QUESTIONS } from "@/lib/quiz-questions";
import type { QuizResponse } from "@/types/app";

/* Where I Stand, un-gated (TASK-068).

   The quiz used to open with a ZIP field: five questions sat behind a
   location the answer barely depends on. Statewide races are five of the six
   candidate races, so the quiz now starts at the first question and runs
   against those. ZIP moves to the results step, where it does something
   visible — it adds the district race to a result already on screen — rather
   than standing between the voter and the feature.

   Losing the up-front ZIP means losing the up-front coverage check, which
   used to catch an out-of-coverage voter before they answered anything. That
   check now lands at the results step instead, and costs nothing when it
   fails: the statewide results stay on screen and the notice explains what
   could not be added. */

type Stage =
  | { kind: "intro" }
  | { kind: "questions"; index: number }
  | { kind: "loading" }
  | { kind: "results"; response: QuizResponse; usedZip: boolean }
  | { kind: "error"; message: string; races: Array<{ raceId: string; office: string }> };

export function Quiz() {
  const [stage, setStage] = useState<Stage>({ kind: "intro" });
  const [answers, setAnswers] = useState<Record<string, { choice?: string; freeText?: string }>>({});
  const [zip, setZip] = useState("");
  const [zipBusy, setZipBusy] = useState(false);
  const [zipNotice, setZipNotice] = useState<string | null>(null);

  /* One request shape for both paths — the results-step upgrade is the same
     quiz with a ZIP attached, not a second feature. */
  async function post(zipToUse?: string) {
    const stored = readLocation();
    const res = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zip: zipToUse,
        district:
          zipToUse && stored?.zip === zipToUse ? stored?.district : undefined,
        answers: Object.entries(answers).map(([questionId, a]) => ({
          questionId,
          ...a,
        })),
      }),
    });
    /* res.json() is untyped network data; naming the shape here beats letting
       `any` flow into setStage. The response is a QuizResponse on success and
       {error} on failure. */
    const data = (await res.json()) as Partial<QuizResponse> & { error?: string };
    return { ok: res.ok, data };
  }

  async function submit() {
    setStage({ kind: "loading" });
    try {
      const { ok, data } = await post();
      if (!ok) {
        setStage({
          kind: "error",
          message: data.error ?? "Couldn't process that — try again.",
          races: data.races ?? [],
        });
        return;
      }
      track("quiz_completed");
      setStage({ kind: "results", response: data as QuizResponse, usedZip: false });
    } catch {
      setStage({ kind: "error", message: "Couldn't process that — try again.", races: [] });
    }
  }

  /* The upgrade never destroys what the voter already has: on any failure the
     results stage is left untouched and only the notice changes. */
  async function addDistrictRace(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{5}$/.test(zip)) return;
    setZipNotice(null);
    setZipBusy(true);
    try {
      const { ok, data } = await post(zip);
      if (!ok) {
        setZipNotice(data.error ?? "We couldn't add that race — try again.");
        return;
      }
      track("zip_resolved");
      setStage({ kind: "results", response: data as QuizResponse, usedZip: true });
    } catch {
      setZipNotice("We couldn't add that race right now — try again in a moment.");
    } finally {
      setZipBusy(false);
    }
  }

  if (stage.kind === "intro") {
    return (
      <div className="flex flex-col gap-4">
        {/* Not "candidates who line up with you" — that is the alignment
            framing TASK-065 removed from the results, and it would be odd for
            the invitation to promise what the answer refuses to give. */}
        <p className="text-body-lg text-on-surface-muted">
          Answer a few neutral questions and we&apos;ll show you what every
          candidate has said about the issues you picked — all of them, nobody
          ranked, nothing recommended. No ZIP needed.
        </p>
        <Button onClick={() => setStage({ kind: "questions", index: 0 })}>
          Take the quiz
        </Button>
      </div>
    );
  }

  if (stage.kind === "questions") {
    const question = QUIZ_QUESTIONS[stage.index];
    const isLast = stage.index === QUIZ_QUESTIONS.length - 1;
    const current = answers[question.id] ?? {};

    const goNext = () =>
      isLast ? void submit() : setStage({ kind: "questions", index: stage.index + 1 });
    const goBack = () =>
      stage.index === 0
        ? setStage({ kind: "intro" })
        : setStage({ kind: "questions", index: stage.index - 1 });

    return (
      <div className="flex flex-col gap-4">
        <p className="text-caption text-on-surface-muted">
          Question {stage.index + 1} of {QUIZ_QUESTIONS.length}
        </p>
        <h2 className="text-h2">{question.prompt}</h2>

        {question.kind === "choice" ? (
          <div className="flex flex-col gap-2" role="radiogroup" aria-label={question.prompt}>
            {question.options?.map((opt) => {
              const selected = current.choice === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setAnswers((a) => ({ ...a, [question.id]: { choice: opt.id } }));
                  }}
                  className={`rounded-md border px-4 py-3 text-left text-body-sm transition-colors ${
                    selected
                      ? "border-primary bg-primary-muted text-primary-hover"
                      : "border-border-strong bg-surface hover:border-primary"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        ) : (
          <textarea
            value={current.freeText ?? ""}
            onChange={(e) =>
              setAnswers((a) => ({ ...a, [question.id]: { freeText: e.target.value } }))
            }
            rows={3}
            maxLength={400}
            placeholder="Optional — in your own words"
            className="w-full rounded-md border border-border-strong bg-surface px-[14px] py-3 text-body text-on-surface placeholder:text-on-surface-muted focus:border-primary focus:shadow-[inset_0_0_0_1px_var(--color-primary)] focus:outline-none"
          />
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={goBack}>
            Back
          </Button>
          <Button onClick={goNext}>{isLast ? "See candidates" : "Next"}</Button>
          <button
            type="button"
            onClick={goNext}
            className="text-body-sm text-on-surface-muted underline underline-offset-2 hover:text-on-surface"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  if (stage.kind === "loading") {
    return (
      <div className="flex flex-col gap-3" role="status">
        <p className="text-body-lg">Reading your answers…</p>
        <div className="h-24 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-24 animate-pulse rounded-lg bg-surface-muted" />
      </div>
    );
  }

  if (stage.kind === "error") {
    return (
      <div className="flex flex-col gap-3">
        <p role="alert" className="text-body text-on-surface-muted">
          {stage.message}
        </p>
        {stage.races.length > 0 && (
          <>
            <p className="text-body-sm text-on-surface-muted">
              The full briefs are always open:
            </p>
            <ul className="flex flex-col gap-1">
              {stage.races.map((r) => (
                <li key={r.raceId}>
                  <Link
                    href={`/races/${r.raceId}`}
                    className="text-label text-primary underline underline-offset-2"
                  >
                    {r.office}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        <Button variant="secondary" onClick={() => setStage({ kind: "intro" })}>
          Start over
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <QuizResults response={stage.response} />

      {stage.usedZip ? (
        <p className="text-caption text-on-surface-muted">
          Your congressional district race is included above.
        </p>
      ) : (
        <section className="flex flex-col gap-3 border-t border-border pt-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-h3">Add your U.S. House race</h2>
            <p className="text-caption text-on-surface-muted">
              These are the statewide races every Florida voter gets. Your
              congressional district race depends on where you live — add your
              ZIP and we&apos;ll include it here too.
            </p>
          </div>
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={addDistrictRace}>
            <label htmlFor="quiz-zip" className="sr-only">
              ZIP code
            </label>
            <Input
              id="quiz-zip"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              placeholder="Your ZIP code"
              value={zip}
              onChange={(e) => {
                setZip(e.target.value.replace(/\D/g, ""));
                if (zipNotice) setZipNotice(null);
              }}
              className="sm:max-w-[200px]"
            />
            <Button type="submit" disabled={!/^\d{5}$/.test(zip) || zipBusy}>
              {zipBusy ? "Adding…" : "Add my House race"}
            </Button>
          </form>
          {zipNotice && (
            <p role="alert" className="text-body-sm text-on-surface-muted">
              {zipNotice}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
