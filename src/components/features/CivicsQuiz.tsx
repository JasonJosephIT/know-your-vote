"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { track } from "@/lib/analytics";
import type { CivicsQuestion } from "@/lib/civics-quiz";

/* The /civics quiz: think of the answer, show it, then say whether you
   knew it (spec §2, §5). No multiple choice, so the page never picks real
   people to be wrong answers. Every card is the same template.

   The marks and the tally live only in this component: nothing is sent or
   stored, and civics_done carries no props. */

type Mark = "knew" | "didnt";

export function CivicsQuiz({
  questions,
}: {
  /* stale: checked too long ago to show the name (isStale, server-side). */
  questions: readonly (CivicsQuestion & { stale: boolean })[];
}) {
  const [shown, setShown] = useState<ReadonlySet<string>>(new Set());
  const [marks, setMarks] = useState<Readonly<Record<string, Mark>>>({});

  const marked = Object.keys(marks).length;
  const knew = Object.values(marks).filter((m) => m === "knew").length;

  const done = marked === questions.length;
  useEffect(() => {
    if (done) track("civics_done");
  }, [done]);

  function mark(id: string, value: Mark) {
    setMarks((prev) => ({ ...prev, [id]: value }));
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4">
        {questions.map((q, i) => {
          const open = shown.has(q.id);
          return (
            <li key={q.id}>
              <Card className="flex flex-col gap-3">
                <p className="text-caption text-on-surface-muted">
                  Question {i + 1} of {questions.length}
                </p>
                <h2 className="text-h3">{q.question}</h2>
                {!open ? (
                  <>
                    <p className="text-body-sm text-on-surface-muted">
                      Think of the answer, then check.
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => setShown((prev) => new Set(prev).add(q.id))}
                    >
                      Show answer
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col gap-3" aria-live="polite">
                    {q.stale ? (
                      <p className="text-body">
                        We&rsquo;re re-checking this one.{" "}
                        <a href={q.source.url} className="text-primary underline underline-offset-2">
                          {q.source.name}
                        </a>{" "}
                        lists it.
                      </p>
                    ) : (
                      <p className="text-h2">{q.answer}</p>
                    )}
                    <p className="text-body-sm">
                      {q.about.text}{" "}
                      <a
                        href={q.about.sourceUrl}
                        className="text-on-surface-muted underline underline-offset-2"
                      >
                        {q.about.source}
                      </a>
                    </p>
                    <p className="rounded-md bg-surface-muted px-4 py-3 text-body-sm">
                      {q.ballot.text}{" "}
                      <Link href={q.ballot.href} className="font-semibold text-primary underline underline-offset-2">
                        {q.ballot.linkText}
                      </Link>
                    </p>
                    {!q.stale && (
                      <p className="font-mono text-mono text-on-surface-muted">
                        <a href={q.source.url} className="underline underline-offset-2">
                          {q.source.name}
                        </a>{" "}
                        · Checked {q.checkedAt}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Did you know it?">
                      <Button
                        variant={marks[q.id] === "knew" ? "primary" : "secondary"}
                        aria-pressed={marks[q.id] === "knew"}
                        onClick={() => mark(q.id, "knew")}
                      >
                        I knew it
                      </Button>
                      <Button
                        variant={marks[q.id] === "didnt" ? "primary" : "secondary"}
                        aria-pressed={marks[q.id] === "didnt"}
                        onClick={() => mark(q.id, "didnt")}
                      >
                        I didn&rsquo;t
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ol>
      {done && (
        <p className="text-h3" role="status">
          You knew {knew} of {questions.length}.
        </p>
      )}
    </div>
  );
}
