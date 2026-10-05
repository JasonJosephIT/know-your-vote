"use client";

import { useSyncExternalStore } from "react";
import { track } from "@/lib/analytics";
import { isSaved, onSavedChange, toggleSaved } from "@/lib/saved";

/* `name` is the candidate's name, read only by assistive technology.
   a11y-perf-2026-10-04.md fix 6 (WCAG 2.4.6 Headings and Labels): /candidates
   had 106 buttons all named "Keep in mind", and a screen-reader user moving
   through a list of buttons could not tell whose each one was. The name is a
   visually hidden suffix AFTER the visible label, so the accessible name
   still starts with the words on screen ("Keep in mind: Jane Doe") and voice
   control by the visible label keeps working (WCAG 2.5.3 Label in Name).
   Optional so a caller with no name to hand still renders; every current
   caller passes one. */
export function SaveToggle({
  candidateId,
  name,
}: {
  candidateId: string;
  name?: string;
}) {
  /* Render the unsaved state on the server (saved state is device-local by
     design); the store snapshot takes over right after hydration, and
     toggleSaved notifies every subscribed toggle through onSavedChange. */
  const saved = useSyncExternalStore(
    onSavedChange,
    () => isSaved(candidateId),
    () => false,
  );

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => {
        if (toggleSaved(candidateId)) track("candidate_saved");
      }}
      className={`inline-flex w-fit items-center gap-[6px] rounded-full px-3 py-1 text-caption transition-colors ${
        saved
          ? "bg-primary-muted text-primary-hover"
          : "bg-surface-muted text-on-surface-muted hover:text-on-surface"
      }`}
    >
      <span aria-hidden>{saved ? "✓" : "+"}</span>
      {saved ? "Keeping in mind" : "Keep in mind"}
      {name && <span className="sr-only">: {name}</span>}
    </button>
  );
}
