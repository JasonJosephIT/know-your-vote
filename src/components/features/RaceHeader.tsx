import type { Race } from "@/types/schema";

function formatDate(iso?: string) {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/* Office, district and dates. Identical for a brief, a listing and the
   issue-filtered view, so a race keeps its heading in every state. */
export function RaceHeader({
  race,
  children,
}: {
  race: Race;
  children?: React.ReactNode;
}) {
  const general = formatDate(race.key_dates?.general_date);
  const registration = formatDate(race.key_dates?.registration_deadline);
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-h1">{race.office}</h1>
      <p className="text-body-sm text-on-surface-muted">
        {race.district ?? "Statewide"}
        {general ? ` · General election ${general}` : ""}
        {registration ? ` · Register by ${registration}` : ""}
      </p>
      {children}
    </header>
  );
}
