# Publisher outreach: feed use and linking (drafts, 2026-10-09)

Three drafts, one per publisher. **Not sent.** The founder sends them from
`info@knowyour.vote`. Fill in or confirm anything in [brackets] before sending.

**Why these three.** Each one's robots.txt now asks AI crawlers, Anthropic's
included, not to crawl the site. Each one's terms of use ask for **written
permission** before content is gathered or shown elsewhere (details below).
The daily sweep read their public feeds under its own user agent until
2026-10-09. That day all three went onto `AI_POLICY_HOLD` (`news-sources.ts`),
so nothing new is read from them until a publisher replies. **A yes takes that
outlet off the hold the same day.** Stories already published or queued were
left as they were: 2 published from NBC 6, and 3 pending (2 NBC, 1
ClickOrlando). The emails say reading is paused and ask to resume.

**Check these before sending.** The drafts rely on them:
- The sweep identifies itself as `KnowYourVote/1.0 (+https://github.com/JasonJosephIT/know-your-vote)`
  and reads each feed once a day.
- A voter sees the headline, a summary of up to 400 characters (`DEK_MAX`), the
  outlet's name and a link. No article text is stored beyond that.
- Parts of the tooling use AI models: Anthropic's Claude in development and
  maintenance runs, and TypeSafe's Jev to label a story's issues. Matching a
  story to a candidate is plain code. We don't use anything we collect to train
  a model. The drafts say "we don't use", never "nothing is used", because a
  model vendor's own terms are theirs to state.
- A person approves every story before it appears on the site.
- The site is free to use and shows no advertising. It is run by Know Yours
  Inc, a nonprofit but not a 501(c)(3), and is funded by reader donations
  through Zeffy (/about). It does load an opt-in Google Ads measurement tag for
  its own campaigns (prd.md §2). The drafts say "shows no advertising", which is
  true; they don't say "no ads anywhere". [Confirm before sending: the NBCU and
  GEMG terms both turn on "commercial" use, and donations could be read as
  revenue.]

---

## 1. NBC 6 South Florida (nbcmiami.com, NBCUniversal Local)

**To:** NBC6.desk@nbcuni.com
**Cc:** wtvjdesk@nbcuni.com
**Subject:** Permission request: linking to NBC 6 election stories from a free, non-partisan Florida voter guide

Dear Ms. Clapperton,

I'm writing to the News Desk because it's the contact your About page lists.
If this belongs with your digital team or NBCUniversal Local's business and
legal affairs, I'd be grateful if you could pass it along.

I run Know Your Vote (https://knowyour.vote), a free, non-partisan guide for
Florida voters. It's free to use, shows no advertising, and is run by Know
Yours Inc, a nonprofit funded by reader donations. For each candidate on the
November 3 ballot, we point readers to recent local reporting. For each story we
show the headline, a one- or two-sentence summary, the outlet's name, and an
ordinary link to the full story on your site. We don't frame or republish
articles, and we don't use anything we collect to train AI models. A person on
our team approves each story before it appears.

We've been finding NBC 6's election coverage through your public RSS feed,
which we read once a day under our own user agent (KnowYourVote/1.0). Your
robots.txt asks AI crawlers, Anthropic's included, not to crawl the site. Your
Terms ask for written permission before content is gathered this way. Some of
our tooling uses AI models, including Anthropic's Claude, so we've paused
reading your feed until we hear from you:

1. May we resume reading your public RSS feed this way, and show each story's
   headline and short summary with a link to the article on nbcmiami.com?
2. If you'd prefer headline and link only, without the summary, we'll do that.
3. If the answer is no, we'll stop reading the feed and remove the links. Just
   let us know.

We'll follow any attribution preferences you have. Thank you for the reporting.
It's what makes a guide like ours useful.

[Your name]
Founder, Know Your Vote
info@knowyour.vote · https://knowyour.vote

---

## 2. News 6 / ClickOrlando (WKMG, Graham Media Group)

**To:** websitepolicy@wkmg.com
**Cc:** webstaff@wkmg.com
**Subject:** Permission request: linking to News 6 election stories from a free, non-partisan Florida voter guide

Hello,

I'm writing to the website-policy address your Terms of Use give for
questions about them. I've copied your digital staff.

I run Know Your Vote (https://knowyour.vote), a free, non-partisan guide for
Florida voters, including Orange County. It's free to use, shows no advertising, and is run by Know Yours Inc, a nonprofit funded by reader donations.
For each candidate on the November 3 ballot, we point readers to recent local
reporting. For each story we show the headline, a one- or two-sentence summary,
the outlet's name, and an ordinary link to the full story on clickorlando.com.
We don't republish articles, and we don't use anything we collect to train AI
models. A person on our team approves each story before it appears.

We've been reading your public RSS feed once a day under our own user agent
(KnowYourVote/1.0). Your robots.txt asks ClaudeBot and some other AI crawlers
not to crawl the site. Your Terms ask that the site be accessed only through
means you authorize, and that content not be reused without your prior written
authorization. Some of our tooling uses AI models, including Anthropic's
Claude, so we've paused reading your feed until we hear from you:

1. May we resume reading your public RSS feed this way, and show each story's
   headline and short summary with a link to the article on clickorlando.com?
2. If you'd prefer headline and link only, we'll do that.
3. If the answer is no, we'll stop and remove the links. Just let us know.

We'll follow any attribution preferences you have. Thank you for your coverage
of Central Florida's races.

[Your name]
Founder, Know Your Vote
info@knowyour.vote · https://knowyour.vote

*If there's no reply in about two weeks, send the same email to
websitepolicy@grahammedia.com. Graham Media's terms are written at group level,
so one answer could also cover WJXT in Jacksonville.*

---

## 3. The News Service of Florida (subscription wire, GEMG)

**To:** billing@newsserviceflorida.com
**Cc:** feedback@govexec.com, apoe@newsserviceflorida.com
**Subject:** Permission request: sending Florida voters to News Service stories, subscriber stories included

Hello,

I'm writing to the address your Terms give for permission requests. I've
copied Government Executive Media Group's feeds contact and your subscriptions
manager.

I run Know Your Vote (https://knowyour.vote), a free, non-partisan guide for
Florida voters. It's free to use, shows no advertising, and is run by Know
Yours Inc, a nonprofit funded by reader donations. For each candidate on the
November 3 ballot, we point readers to recent reporting. We don't republish
articles, and we don't use anything we collect to train AI models. A person on
our team approves each story before it appears.

Your coverage of state government is some of the most useful on these races,
and much of it is for subscribers. We don't want to work around that. We'd like
to send readers to it:

1. **Linking to subscriber stories.** May we show a News Service story's
   headline, labelled clearly as subscriber content, with a link to it on
   newsserviceflorida.com? Readers who want the story would subscribe or log in
   with you. We'd show no summary or excerpt unless you'd like us to, only the
   headline, your name and the link.
2. **How we'd find stories.** We understand your free RSS feed is for personal,
   non-commercial use. Our use is public and non-commercial, but it isn't
   personal, so we're asking for written permission rather than assuming it.
   May we read the public feed once a day under our own user agent
   (KnowYourVote/1.0)? Your robots.txt also asks AI crawlers, Anthropic's
   included, not to crawl the site, and some of our tooling uses AI models,
   including Anthropic's Claude. If you'd prefer another arrangement, such as a
   headline feed, a partner arrangement or [a subscription for our editors],
   we're open to it.
3. **Attribution.** We'll credit The News Service of Florida with a link back
   to each original article, and a linked logo if you'd like one. Your feed
   terms also ask for a canonical tag pointing to you. Our pages list stories
   from many outlets, so we're not sure how that applies to a headline listing,
   and we'd welcome your guidance.

If you'd rather we didn't link to or read your content at all, tell us and we
won't.

Thank you for the work you do covering Tallahassee.

[Your name]
Founder, Know Your Vote
info@knowyour.vote · https://knowyour.vote

---

## Contact research (2026-10-09)

A two-stage workflow found the contacts: one researcher per publisher, then an
independent verifier who re-fetched every cited page the same day. Only
addresses published by the publisher itself are listed. None was guessed.

**NBC 6.** The About page
(https://www.nbcmiami.com/news/local/about-nbc-6-our-mission-and-story/2861756/)
lists the News Desk link. Its visible text is `wtvjdesk@nbcuni.com`, but it
opens a mail to `NBC6.desk@nbcuni.com`, so the draft sends to both. The same
page names Dawn Clapperton, Vice President of News. NBC 6 publishes no
licensing or permissions address.
- **Backup:** the Send Feedback form at https://www.nbcmiami.com/send-feedback/,
  reason "Public Relations". It has a reCAPTCHA, so the founder submits it.
- **Not for this ask:** `dmca.agent@nbcuni.com` (takedowns only), and the
  advertising and captioning inboxes.
- **Terms** (https://www.nbcuniversal.com/terms/prohibited-actions):
  - Clause I bars "frames or in-line links". The draft says "ordinary link".
  - Clause K bars crawlers that "scrape, data mine, or aggregate any Content"
    except through NBCU's "currently available, published interfaces", unless
    NBCU authorizes it in writing.
  - Clause L bars redistribution "whether for profit or for no profit".
- **robots.txt:** under `User-agent: *` it explicitly allows `/?rss=y&most_recent=y`.
  The site is free; pages carry `article:content_tier="free"`.

**WKMG / ClickOrlando.** The Graham Media Group Terms
(https://www.grahammedia.com/terms, effective 2024-07-01) name
`websitepolicy@wkmg.com` for questions about the Terms (section 10(i)).
`webstaff@wkmg.com` is "Digital Staff" on https://www.clickorlando.com/contact/.
- **Escalation:** `websitepolicy@grahammedia.com`, or the Terms' postal route:
  WKMG-TV6, Attn: News Director, 4466 John Young Parkway, Orlando, FL 32804.
- **Terms:**
  - 3(a)(3) allows access only through "the explicitly authorized means GMG may designate".
  - 3(a)(2) requires "GMG's prior written authorization" before content is
    republished or reused.
  - Nothing addresses inbound links.
- **Paywall:** none. "Insider" is a free membership.

**News Service of Florida.** The Terms
(https://www.newsserviceflorida.com/site/terms.html) give
`billing@newsserviceflorida.com` as the one address for permission to
republish.
- **GEMG's terms** (https://www.govexec.com/about/terms-and-conditions/, "Use
  of RSS Feeds") send requests for "commercial use of the Feeds" to
  `feedback@govexec.com`. They limit the free feed to personal, non-commercial
  use and ask for a linked logo, a link to the original, and a canonical tag.
- `apoe@newsserviceflorida.com` is Alyssa Poe, Subscriptions Manager (contact page).
- **Escalation:** Gray Rohrer, Executive Editor, `grohrer@newsserviceflorida.com`.
- **Not for this ask:** `DMCA@govexec.com`, PARS (reprints), and the sales
  inboxes.
- **Feed descriptions:** about 240 characters of each story's opening, which
  is why draft 3 offers the headline only.

Full per-agent results are in the workflow journal (run `wf_d8171416-c17`).
