import { Card } from "@/components/ui/Card";
import {
  ELECTION_OFFICE_SOURCES,
  hasSeparateMailingAddress,
  mailingAddress,
  streetAddress,
  type ElectionOffice,
} from "@/lib/election-office";

/* The county election office, as one contact card.

   Every field here is verbatim from the Florida Division of Elections'
   published contact file, with one deliberate exception: `overseasEmail`
   comes from the Federal Voting Assistance Program, whose Florida feed lists
   each county's vote-by-mail/UOCAVA desk rather than its public inbox. That
   is the right address for a deployed service member and the wrong one for
   everyone else, so it is shown as its own labeled line instead of replacing
   the general contact.

   The footer stamps the capture date and links both sources. Contact details
   go stale — a voter who can see how old this is, and check it in one click,
   is better served than one asked to trust it. */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-2">
      <dt className="min-w-[104px] text-on-surface-muted">{label}</dt>
      {/* break-words so a long .gov address wraps inside the card on a phone
          rather than pushing the row wider than the screen. */}
      <dd className="min-w-0 flex-1 break-words">{children}</dd>
    </div>
  );
}

export function ElectionOfficeCard({ office }: { office: ElectionOffice }) {
  const separateMailing = hasSeparateMailingAddress(office);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-h2">{office.county} County</h2>
        <p className="text-body-sm text-on-surface-muted">
          Supervisor of Elections: {office.supervisor}
        </p>
      </div>

      <dl className="flex flex-col gap-2 text-body-sm">
        <Row label="Website">
          <a
            href={office.website}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {office.website.replace(/^https?:\/\//, "")}
          </a>
        </Row>
        <Row label="Phone">
          <a
            href={`tel:${office.phone.replace(/\D/g, "")}`}
            className="text-primary underline underline-offset-2"
          >
            {office.phone}
          </a>
        </Row>
        <Row label="Email">
          <a
            href={`mailto:${office.email}`}
            className="text-primary underline underline-offset-2"
          >
            {office.email}
          </a>
        </Row>
        {office.fax && <Row label="Fax">{office.fax}</Row>}
        {/* Only labeled "Office" when there is a separate mailing address to
            distinguish it from; otherwise one address serves both and a
            two-row split would invent a difference that isn't there. */}
        <Row label={separateMailing ? "Office" : "Address"}>
          {streetAddress(office)}
        </Row>
        {separateMailing && <Row label="Mail">{mailingAddress(office)}</Row>}
      </dl>

      {office.overseasEmail && (
        <div className="flex flex-col gap-1 rounded-md bg-surface-muted px-4 py-3">
          <p className="text-label">Voting from overseas or on active duty?</p>
          <p className="text-body-sm text-on-surface-muted">
            {office.county} County runs a separate desk for absentee ballots
            under UOCAVA:{" "}
            <a
              href={`mailto:${office.overseasEmail}`}
              className="text-primary underline underline-offset-2"
            >
              {office.overseasEmail}
            </a>
          </p>
        </div>
      )}

      <p className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border pt-3 text-caption text-on-surface-muted">
        <span>
          From the state&apos;s published contact list, revised{" "}
          {ELECTION_OFFICE_SOURCES.stateRevision}
        </span>
        <a
          href={ELECTION_OFFICE_SOURCES.stateUrl}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-on-surface"
        >
          Check it at the Division of Elections
        </a>
      </p>
    </Card>
  );
}
