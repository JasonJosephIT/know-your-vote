/* Ops-plane payload + API-body contracts (design.md § 3 "Payload shapes", § 4
   "API Contracts"). One zod schema per review_item.kind, assembled into a
   discriminated union on `kind`, with inferred TS types. This file is the
   single source of truth the API handlers zod-parse against and the queue UI
   renders from — the JSONB `payload` column's shape lives here, nowhere else.

   Import discipline: this module imports ONLY `zod` (a bare specifier). It must
   stay free of `@/`-aliased imports so the plain-Node self-test
   (`scripts/verify-admin-types.ts`) can import it by relative path under
   Node's type-stripping, exactly like the other verify-*.ts scripts. */

import { z } from "zod";

/* http(s)-only URL guard, mirroring src/lib/format.ts `safeHttpUrl` semantics.
   Inlined (not imported) to honor the import discipline above; the render layer
   still routes every URL through safeHttpUrl, so this is input validation, not
   the output guard. */
function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
const httpUrl = z.string().refine(isHttpUrl, {
  message: "must be an http(s) URL",
});

/* Operator-submitted news is agent-scoped news (candidate_news / election_news),
   which is exactly why approving it fails closed until migration 0005 makes
   those legal item_types (AFR-033). */
export const MANUAL_NEWS_ITEM_TYPES = ["candidate_news", "election_news"] as const;

/* ---- Per-kind payload schemas (design.md § 3) --------------------------- */

export const ManualNewsPayloadSchema = z
  .object({
    item_type: z.enum(MANUAL_NEWS_ITEM_TYPES),
    title: z.string().trim().min(1, "Title is required").max(240),
    summary: z.string().trim().max(2000).nullish(),
    url: httpUrl, // source URL is mandatory for a news story (AFR-020)
    metro: z.string().trim().nullish(),
    race_id: z.string().trim().nullish(),
    candidate_id: z.string().trim().nullish(),
    published_at: z.string().min(1),
    /* How this article was matched to its candidate (migration 0017, PRD §6).
       'named' = the candidate's full name is in the title or dek. 'related' =
       the story covers their race, or names a surname several candidates share,
       so it attaches to EVERY candidate the ambiguity admits.

       NULLISH, and null is not a third tier: it means the row is not a
       candidate match at all, which is right for an election_news row scoped to
       a metro. But null on a CANDIDATE row is a real hazard — CandidateNews
       renders `relation !== "related"` under "In the news", so a null would
       present an ambiguous surname hit as a story that named the person. That
       is the single misreading PRD §6's tier exists to prevent, so the refine
       below requires the tier whenever a candidate is named. */
    relation: z.enum(["named", "related"]).nullish(),
    /* Hero image for the card, from the outlet's feed (migration 0029). */
    image_url: httpUrl.nullish(),
    /* The `source` row this article is attributed to. Migration 0014's CHECK
       requires every candidate_news / election_news row to carry one — the
       ledger's 0014 entry names this as a precondition, because without it every
       approved news insert fails and `describeNewsInsertError` blames the wrong
       migration. An operator hand-adding a story may not have one; a swept
       article always does. */
    source_id: z.string().trim().nullish(),
    /* County scope for an election_news row that names no candidate and no
       race (founder 2026-10-06: the sweep queues election-related stories
       from county outlets too). news_item.county_fips already exists and the
       /news county filter reads it; this lets such a row survive approval. */
    county_fips: z.string().trim().regex(/^\d{5}$/, "A county FIPS is 5 digits").nullish(),
    /* Explicitly statewide: an election story scoped to no race, candidate,
       metro or county, which is what the home page's statewide news shows.
       A flag rather than "no scope at all", so an operator's form still has
       to pick a scope and can't post an unscoped row by leaving it blank. */
    statewide: z.boolean().nullish(),
  })
  .refine((p) => !p.candidate_id || Boolean(p.relation), {
    message:
      "A candidate-scoped story needs a relation tier ('named' or 'related') — "
      + "without it an ambiguous surname match renders as though it named the candidate.",
    path: ["relation"],
  })
  .refine(
    (p) => Boolean(p.race_id || p.candidate_id || p.metro || p.county_fips || p.statewide),
    {
      message: "Pick at least one scope (race, candidate, metro, county, or statewide).",
      path: ["race_id"],
    }
  )
  /* Statewide means no narrower scope; both at once would be a contradiction
     the feed can't place. */
  .refine(
    (p) => !p.statewide || !(p.race_id || p.candidate_id || p.metro || p.county_fips),
    {
      message: "A statewide story can't also carry a race, candidate, metro or county.",
      path: ["statewide"],
    }
  );

export const GatedDiffPayloadSchema = z.object({
  table: z.string().min(1),
  pk: z.string().min(1),
  field: z.string().min(1),
  old: z.unknown().optional(),
  new: z.unknown(),
  source_url: httpUrl,
  seen_at: z.string().min(1),
});

/* fact_flag / unclear_statement / unverified_fact share one shape. */
export const FactLikePayloadSchema = z.object({
  text: z.string().trim().min(1, "Text is required"),
  context: z.string().trim().nullish(),
  candidate_id: z.string().trim().nullish(),
  race_id: z.string().trim().nullish(),
  source_url: httpUrl.nullish(),
});

export const DateMismatchPayloadSchema = z.object({
  race_id: z.string().min(1),
  field: z.string().min(1),
  db_value: z.unknown().optional(),
  official_value: z.unknown(),
  source_url: httpUrl,
});

/* candidate_lead: a person the news names as a 2026 Florida candidate whom
   the guide does not cover, queued by R5 (spec
   docs/superpowers/specs/2026-10-07-candidate-leads-agent-design.md §5).
   Operator-only. Approving records "noted for research"; it never writes a
   candidate or race row. */
export const CANDIDATE_LEAD_KINDS = ["other_county", "running_mate"] as const;

export const CandidateLeadPayloadSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    office: z.string().trim().min(1).max(200),
    jurisdiction: z.string().trim().max(200),
    kind: z.enum(CANDIDATE_LEAD_KINDS),
    county_fips: z.string().regex(/^12\d{3}$/, "a Florida county FIPS code").nullable(),
    evidence: z.string().trim().max(300),
    stories: z
      .array(
        z.object({
          url: httpUrl,
          title: z.string().trim().min(1).max(240),
          outlet: z.string().trim().min(1).max(120),
          published_at: z.string().min(1),
        }),
      )
      .min(1)
      .max(20),
    verification: z.object({
      status: z.enum(["found", "not_found", "unchecked"]),
      url: httpUrl.nullable(),
      note: z.string().trim().max(300).nullable(),
    }),
    dedupe_key: z.string().min(3).max(300),
  })
  .refine((p) => (p.kind === "running_mate" ? p.county_fips === null : p.county_fips !== null), {
    message: "other_county needs a county_fips; running_mate has none",
    path: ["county_fips"],
  })
  .refine((p) => p.verification.status === "unchecked" || p.verification.url !== null, {
    message: "a found or not_found check must name the URL that was read",
    path: ["verification", "url"],
  });

/* ---- review_item discriminated union (per review_item.kind) -------------- */

/* The full content shape of any review_item row: the seven kinds, each pairing
   its `kind` literal with its validated `payload`. Used to parse rows read back
   from the DB before the queue renders them, and by the effects map before it
   applies anything. */
export const ReviewItemContentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("manual_news"), payload: ManualNewsPayloadSchema }),
  z.object({ kind: z.literal("gated_diff"), payload: GatedDiffPayloadSchema }),
  z.object({ kind: z.literal("fact_flag"), payload: FactLikePayloadSchema }),
  z.object({ kind: z.literal("unclear_statement"), payload: FactLikePayloadSchema }),
  z.object({ kind: z.literal("unverified_fact"), payload: FactLikePayloadSchema }),
  z.object({ kind: z.literal("date_mismatch"), payload: DateMismatchPayloadSchema }),
  z.object({ kind: z.literal("candidate_lead"), payload: CandidateLeadPayloadSchema }),
]);

export const REVIEW_KINDS = [
  "manual_news",
  "gated_diff",
  "fact_flag",
  "unclear_statement",
  "unverified_fact",
  "date_mismatch",
  "candidate_lead",
] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/* ---- Admin API bodies (design.md § 4) ----------------------------------- */

/* POST /api/admin/ingest — the operator submits one of the three hand-add
   kinds (AFR-020). Agent-sourced kinds (gated_diff / date_mismatch / fact_flag)
   arrive via the agents' own dual-write, not this endpoint. */
export const IngestBodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("manual_news"), payload: ManualNewsPayloadSchema }),
  z.object({ kind: z.literal("unclear_statement"), payload: FactLikePayloadSchema }),
  z.object({ kind: z.literal("unverified_fact"), payload: FactLikePayloadSchema }),
]);
export type IngestBody = z.infer<typeof IngestBodySchema>;
export const INGEST_KINDS = ["manual_news", "unclear_statement", "unverified_fact"] as const;
export type IngestKind = (typeof INGEST_KINDS)[number];

/* POST /api/admin/review/:id/decision. */
export const DecisionBodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(2000).nullish(),
});
export type DecisionBody = z.infer<typeof DecisionBodySchema>;

/* ---- Inferred payload types --------------------------------------------- */

export type ManualNewsPayload = z.infer<typeof ManualNewsPayloadSchema>;
export type GatedDiffPayload = z.infer<typeof GatedDiffPayloadSchema>;
export type FactLikePayload = z.infer<typeof FactLikePayloadSchema>;
export type DateMismatchPayload = z.infer<typeof DateMismatchPayloadSchema>;
export type CandidateLeadPayload = z.infer<typeof CandidateLeadPayloadSchema>;
export type ReviewItemContent = z.infer<typeof ReviewItemContentSchema>;

/* A review_item row as read from the ops plane (design.md § 3). `payload` is
   validated into its per-kind shape via ReviewItemContentSchema at the edge;
   the raw row keeps it as the DB's unknown JSON until then. */
export interface ReviewItemRow {
  id: string;
  kind: ReviewKind;
  source: string;
  payload: unknown;
  status: ReviewStatus;
  created_at: string;
  decided_at: string | null;
  decision_note: string | null;
  applied_at: string | null;
  apply_error: string | null;
}

/* An admin_action audit row (design.md § 3). */
export type AdminActionName =
  | "trigger"
  | "submit"
  | "approve"
  | "reject"
  | "cancel";

/* An admin_action row as the Log reads it. The console writes the verbs
   above against a UUID subject (subject_id). Publication changes write
   their own against a TEXT subject_ref with subject_id NULL:
   set_race_publication (0018, 0033) logs publish, unpublish, list, unlist
   or set_status on 'race_publication'; the measure flips log publish (0038,
   0040) and list (scripts/list-ballot-2026.sql) on 'measure_publication'.
   Rows can also be inserted by hand: production holds one 'note' row, a
   correction about an earlier batch, whose subject_ref is not an id. action
   has no CHECK (0006), and exactly one of subject_id / subject_ref is set
   (0018, admin_action_subject_one_of). On 2026-10-05 all 170 production rows
   used subject_ref with subject_id NULL. */
export interface AdminActionRow {
  id: string;
  actor: string;
  action: string;
  subject_kind: string;
  subject_id: string | null;
  subject_ref: string | null;
  detail: unknown;
  created_at: string;
}
