"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { isSaved, onSavedChange, toggleSaved } from "@/lib/saved";

export function SaveToggle({ candidateId }: { candidateId: string }) {
  /* Render the unsaved state on the server and hydrate from localStorage —
     saved state is device-local by design. */
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isSaved(candidateId));
    return onSavedChange(() => setSaved(isSaved(candidateId)));
  }, [candidateId]);

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => {
        const nowSaved = toggleSaved(candidateId);
        setSaved(nowSaved);
        if (nowSaved) track("candidate_saved");
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
