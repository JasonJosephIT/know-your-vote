import { Card } from "@/components/ui/Card";
import { getCandidateContact } from "@/lib/briefs";
import { formatNewsDate, safeHttpUrl } from "@/lib/format";

/* Campaign contact block from candidate_contact (R2 refresher, weekly).
   CAP_Refresh_Agents_Plan §8 Q3: this stays unrendered until Jason reviews
   the first real R2 run's data — flip SHOW_CANDIDATE_CONTACT=true (and
   redeploy) to ship it. Every field is verbatim from the campaign's own
   site or an official filing, with a freshness stamp. */
export async function CandidateContact({
  candidateId,
}: {
  candidateId: string;
}) {
  if (process.env.SHOW_CANDIDATE_CONTACT !== "true") return null;

  const contact = await getCandidateContact(candidateId);
  if (!contact) return null;

  const contactUrl = safeHttpUrl(contact.contact_url);
  const sourceUrl = safeHttpUrl(contact.source_url);
  const hasAnyField =
    contact.campaign_email ||
    contact.campaign_phone ||
    contact.mailing_address ||
    contactUrl;
  if (!hasAnyField) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-h2">Contact the campaign</h2>
      <Card className="flex flex-col gap-2">
        <dl className="flex flex-col gap-2 text-body-sm">
          {contact.campaign_email && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-on-surface-muted">Email</dt>
              <dd>
                <a
                  href={`mailto:${contact.campaign_email}`}
                  className="text-primary underline underline-offset-2"
                >
                  {contact.campaign_email}
                </a>
              </dd>
            </div>
          )}
          {contact.campaign_phone && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-on-surface-muted">Phone</dt>
              <dd>
                <a
                  href={`tel:${contact.campaign_phone}`}
                  className="text-primary underline underline-offset-2"
                >
                  {contact.campaign_phone}
                </a>
              </dd>
            </div>
          )}
          {contact.mailing_address && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-on-surface-muted">Mail</dt>
              <dd>{contact.mailing_address}</dd>
            </div>
          )}
          {contactUrl && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-on-surface-muted">Contact page</dt>
              <dd>
                <a
                  href={contactUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  Campaign contact page
                </a>
              </dd>
            </div>
          )}
        </dl>
        <p className="flex flex-wrap gap-x-3 border-t border-border pt-2 text-caption text-on-surface-muted">
          <span>Verified {formatNewsDate(contact.last_verified_at)}</span>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-on-surface"
            >
              Where we read this
            </a>
          )}
        </p>
      </Card>
    </section>
  );
}
