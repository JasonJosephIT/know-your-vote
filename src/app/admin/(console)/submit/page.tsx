import { requireAdmin } from "@/lib/admin/guard";
import {
  getHealth,
  MISSING_0006,
  MISSING_SERVICE,
} from "@/lib/admin/monitor";
import { getScopeRefs, METROS } from "@/lib/admin/refs";
import { DegradedBanner } from "@/components/admin/DegradedBanner";
import { SubmitForm } from "@/components/admin/SubmitForm";

export const metadata = { title: "Submit — Operator Console" };
export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  await requireAdmin();

  const health = await getHealth();
  const opsMissing = !health.service_role
    ? MISSING_SERVICE
    : health.migrations["0006"] === false
      ? MISSING_0006
      : null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2">Submit</h1>
        <p className="text-body-sm text-on-surface-muted">
          Hand-add a news story, a statement needing clarification, or an
          unverified fact. Nothing publishes directly — every submission enters
          the approval queue.
        </p>
      </div>

      {opsMissing ? (
        <DegradedBanner missing={opsMissing}>
          Submissions are stored in the ops plane; add the dependency above to
          enable this form.
        </DegradedBanner>
      ) : (
        <SubmitFormLoader today={today} />
      )}
    </div>
  );
}

/* Split so the refs query only runs when the ops plane is ready. */
async function SubmitFormLoader({ today }: { today: string }) {
  const { races, candidates } = await getScopeRefs();
  return (
    <SubmitForm
      races={races}
      candidates={candidates}
      metros={METROS}
      today={today}
    />
  );
}
