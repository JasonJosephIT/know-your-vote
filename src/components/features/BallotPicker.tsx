"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import {
  clearPicks,
  onPicksChange,
  readPicks,
  setPick,
  type Picks,
} from "@/lib/picks";

export interface BallotChoice {
  /* candidate_id, or "yes" / "no" for a ballot question. */
  value: string;
  label: string;
  /* The party code, printed after the name the same way for everyone
     (partyLabel). Null for nonpartisan seats and for Yes and No. */
  party?: string | null;
  /* The candidate's headshot URL, set for every candidate in a race or for
     none (headshots.ts). */
  photo?: string | null;
}

export interface BallotContest {
  /* race_id or measure_id: the contest's key in kyv.picks. */
  id: string;
  title: string;
  detail?: string;
  href: string;
  linkLabel: string;
  choices: BallotChoice[];
}

export interface BallotGroup {
  id: string;
  heading: string;
  note?: string;
  contests: BallotContest[];
}

const NONE: Picks = {};

/* The marking half of "Mark your ballot" (MarkBallot renders the rest). One
   native radio group per contest, so it works with a keyboard and a screen
   reader as a ballot would, and the choices come in the order the server
   gave them: Florida ballot order for candidates, Yes then No for a
   question, as printed on the ballot. Nothing is pre-marked, every choice
   has the same size and style until the voter picks one, and nothing here
   counts, ranks or reports what anyone picked: the store is this device's
   localStorage and nothing else (picks.ts).

   Printing keeps each contest's title and the voter's choice, or "No choice
   marked", and drops the other names, the links and the buttons, so the
   sheet is one short list in ballot order. */
export function BallotPicker({ groups }: { groups: BallotGroup[] }) {
  /* Nothing is marked on the server and in the hydration render; the
     device's choices appear right after, as SaveToggle does. */
  const picks = useSyncExternalStore(onPicksChange, readPicks, () => NONE);
  /* A stored choice that is no longer on the ballot (a candidate who left
     the race) reads as no choice rather than a ghost mark. */
  const chosenFor = (c: BallotContest) =>
    c.choices.some((ch) => ch.value === picks[c.id]) ? picks[c.id] : undefined;
  const anyMarked = groups.some((g) => g.contests.some(chosenFor));

  return (
    <div className="flex flex-col gap-8 print:gap-4">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Button type="button" onClick={() => window.print()}>
          Print my choices
        </Button>
        {anyMarked && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (window.confirm("Clear every choice marked on this device?")) {
                clearPicks();
              }
            }}
          >
            Clear all
          </Button>
        )}
      </div>

      {groups.map((g) => (
        <section
          key={g.id}
          aria-labelledby={`${g.id}-heading`}
          className="flex flex-col gap-3 print:gap-1"
        >
          <h2 id={`${g.id}-heading`} className="text-h2">
            {g.heading}
          </h2>
          {g.note && (
            <p className="text-body-sm text-on-surface-muted lg:max-w-[65ch] print:hidden">
              {g.note}
            </p>
          )}
          <ul className="flex flex-col gap-3 print:gap-0">
            {g.contests.map((c) => {
              const chosen = chosenFor(c);
              return (
                <li
                  key={c.id}
                  className="break-inside-avoid rounded-lg border border-border bg-surface p-4 print:rounded-none print:border-0 print:border-b print:px-0 print:py-2"
                >
                  <fieldset className="flex min-w-0 flex-col gap-2 print:gap-0.5">
                    <legend className="text-h3">{c.title}</legend>
                    {c.detail && (
                      <p className="text-body-sm text-on-surface-muted">
                        {c.detail}
                      </p>
                    )}
                    <div className="flex flex-col gap-1.5 print:gap-0">
                      {c.choices.map((ch) => {
                        const on = chosen === ch.value;
                        return (
                          <label
                            key={ch.value}
                            className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-body text-on-surface ${
                              on
                                ? "border-primary bg-primary-muted print:min-h-0 print:border-0 print:bg-transparent print:px-0 print:py-0"
                                : "border-border hover:border-border-strong print:hidden"
                            }`}
                          >
                            <input
                              type="radio"
                              name={c.id}
                              value={ch.value}
                              checked={on}
                              onChange={() => setPick(c.id, ch.value)}
                              className="size-5 shrink-0 accent-primary"
                            />
                            {ch.photo && (
                              /* Same size and frame for everyone, as
                                 CandidatePhoto; alt is empty because the
                                 name follows. Not lazy: a photo still
                                 unloaded when the voter prints would leave
                                 a blank box on the sheet. */
                              /* eslint-disable-next-line @next/next/no-img-element -- a pre-cropped
                                 400px WebP from our own bucket (CandidatePhoto). */
                              <img
                                src={ch.photo}
                                alt=""
                                width={48}
                                height={48}
                                decoding="async"
                                className="size-12 shrink-0 rounded-md border border-border bg-surface-muted object-cover print:size-10"
                              />
                            )}
                            <span>
                              {ch.label}
                              {ch.party && (
                                <span className="text-body-sm text-on-surface-muted">
                                  {" "}
                                  ({ch.party})
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {!chosen && (
                      <p className="hidden text-body-sm text-on-surface-muted print:block">
                        No choice marked
                      </p>
                    )}
                  </fieldset>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 print:hidden">
                    <Link
                      href={c.href}
                      className="inline-flex min-h-[24px] items-center text-body-sm text-primary underline underline-offset-2 hover:text-primary-hover"
                    >
                      {c.linkLabel}
                      <span className="sr-only">: {c.title}</span>
                    </Link>
                    {chosen && (
                      <button
                        type="button"
                        onClick={() => setPick(c.id, null)}
                        className="inline-flex min-h-[24px] items-center text-body-sm text-on-surface-muted underline underline-offset-2 hover:text-on-surface"
                      >
                        Clear choice
                        <span className="sr-only">: {c.title}</span>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
