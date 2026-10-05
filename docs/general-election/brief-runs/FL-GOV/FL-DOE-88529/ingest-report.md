# Ingest report: FL-DOE-88529 (Moliere "Moe" Dimanche), attempt 2

This re-ingest ran after the comment-section fix (`stripCommentSections` in `src/lib/candidate-site.ts`). The command was the same as in `ingest-prompt.md`, written to `passages.v2.jsonl`, then promoted to `passages.jsonl` once compared.

- Exit code 0. **18 passages** from 2 pages: the homepage and the 2026-07-09 blog post (`91 links, 1 policy page(s) selected (cap 8)`).
- Against attempt 1 (`attempt-1-comment-leak/`), exactly one passage is gone: `0c289595`, a visitor's comment ("Jesse Vega July 9, 2026 at 2:26 pm …") under the blog post's "One response to …" thread. Every other passage is identical apart from `retrieved_at`.
- No robots.txt, Crawl-delay, bot-challenge or browser-fallback lines.
- There is no About or bio page among the passages.

The superseded run and its FAIL review are kept in `attempt-1-comment-leak/`.
