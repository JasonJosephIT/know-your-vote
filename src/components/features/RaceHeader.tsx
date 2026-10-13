import { easternToday } from "@/lib/notifications/schedule";
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
   issue-filtered view, so a race keeps its heading in every state.

   The registration deadline is an instruction only until it passes: from
   the day after, it is stated as past ("Registration closed October 5",
   founder 2026-10-12), Florida's calendar day, not UTC's. The page
   revalidates hourly, so the switch lands within the hour. */
export function RaceHeader({
  race,
  children,
}: {
  race: Race;
  children?: React.ReactNode;
}) {
  const general = formatDate(race.key_dates?.general_date);
  const registrationIso = race.key_dates?.registration_deadline;
  const registration = formatDate(registrationIso);
  const registrationClosed =
    registrationIso !== undefined && registrationIso < easternToday();
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-h1">{race.office}</h1>
      <p className="text-body-sm text-on-surface-muted">
        {race.district ?? "Statewide"}
        {general ? ` · General election ${general}` : ""}
        {registration
          ? registrationClosed
            ? ` · Registration closed ${registration}`
            : ` · Register by ${registration}`
          : ""}
      </p>
      {children}
    </header>
  );
}
