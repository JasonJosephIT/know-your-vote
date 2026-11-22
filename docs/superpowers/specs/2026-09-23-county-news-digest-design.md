# County news digest — design

Date: 2026-09-23
Status: approved in conversation, awaiting founder read of this file
Branch: `claude/keep-in-mind-function-4daf98`

## 1. Why

"Keep in mind" (FR-008) works as built: a device-local list of candidate ids
under `kyv.saved`, a toggle mounted on briefs, the browser, race listings, quiz
results and the saved list itself, and a "Keeping in mind" tab that fetches
summaries from `/api/candidates?ids=`. Verified live on 2026-09-23: save,
unsave, persistence across navigation, and silent degradation with storage
disabled all hold.

What it cannot do is reach a voter after they close the tab. The founder's
goal is a recurring email that says "here is what happened about the things
on your ballot", linking to the same news items the site already shows. The
first rollout is deliberately not personalized: a **county digest**, opt-in,
every two weeks. Following specific topics, candidates or amendments is a later
rollout that will get its own opt-in at that time.

Decisions taken in the brainstorm, in order:

1. Keep in mind stays device-only. The digest never reads it. The privacy
   page's promise that saved candidates "never reach our servers" stays true.
2. Opt-in is a second checkbox on the existing polling-place email form. One
   subscription row, one unsubscribe link.
3. Content is news only: statewide plus the subscriber's county/metro rows
   from the last 14 days, newest first, at most 10. A county with nothing new
   gets no email.
4. The send lives in its own cron route, sharing helpers extracted from the
   reminder cron. Reminder behavior does not change.

Out of scope for this spec: SMS, web push, accounts or Google sign-in,
saving amendments, per-topic or per-candidate follows, issue tags in the
email, deadline lines in the email.

## 2. Opt-in

### Form (`src/components/features/VotingInfo.tsx`)

Below the existing consent checkbox, a second, independent checkbox, unchecked
by default:

> Also send me a county news roundup every two weeks — headlines and links
> from local outlets, the same ones on our News page. Same unsubscribe link.

The heading stays. The intro sentence changes from "the only time we ever ask
for anything personal" to "the only place we ever ask for anything personal".
The success message adds one clause when the digest box was ticked: "and a
news roundup every other week".

The first checkbox remains required. The digest cannot be requested on its
own from this form.

### API (`src/app/api/voting-info/route.ts`)

Body schema gains `digest: z.boolean().optional()`. On upsert:

- `digest === true` → set `digest_consent_at = now()`.
- `digest` absent or `false` → leave `digest_consent_at` untouched. An earlier
  consent is not revoked by a later form submission that omits the box; the
  unsubscribe link is the revocation path.

Nothing else in the route changes. The one-time polling-place email is sent
exactly as today.

### Table (migration `0034_digest_consent.sql`)

```sql
ALTER TABLE voting_info_subscription
  ADD COLUMN IF NOT EXISTS digest_consent_at TIMESTAMPTZ;
```

NULL means never asked. RLS posture is unchanged: service-role only, anon and
authenticated fully revoked (0002). No index; the cohort is read by the cron
with `active = true AND digest_consent_at IS NOT NULL`, which is a full scan
of a table whose fuse is 50,000 rows.

### Unsubscribe

Unchanged. The existing token link sets `active = false`, which stops both
reminders and the digest. Every digest carries the link. There is no partial
unsubscribe in this rollout.

### Privacy page (`src/app/(public)/privacy/page.tsx`)

"The one thing we ever store" section:

- "exactly four things" → "exactly five things: your email, your ZIP, when you
  consented, whether and when you asked for the news roundup, and an
  unsubscribe token."
- After the reminders paragraph, one new paragraph: if you tick the roundup
  box, every two weeks we email you headlines and links to local election
  news for your county. The list is built only from the same items on our
  News page — the headline and the outlet's name, exactly as the outlet
  published them. We write nothing in it. Nothing goes out in a fortnight
  with nothing new. The same unsubscribe link stops it.

`scripts/verify-no-stored-location.ts` gains one assertion pinning that the
privacy page names the roundup and says it is built from News-page items, so
the prose cannot drift from the code silently.

### Where the form appears

Today: inside `YourRaces` (the "Your races" tab). Added: under the saved list
on the "Keeping in mind" tab of `/candidates`, rendered by
`SavedCandidates` after the list (or after the empty-state text). Same
component, no new props beyond the ZIP it already accepts, which is empty on
that tab.

## 3. Send pipeline

### Shared helpers (`src/lib/notifications/send.ts`, new)

Extracted from `src/app/api/cron/send-reminders/route.ts` with no behavior
change:

| Helper | Does |
|---|---|
| `authorizeCron(request)` | `CRON_SECRET` via bearer or `x-cron-secret`, constant-time compare |
| `preflight()` | `NOTIFICATIONS_PAUSED`, `RESEND_API_KEY`, `EMAIL_FROM`, service client; returns a typed refusal or the clients |
| `claim(service, dedupeKey)` / `release(service, dedupeKey)` | the `notification_send_log` upsert with `ignoreDuplicates`, and its delete |
| `readCohort(service, match)` | fuse check, then paged read of `email, unsubscribe_token` (plus `zip5` when asked) for rows matching the given column predicates; returns the full array |
| `sendBatches(resend, recipients, rendered, origin)` | batches of 100 through `resend.batch.send`, appends the unsubscribe footer, returns recipient count or throws |
| `founderDigest(resend, subject, lines)` | best-effort summary to `EMAIL_FROM` |

`send-reminders` is rewired onto these. `verify-notifications-schema.mjs` and
`verify-notification-templates.ts` must pass unchanged.

### Schedule (`src/lib/notifications/digest-schedule.ts`, new, pure)

- Vercel cron: `/api/cron/send-digest` at `0 15 * * 2` (Tuesdays, one hour
  after reminders so the two never share a minute).
- `digestDue(todayIso)` returns the period `{ start, end }` when the ISO week
  number of `today` is even, otherwise `null`. Period end is yesterday,
  period start is 14 days before end, both inclusive, UTC dates.
- `dedupeKey(countyFips, periodEnd)` → `digest:{county_fips}:{period_end}`.

A missed Tuesday misses that fortnight loudly, the same posture as reminders.

Known edge: a 53-week ISO year (next: 2026 is not one; 2032 is) puts two odd
weeks back to back at the year boundary, so one gap of three weeks. Accepted;
not worth an anchor-date scheme for a one-election rollout. The dry-run
script pins the behavior so it is a known fact, not a surprise.

### Route (`src/app/api/cron/send-digest/route.ts`, new)

GET and POST, `maxDuration = 60`. Steps:

1. `authorizeCron`, `preflight`. Refusals mirror the reminder route's JSON.
2. `digestDue(today)`; if null respond `{ due: false }`.
3. Cohort: `voting_info_subscription` where `active AND digest_consent_at IS
   NOT NULL`, selecting `email, unsubscribe_token, zip5`. Fuse applies to the
   whole cohort.
4. Resolve each ZIP to `county_fips` and `metro` with one query against
   `zip_district` for the distinct ZIPs. A ZIP with no row is skipped and
   counted in the response as `unresolved`.
5. For each county with at least one subscriber, run the content query
   (section 4). Zero items → no claim, no send, counted as `quiet`.
6. `claim` the county's dedupe key. Already claimed → `skipped`.
7. Render the template and pass that county's subscriber group to
   `sendBatches`. Failure → `release`, Sentry, 502 with what was sent so far.
8. Update `recipient_count`, continue to the next county.
9. Founder digest: one email listing `county -> recipients`, `quiet`,
   `skipped`, `unresolved`.

### Content query

Per county, from `news_item` joined to `source(publisher)`:

- `published_at` within the period.
- `item_type IN ('election_news', 'candidate_news')`. `official_link` and
  `pipeline_event` rows are excluded.
- Scope: `(race_id IS NULL AND metro IS NULL AND county_fips IS NULL)` OR
  `county_fips = :county` OR `metro = :metro`. Race-scoped rows are excluded
  in this rollout; they belong to the per-topic follow.
- `url IS NOT NULL`.
- Ordered `published_at DESC`, passed through `dedupeByUrl` from
  `src/lib/news-feed.ts`, then sliced to 10.

Each item carries `title`, `source.publisher`, `url`.

## 4. Template

New entry in `src/lib/notifications/templates.ts`:

```
county_news_digest: {
  channel: "email",
  schema: z.object({
    county_name: z.string().min(1),
    period_end: iso date,
    items: z.array(z.object({
      title: z.string().min(1).max(200),
      publisher: z.string().min(1).max(80),
      url: z.string().url().startsWith("https://"),
    })).min(1).max(10),
    details_url: z.string().url().startsWith("https://"),  // the News page
  }),
  render: subject "Election news in {county_name} County — {n} stories",
          title  "Your {county_name} County roundup",
          body   one line per item "• {title} — {publisher}\n  {url}",
                 blank line, "Everything above is on our News page: {details_url}"
}
```

The body still ends with `details_url`, so the verifier's rule 3 holds. The
registry comment's copy rule is amended: the digest may carry a headline and a
publisher name exactly as stored on a published `news_item`; it never carries a
summary, a verdict, or any sentence composed here.

`BUDGETS` gains a per-template override: `county_news_digest` body budget is
2,400 characters (10 items at ~200 plus fixed copy). The verifier reads the
override when present. The neutrality regex is applied to the rendered body
with sample items whose titles are neutral fixtures; the check is that the
fixed copy stays clean, not that outlet headlines are policed here.

## 5. Failure handling

| Failure | Behavior |
|---|---|
| Not an even ISO week | `{ due: false }`, nothing touched |
| Pause switch set | `{ paused: true }` |
| Missing env or service creds | 503, nothing sent |
| Cohort over fuse | 500, Sentry, nothing sent |
| ZIP unresolvable | subscriber skipped, counted |
| County has zero items | no claim, no send, counted as quiet |
| Claim already exists | county skipped |
| Resend batch fails mid-county | claim released, Sentry, 502; a manual re-run retries that county and may duplicate for recipients already sent |
| Founder digest fails | ignored |

## 6. Testing

- `scripts/verify-digest-schedule.ts` (new, no env): even/odd week gate on
  fixture dates including year boundary; period bounds; dedupe key format;
  content shaping against fixture rows (scope filter, type filter, dedupe,
  cap at 10, newest first).
- `scripts/verify-notification-templates.ts`: renders `county_news_digest`
  with a 10-item sample; budget override honored; body ends with
  `details_url`; a `http://` item URL is rejected; an empty items array is
  rejected.
- `scripts/verify-notifications-schema.mjs` (live section): `digest_consent_at`
  exists; anon still cannot select from `voting_info_subscription`.
- `scripts/verify-no-stored-location.ts`: the new privacy assertion; the
  allowed-keys set is unchanged.
- Manual: with the pause switch off and one test subscriber, POST the route
  with the cron secret on an even week and read the one email; on an odd week
  confirm `{ due: false }`.

## 7. Files

New:
- `supabase/migrations/0034_digest_consent.sql`
- `src/lib/notifications/send.ts`
- `src/lib/notifications/digest-schedule.ts`
- `src/lib/notifications/digest-content.ts` (the content query + shaping)
- `src/app/api/cron/send-digest/route.ts`
- `scripts/verify-digest-schedule.ts`

Changed:
- `src/components/features/VotingInfo.tsx`
- `src/components/features/SavedCandidates.tsx`
- `src/app/api/voting-info/route.ts`
- `src/app/api/cron/send-reminders/route.ts` (rewired onto shared helpers)
- `src/lib/notifications/templates.ts`
- `src/app/(public)/privacy/page.tsx`
- `scripts/verify-notification-templates.ts`
- `scripts/verify-notifications-schema.mjs`
- `scripts/verify-no-stored-location.ts`
- `vercel.json`
- `.env.example` (no new variables; comment noting the digest shares the
  reminder switches)

## 8. What this does not fix

The saved list's stated value, "official links in one place", is empty for
almost everyone: on 2026-09-23 the live database had 296 candidates, 7 with an
official site, 0 with a verified handle, 0 candidate-scoped news rows and 0
issue-tagged rows. The digest will be thin until the news sweep runs and
profiles are populated. That is data work tracked elsewhere, not this spec.
