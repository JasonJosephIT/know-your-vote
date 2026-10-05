/* The site's public address, for every link we send out of the site: the
   reminder and correction emails, the welcome email and its calendar link.

   Those links used to be built from request.nextUrl.origin, the address
   the request arrived on. A voter's signup arrives on knowyour.vote, but
   Vercel Cron can call the deployment's own *.vercel.app address, and then
   every scheduled reminder would carry an unsubscribe link to that address
   instead of the site (launch review, 2026-10-05). An email link must not
   depend on who asked for the email to be sent.

   NEXT_PUBLIC_SITE_URL, else https://knowyour.vote: the same rule as
   metadataBase in src/app/layout.tsx, robots.ts and sitemap.ts, so an email
   and a shared page agree on where the site is. An empty value counts as
   unset, and a trailing slash is dropped so a path can be appended. Never
   know-your-vote.vercel.app, which is someone else's site.

   No imports, so scripts/verify-email-origin.ts can load it in plain Node. */

const PRODUCTION_ORIGIN = "https://knowyour.vote";

export function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (configured || PRODUCTION_ORIGIN).replace(/\/+$/, "");
}

/* The one-click unsubscribe link every email carries. */
export function unsubscribeUrl(token: string): string {
  return `${siteOrigin()}/api/voting-info/unsubscribe?token=${token}`;
}
