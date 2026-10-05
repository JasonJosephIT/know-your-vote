# Reminders: production setup and end-to-end test

Written 2026-10-04 for launch handoff items 2.2 (test the reminder pipeline end to end) and 2.3 (make the reminder signup visible). Every step marked **Founder** needs an account only the founder holds. Calls marked **Recommended (pending founder confirmation)** are an agent's choice, not the founder's decision, and each one says how to flip it.

**Hard deadline: Tuesday 2026-10-20.** The first reminder that can still reach a voter is the vote-by-mail request reminder, sent in the 14:00 UTC cron on **Wednesday 2026-10-21**. A reminder is sent only on its exact day, so if the env is still broken that morning, that reminder is lost rather than delayed.

## Why nothing sends today

Checked on 2026-10-04. The Vercel env metadata was read without decrypting any value. The 503s on the two POST routes follow from that env and the code; they were not triggered, because a live POST changes state. The calendar 503 and the missing banner were seen with live GETs.

- **The keys were in Vercel under other names.** Production holds sensitive vars called `SUPABASE`, `RESEND` and `JEV`, created 2026-08-31. The founder confirmed on 2026-10-05 that they hold the service-role key, the Resend key and the TypeSafe key. The code reads `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY`, and nothing read the others. **Fixed in code since:** `instrumentation.ts` maps `SUPABASE` and `RESEND` to those names at server start (step 1). `EMAIL_FROM` was added on 2026-10-05.
- **So every email path fails, and so does everything else that needs the service role:**
  - `POST /api/voting-info` (the signup) answers 503 "Email delivery isn't configured yet".
  - The 14:00 UTC reminder cron answers 503. Today's run would have sent the registration T-1 reminder; there were 0 subscribers, so no one missed it.
  - The calendar file `/api/calendar/general_2026.ics` answers **503**, and the home-page deadline banner renders nothing. Both read `election_event` through the service role.
- **The signup form is still offered** on the "Your races" view, where it can only fail. This PR replaces it with official links until delivery is configured (see "What this PR changes").

## Step 1. Fix the production env in Vercel (Founder)

Vercel, project **know-your-vote**, Settings, Environment Variables. Every existing variable targets **Production** only. Keep that.

**Updated 2026-10-05: no renaming is needed.** `SUPABASE` holds the service-role key and `RESEND` the Resend key, as the founder confirmed. `instrumentation.ts` copies them to `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` when the server starts, unless the correct names are already set. The code change ships with #107 and #108. What's left:

| Check | Name | Value |
| --- | --- | --- |
| Keep | `SUPABASE` | The service-role key. Mapped at server start. |
| Keep | `RESEND` | The Resend API key, with sending access for `knowyour.vote`. Mapped at server start. |
| **Confirm** | `EMAIL_FROM` | Must be an address **on `knowyour.vote`**, for example `Know Your Vote <info@knowyour.vote>`. `knowyourvote.com` is not ours: it's parked for sale, and its SPF record forbids all senders, so Resend would refuse every email from it. |
| Optional | `JEV` | The TypeSafe key. No deployed code reads it, so it can stay or go. |
| Not read | `EMAIL_SERVICE` | Nothing reads this name. To let `admin@knowyour.vote` sign in to the admin console, the name is `ADMIN_EMAILS`, and Supabase Auth must be enabled (`admin-dashboard/roadmap.md`). |

After any env change, redeploy: env changes reach only new deployments. Merging #107 deploys.

To retire the mapping later, add `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` under their own names, redeploy, and delete `mapProductionEnvNames()` from `instrumentation.ts`.

Notes:

- **`TYPESAFE_API_KEY` is not needed on Vercel.** It was checked on 2026-10-04: only `src/lib/news-characterize-engines.ts` reads it, and only local scripts import that file (`scripts/news-characterize.ts`, `scripts/candidate-site-ingest.ts` and the eval and demo scripts). No route, cron or page does. Add it to Vercel only if the news characterizer is ever moved into a Vercel cron (the R3 plan in `refresh-agents-plan.md`).
- **`CRON_SECRET` is Sensitive (created 2026-07-02), so Vercel can't show it to you.** If you have no saved copy, rotate it:
  1. Generate a new value (`openssl rand -hex 32`).
  2. Edit `CRON_SECRET` in Vercel and save the new value in your password manager.
  3. Redeploy.

  Vercel Cron picks up the new value by itself. Anything else that calls `/api/cron/*` with the old value must be updated, such as a Cowork task.

## Step 2. Mail DNS and the hello@ mailbox (Founder)

Public DNS was checked on 2026-10-04:

| Record | Found |
| --- | --- |
| `knowyour.vote` MX | `route1/2/3.mx.cloudflare.net` (Cloudflare Email Routing) |
| `knowyour.vote` TXT (SPF) | `v=spf1 include:_spf.mx.cloudflare.net ~all` |
| `resend._domainkey.knowyour.vote` | DKIM key present |
| `send.knowyour.vote` | MX and SPF present (Resend's return path) |
| `_dmarc.knowyour.vote` | **missing** |

1. **Resend, Domains, `knowyour.vote` must show Verified.** If it shows Pending or Failed, compare the records Resend lists with Cloudflare DNS. Any CNAME must be "DNS only" (grey cloud), not proxied.
2. **Add DMARC.** Recommended (pending founder confirmation).
   - Where: Cloudflare, `knowyour.vote`, DNS, Records, Add record.
   - Type `TXT`, name `_dmarc`, content `v=DMARC1; p=none; rua=mailto:hello@knowyour.vote`, TTL Auto.
   - `p=none` only monitors; it never blocks mail. It is there because Gmail and Yahoo expect DMARC from domains that send in volume, and its absence counts against inbox placement.
   - Aggregate reports arrive as daily XML attachments. To skip them, drop the `rua=` part, or use Cloudflare's DMARC Management, which gives its own report address.
3. **Make sure mail to hello@ reaches someone.** Cloudflare, Email, Email Routing, Routing rules: there must be an **Active** rule for `hello@knowyour.vote` (or a catch-all) whose destination is a **verified** address you read. Reminders go out from the `EMAIL_FROM` address (`info@` since 2026-10-05), and so does the daily send digest, so voters' replies and the digest land there. It needs an active rule. So does `hello@`, the public contact on /terms, /methodology and the flag-a-brief link (`CONTACT_EMAIL` in `src/lib/contact.ts`), and `admin@` if you use it.
4. **If your hello@ mailbox is hosted at Spacemail:** with the MX at Cloudflare, inbound mail never reaches that mailbox, and Cloudflare cannot forward `hello@knowyour.vote` to itself. Choose one:
   - **Recommended (pending founder confirmation):** keep Cloudflare Email Routing and forward hello@ to an inbox on another domain that you read. This is no MX change 30 days before the election.
   - Or move the root MX to Spacemail and turn Email Routing off, following Spacemail's own DNS instructions. Add Spacemail to the root SPF if you will also *send* from it.

   Resend sending is unaffected either way: it uses `send.` and its own DKIM record.
5. **Check your Resend plan's sending limits.** The free plan caps daily sends: 100 a day when last checked; confirm on resend.com/pricing. Welcome emails and reminders share that cap. Once the signup is promoted, a reminder day with more active subscribers than the cap will fail part-way. The cron then releases its claim and answers 502, and a re-run mails the early recipients twice. Upgrade before subscribers approach the cap.

## Step 3. Redeploy (Founder)

Env changes reach only new deployments. Use Vercel, Deployments, the current Production deployment, ⋯, Redeploy. Merging this PR to `main` also deploys, with the new env.

After it is live, these GETs are safe to run from anywhere:

- `https://knowyour.vote/api/calendar/general_2026.ics` returns **200** with a calendar file (it was 503).
- The home page shows the deadline banner. Until midnight Eastern on Oct 5 it reads "Register to vote by October 5 · Election Day is November 3".

## Step 4. The end-to-end test (Founder)

Use an address you read that is **not** hello@, such as a personal Gmail or Outlook address, so the test also covers delivery to a major provider. Gmail's plus addressing (`you+kyv1@gmail.com`) gives you a fresh test address each time.

Run SQL in the Supabase dashboard's SQL Editor. It runs as the database owner, which is what these service-role-only tables need.

### 4a. Subscribe

On `https://knowyour.vote/candidates?view=races&zip=33130`, or with this PR merged on the home-page card "Get deadline reminders by email": enter the test address and a covered ZIP, tick the consent box, then press "Email my voting info". The page should say "Sent."

**Expected:** within a minute, an email titled "Where to vote in Miami-Dade County", from your `EMAIL_FROM` address. Check the spam folder. In Gmail, "Show original" should read **SPF: PASS, DKIM: PASS** (`knowyour.vote`), and **DMARC: PASS** once the record exists.

```sql
SELECT email, zip5, consent_at, last_sent_at, active,
       left(unsubscribe_token, 6) AS token_prefix
FROM voting_info_subscription
WHERE lower(email) = lower('<test address>');
```

**Expected:** one row with `active = true` and `last_sent_at` set. If `last_sent_at` is NULL, the row was saved but the email failed, and the page showed "We saved your request but the email didn't send".

### 4b. Trigger the cron by hand

The route accepts `POST` with `x-cron-secret: <CRON_SECRET>`, the manual contract, and `GET` with `Authorization: Bearer <CRON_SECRET>`, which is what Vercel Cron sends. Keep the secret out of your shell history:

```sh
read -rs CRON_SECRET    # paste the value, press Enter; nothing is shown
curl -sS -X POST "https://knowyour.vote/api/cron/send-reminders" \
  -H "x-cron-secret: $CRON_SECRET"
```

Without the secret to hand, Vercel, Settings, Cron Jobs, `/api/cron/send-reminders`, "Run" sends the same request Vercel Cron does.

**What a correct answer looks like depends on the date:**

| When you run it | Answer | What it proves |
| --- | --- | --- |
| Before **00:00 UTC Oct 5** (8 p.m. EDT Oct 4) on today's production code, or before midnight EDT once this PR is merged | `{"due":1,"sent":[{"dedupe_key":"general_2026:registration_deadline:T-1:email","recipients":N}],"skipped":[]}`, and every active subscriber gets "Voter registration closes tomorrow" | The whole path, for real. Only possible tonight. |
| Oct 5 to Oct 20 | `{"due":0,"sent":[],"skipped":[]}` | Auth, env and the database read work. **Nothing is sent and nothing is logged**: no reminder is due. Use 4c for the send path. |
| A send day, after its 14:00 UTC run | the same key under `"skipped"` | Idempotency: the scheduled run already claimed it. |

### 4c. Rehearse the next reminder (needs this PR merged)

Recommended (pending founder confirmation). Between Oct 5 and Oct 20 a plain trigger sends nothing, so this PR adds a rehearsal mode. It sends the **next scheduled reminder**, word for word, to **one address that already has an active subscription**. The subject is prefixed "[Rehearsal]". It is logged under a synthetic key, so the real send for that day is untouched.

The address goes in a JSON body, never in the URL. Vercel's request logs keep every URL with its query string, but not request bodies. (Sentry also strips email addresses from every event: `src/lib/sentry-scrub.ts`.) The route answers **400** if `rehearse` appears in the URL.

```sh
curl -sS -X POST "https://knowyour.vote/api/cron/send-reminders" \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "Content-Type: application/json" \
  --data '{"rehearse":"<test address>"}'
```

**Expected:** `{"rehearsal":true,"dedupe_key":"rehearsal:general_2026:vbm_request_deadline:T-1:email:<timestamp>","template_id":"vbm_deadline_t1","real_send_date":"2026-10-21","recipients":1}`. The email is "[Rehearsal] Vote-by-mail request deadline is tomorrow", ending with an unsubscribe link. Its "tomorrow" refers to the real send date, Oct 21.

### 4d. Check the send log

```sql
SELECT dedupe_key, sent_at, recipient_count
FROM notification_send_log
ORDER BY sent_at DESC
LIMIT 20;
```

**Expected:** the `rehearsal:…` row with `recipient_count = 1`, or the real key from 4b with `recipient_count` equal to the number of distinct active addresses. The cron mails each address once, even when it holds subscriptions for two ZIPs:

```sql
SELECT count(*) AS subscriptions,
       count(DISTINCT lower(email)) AS addresses
FROM voting_info_subscription
WHERE active;
```

The send-day digest reports the first number, as "Active subscriptions". A row with `recipient_count` NULL means a send claimed its key and never finished. That should not happen: failures release the claim. Look at Vercel's function logs and Sentry for that run.

Rehearsal rows are a record that a rehearsal ran. They never match a real key, so leaving them is harmless. Like every row in this table, they hold a key and a count, never an address.

### 4e. Test the unsubscribe link

Open the link at the bottom of the welcome email or the rehearsal. **Expected:** a plain page reading "You're unsubscribed. We won't email you again unless you ask."

```sql
SELECT email, active FROM voting_info_subscription WHERE lower(email) = lower('<test address>');
```

**Expected:** `active = false`. Running 4c again for that address now answers **404**, "No active subscription for that address": an unsubscribed address gets nothing.

**Known limit, not fixed in this PR:** the link deactivates only the row it belongs to. An address subscribed from two ZIPs keeps its other row, so the next reminder still reaches it, carrying the other row's link. The fix belongs in `src/app/api/voting-info/unsubscribe/route.ts`, which is outside this package: deactivate every row whose `lower(email)` matches the token's row. Until it lands, a voter who reports this can be unsubscribed by hand. Run this in the SQL Editor:

```sql
UPDATE voting_info_subscription SET active = false
WHERE lower(email) = lower('<their address>');
```

### 4f. Keep a canary (Recommended, pending founder confirmation)

Subscribe one address you read and leave it subscribed through Nov 3, so you receive every real reminder as voters do. Submitting the form again re-activates an unsubscribed row. On each send day, a digest also goes to the `EMAIL_FROM` address ("Know Your Vote reminders digest — <date>") with the counts. It goes out only on days something was sent.

## What fires when

The output of `node scripts/verify-reminder-schedule.ts`: the real schedule and template code, driven with the six verified `general_2026` rows as they stood on 2026-10-04, one run per day at 14:00 UTC from Oct 4 to Nov 4.

| Send day (14:00 UTC run) | Eastern time | Template | Subject | For |
| --- | --- | --- | --- | --- |
| Sun 2026-10-04 | 10 a.m. EDT | `reg_deadline_t1` | Voter registration closes tomorrow | Registration deadline Oct 5 (postmarked by). **Missed today**: the cron returned 503, with 0 subscribers. |
| Wed 2026-10-21 | 10 a.m. EDT | `vbm_deadline_t1` | Vote-by-mail request deadline is tomorrow | VBM request deadline Oct 22 (received by) |
| Sat 2026-10-24 | 10 a.m. EDT | `early_voting_start` | Early voting starts today | Early voting Oct 24 to 31 |
| Tue 2026-10-27 | 10 a.m. EDT | `ballot_return_t7` | Mail your ballot back this week | Ballot return Nov 3, 7 p.m. (received by) |
| Mon 2026-11-02 | 9 a.m. EST | `ballot_return_t1` | Your ballot must be back by 7 p.m. tomorrow | Ballot return Nov 3 |
| Tue 2026-11-03 | 9 a.m. EST | `election_day` | Today is Election Day | Election Day |

The script asserts all of the following:

- The VBM reminder fires before Oct 22.
- The early-voting reminder fires on or before Oct 24.
- The Election Day reminder fires on or before Nov 3.
- Nothing fires for a passed deadline: the registration T-7 of Sep 28 is never sent late, and nothing goes out on Nov 4.
- Each key fires once, at most one email a day, and a same-day re-run sends nothing new.
- Every email names its date and says "today", "tomorrow" or "one week" correctly for the day it goes out.

There is no reminder for the end of early voting. Nothing about the dates in the table is configurable outside `REMINDER_OFFSETS` in `src/lib/notifications/schedule.ts`.

Vercel may start a scheduled run some minutes into the 14:00 UTC hour.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Cron: **401** `{"error":"Unauthorized"}` | `CRON_SECRET` unset in Production, or the header value is wrong | Check the header name (`x-cron-secret`, or `Authorization: Bearer …`). Rotate `CRON_SECRET` (Step 1) and redeploy. |
| Cron: **503** "Email delivery isn't configured — nothing was sent." | `RESEND_API_KEY` or `EMAIL_FROM` unset in Production | Step 1, then redeploy |
| Cron: **503** "Service credentials missing — nothing was sent." | `SUPABASE_SERVICE_ROLE_KEY` unset | Step 1, then redeploy |
| Signup: **503** "Email delivery isn't configured yet — nothing was sent or stored." | `RESEND_API_KEY` or `EMAIL_FROM` unset | Step 1, then redeploy |
| Signup: **503** "We couldn't save your request — nothing was sent." | `SUPABASE_SERVICE_ROLE_KEY` unset, or the upsert failed | Step 1, then the Supabase logs |
| Signup: **502** "We saved your request but the email didn't send" | Resend rejected the send: domain not verified, wrong key, daily cap reached, or rate limit | Resend, Logs. Step 2, items 1 and 5. |
| Cron: **200** `{"paused":true,…}` | `NOTIFICATIONS_PAUSED` is set (any value) | The intended kill switch (design doc §7). To resume, delete it and redeploy. **A reminder whose day passes while paused is not sent later.** With this PR, pausing also hides the home-page signup card, and the races-view form and the welcome email stop promising reminders. |
| Cron: **200** `{"due":0,…}` | No reminder is scheduled today (see "What fires when"), or the `election_event` rows lost `verified_by` | Normal on most days. Re-check the verified rows if it happens on a send day. |
| Cron: **502** "Claim failed …" or "Cohort count failed …" | Database error | Supabase logs. Nothing was sent; re-run. |
| Cron: **502** "Send failed for … after N recipients — claim released" | Resend error mid-send (daily cap, rate limit, bad key) | Fix the cause and re-run the same day. The first N recipients get a duplicate, the accepted cost (design doc §7). |
| Cron: **500** "Cohort size fuse tripped" | More than 50,000 active subscriptions | Something upstream is corrupt. Investigate before touching the fuse. |
| Rehearsal: **404** "No active subscription for that address" | Address not subscribed, unsubscribed, or misspelled. Case doesn't matter. | Subscribe it (4a), then re-run 4c |
| Rehearsal: **400** "Send the rehearsal address in a JSON body…" | `rehearse` was put in the URL | Use the 4c command: the address goes in the `--data` body |
| Rehearsal: **400** `"rehearse" must be an email address` | The body's `rehearse` is empty or not a string | Fix the body |
| The email lands in spam | No DMARC, a new sending domain, or link-heavy text | Step 2, item 2. Mark it "Not spam" on the canary. |
| Deadline banner missing on the home page | `SUPABASE_SERVICE_ROLE_KEY` unset, or the read failed (cached for up to an hour) | Step 1. A failed read clears within the hour. |

## What this PR changes (for the reviewer)

### Gate, copy and banner

- **One gate.** `src/lib/notifications/config.ts` adds:
  - `emailSenderConfigured()` (`RESEND_API_KEY` + `EMAIL_FROM`), used by both routes in place of their inline checks, with the same status codes and messages;
  - `emailDeliveryConfigured()`, which adds `SUPABASE_SERVICE_ROLE_KEY`. Pages use it to decide whether to offer a signup.
- **No form that can only fail.** When delivery is off, `VotingInfo` on the "Your races" view shows the county Supervisor of Elections and the Division of Elections dates page instead. The flag is passed from `YourRaces`, a server component.
- **Founder decision 3, promotion.** Recommended (pending founder confirmation): yes, once email works.
  - The home page gets a "Get deadline reminders by email" card (`ReminderSignupCta`), plus a link to it in the deadline banner.
  - It renders only while delivery is configured and reminders are not paused, so it switches on with the redeploy after Step 1.
  - **To turn it off:** set `PROMOTE_REMINDER_SIGNUP = false` in `src/lib/notifications/config.ts`.
- **The copy now says what the signup does.**
  - The form and the welcome email used to call it "one email" and a "one-time email", while the cron mails every active subscriber before each deadline (as `/privacy` already said). They now say a reminder follows as each remaining deadline comes up.
  - While `NOTIFICATIONS_PAUSED` is set, the form (`remindersOn`, passed from `YourRaces`) and the welcome email drop that promise.
  - The form and the home card say "where to vote" and "the official link to look up your polling place", because the email links to the county's precinct lookup; it doesn't name a polling place.
- **The deadline banner rolls forward** (`bannerDates()` in `schedule.ts`):
  - registration until the end of Oct 5;
  - the VBM request deadline through Oct 22;
  - early voting Oct 24 to 31;
  - the ballot-return deadline Nov 1 to 3;
  - then nothing after Election Day.

  It used to say "Register to vote by October 5" forever.

### Route behaviour changes beyond the gate

These change what the two production routes do once this PR is merged. None of them has run against the real database or Resend. `scripts/verify-reminder-schedule.ts` runs the pure logic each one depends on, and the founder's Step 4 is the first real run.

1. **Florida's day, not UTC's** (both routes, bug fix). `easternToday()` in `schedule.ts`. The cron took the UTC date: harmless at 14:00 UTC, but a manual re-run after 8 p.m. Eastern would skip that day's released reminder and send tomorrow's a day early. The welcome email and the banner use the same day. *Covered:* the boundary instants, the evening re-run and the night-before early-voting case.
2. **Welcome email rewrite** (signup route). Its copy moved to `welcomeEmail()` in `templates.ts`. It lists only dates that haven't passed in Florida, adds the VBM, early-voting and ballot-return lines, keeps its paragraph breaks, and promises reminders only while they're not paused. *Covered:* rendered for every day from Oct 4 to Nov 4, with reminders on and paused.
3. **Lower-cased signups** (signup route). The address is stored lower-cased, so a change of case no longer creates a second subscription. The live table held no rows on 2026-10-04. *Covered:* source check only.
4. **One reminder per address** (cron). An address with subscriptions for two ZIPs gets one copy of each reminder, not two. `recipient_count` counts addresses. *Covered:* source check only.
5. **Batch pacing** (cron). The cron waits 600 ms between Resend batch calls. Without it, a cohort over 200 hits Resend's default limit of 2 requests a second, and the resulting 429 releases the claim, so a re-run mails the early recipients twice. *Not covered* by the script: it is a sleep between sends.
6. **Rehearsal mode** (cron, step 4c). Recommended (pending founder confirmation). This is a new state-changing path: it inserts, updates and, on a failed send, deletes a `rehearsal:…` row in `notification_send_log`, and it sends one email. It can be reached only with `CRON_SECRET` and a JSON body naming an address that already has an active subscription. *Covered:* `nextReminder()`, the reminder it picks, for every day and evening; source checks that the address comes from the body and that the key is synthetic. **To remove it:** delete the block marked `REHEARSAL` in `src/app/api/cron/send-reminders/route.ts`, plus its `rehearsalRequest()` and `rehearse()` functions. `nextReminder()` in `schedule.ts` then has no caller and can go too.

### To confirm (Founder)

- **The vote-by-mail request cutoff time.** Florida Statutes s. 101.62(3)(c) (2025 text, read at flsenate.gov on 2026-10-04) says: "The deadline to submit a request for a ballot to be mailed is 5 p.m. local time on the 12th day before an upcoming election." No copy states a time yet: the reminder template, the welcome email and the banner all give only the date. As a result, someone who signs up on the evening of Oct 22 is still shown that day's deadline. Once you have confirmed it against dos.fl.gov, these three edits add the time:
  - `src/lib/notifications/templates.ts`, `welcomeEmail()`: change "(your request must be received by then)" to "(your request must be received by 5 p.m. that day)".
  - `src/components/features/DeadlineBanner.tsx`, `nextLine()`: change "Request a vote-by-mail ballot by ${…}" to "Request a vote-by-mail ballot by 5 p.m. on ${…}".
  - `templates.ts`, `vbm_deadline_t1`: add "by 5 p.m." to its body. This is a founder-reviewed template; it goes out on Oct 21.

## Verified, and not verified

- **Verified locally:**
  - `node scripts/verify-reminder-schedule.ts` (schedule, rehearsal target, welcome email by day, Eastern day boundary, banner rollover, delivery gate, and the route wiring above). Deliberately broken copies of the welcome filter, the pause wording, the rehearsal source, the recipient dedupe, `nextReminder`, the form copy and the UTC day each make it fail;
  - `verify-notification-templates.ts`, `verify-calendar.ts` and the dry-run half of `verify-notifications-schema.mjs`;
  - `tsc` and `eslint` on the changed files;
  - a static render (TypeScript transpile and `react-dom/server`) of the form with reminders on and paused, the no-email fallback and the home card, redone after the review fixes, and of the banner on each rollover day;
  - the rehearsal body parsing, run against real `Request` objects: GET, an empty POST, `{}` or a non-JSON body run the normal schedule; a body address is trimmed; a non-string, empty or URL `rehearse` gets a 400.
- **Verified live (read-only):** the env names and types in Vercel (values never decrypted), the DNS records above, the six `election_event` rows, 0 subscribers and 0 send-log rows, and the 503 on the calendar file.
- **Not verified:**
  - **any live POST**: signup, cron, rehearsal and unsubscribe all change state, so the whole of Step 4 is the founder's. The route behaviour changes listed above have run only as pure functions and source checks;
  - Resend's domain status, plan and limits;
  - the Cloudflare Email Routing rules;
  - whether Resend accepts the `Name <address>` form of `EMAIL_FROM` as the digest's `to` address. If the digest never arrives on a send day, check Resend's logs.
