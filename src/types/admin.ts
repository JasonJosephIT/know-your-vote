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
  })
  .refine((p) => Boolean(p.race_id || p.candidate_id || p.metro), {
    message: "Pick at least one scope (race, candidate, or metro).",
    path: ["race_id"],
  });

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

/* ---- review_item discriminated union (per review_item.kind) -------------- */

/* The full content shape of any review_item row: the six kinds, each pairing
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
]);

export const REVIEW_KINDS = [
  "manual_news",
  "gated_diff",
  "fact_flag",
  "unclear_statement",
  "unverified_fact",
  "date_mismatch",
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

export interface AdminActionRow {
  id: string;
  actor: string;
  action: AdminActionName;
  subject_kind: "agent_run_request" | "review_item";
  subject_id: string;
  detail: unknown;
  created_at: string;
}
