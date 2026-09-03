import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

/* OpenNext Cloudflare adapter config — the Workers equivalent of what Vercel
   did implicitly.

   Three pieces, and each one is load-bearing for a feature this app already
   uses:

   incrementalCache (R2)  ISR. Three routes declare `revalidate = 3600`
                          (/methodology, /races/[raceId], /candidates/[id]).
                          Workers isolates are ephemeral, so without a shared
                          cache every request would re-render and re-hit
                          Supabase.

   tagCache (D1)          On-demand revalidation. The refresh-news cron calls
                          revalidateTag("races", "max") — with no tag cache
                          that call silently no-ops and a newly published race
                          would sit behind a stale page for up to an hour.

   queue ("direct")       Revalidation runs inline rather than through a
                          Durable Object queue. DOs need a paid Workers plan
                          and buy de-duplication this site's traffic does not
                          need; "direct" keeps the deploy on the free tier.
                          Revisit if revalidation volume ever grows. */
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: d1NextTagCache,
  queue: "direct",
});
