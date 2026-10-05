# Session A — Publish the three amendment pages

**Start this session with:** "Read `docs/general-election/sessions/session-a-amendments.md` and do it."

## Goal

Amendments 1–3 go from `listed` (ballot text only) to `published`, each with a
balanced set of outside resources for and against, under the resource-ladder
design. This is independent of the candidate briefs and can finish first.

## Read first

- `docs/superpowers/specs/2026-09-23-measure-resource-ladder-design.md` — the
  design. §4 is the publication gate, §9 the founder calls, §10 the candidate
  URLs per amendment.
- `supabase/migrations/README.md` rows `0034` and `0035` — preconditions and the
  read-back each one expects.
- `src/lib/measure-ladder.ts`, `src/lib/measures.ts` and
  `scripts/verify-measure-resources.ts` / `scripts/verify-measure-balance.ts`.

## State on 2026-09-24

- The code is on `main` (PR #80, `353f661`) and deployed.
- `0034_measure_resources.sql` and `0035_measure_resources_2026.sql` are
  written and **not applied**.
- 3 measures are `listed`; 0 `measure_resource` rows exist.
- Founder calls F1–F7 are assumed in the spec but **not confirmed**.

## Steps

1. **Apply `0034`** (production). Its precondition is that PR #80 is deployed,
   which it is. **Ask the founder before applying anything to production.**
   Read back as anon: 3 measures, 0 `measure_resource` rows.
2. **Check, then apply `0035`.** First run
   `SELECT source_id FROM source WHERE url_norm LIKE 'files.floridados.gov/media/711355/%'`.
   If a row exists under another id, change the three `source_id` values in
   `0035` to it (the file is unapplied, so editing it is allowed). Read back:
   3 rows visible to service_role, 0 to anon.
3. **Verify the §10 URLs, row by row.** Open every URL. Record for each: does
   it load, who published it, its `kind` (official / analysis / reporting /
   argument / commentary) and `stance` (yes / no / neutral) under the
   ladder's rules, and the evidence. "Found via news" is `reporting` +
   `neutral`, never an `argument` row. Write the results to
   `docs/general-election/measure-resources-verified-2026-09-XX.md`. For the
   gaps the spec names, look for primary sources:
   - AM1 NO: the Florida Channel archive of the House Budget Committee hearing
     (AFL-CIO testimony), and DeSantis's own video or transcript.
   - AM2 NO: an FEA or LWV Florida statement giving their reasons.
   - AM3: the Sheriffs Association ad video.
4. **Draft the sided rows** as a new unapplied migration only after the
   founder confirms F1–F7 and approves the verified list. Use the number the
   founder gives you, or ask. **Do not take `0036` or `0037`**: they are
   reserved for Sessions B and C.
5. **Publish** each amendment whose sides clear the gate (both sides present,
   larger ≤ 2× smaller). Per the spec, AM3 is the likeliest to clear first and
   AM2 the least likely. An amendment that cannot clear the gate honestly stays
   at ballot text. Don't pad a side to pass.

## Done when

- `0034` and `0035` are applied and read back as expected.
- The verified-resources doc exists, with every URL opened.
- Each amendment is published or has a written reason it can't be yet.
- `node scripts/verify-measure-resources.ts` and
  `node scripts/verify-measure-balance.ts` pass.

## Don't

- Don't write your own for/against text. The design replaced that with outside links.
- Don't assign a lean or a category to an organisation. That is the founder's
  call (spec §11).
- Don't touch migration numbers other than `0034`, `0035` and the one the
  founder assigns.
