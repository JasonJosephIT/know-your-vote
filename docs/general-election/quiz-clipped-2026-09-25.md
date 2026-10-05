# The quiz is clipped (2026-09-25)

Founder call: take the "Where I Stand" quiz off the site and look for a better
option later.

## What was removed

- The page (`/where-i-stand`), its API route (`/api/quiz`), the `Quiz` and
  `QuizResult` components, `src/lib/quiz.ts`, `src/lib/quiz-guardrails.ts`,
  their two verify scripts, the nav item, the sitemap entry, the
  `quiz_completed` analytics event, and the quiz paragraphs on the privacy page.
- `/where-i-stand` and `/find-my-candidates` redirect to `/candidates`. The
  redirects are temporary (307), so the path is free for a replacement.

## What was kept, and why

`src/lib/quiz-questions.ts` stays. Its eight question ids are the shared key
for the news categories (`news-issues.ts`), the policy areas
(`policy-areas.ts`) and `verify-news-issues.ts`. Removing it would break the
taxonomy, not just the quiz. The file keeps its name so this change stays
small; renaming it is a separate cleanup if the quiz never returns.

The whole feature is one commit, so `git revert` brings it back intact.

## Why it came off

- It needed a live `ANTHROPIC_API_KEY` in Vercel and paid per answer.
- A model wrote the `stanceSummary` for each candidate. That is site-authored
  characterisation of a candidate, the same thing the measure pages stopped
  doing on 2026-09-23 ("we write none of it").
- No race has published, audited briefs yet (Session C is blocked on
  credentials), so there was little real material for it to draw on.

## Options to look into later

Not researched yet. A starting list, roughly cheapest first:

1. **Link out.** Point voters at established nonpartisan tools (for example
   the League of Women Voters' Vote411) from the candidates hub. No build,
   no spend, and no characterisation by us.
2. **Issue filter, no AI.** The voter picks issues, and the page shows each
   candidate's own audited brief rows for those issues side by side: quotes
   and sources, no score and no summary. It reuses the eight ids above and
   the brief pipeline, so it can't ship before FL-GOV's briefs pass the
   Balance Audit.
3. **A comparison table per race by policy area.** The same data as option 2,
   with no voter input. Voters get the content without a quiz frame around it.
4. **AI only for retrieval.** If AI comes back, it should only select which
   audited brief rows to show and never write about a candidate. It needs
   its own guardrail tests, as the old `quiz-guardrails` had.

Each option except 1 depends on published briefs, so the decision naturally
follows Session C.
