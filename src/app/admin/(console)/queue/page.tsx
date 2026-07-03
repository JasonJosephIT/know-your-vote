import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/admin/guard";

export const metadata = { title: "Queue — Operator Console" };

export default async function QueuePage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2">Approval queue</h1>
        <p className="text-body-sm text-on-surface-muted">
          Every manual submission and agent-gated change waits here for a
          decision, oldest first, with an audit trail.
        </p>
      </div>
      <Card>
        <p className="text-body-sm text-on-surface-muted">
          No items awaiting review. The queue, filters, and approve/reject
          effects arrive in Phase A3.
        </p>
      </Card>
    </div>
  );
}
