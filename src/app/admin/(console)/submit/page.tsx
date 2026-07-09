import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/admin/guard";

export const metadata = { title: "Submit — Operator Console" };

export default async function SubmitPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2">Submit</h1>
        <p className="text-body-sm text-on-surface-muted">
          Hand-add a news story, a statement needing clarification, or an
          unverified fact. Nothing publishes directly — every submission enters
          the approval queue.
        </p>
      </div>
      <Card>
        <p className="text-body-sm text-on-surface-muted">
          The structured submission forms arrive in Phase A3.
        </p>
      </Card>
    </div>
  );
}
