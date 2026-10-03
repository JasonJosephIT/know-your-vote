# Know Your Vote — what's still missing from launch

**Audited 2026-10-03** against the live site (knowyour.vote), the live Supabase
database, and `main` at `64383f2`.

Know Your Vote is a Next.js website on Vercel. Its data lives in Supabase (a
hosted Postgres database). It also uses Resend for email, Sentry for error
tracking, Pelias for address lookup, and Zeffy for donations.

**Already working:** the site loads, the Google tag waits for cookie consent, the
Donate form (Zeffy, Know Yours Inc) works, and the publish function cannot be
called with the public browser key (TC-5 is closed on live).

**Clock:** election day is **Nov 3**, 31 days away. Voter registration closes
**Mon Oct 5**. Vote-by-mail requests close **Oct 22**. Early voting starts as
soon as **Oct 19** in some counties.

**Estimated time:** about 1 hour of your time, plus the content pipeline runs.
**Added monthly cost:** $0 (Resend's free tier covers 3,000 emails a month).

Legend:
- 🧑 **You** — needs your accounts, a decision, or a final click.
- 🤖 **Agent** — paste the prompt into your coding agent.
- 🤝 **Together** — the agent prepares it, you approve or paste in a value.

Never paste a secret (API key, password) into a chat. Secrets go straight
into Vercel → Settings → Environment Variables.

---

## Phase 1 — Quick settings fixes (do today)

- [ ] 🧑 **Point the site's address setting at the real domain** — 5 min
  An *environment variable* is a setting stored outside your code.
  `NEXT_PUBLIC_SITE_URL` is currently `https://know-your-vote-chazak.vercel.app`.
  Because of that, the sitemap and the share-preview image point at the
  vercel.app address instead of knowyour.vote.
  Go to Vercel → the know-your-vote project → Settings → Environment Variables.
  Edit `NEXT_PUBLIC_SITE_URL` (Production) to `https://knowyour.vote`, then
  Deployments → latest → ⋯ → **Redeploy**.
  **You'll know it worked when** https://knowyour.vote/sitemap.xml lists
  `https://knowyour.vote/...` addresses.

- [ ] 🧑 **Make www.knowyour.vote work** — 5 min, plus up to a day for the change to spread
  DNS is the address book that points your domain name at your app's server.
  `www.knowyour.vote` has no entry today, so it fails to load.
  In Vercel → project → Settings → Domains, add `www.knowyour.vote` and choose
  "Redirect to knowyour.vote". Vercel shows a CNAME record (a DNS entry that
  says "this name is another name"). Add it at your domain registrar.
  **You'll know it worked when** opening www.knowyour.vote lands on
  knowyour.vote with the padlock showing.

- [ ] 🧑 **Turn on browser error tracking** — 5 min
  The live site's JavaScript has no Sentry key, so errors in visitors'
  browsers go unreported. In Sentry → your project → Settings → Client Keys,
  copy the DSN (the address errors are sent to; it is safe to make public).
  In Vercel, set it as both `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN`, then
  redeploy.
  **You'll know it worked when** Sentry shows an event after you open
  https://knowyour.vote/does-not-exist in a browser.

## Phase 2 — Email reminders (before Oct 22)

Seven reminder emails are scheduled, but there are 0 subscribers. Sign-up stops
with "Email delivery isn't configured yet" until Resend is configured.

- [ ] 🧑 **Verify the sending domain in Resend** — 15 min, plus up to a day for DNS
  At resend.com → Domains → Add `knowyour.vote`. Resend lists 3–4 DNS records.
  Add them at your registrar exactly as shown. Free tier: $0.
  **You'll know it worked when** Resend shows the domain as "Verified".

- [ ] 🧑 **Add the email settings in Vercel** — 5 min
  Resend → API Keys → create a "Sending access" key. In Vercel, add
  `RESEND_API_KEY` (the key) and `EMAIL_FROM` (for example
  `Know Your Vote <reminders@knowyour.vote>`). Redeploy.
  **You'll know it worked when** signing up with your own email on the home
  page says it's saved instead of "isn't configured yet", and the email
  arrives.

- [ ] 🤖 **Confirm the reminder job will send** — 10 min
  > Check that /api/cron/send-reminders on production will send the armed
  > general_2026 reminders now that RESEND_API_KEY and EMAIL_FROM are set.
  > Check that NOTIFICATIONS_PAUSED is not set in Vercel, and read the code
  > path for any other gate. Don't trigger a real send. Report what will go
  > out and on which dates.

  **You'll know it worked when** the agent lists each upcoming send date and
  finds no blocking gate.

## Phase 3 — Content (the biggest gap)

Only **1 of 53 races** is published (FL-GOV). The other 52 show candidate names
only. Of 3 ballot measures, 2 are published and AM1 is held.

- [ ] 🤝 **Publish the remaining race write-ups** — agent runs, you approve each publish
  The pipeline already pulled in 46 races (90 candidates) and finished the
  Step 3 reviews. What's left is the same publish gate FL-GOV went through.
  > Using the FL-GOV brief run as the template (docs/general-election/brief-runs/,
  > review-2026-09-29.md), list every race in race_publication with status
  > 'listed', its brief-run state, and what is still needed before
  > publication. Order the list by voters reached. Prepare the next race's
  > brief.sql and audit for my yes/no. Don't publish anything without my
  > explicit yes.

  **You'll know it worked when** `select status, count(*) from race_publication
  group by 1` shows the published count going up, and each new race page
  renders its write-up.

- [ ] 🧑 **Decide on AM1** — 5 min
  It is held with a note. The weekly re-check routine is still running.
  Publish it, or leave it held on purpose.

- [ ] 🧑 **Decide on the news page** — 5 min decision
  There are 14 news items, the newest from Sept 9, and none is tied to a
  candidate. The news-source gate (C7-a) keeps new items out because
  `LeanTag` has no value meaning "unrated". Either sign off on how unrated
  outlets are shown, or hide `/news` until after the election so it doesn't
  look abandoned.
  **You'll know it worked when** `/news` shows items from this week, or is
  no longer linked.

## Phase 4 — Trust pages

- [x] 🤖 **Add About/Contact and Terms pages** — 30 min *(done 2026-10-03: /about, /terms, site footer; contact is hello@knowyour.vote via Cloudflare Email Routing)*
  > Add /about (who runs Know Your Vote: Know Yours Inc, that the site takes
  > no side, how content is sourced with a link to /methodology, where
  > donations go, and a contact email I will supply) and /terms (plain-language
  > terms of use: information only, not legal advice, verify with your county
  > Supervisor of Elections, no warranties, links to /privacy). Match
  > docs/voice-and-tone.md and the existing /privacy page's layout. Link both
  > from the footer and add them to sitemap.ts. Leave placeholders for any
  > fact you can't confirm from the repo.

  **You'll know it worked when** /about and /terms load on a preview
  deployment and the footer links to them.

- [ ] 🧑 **Review the terms** — 15 min
  They were written without a lawyer. If you want legal review, do it now.

## Phase 5 — Pre-launch check, as a real voter

- [ ] 🧑 **Walk the site on your phone** — 15 min
  Enter a covered ZIP, then a full street address. Open your ballot, a race,
  a candidate, and a measure. Sign up for reminders. Accept and then decline
  cookies in a private window. Tap Donate (don't pay).
  **You'll know it worked when** every step works with nothing blank or
  broken, and the reminder email arrives.

## Phase 6 — Housekeeping

- [ ] 🧑 Close or merge the stale PRs
  [#81](https://github.com/JasonJosephIT/know-your-vote/pull/81) (record
  0034/0035 as applied) and draft
  [#66](https://github.com/JasonJosephIT/know-your-vote/pull/66) (0030,
  already applied live). 5 min.
- [ ] 🧑 Optional: turn on leaked-password protection in Supabase → Auth →
  Settings. It only affects admin sign-in. 2 min.

---

**Not verified in this audit:** the Vercel connector couldn't see the project,
so the environment-variable findings (site URL, Sentry, Resend) come from what
the live site serves, not from Vercel's settings page.
