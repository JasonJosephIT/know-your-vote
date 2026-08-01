import { requireAdmin } from "@/lib/admin/guard";
import { getPendingReviewCount } from "@/lib/admin/monitor";
import { getReviewQueue } from "@/lib/admin/review";
import { Card } from "@/components/ui/Card";
import { DegradedBanner } from "@/components/admin/DegradedBanner";
import { QueueFilters } from "@/components/admin/QueueFilters";
import { ReviewItemCard } from "@/components/admin/ReviewItemCard";

export const metadata = { title: "Queue — Operator Console" };
export const dynamic = "force-dynamic";

type Search = { status?: string; kind?: string; source?: string; added?: string };

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const status = sp.status ?? "pending";
  const kind = sp.kind ?? "all";
  const source = sp.source ?? "all";
  const filtered = status !== "pending" || kind !== "all" || source !== "all";

  const [result, pendingCount] = await Promise.all([
    getReviewQueue({ status, kind, source }),
    getPendingReviewCount(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2">Approval queue</h1>
        <p className="text-body-sm text-on-surface-muted">
          Every manual submission and agent-gated change waits here for a
          decision, oldest first, with an audit trail.
        </p>
      </div>

      {sp.added ? (
        <p
          role="status"
          className="rounded-md border border-primary/40 bg-primary-muted px-4 py-3 text-body-sm text-primary-hover"
        >
          Queued for review.
        </p>
      ) : null}

      <QueueFilters
        status={status}
        kind={kind}
        source={source}
        pendingCount={pendingCount}
      />

      {result.status === "degraded" ? (
        <DegradedBanner missing={result.missing} />
      ) : result.status === "error" ? (
        <Card>
          <p role="alert" className="text-body-sm text-error">
            Couldn’t load the queue: {result.message}
          </p>
        </Card>
      ) : result.items.length === 0 ? (
        <Card>
          <p className="text-body-sm text-on-surface-muted">
            {filtered ? "No items match these filters." : "Nothing awaiting review."}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {result.items.map((item) => (
            <ReviewItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
