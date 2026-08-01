"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Card } from "@/components/ui/Card";
import { PartyChip } from "@/components/ui/PartyChip";
import { SaveToggle } from "@/components/ui/SaveToggle";
import { onSavedChange, readSaved } from "@/lib/saved";
import type { Party } from "@/types/schema";

interface SavedSummary {
  candidate_id: string;
  legal_name: string;
  party: Party;
  office_sought: string;
  official_site: string | null;
  handles: Array<{ handle: string; platform: string; url: string | null }>;
}

export function SavedCandidates() {
  /* null only on the server and the hydration render — render nothing until
     the device-local list is knowable, so server HTML never shows a wrong
     state. */
  const ids = useSyncExternalStore<string[] | null>(
    onSavedChange,
    readSaved,
    () => null,
  );
  const [rows, setRows] = useState<SavedSummary[]>([]);

  useEffect(() => {
    if (!ids || ids.length === 0) return;
    const controller = new AbortController();
    fetch(`/api/candidates?ids=${ids.join(",")}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { candidates: [] }))
      .then((data) => setRows(data.candidates ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, [ids]);

  if (ids === null) return null;

  if (ids.length === 0) {
    return (
      <p className="text-body text-on-surface-muted">
        You haven&apos;t saved anyone yet. Tap &quot;keep in mind&quot; on any
        candidate and they&apos;ll be here on your next visit — saved on this
        device only, never on our servers.
      </p>
    );
  }

  /* rows lags ids while a fetch is in flight — filter so an unsave hides its
     card immediately and rows from a previous list never resurface. */
  const visible = rows.filter((c) => ids.includes(c.candidate_id));

  return (
    <ul className="flex flex-col gap-4">
      {visible.map((c) => (
        <li key={c.candidate_id}>
          <Card className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-h3">
                <Link
                  href={`/candidates/${c.candidate_id}`}
                  className="hover:underline"
                >
                  {c.legal_name}
                </Link>
              </h2>
              <PartyChip party={c.party} />
              <SaveToggle candidateId={c.candidate_id} />
            </div>
            <p className="text-body-sm text-on-surface-muted">{c.office_sought}</p>
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-on-surface-muted">
              {c.official_site && (
                <a
                  href={c.official_site}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-on-surface"
                >
                  Official site
                </a>
              )}
              {c.handles.map((h) => (
                <a
                  key={`${h.platform}-${h.handle}`}
                  href={h.url ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-on-surface"
                >
                  {h.handle} ({h.platform})
                </a>
              ))}
            </p>
          </Card>
        </li>
      ))}
    </ul>
  );
}
