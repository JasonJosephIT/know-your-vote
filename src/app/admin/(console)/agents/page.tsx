import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/admin/guard";

export const metadata = { title: "Agents — Operator Console" };

export default async function AgentsPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2">Agents</h1>
        <p className="text-body-sm text-on-surface-muted">
          Request a run of R1–R4. Requests queue on the operator&apos;s machine
          and execute when the Claude desktop app is open — the UI will always
          show a request&apos;s age and that caveat.
        </p>
      </div>
      <Card>
        <p className="text-body-sm text-on-surface-muted">
          Run triggers and the run history arrive in Phase A4.
        </p>
      </Card>
    </div>
  );
}
