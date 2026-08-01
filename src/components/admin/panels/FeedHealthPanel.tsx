import type { FeedHealthData, PanelState } from "@/lib/admin/monitor";
import { relativeTime } from "@/lib/admin/format";
import { PanelCard, PanelStates } from "./PanelCard";
import { RecheckButton } from "./RecheckButton";

/* Panel 3 — Feed health + on-demand neutrality verdict (AFR-003). Counts by
   item_type over the last 30 days, newest published time, and the shared-matcher
   lint over agent-written rows. 0 agent rows is an explicit pass, never blank. */

const ITEM_TYPE_LABEL: Record<string, string> = {
  candidate_news: "Candidate news",
  election_news: "Election news",
  official_link: "Official links",
  pipeline_event: "Pipeline events",
};

export function FeedHealthPanel({
  state,
}: {
  state: PanelState<FeedHealthData>;
}) {
  return (
    <PanelCard title="Feed health" id="panel-feed-health">
      <PanelStates state={state}>
        {(d) => {
          const entries = Object.entries(d.counts);
          const flagged = d.lint.verdict === "flagged";
          return (
            <div className="flex flex-col gap-3">
              {entries.length === 0 ? (
                <p className="text-body-sm text-on-surface-muted">
                  No feed items in the last 30 days.
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {entries.map(([type, count]) => (
                    <li
                      key={type}
                      className="flex items-baseline justify-between gap-2 text-body-sm"
                    >
                      <span className="text-on-surface-muted">
                        {ITEM_TYPE_LABEL[type] ?? type}
                      </span>
                      <span>{count}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-caption text-on-surface-muted">
                Newest{" "}
                {d.newest_published_at
                  ? relativeTime(d.newest_published_at)
                  : "—"}
              </p>

              {/* Neutrality verdict (role=status so re-checks announce). */}
              <div
                role="status"
                className="flex flex-col gap-2 border-t border-border pt-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`text-label ${flagged ? "text-error" : "text-success"}`}
                  >
                    {d.lint.agent_rows === 0
                      ? "0 agent-written rows"
                      : flagged
                        ? `${d.lint.flags.length} wording ${d.lint.flags.length === 1 ? "flag" : "flags"}`
                        : "neutral"}
                  </span>
                  <RecheckButton />
                </div>
                {flagged ? (
                  <details className="text-caption">
                    <summary className="cursor-pointer text-on-surface-muted">
                      Show flags
                    </summary>
                    <ul className="mt-1 flex flex-col gap-1">
                      {d.lint.flags.map((f, i) => (
                        <li key={`${f.id}-${i}`} className="text-on-surface-muted">
                          {f.kind === "missing_url" ? (
                            <>
                              <span className="text-error">missing url</span>{" "}
                              <span className="font-mono">{f.id}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-error">
                                flagged: {f.term}
                              </span>{" "}
                              {f.snippet ? (
                                <span className="italic">“{f.snippet}”</span>
                              ) : null}
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            </div>
          );
        }}
      </PanelStates>
    </PanelCard>
  );
}
