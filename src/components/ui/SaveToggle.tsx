"use client";

import { useSyncExternalStore } from "react";
import { track } from "@/lib/analytics";
import { isSaved, onSavedChange, toggleSaved } from "@/lib/saved";

export function SaveToggle({ candidateId }: { candidateId: string }) {
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
    </button>
  );
}
