# Reminders: production setup and end-to-end test

Written 2026-10-04 for launch handoff items 2.2 (test the reminder pipeline end to end) and 2.3 (make the reminder signup visible). Every step marked **Founder** needs an account only the founder holds. Calls marked **Recommended (pending founder confirmation)** are an agent's choice, not the founder's decision, and each one says how to flip it.

**Hard deadline: Sunday 2026-10-18** (moved up from Tuesday 2026-10-20 on 2026-10-05). The first reminder that can still reach a voter is now "Early voting starts today" for the four covered counties, sent in the 14:00 UTC cron on **Monday 2026-10-19**. That needs migration 0043 applied and stamped first (see "County early-voting dates (0043)" below). Without it, the first send is the vote-by-mail request reminder on Wednesday 2026-10-21, and the early-voting reminder reaches voters on Oct 24, five days after their county opened. A reminder is sent only on its exact day, so if sending still fails that day, that reminder is lost rather than delayed.

## Why nothing sent before 2026-10-05

Checked on 2026-10-04. The Vercel env metadata was read without decrypting any value. The 503s on the two POST routes follow from that env and the code; they were not triggered, because a live POST changes state. The calendar 503 and the missing banner were seen with live GETs.

- **The keys were in Vercel under other names.** Production holds sensitive vars called `SUPABASE`, `RESEND` and `JEV`, created 2026-08-31. The founder confirmed on 2026-10-05 that they hold the service-role key, the Resend key and the TypeSafe key. The code read `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY`, and nothing read the others. **Fixed in code on 2026-10-05 (#109):** the code now reads either name (`src/lib/server-keys.ts`, step 1). A first attempt in #107, a startup mapping in the root `instrumentation.ts`, never ran on Vercel: with a `src/` folder, Next.js deploys the instrumentation hook only from `src/`. After #109 deployed, the calendar file returned 200 and the banner rendered (live GETs). `EMAIL_FROM` was added on 2026-10-05.
- **So, until #109, every email path failed, and so did everything else that needs the service role:**
  - `POST /api/voting-info` (the signup) answered 503 "Email delivery isn't configured yet".
  - The 14:00 UTC reminder cron answered 503. The 2026-10-04 run would have sent the registration T-1 reminder; there were 0 subscribers, so no one missed it.
  - The calendar file `/api/calendar/general_2026.ics` answered **503**, and the home-page deadline banner rendered nothing. Both read `election_event` through the service role, and both work since #109. The signup has not been seen working yet: that needs a POST (step 4a). Nor have the crons: their first runs with the keys are the scheduled GETs on 2026-10-05 (news at 10:00 UTC, reminders at 14:00 UTC). Until Oct 21 the reminder run should answer `{"due":0,…}`; steps 4b and 4c exercise it by hand.
- **The signup form is offered** on the "Your races" view. Until #109 and `EMAIL_FROM` it could only fail. This PR replaces it with official links whenever delivery isn't configured (see "What this PR changes").

## Step 1. Fix the production env in Vercel (Founder)

Vercel, project **know-your-vote**, Settings, Environment Variables. Every existing variable targets **Production** only. Keep that.

**Updated 2026-10-05: no renaming is needed.** `SUPABASE` holds the service-role key and `RESEND` the Resend key, as the founder confirmed. The code reads `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` when they are set and non-empty, and otherwise `SUPABASE` and `RESEND` (`src/lib/server-keys.ts`, live since #109 on 2026-10-05). What's left:

| Check | Name | Value |
| --- | --- | --- |
| Keep | `SUPABASE` | The service-role key. Read as the fallback name. |
| Keep | `RESEND` | The Resend API key, with sending access for `knowyour.vote`. Read as the fallback name. |
| Keep | `EMAIL_FROM` | An address **on `knowyour.vote`**, for example `Know Your Vote <info@knowyour.vote>`. The founder confirmed on 2026-10-05 that it is. It must stay there: `knowyourvote.com` is not ours. It's parked for sale, and its SPF record forbids all senders, so Resend would refuse every email from it. |
| Optional | `JEV` | The TypeSafe key. No deployed code reads it, so it can stay or go. |
| Not read | `EMAIL_SERVICE` | Nothing reads this name. To let `admin@knowyour.vote` sign in to the admin console, the name is `ADMIN_EMAILS`, and Supabase Auth must be enabled (`admin-dashboard/roadmap.md`). |

After any env change, redeploy: env changes reach only new deployments. A merge to `main` deploys.

To retire the fallbacks later, add `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` under their own names, redeploy, and reduce each function in `src/lib/server-keys.ts` to its first operand.

Notes:

- **`TYPESAFE_API_KEY` is not needed on Vercel.** It was checked on 2026-10-04: only `src/lib/news-characterize-engines.ts` reads it, and only local scripts import that file (`scripts/news-characterize.ts`, `scripts/candidate-site-ingest.ts` and the eval and demo scripts). No route, cron or page does. Add it to Vercel only if the news characterizer is ever moved into a Vercel cron (the R3 plan in `refresh-agents-plan.md`).
- **`CRON_SECRET` is Sensitive (created 2026-07-02), so Vercel can't show it to you.** If you have no saved copy, rotate it:
  1. Generate a new value (`openssl rand -hex 32`).
  2. Edit `CRON_SECRET` in Vercel and save the new value in your password manager.
  3. Redeploy.

  Vercel Cron picks up the new value by itself. Anything else that calls `/api/cron/*` with the old value must be updated, such as a Cowork task.

## Step 2. Mail DNS and the info@ mailbox (Founder)

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
   - Type `TXT`, name `_dmarc`, content `v=DMARC1; p=none; rua=mailto:info@knowyour.vote`, TTL Auto.
   - `p=none` only monitors; it never blocks mail. It is there because Gmail and Yahoo expect DMARC from domains that send in volume, and its absence counts against inbox placement.
   - Aggregate reports arrive as daily XML attachments. To skip them, drop the `rua=` part, or use Cloudflare's DMARC Management, which gives its own report address.
3. **Make sure mail to info@ reaches someone.** Cloudflare, Email, Email Routing, Routing rules: there must be an **Active** rule for `info@knowyour.vote` (or a catch-all) whose destination is a **verified** address you read. Since 2026-10-05 info@ is both the `EMAIL_FROM` address, so voters' replies and the daily send digest land there, and the public contact on /about, /terms, /methodology and the flag-a-brief link (`CONTACT_EMAIL` in `src/lib/contact.ts`; it was hello@ before). `admin@` needs a rule too if you use it.
4. **If your info@ mailbox is hosted at Spacemail:** with the MX at Cloudflare, inbound mail never reaches that mailbox, and Cloudflare cannot forward `info@knowyour.vote` to itself. Choose one:
   - **Recommended (pending founder confirmation):** keep Cloudflare Email Routing and forward info@ to an inbox on another domain that you read. This is no MX change 30 days before the election.
   - Or move the root MX to Spacemail and turn Email Routing off, following Spacemail's own DNS instructions. Add Spacemail to the root SPF if you will also *send* from it.

   Resend sending is unaffected either way: it uses `send.` and its own DKIM record.
5. **Check your Resend plan's sending limits.** The free plan caps daily sends: 100 a day when last checked; confirm on resend.com/pricing. Welcome emails and reminders share that cap. Once the signup is promoted, a reminder day with more active subscribers than the cap will fail part-way. The cron then releases its claim and answers 502, and a re-run mails the early recipients twice. Upgrade before subscribers approach the cap.

## Step 3. Redeploy (Founder)

Env changes reach only new deployments. Use Vercel, Deployments, the current Production deployment, ⋯, Redeploy. Merging this PR to `main` also deploys, with the new env.

After it is live, these GETs are safe to run from anywhere:

- `https://knowyour.vote/api/calendar/general_2026.ics` returns **200** with a calendar file (it was 503).
- The home page shows the deadline banner. Until midnight Eastern on Oct 5 it reads "Register to vote by October 5 · Election Day is November 3".

## Step 4. The end-to-end test (Founder)

Use an address you read that is **not** info@, such as a personal Gmail or Outlook address, so the test also covers delivery to a major provider. Gmail's plus addressing (`you+kyv1@gmail.com`) gives you a fresh test address each time.

Run SQL in the Supabase dashboard's SQL Editor. It runs as the database owner, which is what these service-role-only tables need.

### 4a. Subscribe

On `https://knowyour.vote/candidates?view=races&zip=33130`, or with this PR merged on the home-page card "Get deadline reminders by email": enter the test address and a covered ZIP, tick the consent box, then press "Email my voting info". The page should say "Done. Check your inbox for where to vote and the key dates."

**One welcome email per address and ZIP per day, three per address.** A second signup for the same address and ZIP within 24 hours, or a fourth ZIP that day, saves the subscription but sends no email, and the page says the same "Done." (`src/lib/notifications/welcome-throttle.ts`). A different ZIP within the day does get its own welcome. If you repeat 4a, use a fresh plus address (`you+kyv2@gmail.com`), or check that `last_sent_at` in the query below is more than a day old.

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
| Oct 5 to Oct 18 (to Oct 20 without 0043) | `{"due":0,"sent":[],"skipped":[]}` | Auth, env and the database read work. **Nothing is sent and nothing is logged**: no reminder is due. Use 4c for the send path. |
| A send day, after its 14:00 UTC run | that day's key under `"skipped"` (on Oct 21, `general_2026:vbm_request_deadline:T-1:email`; on Oct 19, `general_2026:early_voting_start:T-0:email:<FIPS>` for each county with at least one active subscriber, and under `"noRecipients"` for each county with none) | Idempotency: the scheduled run already claimed it. A key with no subscriber in its scope is never claimed, so it can never show as skipped. |
| Oct 24, with 0043 stamped | `general_2026:early_voting_start:T-0:email` under `"noRecipients"` | The statewide "starts today" reminder is due but goes to nobody: every subscriber is in a covered county, and each county's own reminder went out on Oct 19. A reminder with no recipients is not claimed or logged. |

The registration T-1 reminder was due on Oct 4, when the cron still answered 503 (see "Why nothing sent before 2026-10-05"). The production code takes the UTC date, so its Oct 4 ended at 00:00 UTC Oct 5 (8 p.m. EDT Oct 4), before #109 deployed. That reminder could never be sent and can't be tested live.

### 4c. Rehearse the next reminder (needs this PR merged)

Recommended (pending founder confirmation). Between Oct 5 and Oct 18 a plain trigger sends nothing, so this PR adds a rehearsal mode. It sends the **next scheduled reminder**, word for word, to **one address that already has an active subscription**. The subject is prefixed "[Rehearsal]". It is logged under a synthetic key, so the real send for that day is untouched.

The address goes in a JSON body, never in the URL. Vercel's request logs keep every URL with its query string, but not request bodies. (Sentry also strips email addresses from every event: `src/lib/sentry-scrub.ts`.) The route answers **400** if `rehearse` appears in the URL.

```sh
curl -sS -X POST "https://knowyour.vote/api/cron/send-reminders" \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "Content-Type: application/json" \
  --data '{"rehearse":"<test address>"}'
```

**Expected, once 0043 is stamped** (the test address subscribed with a ZIP in one of the four counties): `{"rehearsal":true,"dedupe_key":"rehearsal:general_2026:early_voting_start:T-0:email:<county FIPS>:<timestamp>","template_id":"early_voting_start","real_send_date":"2026-10-19","recipients":1}`. The email is "[Rehearsal] Early voting starts today". It names the county, says early voting begins Monday, October 19, links the county's early-voting page, and ends with an unsubscribe link. Its "today" refers to the real send date, Oct 19. The rehearsal follows the subscriber's county, exactly as the scheduled run does.

**Expected before 0043 is stamped,** or on Oct 20 and 21: `{"rehearsal":true,"dedupe_key":"rehearsal:general_2026:vbm_request_deadline:T-1:email:<timestamp>","template_id":"vbm_deadline_t1","real_send_date":"2026-10-21","recipients":1}`. The email is "[Rehearsal] Vote-by-mail request deadline is tomorrow", ending with an unsubscribe link. Its "tomorrow" refers to the real send date, Oct 21. Before 0043, the welcome email from 4a also still shows the statewide window (Oct 24 to Oct 31); after it, the county's (Oct 19 to Nov 1).

### 4d. Check the send log

```sql
SELECT dedupe_key, sent_at, recipient_count
FROM notification_send_log
ORDER BY sent_at DESC
LIMIT 20;
```

**Expected:** the `rehearsal:…` row with `recipient_count = 1`, or, after a send day's 14:00 UTC run, that day's real key (the one 4b shows under `"skipped"`) with `recipient_count` equal to the number of distinct active addresses. For a county key (`…:<FIPS>`, Oct 19), count only the addresses whose ZIP is in that county. A reminder due to no one is not logged at all; the digest lists it instead. The cron mails each address once per reminder, even when it holds subscriptions for two ZIPs:

```sql
SELECT count(*) AS subscriptions,
       count(DISTINCT lower(email)) AS addresses
FROM voting_info_subscription
WHERE active;
```

The send-day digest reports the first number, as "Active subscriptions". A row with `recipient_count` NULL means a send claimed its key and never finished. That should not happen: failures release the claim. Look at Vercel's function logs for that run.

Rehearsal rows are a record that a rehearsal ran. They never match a real key, so leaving them is harmless. Like every row in this table, they hold a key and a count, never an address.

### 4e. Test the unsubscribe link

Open the link at the bottom of the welcome email or the rehearsal. **Expected:** a page titled "Unsubscribe from Know Your Vote?" naming the test address masked (for example `y***@gmail.com`), with one **Unsubscribe** button. Opening the link changes nothing: mail scanners open links before the voter does (`src/lib/notifications/unsubscribe.ts`). Run the query below now and `active` is still `true`.

Press **Unsubscribe**. **Expected:** "You're unsubscribed. We won't email y***@gmail.com again unless you ask." Pressing it again, or opening the link again, says "You're already unsubscribed".

```sql
SELECT email, active FROM voting_info_subscription WHERE lower(email) = lower('<test address>');
```

**Expected:** `active = false` on every row for the address, one per ZIP it signed up from. Running 4c again for that address now answers **404**, "No active subscription for that address": an unsubscribed address gets nothing.

**The mail app's own button.** Every email to a subscriber carries `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058). In Gmail, "Show original" lists both. RFC 8058 asks the receiver to honour one-click only when the DKIM signature covers both headers, so check that the `DKIM-Signature` header's `h=` list includes `list-unsubscribe` and `list-unsubscribe-post`. Gmail may also show an "Unsubscribe" link beside the sender's name, more often once the domain has some sending history. Pressing it POSTs to the same link and unsubscribes with no page. To try it, subscribe a second test address and use it there.

**Exact address match.** The button turns off every row whose address matches the token's row exactly. The signup route has stored addresses lower-cased since 2026-10-04, when the table was empty, so every row is lower-case. A row stored with capitals before that would not match. A voter who reports still getting email after unsubscribing can be unsubscribed by hand. Run this in the SQL Editor:

```sql
UPDATE voting_info_subscription SET active = false
WHERE lower(email) = lower('<their address>');
```

### 4f. Keep a canary (Recommended, pending founder confirmation)

Subscribe one address you read and leave it subscribed through Nov 3, so you receive every real reminder as voters do. Submitting the form again re-activates an unsubscribed row; it sends a new welcome email only if that address had none in the last 24 hours, so a canary that reuses the 4a address gets no second welcome the same day, and still gets every reminder. On each send day, a digest also goes to the `EMAIL_FROM` address ("Know Your Vote reminders digest — <date>") with the counts. It goes out only on days something was sent.

## County early-voting dates (0043)

**Done 2026-10-05: applied, then stamped at 15:54 UTC.** The banner, the welcome email, the calendar file and the reminders now give each covered county its own window.

Florida's statewide window (Sat Oct 24 to Sat Oct 31) is the minimum every county must offer. A Supervisor of Elections may add the 15th to 11th days before the election and the 2nd (s. 101.657(1)(d), Fla. Stat.), and all four covered counties add every one of them. Each county's own site, checked twice on 2026-10-05, says early voting for the Nov 3 general runs **Monday Oct 19 to Sunday Nov 1**:

| County | FIPS | Hours | Official page (`details_url`) |
| --- | --- | --- | --- |
| Miami-Dade | 12086 | 7 a.m. to 7 p.m. | https://www.miamidade.gov/elections/library/early-voting/2026-11-03-general-election-early-voting-schedule.pdf |
| Broward | 12011 | 7 a.m. to 7 p.m. | https://browardvotes.gov/voters/early-voting-ballot-return |
| Hillsborough | 12057 | 7 a.m. to 7 p.m. | https://www.votehillsborough.gov/EarlyVoting |
| Orange | 12095 | 8 a.m. to 8 p.m. | https://voteorangefl.gov/vote-early/ (ocfelections.gov now redirects here) |

`supabase/migrations/0043_county_early_voting_2026.sql` adds one `early_voting_start` (Oct 19) and one `early_voting_end` (Nov 1) row per county, with `verified_by` NULL. As with every `election_event` row, an unverified row reaches no page, email or calendar.

1. ~~Run the file in the Supabase SQL editor.~~ **Done 2026-10-05:** applied to production with the founder's approval; the 8 rows are in, unverified. It is idempotent (`ON CONFLICT DO NOTHING`), so running it again changes nothing. It doesn't depend on 0042 or 0014, and those don't depend on it.
2. ~~Open each `details_url` above and check the dates. Then stamp the rows.~~ **Done 2026-10-05 15:54 UTC** with the founder's approval: `UPDATE 8`. Just before it, the Miami-Dade, Broward and Orange pages were read again and matched. Hillsborough's site blocked the cloud session (Cloudflare 403), so its stamp rests on two direct reads earlier that day, the county's own news post and Fox 13 Tampa Bay (Oct 1); the founder's browser check is `cowork-handoff-2026-10-05.md` task 1. The SQL, for reference:

   ```sql
   UPDATE election_event
      SET verified_by = '<your email>', verified_at = now()
    WHERE election = 'general_2026'
      AND county_fips IN ('12086', '12011', '12057', '12095')
      AND event_type IN ('early_voting_start', 'early_voting_end')
      AND verified_by IS NULL;
   -- expect: UPDATE 8
   ```

3. Check:

   ```sql
   SELECT county_fips, event_type, event_date, verified_by IS NOT NULL AS verified
     FROM election_event
    WHERE county_fips IS NOT NULL
    ORDER BY county_fips, event_type;
   -- expect 8 rows, all verified: early_voting_end 2026-11-01, early_voting_start 2026-10-19
   ```

**If the stamp is late.** A reminder is sent only on its own day, and the statewide Oct 24 reminder no longer covers a county once that county's rows are stamped.

- **Stamped on Oct 19, after the 14:00 UTC run.** Trigger the cron by hand the same day, before midnight Eastern (step 4b). The county reminders are still due that day and go out.
- **Stamped Oct 20 or later.** No subscriber gets an early-voting reminder at all: the county reminders' day has passed, and the Oct 24 one now covers none of them. Stamp anyway. The Oct 24 "starts today" email would have been false for every subscriber, and the stamp still fixes the banner, the welcome email and the calendar file.
- **Either way, the digest says so.** On any day a reminder was due but reached no one, the send-day digest lists it under "Due today but sent to no one".

What changes once the rows are stamped. The code that reads them is already deployed, and it works without them:

- **Reminders.** Each county's subscribers get "Early voting starts today" on Oct 19, naming their county and linking its page. Each county is its own send under its own key (`general_2026:early_voting_start:T-0:email:<FIPS>`). The statewide Oct 24 reminder skips them. A subscriber's county comes from their ZIP (`zip_district`).
- **Banner.**
  - A visitor whose saved district is in one of the four counties sees "Early voting runs October 19 to November 1 in <county> County".
  - Everyone else sees "Early voting runs October 24 to October 31 statewide; October 19 to November 1 in Miami-Dade, Broward, Hillsborough and Orange counties".
  - The banner's cache tag is `election-dates`, so it updates within the hour.
- **Welcome email and calendar file.** Both give the voter's county's window. The calendar link carries `?county=<FIPS>`. `/api/calendar/general_2026.ics` without it stays statewide.

Doing nothing is not neutral. The Oct 24 "Early voting starts today" email would tell every subscriber something false: their county opened five days earlier.

## What fires when

The output of `node scripts/verify-reminder-schedule.ts`: the real schedule and template code, driven with the six verified `general_2026` rows as they stood on 2026-10-04, plus 0043's county rows stamped. One run a day at 14:00 UTC, Oct 4 to Nov 4. Every current subscriber is in one of the four covered counties (the signup accepts no other ZIP), so this is the calendar each of them gets.

| Send day (14:00 UTC run) | Eastern time | Template | Subject | For |
| --- | --- | --- | --- | --- |
| Sun 2026-10-04 | 10 a.m. EDT | `reg_deadline_t1` | Voter registration closes tomorrow | Registration deadline Oct 5 (postmarked by). **Missed**: the cron returned 503, with 0 subscribers. |
| Mon 2026-10-19 | 10 a.m. EDT | `early_voting_start` | Early voting starts today | Early voting in the subscriber's county, Oct 19 to Nov 1. One send per county; needs 0043 stamped |
| Wed 2026-10-21 | 10 a.m. EDT | `vbm_deadline_t1` | Vote-by-mail request deadline is tomorrow | VBM request deadline Oct 22 (received by) |
| Tue 2026-10-27 | 10 a.m. EDT | `ballot_return_t7` | Mail your ballot back this week | Ballot return Nov 3, 7 p.m. (received by) |
| Mon 2026-11-02 | 9 a.m. EST | `ballot_return_t1` | Your ballot must be back by 7 p.m. tomorrow | Ballot return Nov 3 |
| Tue 2026-11-03 | 9 a.m. EST | `election_day` | Today is Election Day | Election Day |

The script asserts all of the following:

- The VBM reminder fires before Oct 22.
- With 0043 stamped, each county's early-voting reminder fires on Oct 19, under its own key, to that county only, and no county gets the statewide Oct 24 one. A voter in no county with its own dates (the statewide scope; none today) would still get the statewide reminder on Oct 24.
- Before 0043 is stamped, the schedule is exactly the statewide one: early voting on Oct 24, and the other keys unchanged.
- The Election Day reminder fires on or before Nov 3.
- Nothing fires for a passed deadline: the registration T-7 of Sep 28 is never sent late, and nothing goes out on Nov 4.
- Each key fires once, at most one email a day, and a same-day re-run sends nothing new.
- Every email names its date and says "today", "tomorrow" or "one week" correctly for the day it goes out.

There is no reminder for the end of early voting. Nothing about the dates in the table is configurable outside `REMINDER_OFFSETS` in `src/lib/notifications/schedule.ts`.

Vercel may start a scheduled run some minutes into the 14:00 UTC hour.

## Sending a correction

Added 2026-10-05 (plan C3; design doc §7, "Wrong-date catastrophe"). Use it when an email we sent stated a wrong date. The route is `POST /api/cron/send-correction` (`src/app/api/cron/send-correction/route.ts`). It sends one thing only, the pre-approved `correction` template, which has no free-text field:

> Correction: the <event> for the 2026 Florida general election is <date>. Please disregard the date in our earlier message — we're sorry for the error. Official source: <details_url>

followed by the unsubscribe line every reminder carries.

**It can only state a date you have already verified.** The `date` and `details_url` you send must equal those of a **verified** `election_event` row of the type `event_label` names: the statewide row, or a county's own row when you add `county_fips`. Anything else answers **422** and sends nothing. So the order is always: fix the row, verify it, then send. The email is rendered from that row.

| `event_label` | Corrects |
| --- | --- |
| `voter registration deadline` | `registration_deadline` |
| `vote-by-mail request deadline` | `vbm_request_deadline` |
| `vote-by-mail ballot return deadline` | `ballot_return_deadline` |
| `early voting start date` | `early_voting_start` |
| `early voting end date` | `early_voting_end` |
| `election day` | `election_day` |

**Who gets it:** every active subscriber the corrected date applies to now, each address once. That is not limited to the people the wrong date reached: someone who subscribed afterwards gets it too, and its "disregard the date in our earlier message" will not match anything they received.

- **Statewide** (no `county_fips`): every active subscriber for whom the statewide row is the date that applies. Once 0043 is stamped, that leaves out the four counties' subscribers for early voting only, because they have rows of their own.
- **One county** (`"county_fips":"12086"`, `12011`, `12057` or `12095`): that county's subscribers only. This needs the county's own row of that type. A county without one reads the statewide date, so its subscribers are covered by the statewide correction. The two never overlap, so nobody gets the same correction twice.

**`NOTIFICATIONS_PAUSED` does not stop it, on purpose.** The playbook pauses the reminders while a correction is prepared, so the correction is what you send while they are paused. If the pause blocked it, you would have to resume the schedule that sent the wrong date in order to send the fix. Its own secret, the verified-date guard and the confirmed key and count are its safety instead.

**Its own secret.** The route checks `CORRECTION_SECRET` in an `x-correction-secret` header, not `CRON_SECRET`, which Vercel Cron and any scheduled caller also hold. Without `CORRECTION_SECRET` set, every call answers **503** and nothing is sent. **Set it once, before you need it:** generate a long random value (for example `openssl rand -hex 32`), keep it only in your password manager, add it in Vercel as `CORRECTION_SECRET` (Production, Sensitive), and redeploy.

**Everything goes in the JSON body.** A URL with any query parameter answers **400**. Each call takes exactly one of `"dry_run": true`, `"rehearse": "<address>"` or `"confirm_recipients": <count>` (with `"confirm_key"`). A real send needs both the count and the `dedupe_key` from this correction's own dry run, so it cannot happen by accident, and a count from a different correction's dry run does not unlock it.

### Steps (Founder)

1. **Pause the reminders** if another wrong send could go out: in Vercel, add `NOTIFICATIONS_PAUSED` = `1` to Production, then redeploy.
2. **Fix and re-verify the row.** Open the official page and check the date first. Then run this in the SQL Editor:

   ```sql
   UPDATE election_event
      SET event_date = '<correct date>', details_url = '<official page>',
          verified_by = '<your email>', verified_at = now()
    WHERE election = 'general_2026'
      AND event_type = '<event_type>'
      AND county_fips IS NULL;     -- for a county row: AND county_fips = '<FIPS>'
   -- expect: UPDATE 1
   ```

   This also fixes the banner (within the hour), the welcome email and the calendar file.
3. **Set the fields once**, in the shell you will send from. The three calls below differ only in their last key, so the dry run counts exactly the people the send will mail:

   ```sh
   read -rs CORRECTION_SECRET    # paste the value, press Enter; nothing is shown
   FIELDS='"event_label":"early voting start date","election":"general_2026","date":"2026-10-19","details_url":"https://www.miamidade.gov/elections/library/early-voting/2026-11-03-general-election-early-voting-schedule.pdf","county_fips":"12086"'
   ```

   That example is Miami-Dade's own early-voting row. For a statewide correction, leave out `,"county_fips":"…"`. Copy `date` and `details_url` from the row exactly: a missing trailing slash is a mismatch. Run this step in every new shell: steps 4 to 6 use both variables.
4. **Dry run.** It sends nothing and writes nothing.

   ```sh
   curl -sS -X POST "https://knowyour.vote/api/cron/send-correction" \
     -H "x-correction-secret: $CORRECTION_SECRET" \
     -H "Content-Type: application/json" \
     --data "{$FIELDS,\"dry_run\":true}"
   ```

   **Expected:** `{"dry_run":true,"dedupe_key":"correction:general_2026:early_voting_start:2026-10-19:12086","scope":"Miami-Dade County","already_sent":false,"subject":"Correction: an election date we sent was wrong","text":"…","recipients":<N>,"active_subscriptions":<M>,"next":"…"}`. Read `text`: it is the email word for word. The unsubscribe link shows `<unsubscribe token>` where each voter's own token goes.
5. **Rehearse** to your own address. It must hold an active subscription (4a):

   ```sh
   curl -sS -X POST "https://knowyour.vote/api/cron/send-correction" \
     -H "x-correction-secret: $CORRECTION_SECRET" \
     -H "Content-Type: application/json" \
     --data "{$FIELDS,\"rehearse\":\"<test address>\"}"
   ```

   **Expected:** `{"rehearsal":true,"dedupe_key":"rehearsal:correction:…:<timestamp>","real_dedupe_key":"correction:…","in_cohort":true,"recipients":1}`, and an email "[Rehearsal] Correction: an election date we sent was wrong". If `in_cohort` is `false`, the real send will not reach that address, for example a county correction and a test ZIP in another county. The rehearsal is still sent.
6. **Send**, with the count the dry run reported:

   ```sh
   curl -sS -X POST "https://knowyour.vote/api/cron/send-correction" \
     -H "x-correction-secret: $CORRECTION_SECRET" \
     -H "Content-Type: application/json" \
     --data "{$FIELDS,\"confirm_recipients\":<N from step 4>,\"confirm_key\":\"<dedupe_key from step 4>\"}"
   ```

   **Expected:** `{"sent":true,"dedupe_key":"correction:…","scope":"…","recipients":<N>}`, then a digest to the `EMAIL_FROM` address, "Know Your Vote correction sent — <date>". If anyone subscribed or unsubscribed since the dry run, or `confirm_key` is not this correction's `dedupe_key`, the call answers **409** and sends nothing. Run the dry run again and confirm what it reports.
7. **Check** that 4d's query shows the `correction:…` row with `recipient_count` = N. Once every remaining date is right, delete `NOTIFICATIONS_PAUSED` and redeploy. A reminder whose day passed while paused is not sent later.

**Once per date.** A correction is claimed in `notification_send_log` as `correction:<election>:<event_type>:<date>[:<FIPS>]` and goes out once. Sending it again answers **409** "Already sent". A correction to a different date, after you re-verify the row again, has a new key. To resend the same one deliberately, delete its row first: `DELETE FROM notification_send_log WHERE dedupe_key = '<key>';`.

**Rehearse it once, before the first county reminder on Oct 19.** Recommended (pending founder confirmation); it is plan C3's Verify step. Nothing is wrong today, so rehearse with a date that is already right, such as the statewide vote-by-mail request deadline. Set `CORRECTION_SECRET` first (above). Then run step 3 with these fields, and steps 4 and 5:

```sh
read -rs CORRECTION_SECRET
FIELDS='"event_label":"vote-by-mail request deadline","election":"general_2026","date":"2026-10-22","details_url":"https://dos.fl.gov/elections/for-voters/election-dates/"'
```

**Do not run step 6 for a rehearsal:** it would mail every subscriber a correction for a date that was never wrong.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Correction: **503** "Corrections are off: CORRECTION_SECRET is not set" | `CORRECTION_SECRET` unset in Production | "Sending a correction": set it, then redeploy |
| Correction: **401** `{"error":"Unauthorized"}` | Wrong header or value. The correction route takes `x-correction-secret: <CORRECTION_SECRET>`, never `CRON_SECRET` | Re-run step 3's `read -rs CORRECTION_SECRET` |
| Cron: **401** `{"error":"Unauthorized"}` | `CRON_SECRET` unset in Production, or the header value is wrong | Check the header name (`x-cron-secret`, or `Authorization: Bearer …`). Rotate `CRON_SECRET` (Step 1) and redeploy. |
| Cron: **503** "Email delivery isn't configured — nothing was sent." | `RESEND_API_KEY` and `RESEND` both unset or empty, or `EMAIL_FROM` unset, in Production | Step 1, then redeploy |
| Cron: **503** "Service credentials missing — nothing was sent." | `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE` both unset or empty | Step 1, then redeploy |
| Signup: **503** "Email delivery isn't configured yet — nothing was sent or stored." | `RESEND_API_KEY` and `RESEND` both unset or empty, or `EMAIL_FROM` unset | Step 1, then redeploy |
| Signup: **503** "We couldn't save your request — nothing was sent." | `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE` both unset or empty, or the upsert failed | Step 1, then the Supabase logs |
| Signup: **502** "We saved your request but the email didn't send" | Resend rejected the send: domain not verified, wrong key, daily cap reached, or rate limit | Resend, Logs. Step 2, items 1 and 5. |
| Cron: **200** `{"paused":true,…}` | `NOTIFICATIONS_PAUSED` is set (any value) | The intended kill switch (design doc §7). To resume, delete it and redeploy. **A reminder whose day passes while paused is not sent later.** With this PR, pausing also hides the home-page signup card, and the races-view form and the welcome email stop promising reminders. A correction still sends while paused, by design ("Sending a correction"). |
| Cron: **200** `{"due":0,…}` | No reminder is scheduled today (see "What fires when"), or the `election_event` rows lost `verified_by` | Normal on most days. Re-check the verified rows if it happens on a send day. |
| Cron: **502** "Claim failed …" or "Cohort count failed …" | Database error | Supabase logs. Nothing was sent; re-run. |
| Cron: **502** "Send failed for … after N recipients — claim released" | Resend error mid-send (daily cap, rate limit, bad key) | Fix the cause and re-run the same day. The first N recipients get a duplicate, the accepted cost (design doc §7). |
| Cron: **500** "Cohort size fuse tripped" | More than 50,000 active subscriptions | Something upstream is corrupt. Investigate before touching the fuse. |
| Rehearsal: **404** "No active subscription for that address" | Address not subscribed, unsubscribed, or misspelled. Case doesn't matter. | Subscribe it (4a), then re-run 4c |
| Rehearsal: **400** "Send the rehearsal address in a JSON body…" | `rehearse` was put in the URL | Use the 4c command: the address goes in the `--data` body |
| Rehearsal: **400** `"rehearse" must be an email address` | The body's `rehearse` is empty or not a string | Fix the body |
| Correction: **422** "… is <date>, not <date>", "details_url must be the verified row's own", or "is not verified" | The request does not match a verified row | Fix and re-verify the row first ("Sending a correction", step 2), then copy its `date` and `details_url` exactly |
| Correction: **422** "There is no … County's own … row" | `county_fips` given for a type that county has no row of its own for | Leave `county_fips` out: the statewide correction covers that county |
| Correction: **400** "… Nothing was sent." | A field is missing, misspelt or unknown, not exactly one mode was given, or the URL carries a query parameter | The message names the field. Everything goes in the `--data` body |
| Correction: **409** "confirm_recipients is …" | The count changed since the dry run, or was mistyped | Dry-run again and confirm the number it reports |
| Correction: **409** "Already sent" | This correction's key is already in `notification_send_log` | Nothing to do. To resend deliberately, delete that row first |
| Correction: **404** "No active subscriber is in this correction's scope" | Nobody holds the date being corrected (for example the statewide early-voting row, once 0043 is stamped) | Nothing to send. Check `county_fips` |
| Correction: **502** "Send failed for correction:… after N recipients — claim released" | Resend error mid-send | Fix the cause, dry-run and send again. The first N get a duplicate |
| Correction: **405** | A GET, or a method other than POST | Use the curl commands in "Sending a correction" |
| The email lands in spam | No DMARC, a new sending domain, or link-heavy text | Step 2, item 2. Mark it "Not spam" on the canary. |
| Deadline banner missing on the home page | `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE` both unset or empty, or the read failed (cached for up to an hour) | Step 1. A failed read clears within the hour. |

## What this PR changes (for the reviewer)

### Gate, copy and banner

- **One gate.** `src/lib/notifications/config.ts` adds:
  - `emailSenderConfigured()` (the Resend key, `RESEND_API_KEY` or `RESEND`, plus `EMAIL_FROM`), used by both routes in place of their inline checks, with the same status codes and messages;
  - `emailDeliveryConfigured()`, which adds the service-role key (`SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE`, via `src/lib/server-keys.ts`). Pages use it to decide whether to offer a signup.
- **No form that can only fail.** When delivery is off, `VotingInfo` on the "Your races" view shows the county Supervisor of Elections and the Division of Elections dates page instead. The flag is passed from `YourRaces`, a server component.
- **Founder decision 3, promotion.** Recommended (pending founder confirmation): yes, once email works.
  - The home page gets a "Get deadline reminders by email" card (`ReminderSignupCta`), plus a link to it in the deadline banner.
  - It renders only while delivery is configured and reminders are not paused. Production's env is now complete, so it switches on as soon as this PR deploys.
  - **To turn it off:** set `PROMOTE_REMINDER_SIGNUP = false` in `src/lib/notifications/config.ts`.
- **The copy now says what the signup does.**
  - The form and the welcome email used to call it "one email" and a "one-time email", while the cron mails every active subscriber before each deadline (as `/privacy` already said). They now say a reminder follows as each remaining deadline comes up.
  - While `NOTIFICATIONS_PAUSED` is set, the form (`remindersOn`, passed from `YourRaces`) and the welcome email drop that promise.
  - The form and the home card say "where to vote" and "the official link to look up your polling place", because the email links to the county's precinct lookup; it doesn't name a polling place.
- **The deadline banner rolls forward** (`bannerDates()` in `schedule.ts`; merged with #107, so already live). This PR only passes it the link to the reminder card (`remindersHref` from `src/app/(public)/page.tsx`). Since #107 it shows:
  - registration until the end of Oct 5;
  - the VBM request deadline through Oct 22;
  - early voting Oct 24 to 31 (the statewide rows; since 2026-10-05, a visitor whose saved district is in a covered county sees that county's Oct 19 to Nov 1 window once 0043 is stamped, see "County early-voting dates (0043)");
  - the ballot-return deadline Nov 1 to 3;
  - then nothing after Election Day.

  Before #107 it said "Register to vote by October 5" forever.

### Route behaviour changes beyond the gate

These change what the two production routes do once this PR is merged. None of them has run against the real database or Resend. `scripts/verify-reminder-schedule.ts` runs the pure logic each one depends on, and the founder's Step 4 is the first real run.

1. **Florida's day, not UTC's** (both routes, bug fix). `easternToday()` in `schedule.ts`. The cron took the UTC date: harmless at 14:00 UTC, but a manual re-run after 8 p.m. Eastern would skip that day's released reminder and send tomorrow's a day early. The welcome email and the banner use the same day. *Covered:* the boundary instants, the evening re-run and the night-before early-voting case.
2. **Welcome email rewrite** (signup route). Its copy moved to `welcomeEmail()` in `templates.ts`. It lists only dates that haven't passed in Florida, adds the VBM, early-voting and ballot-return lines, keeps its paragraph breaks, and promises reminders only while they're not paused. *Covered:* rendered for every day from Oct 4 to Nov 4, with reminders on and paused.
3. **Lower-cased signups** (signup route). The address is stored lower-cased, so a change of case no longer creates a second subscription. The live table held no rows on 2026-10-04. *Covered:* source check only.
4. **One reminder per address** (cron). An address with subscriptions for two ZIPs gets one copy of each reminder, not two. `recipient_count` counts addresses. *Covered:* source check only.
5. **Batch pacing** (cron). The cron waits 600 ms between Resend batch calls. Without it, a cohort over 200 hits Resend's default limit of 2 requests a second, and the resulting 429 releases the claim, so a re-run mails the early recipients twice. *Not covered* by the script: it is a sleep between sends.
6. **Rehearsal mode** (cron, step 4c). Recommended (pending founder confirmation). This is a new state-changing path: it inserts, updates and, on a failed send, deletes a `rehearsal:…` row in `notification_send_log`, and it sends one email. It can be reached only with `CRON_SECRET` and a JSON body naming an address that already has an active subscription. *Covered:* `nextReminder()`, the reminder it picks, for every day and evening; source checks that the address comes from the body and that the key is synthetic. **To remove it:** delete the block marked `REHEARSAL` in `src/app/api/cron/send-reminders/route.ts`, plus its `rehearsalRequest()` and `rehearse()` functions. `nextReminder()` in `schedule.ts` then has no caller and can go too.

### To confirm (Founder)

- **The vote-by-mail request cutoff time.** Florida Statutes s. 101.62(3)(c) (2025 text, read at flsenate.gov on 2026-10-04) says: "The deadline to submit a request for a ballot to be mailed is 5 p.m. local time on the 12th day before an upcoming election." This PR adds that time to the reminder template (`vbm_deadline_t1`) and the welcome email (`welcomeEmail()`, when the event's rule is `received_by`), both in `src/lib/notifications/templates.ts`; the banner (`bannerLine()` in `src/lib/notifications/banner.ts`, moved there from `DeadlineBanner.tsx` on 2026-10-05) has said "5 p.m." since #107. Confirm the time against dos.fl.gov before Oct 21, when `vbm_deadline_t1` goes out. If it is wrong, those three strings are the edits.

## Verified, and not verified

- **Verified locally:**
  - `node scripts/verify-reminder-schedule.ts` (schedule, rehearsal target, welcome email by day, Eastern day boundary, banner rollover, delivery gate, and the route wiring above). Deliberately broken copies of the welcome filter, the pause wording, the rehearsal source, the recipient dedupe, `nextReminder`, the form copy and the UTC day each make it fail;
  - `verify-notification-templates.ts`, `verify-calendar.ts` and the dry-run half of `verify-notifications-schema.mjs`;
  - `tsc` and `eslint` on the changed files;
  - a static render (TypeScript transpile and `react-dom/server`) of the form with reminders on and paused, the no-email fallback and the home card, redone after the review fixes, and of the banner on each rollover day;
  - the rehearsal body parsing, run against real `Request` objects: GET, an empty POST, `{}` or a non-JSON body run the normal schedule; a body address is trimmed; a non-string, empty or URL `rehearse` gets a 400.
- **Verified live (read-only):** the env names and types in Vercel (values never decrypted), the DNS records above, the six `election_event` rows, 0 subscribers and 0 send-log rows, and the 503 on the calendar file; on 2026-10-05, after #109 deployed, the 200 on the calendar file and the banner on `/`.
- **Not verified:**
  - **any live POST**: signup, cron, rehearsal and unsubscribe all change state, so the whole of Step 4 is the founder's. The route behaviour changes listed above have run only as pure functions and source checks;
  - Resend's domain status, plan and limits;
  - the Cloudflare Email Routing rules;
  - whether Resend accepts the `Name <address>` form of `EMAIL_FROM` as the digest's `to` address. If the digest never arrives on a send day, check Resend's logs.
