import { Card } from "@/components/ui/Card";
import { safeHttpUrl } from "@/lib/format";
import { coveredCounty } from "@/lib/counties";
import { countyName } from "@/lib/fl-counties";
import { relativeTime } from "@/lib/admin/format";
import { DecisionControls } from "@/components/admin/DecisionControls";
import {
  ReviewItemContentSchema,
  type ReviewItemRow,
  type ReviewKind,
} from "@/types/admin";

/* One queue row (handoff A3 §B). Header (kind + source + age), a per-kind
   payload/diff body, then either decision controls (pending) or an honest
   outcome line (decided). Every URL is routed through safeHttpUrl; every string
   renders through React's default escaping (no dangerouslySetInnerHTML). */

const KIND_CHIP: Record<ReviewKind, string> = {
  manual_news: "bg-primary-muted text-primary-hover",
  gated_diff: "bg-accent-muted text-accent-strong",
  date_mismatch: "bg-warning/15 text-warning",
  fact_flag: "bg-info/15 text-info",
  unclear_statement: "bg-info/15 text-info",
  unverified_fact: "bg-info/15 text-info",
  candidate_lead: "bg-surface-muted text-on-surface",
};

const KIND_LABEL: Record<ReviewKind, string> = {
  manual_news: "news",
  gated_diff: "gated diff",
  date_mismatch: "date mismatch",
  fact_flag: "fact flag",
  unclear_statement: "unclear",
  unverified_fact: "unverified",
  candidate_lead: "candidate lead",
};

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`rounded-full px-2 py-[2px] text-caption ${className}`}>
      {children}
    </span>
  );
}

function SourceChip({ source }: { source: string }) {
  const operator = source === "operator";
  return (
    <Chip
      className={
        operator
          ? "bg-primary-muted text-primary-hover"
          : "bg-surface-muted text-on-surface-muted"
      }
    >
      {source}
    </Chip>
  );
}

function SourceLink({ url }: { url: string | null | undefined }) {
  const safe = safeHttpUrl(url);
  if (!safe) return null;
  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className="text-caption text-primary-hover underline underline-offset-2 break-all"
    >
      {safe}
    </a>
  );
}

function asText(v: unknown): string {
  return typeof v === "string" ? v : JSON.stringify(v);
}

/* old → new, stacked on mobile, side-by-side on ≥ sm (handoff A3 §E). */
function DiffBlock({
  field,
  oldLabel,
  oldValue,
  newLabel,
  newValue,
}: {
  field: string;
  oldLabel: string;
  oldValue: unknown;
  newLabel: string;
  newValue: unknown;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-caption text-on-surface-muted">{field}</span>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        <div className="rounded-md bg-error/10 px-2 py-1">
          <span className="text-caption text-on-surface-muted">{oldLabel}</span>
          <p className="text-body-sm text-on-surface-muted line-through break-words">
            {asText(oldValue) || "—"}
          </p>
        </div>
        <div className="rounded-md bg-success/10 px-2 py-1">
          <span className="text-caption text-on-surface-muted">{newLabel}</span>
          <p className="text-body-sm break-words">{asText(newValue) || "—"}</p>
        </div>
      </div>
    </div>
  );
}

function Body({ item }: { item: ReviewItemRow }) {
  const parsed = ReviewItemContentSchema.safeParse({
    kind: item.kind,
    payload: item.payload,
  });

  if (!parsed.success) {
    return (
      <pre className="overflow-x-auto rounded-md bg-surface-muted p-3 font-mono text-caption text-on-surface-muted">
        {JSON.stringify(item.payload, null, 2)}
      </pre>
    );
  }
  const content = parsed.data;

  if (content.kind === "manual_news") {
    const p = content.payload;
    return (
      <div className="flex flex-col gap-2">
        <p className="text-label">{p.title}</p>
        {p.summary ? <p className="text-body-sm">{p.summary}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <Chip className="bg-surface-muted text-on-surface-muted">{p.item_type}</Chip>
          {p.candidate_id ? (
            <Chip className="bg-surface-muted text-on-surface-muted">
              candidate: {p.candidate_id}
            </Chip>
          ) : null}
          {p.race_id ? (
            <Chip className="bg-surface-muted text-on-surface-muted">
              race: {p.race_id}
            </Chip>
          ) : null}
          {p.metro ? (
            <Chip className="bg-surface-muted text-on-surface-muted">{p.metro}</Chip>
          ) : null}
          {/* Election stories that name no candidate (sweep, 2026-10-06):
              say where approving one will show it. */}
          {p.county_fips ? (
            <Chip className="bg-surface-muted text-on-surface-muted">
              county: {coveredCounty(p.county_fips)?.name ?? p.county_fips}
            </Chip>
          ) : null}
          {p.statewide ? (
            <Chip className="bg-surface-muted text-on-surface-muted">statewide</Chip>
          ) : null}
          <span className="text-caption text-on-surface-muted">{p.published_at}</span>
        </div>
        <SourceLink url={p.url} />
      </div>
    );
  }

  if (content.kind === "gated_diff") {
    const p = content.payload;
    return (
      <div className="flex flex-col gap-2">
        <span className="text-caption text-on-surface-muted">
          {p.table} · {p.pk}
        </span>
        <DiffBlock
          field={p.field}
          oldLabel="current"
          oldValue={p.old}
          newLabel="proposed"
          newValue={p.new}
        />
        <div className="flex flex-wrap items-center gap-2">
          <SourceLink url={p.source_url} />
          <span className="text-caption text-on-surface-muted">
            seen {relativeTime(p.seen_at)}
          </span>
        </div>
        {/* R2's status change (agent-retrofit §3.6): say what approving does
            and does not do, and why it may fail during the freeze. */}
        {p.table === "candidate" && p.field === "qualifying_status" ? (
          <p className="text-caption text-on-surface-muted">
            Approving changes qualifying_status only. It does not change ballot_status or the
            race&apos;s candidate list: taking a candidate off a race stays a reviewed migration.
            During the content freeze (2026-10-18 to Election Day) the database refuses this
            change, and the message it gives names the correction path.
          </p>
        ) : null}
      </div>
    );
  }

  if (content.kind === "date_mismatch") {
    const p = content.payload;
    /* R2's election_event form (agent-retrofit D3): approving records the
       finding and writes nothing. */
    if ("target" in p) {
      const where = p.county_fips
        ? `${coveredCounty(p.county_fips)?.name ?? countyName(p.county_fips) ?? p.county_fips} County`
        : "statewide";
      return (
        <div className="flex flex-col gap-2">
          <span className="text-caption text-on-surface-muted">
            election_event · {p.election} · {p.event_type} · {where}
          </span>
          <DiffBlock
            field="event_date"
            oldLabel="DB"
            oldValue={p.db_value}
            newLabel="Official"
            newValue={p.official_value}
          />
          <div className="flex flex-wrap items-center gap-2">
            <SourceLink url={p.source_url} />
            <span className="text-caption text-on-surface-muted">
              seen {relativeTime(p.seen_at)}
            </span>
          </div>
          <p className="text-caption text-on-surface-muted">
            Approving records this finding and changes no date. Reminders and the calendar read
            election_event, so a date is corrected through a reviewed migration.
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        <span className="text-caption text-on-surface-muted">race · {p.race_id}</span>
        <DiffBlock
          field={p.field}
          oldLabel="DB"
          oldValue={p.db_value}
          newLabel="Official"
          newValue={p.official_value}
        />
        <SourceLink url={p.source_url} />
      </div>
    );
  }

  if (content.kind === "candidate_lead") {
    const p = content.payload;
    const where =
      p.kind === "running_mate"
        ? "running mate (statewide ticket)"
        : `${countyName(p.county_fips ?? "") ?? p.county_fips} County`;
    const checked =
      p.verification.status === "found"
        ? "On the official candidate list"
        : p.verification.status === "not_found"
          ? "Not found on the official candidate list"
          : "Not checked against an official list";
    return (
      <div className="flex flex-col gap-2">
        <p className="text-label">{p.name}</p>
        <p className="text-body-sm">
          {p.office}
          {p.jurisdiction ? ` · ${p.jurisdiction}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Chip className="bg-surface-muted text-on-surface-muted">{where}</Chip>
          <Chip className="bg-surface-muted text-on-surface-muted">{checked}</Chip>
        </div>
        {p.verification.note ? (
          <p className="text-caption text-on-surface-muted">{p.verification.note}</p>
        ) : null}
        <SourceLink url={p.verification.url} />
        {p.evidence ? (
          <blockquote className="border-l-2 border-border-strong pl-3 text-body-sm">
            {p.evidence}
          </blockquote>
        ) : null}
        <ul className="flex flex-col gap-1">
          {p.stories.map((s) => (
            <li key={s.url} className="flex flex-col">
              <span className="text-caption text-on-surface-muted">
                {s.outlet} · {s.published_at.slice(0, 10)} · {s.title}
              </span>
              <SourceLink url={s.url} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // fact_flag / unclear_statement / unverified_fact
  const p = content.payload;
  return (
    <div className="flex flex-col gap-2">
      <blockquote className="border-l-2 border-border-strong pl-3 text-body-sm">
        {p.text}
      </blockquote>
      {p.context ? (
        <p className="text-caption text-on-surface-muted">{p.context}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {p.candidate_id ? (
          <Chip className="bg-surface-muted text-on-surface-muted">
            candidate: {p.candidate_id}
          </Chip>
        ) : null}
        {p.race_id ? (
          <Chip className="bg-surface-muted text-on-surface-muted">race: {p.race_id}</Chip>
        ) : null}
        <SourceLink url={p.source_url} />
      </div>
    </div>
  );
}

function Outcome({ item }: { item: ReviewItemRow }) {
  if (item.status === "approved") {
    return (
      <p className="border-t border-border pt-3 text-body-sm text-success">
        Approved · applied {relativeTime(item.applied_at)}
        {item.decision_note ? ` · ${item.decision_note}` : ""}
      </p>
    );
  }
  return (
    <p className="border-t border-border pt-3 text-body-sm text-on-surface-muted">
      Rejected {relativeTime(item.decided_at)}
      {item.decision_note ? ` · ${item.decision_note}` : ""}
    </p>
  );
}

/* The confirm line for an approval that writes nothing: R2's election_event
   date_mismatch. Every other gated kind keeps DecisionControls' default. */
function confirmTextFor(item: ReviewItemRow): string | undefined {
  if (item.kind !== "date_mismatch") return undefined;
  const parsed = ReviewItemContentSchema.safeParse({ kind: item.kind, payload: item.payload });
  return parsed.success && parsed.data.kind === "date_mismatch" && "target" in parsed.data.payload
    ? "Approving records this finding and writes no date. Confirm?"
    : undefined;
}

export function ReviewItemCard({ item }: { item: ReviewItemRow }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Chip className={KIND_CHIP[item.kind]}>{KIND_LABEL[item.kind]}</Chip>
          <SourceChip source={item.source} />
        </div>
        <span className="text-caption text-on-surface-muted">
          {relativeTime(item.created_at)}
        </span>
      </div>

      <Body item={item} />

      {item.status === "pending" ? (
        <>
          {item.apply_error ? (
            <p role="alert" className="text-caption text-error">
              Fail-closed — still pending: {item.apply_error}
            </p>
          ) : null}
          <DecisionControls id={item.id} kind={item.kind} confirmText={confirmTextFor(item)} />
        </>
      ) : (
        <Outcome item={item} />
      )}
    </Card>
  );
}
