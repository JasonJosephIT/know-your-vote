"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QuizResults } from "@/components/features/QuizResult";
import { track } from "@/lib/analytics";
import { readLocation } from "@/lib/location";
import { QUIZ_QUESTIONS } from "@/lib/quiz-questions";
import type { QuizResponse, ResolveResult } from "@/types/app";

type Stage =
  | { kind: "intro" }
  | { kind: "zip" }
  | { kind: "questions"; index: number }
  | { kind: "loading" }
  | { kind: "results"; response: QuizResponse }
  | { kind: "error"; message: string; races: Array<{ raceId: string; office: string }> };

export function Quiz() {
  const [stage, setStage] = useState<Stage>({ kind: "intro" });
  const [zip, setZip] = useState("");
  const [answers, setAnswers] = useState<Record<string, { choice?: string; freeText?: string }>>({});
  const [zipChecking, setZipChecking] = useState(false);
  const [zipNotice, setZipNotice] = useState<string | null>(null);

  function start() {
    const stored = readLocation();
    if (stored?.zip) setZip(stored.zip);
    setZipNotice(null);
    setStage({ kind: "zip" });
  }

  /* Check coverage the moment the ZIP is submitted, not after the whole quiz
     — an out-of-coverage voter should hear it here, not five questions in. */
  async function checkZipThenAdvance(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{5}$/.test(zip)) return;
    setZipNotice(null);
    setZipChecking(true);
    try {
      const stored = readLocation();
      const params = new URLSearchParams({ zip });
      if (stored?.zip === zip && stored?.district) {
        params.set("district", stored.district);
      }
      const res = await fetch(`/api/resolve?${params}`);
      const data: ResolveResult = await res.json();
      if (!res.ok) {
        setZipNotice("We couldn't match that ZIP — double-check it and try again.");
        return;
      }
      if (!data.inCoverage) {
        setZipNotice(
          "We don't cover that area yet — right now it's the Miami, Fort Lauderdale, Tampa, and Orlando metros. Try a ZIP in one of those."
        );
        return;
      }
      if (data.needsCountyConfirm) {
        setZipNotice(
          "That ZIP spans more than one congressional district. Confirm your district on the home page first, then come back to the quiz."
        );
        return;
      }
      setStage({ kind: "questions", index: 0 });
    } catch {
      setZipNotice("We couldn't check that ZIP right now — try again in a moment.");
    } finally {
      setZipChecking(false);
    }
  }

  async function submit() {
    setStage({ kind: "loading" });
    try {
      const stored = readLocation();
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zip,
          district: stored?.zip === zip ? stored?.district : undefined,
          answers: Object.entries(answers).map(([questionId, a]) => ({
            questionId,
            ...a,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStage({
          kind: "error",
          message: data.error ?? "Couldn't process that — try again.",
          races: data.races ?? [],
        });
        return;
      }
      track("quiz_completed");
      setStage({ kind: "results", response: data });
    } catch {
      setStage({ kind: "error", message: "Couldn't process that — try again.", races: [] });
    }
  }

  if (stage.kind === "intro") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-body-lg text-on-surface-muted">
          Answer a few neutral questions and we&apos;ll point out candidates
          whose stated positions line up — every candidate shown, nobody
          ranked, nothing recommended.
        </p>
        <Button onClick={start}>Take the quiz</Button>
      </div>
    );
  }

  if (stage.kind === "zip") {
    return (
      <form className="flex flex-col gap-3" onSubmit={checkZipThenAdvance}>
        <label htmlFor="quiz-zip" className="text-label">
          First, your ZIP — so we quiz you on your actual ballot
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id="quiz-zip"
            inputMode="numeric"
            maxLength={5}
            placeholder="Enter your ZIP code"
            value={zip}
            onChange={(e) => {
              setZip(e.target.value.replace(/\D/g, ""));
              if (zipNotice) setZipNotice(null);
            }}
            className="sm:max-w-[200px]"
          />
          <Button type="submit" disabled={!/^\d{5}$/.test(zip) || zipChecking}>
            {zipChecking ? "Checking…" : "Next"}
          </Button>
        </div>
        {zipNotice && (
          <p role="alert" className="text-body-sm text-on-surface-muted">
            {zipNotice}
          </p>
        )}
      </form>
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
        ? setStage({ kind: "zip" })
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

  return <QuizResults response={stage.response} />;
}
