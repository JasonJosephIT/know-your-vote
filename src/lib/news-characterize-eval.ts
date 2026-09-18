/* Scoring for the gold-set evaluation —
   docs/superpowers/specs/2026-09-18-news-characterization-design.md §6,
   plan task C14.

   Separated from scripts/news-characterize-eval.ts for the reason every other
   decidable thing in this feature is separated: the script talks to Jev and the
   filesystem and cannot run in CI, while precision, recall and the
   parents-earn-their-place measure are arithmetic over two sets of ids and must
   be verifiable offline. scripts/verify-news-characterize-eval.ts drives this
   file.

   Three rules here exist because getting them wrong would flatter the model:

   1. A ratio with a zero denominator is NULL, not zero and not one. An issue
      the model never predicted has no precision — reporting 0% would read as
      "it predicts this badly" and reporting 100% as "it predicts this
      perfectly", when the truth is "there is nothing to measure". The report
      prints `n/a` and the reader knows to ignore it.
   2. True negatives are never counted or reported. With 26 questions over a
      handful of tagged issues per article, accuracy would sit near 96% no
      matter how bad the tagging was. Precision and recall over the positive
      class are the only honest measures here.
   3. Gold rows carrying ids outside the taxonomy are an error, never a silent
      drop. A typo'd gold label would otherwise count as a false positive
      against the model for a tag the labeller meant to award it.

   Pure and dependency-free: no network, no filesystem, no clock. */

import type { NewsIssue } from "./news-issues.ts";

/** One hand-labelled article. Shape is the runner's `--dry-run` output with
    `issues` replaced by the labeller's judgement, so a gold set is built by
    correcting a run rather than by re-querying (plan task 6 step 1).

    `sitemapOnly` records that the row reached us with no dek. Today that is
    inferred from `summary === null`, because `news_item` has no `retrieval`
    column — retrieval mode is known to the sweep and thrown away on insert.
    It is therefore a proxy: an RSS item published with an empty dek is
    indistinguishable here from a sitemap-retrieved one. The report must say
    so rather than calling the slice "sitemap rows". */
export interface GoldRow {
  id: string;
  title: string;
  summary?: string | null;
  url: string;
  issues: string[];
  sitemapOnly: boolean;
}

export interface Counts {
  tp: number;
  fp: number;
  fn: number;
}

/** Null where the denominator is zero — see rule 1 in the header. */
export interface Scores {
  precision: number | null;
  recall: number | null;
  f1: number | null;
}

export function emptyCounts(): Counts {
  return { tp: 0, fp: 0, fn: 0 };
}

export function score(counts: Counts): Scores {
  const { tp, fp, fn } = counts;
  const precision = tp + fp === 0 ? null : tp / (tp + fp);
  const recall = tp + fn === 0 ? null : tp / (tp + fn);
  const f1 =
    precision === null || recall === null || precision + recall === 0
      ? null
      : (2 * precision * recall) / (precision + recall);
  return { precision, recall, f1 };
}

/** Parse a gold set from JSONL. Returns the rows AND the problems, rather than
    throwing on the first one: a labeller fixing a hand-built file wants every
    bad line named in one pass, not one per run. The caller decides that any
    error at all is fatal — see the script. */
export function parseGoldSet(
  text: string,
  knownIds: readonly string[],
): { rows: GoldRow[]; errors: string[] } {
  const rows: GoldRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    const at = `line ${i + 1}`;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      errors.push(`${at}: not valid JSON`);
      continue;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      errors.push(`${at}: not a JSON object`);
      continue;
    }
    const row = parsed as Record<string, unknown>;

    if (typeof row.id !== "string" || row.id.length === 0) {
      errors.push(`${at}: missing id`);
      continue;
    }
    if (seen.has(row.id)) {
      /* A duplicated row would be counted twice and silently weight one
         article's labels above every other article's. */
      errors.push(`${at}: duplicate id ${row.id}`);
      continue;
    }
    if (typeof row.title !== "string" || row.title.length === 0) {
      errors.push(`${at}: row ${row.id} has no title`);
      continue;
    }
    if (typeof row.url !== "string" || row.url.length === 0) {
      errors.push(`${at}: row ${row.id} has no url`);
      continue;
    }
    if (!Array.isArray(row.issues) || row.issues.some((v) => typeof v !== "string")) {
      /* An absent `issues` key is NOT an empty label set. "I did not label
         this row" and "I judged this row to have no issues" are different
         claims and only the second one belongs in a measurement. */
      errors.push(`${at}: row ${row.id} has no issues array (use [] for "no issues apply")`);
      continue;
    }
    const unknown = (row.issues as string[]).filter((id) => !knownIds.includes(id));
    if (unknown.length > 0) {
      errors.push(`${at}: row ${row.id} has ids outside the taxonomy: ${unknown.join(", ")}`);
      continue;
    }
    const dupTags = (row.issues as string[]).filter(
      (id, idx, all) => all.indexOf(id) !== idx,
    );
    if (dupTags.length > 0) {
      errors.push(`${at}: row ${row.id} repeats ${[...new Set(dupTags)].join(", ")}`);
      continue;
    }
    if (typeof row.sitemapOnly !== "boolean") {
      errors.push(`${at}: row ${row.id} has no sitemapOnly boolean`);
      continue;
    }

    seen.add(row.id);
    rows.push({
      id: row.id,
      title: row.title,
      summary: typeof row.summary === "string" ? row.summary : null,
      url: row.url,
      issues: row.issues as string[],
      sitemapOnly: row.sitemapOnly,
    });
  }

  return { rows, errors };
}

export interface Tally {
  /** Every id, both levels, pooled. */
  overall: Counts;
  /** Restricted to rows that arrived with no dek — §4.2's input floor. */
  noDek: Counts;
  /** Restricted to rows that arrived with a dek, so the two are comparable. */
  withDek: Counts;
  /** Only the eleven category questions. */
  categories: Counts;
  /** Only the fifteen sub-issue questions. */
  subIssues: Counts;
  perIssue: Record<string, Counts>;
  /** Rows where the model predicted nothing at all. */
  emptyPredictions: number;
  /** Rows the labeller judged to have no issues. */
  emptyGold: number;
  rows: number;
}

/** Score one threshold's predictions against the gold labels.

    `predicted` maps a row id to the ids that cleared the threshold — the
    caller produces it with `applyThreshold`, so this function never needs the
    model's raw answers and stays arithmetic. */
export function tally(
  rows: readonly GoldRow[],
  predicted: ReadonlyMap<string, readonly string[]>,
  ids: { askable: readonly string[]; categories: readonly string[]; subIssues: readonly string[] },
): Tally {
  const t: Tally = {
    overall: emptyCounts(),
    noDek: emptyCounts(),
    withDek: emptyCounts(),
    categories: emptyCounts(),
    subIssues: emptyCounts(),
    perIssue: Object.fromEntries(ids.askable.map((id) => [id, emptyCounts()])),
    emptyPredictions: 0,
    emptyGold: 0,
    rows: rows.length,
  };

  for (const row of rows) {
    const p = new Set(predicted.get(row.id) ?? []);
    const g = new Set(row.issues);
    if (p.size === 0) t.emptyPredictions++;
    if (g.size === 0) t.emptyGold++;

    for (const id of ids.askable) {
      const inP = p.has(id);
      const inG = g.has(id);
      /* True negatives are deliberately not counted — header rule 2. */
      const bucket: keyof Counts | null =
        inP && inG ? "tp" : inP && !inG ? "fp" : !inP && inG ? "fn" : null;
      if (bucket === null) continue;

      t.overall[bucket]++;
      t.perIssue[id][bucket]++;
      (row.sitemapOnly ? t.noDek : t.withDek)[bucket]++;
      if (ids.categories.includes(id)) t.categories[bucket]++;
      if (ids.subIssues.includes(id)) t.subIssues[bucket]++;
    }
  }

  return t;
}

/** Does a parent question ever earn its place?

    news-issues.ts asks the eleven category Nouls alongside the fifteen
    sub-issue Nouls on the stated bet that a broad question catches a general
    article that no narrow one does — and says in its own comment that if no
    article is ever caught by a parent alone, the eleven questions should be
    dropped in a later PR. This counts exactly that: gold rows where the
    category was correctly predicted while none of its own sub-issues were
    predicted at all.

    A zero here is the evidence for dropping them; a non-zero is the evidence
    for keeping them, and the ids say which parents did the work. */
export function parentOnlyCatches(
  rows: readonly GoldRow[],
  predicted: ReadonlyMap<string, readonly string[]>,
  categories: readonly { id: string }[],
  subIssues: readonly { id: string; categoryId: string }[],
): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(categories.map((c) => [c.id, 0]));

  for (const row of rows) {
    const p = new Set(predicted.get(row.id) ?? []);
    const g = new Set(row.issues);
    for (const c of categories) {
      if (!p.has(c.id) || !g.has(c.id)) continue;
      const kids = subIssues.filter((s) => s.categoryId === c.id).map((s) => s.id);
      if (kids.some((k) => p.has(k))) continue;
      out[c.id]++;
    }
  }

  return out;
}

/** Cost per article from what the vendor reported, or null when it reported
    nothing. Never estimated from token counts we did not receive: spec §6 item
    5 asks for measured cost, and a computed guess dressed as a measurement is
    the thing that item exists to prevent. */
export function costPerArticle(
  usages: readonly { input_tokens?: number; output_tokens?: number }[],
  usdPerMillionInput: number,
): { articles: number; inputTokens: number; usd: number } | null {
  const known = usages.filter((u) => typeof u.input_tokens === "number");
  if (known.length === 0) return null;
  const inputTokens = known.reduce((n, u) => n + (u.input_tokens ?? 0), 0);
  return {
    articles: known.length,
    inputTokens,
    usd: (inputTokens / 1_000_000) * usdPerMillionInput,
  };
}

/** Issues whose numbers are bad enough to be a taxonomy or question-wording
    problem rather than a threshold problem (spec §6 item 7). Only issues with
    something to measure are named — an issue with no gold labels and no
    predictions is silent, not failing.

    `minEvidence` is the reason this is not just a ratio test. One article
    disagreeing gives a precision of 0% that looks identical to a question that
    is genuinely mis-worded, and acting on it means rewriting a taxonomy entry
    on a sample of one. Below the floor an issue is reported as unmeasured
    rather than as failing; with a 100-row gold set most issues clear it and the
    rare ones that do not are exactly the ones whose numbers should not be
    trusted yet. */
export function wordingSuspects(
  perIssue: Record<string, Counts>,
  labels: readonly NewsIssue[],
  floor = 0.5,
  minEvidence = 5,
): { id: string; label: string; scores: Scores; counts: Counts }[] {
  const out: { id: string; label: string; scores: Scores; counts: Counts }[] = [];
  for (const issue of labels) {
    const counts = perIssue[issue.id];
    if (!counts) continue;
    /* An explicit "skip unmeasured issues" guard stood here and a mutation
       proved it changed nothing: with no tp, fp or fn, `score` returns null for
       both ratios, and a null is not < floor. Rule 1 in the header is what
       keeps an unmeasured issue out of this list. The evidence floor below is a
       different rule and does bite. */
    if (counts.tp + counts.fp + counts.fn < minEvidence) continue;
    const scores = score(counts);
    const bad =
      (scores.precision !== null && scores.precision < floor) ||
      (scores.recall !== null && scores.recall < floor);
    if (bad) out.push({ id: issue.id, label: issue.label, scores, counts });
  }
  return out;
}
