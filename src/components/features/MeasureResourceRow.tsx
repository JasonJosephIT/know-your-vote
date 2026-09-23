import type { MeasureResourceWithSource } from "@/lib/measures";
import { newsCardLabels } from "@/lib/news-labels";
import { outletPathFor } from "@/lib/news-outlets";
import { OUTLETS } from "@/lib/news-sources";
import { safeHttpUrl } from "@/lib/format";
import type { MeasureFormat } from "@/types/app";

/* One outside resource about a ballot question (spec §5).

   Title, then one muted line of facts: publisher · author · format ·
   duration · date, then the attribution note if there is one. Facts, no
   icons: "Video · 14 min" is a statement, a play glyph is an invitation.

   NO LEAN HERE, same as NewsStoryCard and for the same reason (news-labels.ts,
   founder 2026-09-19): the publisher links to its outlet page when the outlet
   is in the news corpus, and the lean is disclosed there in full. A publisher
   that is NOT in the corpus gets no link — `outletBySlug` is fail-closed, so
   a link would be a 404, and a 404 is worse than plain text.

   OPINION IS MARKED by container, never colour: every `argument` and
   `commentary` row is somebody's case, so the row says so before the title.
   `newsCardLabels` supplies the word from source.type; rows whose kind is
   sided are marked even when the source row is typed factual_reporting (an
   editorial board's source row, say) — the kind is the stronger fact.

   NO THUMBNAIL, NO EMBED (spec §6): a link and nothing that phones home. */

const FORMAT_LABEL: Record<MeasureFormat, string | null> = {
  document: "Document",
  article: null, // the default; unmarked like reporting on a news card
  video: "Video",
  audio: "Audio",
};

function minutes(seconds: number | null): string | null {
  if (seconds === null) return null;
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function monthYear(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/* The outlet-page path for the resource's host, only when that host is a
   listed outlet. Path-scoped corpus domains (`cbsnews.com/miami`) match on
   host + path prefix, the same boundary the sweep uses. */
function listedOutletPath(url: string): string | null {
  let host: string;
  let path: string;
  try {
    const u = new URL(url);
    host = u.hostname.replace(/^www\./, "");
    path = u.pathname;
  } catch {
    return null;
  }
  const hit = OUTLETS.find((o) => {
    const [d, ...rest] = o.domain.split("/");
    const hostOk = host === d || host.endsWith(`.${d}`);
    if (!hostOk) return false;
    return rest.length === 0 || path.startsWith(`/${rest.join("/")}`);
  });
  return hit ? outletPathFor(hit.domain) : null;
}

export function MeasureResourceRow({
  item,
}: {
  item: MeasureResourceWithSource;
}) {
  const { resource, source } = item;
  const href = safeHttpUrl(source.url);
  const { publisher, flag, isOpinion } = newsCardLabels(source);
  const sided =
    resource.kind === "argument" || resource.kind === "commentary";
  const marked = isOpinion || sided;
  const shownFlag = sided ? "Opinion" : flag;
  const outletHref = listedOutletPath(source.url);

  const facts = [
    resource.author,
    FORMAT_LABEL[resource.format],
    minutes(resource.duration_seconds),
    monthYear(resource.published_at),
  ].filter((f): f is string => Boolean(f));

  return (
    <li
      className={[
        "flex flex-col gap-1 rounded-md border p-3",
        marked
          ? "border-border-strong bg-surface-muted"
          : "border-border bg-surface",
      ].join(" ")}
    >
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-body-sm text-on-surface underline underline-offset-2"
        >
          {resource.title}
        </a>
      ) : (
        <span className="text-body-sm text-on-surface">{resource.title}</span>
      )}
      <p className="flex flex-wrap items-center gap-x-2 font-mono text-mono text-on-surface-muted">
        {shownFlag && (
          <span className={marked ? "text-on-surface" : undefined}>
            {shownFlag}
          </span>
        )}
        {publisher &&
          (outletHref ? (
            <a href={outletHref} className="underline underline-offset-2">
              {publisher}
            </a>
          ) : (
            <span>{publisher}</span>
          ))}
        {facts.map((f) => (
          <span key={f}>· {f}</span>
        ))}
      </p>
      {resource.note && (
        <p className="text-caption text-on-surface-muted">{resource.note}</p>
      )}
    </li>
  );
}
