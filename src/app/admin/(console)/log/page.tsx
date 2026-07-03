import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/admin/guard";

export const metadata = { title: "Log — Operator Console" };

export default async function LogPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2">Activity log</h1>
        <p className="text-body-sm text-on-surface-muted">
          An append-only record of every privileged action — who did what, and
          when — read newest first.
        </p>
      </div>
      <Card>
        <p className="text-body-sm text-on-surface-muted">
          No actions recorded yet. The audit log view arrives in Phase A3.
        </p>
      </Card>
    </div>
  );
}
