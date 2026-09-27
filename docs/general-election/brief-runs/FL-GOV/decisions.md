# FL-GOV brief run: founder decisions (2026-09-27)

Asked in one batch at the start of Session C2, answered by the founder in chat.

| # | Question | Decision |
| - | -------- | -------- |
| D1 | FL-GOV spine | **Core 4:** `A1` Property insurance costs, `A3` Property taxes, `A2` Housing affordability, `A4` Cost of living in Florida. **Plus a bio section for every candidate** (see below). |
| D2 | How to pass `word_count` | **Decide after the pilot**, with the measured numbers in hand. |
| D3 | Datto (no `official_site`) | **Record silence:** `no_stated_position_found` on every spine issue. The race does not wait. |
| D4 | Jewett (captcha on `scottjewett.com`) | **Same as D3** if the ingest's browser fallback can't read it. Never solve the captcha. |
| — | Where Jev runs | Cloud session, **pilot one candidate only, then stop** for the go-ahead. The founder supplied a TypeSafe key for this; it is passed through the environment only and is never written to a file. |

## The bio section (founder, verbatim intent)

> Let's have the first section be like a bio page, and we can have that for every
> single candidate. It would be just a simple biography: who they are, what they've
> done within the last 10 years, etc., not specifically policy-wise, just basic facts
> of where they were and what they were doing. We can then go into what they provide
> also on their site, if they have a short "Who am I?" It can literally just be
> "self-describes as blah blah blah," and we put their own self-description.

It has two parts, and each maps onto a bucket that already exists:

1. **Biography facts from the last 10 years.** These are `verifiable_fact` claims, which is the Recorder's bucket (Allowlist B: public record, filings, official bios), and each one has a source. The schema already carries them in `profile.facts`, and `brief-rows.ts` does not emit them yet. The same work is D2 option (a), so the bio section and the `word_count` fix are one piece of work.
2. **Self-description.** This is a verbatim `stated_position` quote from the candidate's own About or "Who I am" page, attributed as "self-describes as …". The ingest follows only policy-looking links today (`selectPolicyPages`), so it has to learn to fetch the About page too, under the same robots rules.

The same rules hold for both parts: every candidate gets the same kinds of source, nothing without a source, and no paraphrase of the self-description. The pilot measures whether the ingest reaches an About page as it stands.
