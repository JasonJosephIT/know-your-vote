import { runningMateLine, type RunningMates } from "@/lib/running-mate";

/* The roster lines a card can carry besides its name and party (spec
   2026-10-08-roster-completeness §3.5 and §3.6). Each takes the value the
   page computed once for the whole race, so every card in a race shows the
   line or none does, and the markup is the same for every candidate: only
   the text differs, as the name does. Plain caption text, no colour and no
   chip. */

/** "Running mate for Lieutenant Governor: <name>", under the name, on every
    Governor card or none (running-mate.ts). */
export function RunningMateLine({
  runningMates,
  candidateId,
}: {
  runningMates: RunningMates | null;
  candidateId: string;
}) {
  const text = runningMateLine(runningMates, candidateId);
  return text ? <p className="text-caption text-on-surface-muted">{text}</p> : null;
}
