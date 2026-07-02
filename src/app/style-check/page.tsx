import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { PartyChip } from "@/components/ui/PartyChip";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import type { Party, Verdict } from "@/types/schema";

const verdicts: Verdict[] = [
  "accurate",
  "mostly_accurate",
  "mixed",
  "mostly_inaccurate",
  "inaccurate",
  "unverifiable",
];

const parties: Party[] = ["REP", "DEM", "NPA", "other"];

/* Dev-only mirror of docs/design.html for comparing primitives to spec. */
export default function StyleCheck() {
  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-5 py-7">
      <h1 className="text-h1">Style check</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>See my ballot</Button>
          <Button disabled>See my ballot</Button>
          <Button variant="secondary">Change location</Button>
          <Button variant="secondary" disabled>
            Change location
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">Text input</h2>
        <div className="max-w-[260px]">
          <Input placeholder="Enter your ZIP code" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">Card</h2>
        <Card className="max-w-[320px]">
          <h3 className="text-h3">Governor</h3>
          <p className="text-body-sm text-on-surface-muted">
            Statewide · General election Nov 3 · 4 candidates
          </p>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">Verdict badges</h2>
        <div className="flex flex-wrap items-center gap-3">
          {verdicts.map((v) => (
            <VerdictBadge key={v} verdict={v} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">Party chips</h2>
        <div className="flex flex-wrap items-center gap-3">
          {parties.map((p) => (
            <PartyChip key={p} party={p} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">Chips</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Chip>Saved</Chip>
          <Chip>Economy</Chip>
          <Chip>Education</Chip>
          <Chip>Healthcare</Chip>
        </div>
      </section>
    </main>
  );
}
