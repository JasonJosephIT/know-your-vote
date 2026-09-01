/* Custom Worker entrypoint — replaces Vercel Cron.

   OpenNext generates a fetch handler at build time; we re-export it unchanged
   and add a `scheduled` handler so Cloudflare Cron Triggers can drive the two
   daily jobs that `vercel.json` used to schedule.

   Rather than duplicate the job logic, `scheduled` calls the existing route
   handlers through the very same fetch handler that serves public traffic,
   with the `Authorization: Bearer ${CRON_SECRET}` header those routes already
   accept (they were written for Vercel Cron's GET + Bearer form). One code
   path, one auth check, nothing to drift.

   The origin matters and is not cosmetic: send-reminders builds every
   reminder email's unsubscribe link from the request origin, so a placeholder
   host here would mail out dead unsubscribe links. NEXT_PUBLIC_SITE_URL is
   therefore required, and a missing one fails loudly instead of sending. */

/* `.open-next/worker.js` exists only after a build, so this specifier
   resolves after `opennextjs-cloudflare build` and not before. @ts-ignore
   rather than @ts-expect-error precisely because it must tolerate BOTH
   states — @ts-expect-error itself errors once the file does resolve, which
   would break every build after the first. */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { default as handler } from "./.open-next/worker.js";

/* `wrangler types` can only see bindings declared in wrangler.jsonc, and
   CRON_SECRET is deliberately not there — it is a Worker secret, set with
   `wrangler secret put CRON_SECRET`. Declared here so the worker still
   type-checks without leaking the value into version control. */
type CronEnv = CloudflareEnv & { CRON_SECRET?: string };

/* Keyed by the cron expression in wrangler.jsonc, so a trigger that is added
   there without a route here fails visibly rather than silently doing
   nothing. Both were `0 10 * * *` / `0 14 * * *` on Vercel; Cloudflare cron
   is UTC too, so the times are unchanged. */
const CRON_ROUTES: Record<string, string> = {
  "0 10 * * *": "/api/cron/refresh-news",
  "0 14 * * *": "/api/cron/send-reminders",
};

export default {
  fetch: handler.fetch,

  async scheduled(
    event: ScheduledController,
    env: CronEnv,
    ctx: ExecutionContext
  ) {
    const path = CRON_ROUTES[event.cron];
    if (!path) {
      console.error(`[cron] no route mapped for "${event.cron}"`);
      return;
    }

    const secret = env.CRON_SECRET;
    const siteUrl = env.NEXT_PUBLIC_SITE_URL;
    if (!secret || !siteUrl) {
      /* Throwing marks the scheduled run as failed in the Cloudflare
         dashboard. A silent success here would look like the reminders ran. */
      throw new Error(
        `[cron] ${path} not run: ${!secret ? "CRON_SECRET" : "NEXT_PUBLIC_SITE_URL"} is unset`
      );
    }

    const request = new Request(new URL(path, siteUrl), {
      method: "GET",
      headers: { authorization: `Bearer ${secret}` },
    });

    const response = await handler.fetch(request, env, ctx);
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`[cron] ${path} failed ${response.status}: ${body}`);
    }
    console.log(`[cron] ${path} ok: ${body}`);
  },
} satisfies ExportedHandler<CronEnv>;
