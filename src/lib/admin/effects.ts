/* The fixed, server-side effects map (design.md § 5 "Approve-effect
   transaction"; § 7 "Effects"). This is the security boundary: a review_item's
   payload can NEVER name an arbitrary table or field to write. Approving an
   item runs exactly one of these planned effects, and the gated-field whitelist
   below is the ONLY set of content-plane columns the operator may change
   through approval.

   `planEffect` is PURE — it maps a validated review_item into a concrete plan
   and takes no I/O — so the decision route stays the transaction orchestrator
   and this logic stays unit-testable (scripts/verify-admin-effects.ts). The
   only import is type-only (erased at runtime), which also keeps the self-test
   runnable under Node's type-stripping. The authoritative manual_news re-lint
   lives in the route (it re-checks with the shared matcher before this plan's
   insert_news is executed). */

import type { ReviewItemContent } from "@/types/admin";

/* The whitelist. Column granularity, per design.md § 5:
   race.key_dates, race.office, race.district, candidate.qualifying_status. */
export const GATED_FIELDS: Record<
  "race" | "candidate",
  { pkColumn: string; fields: ReadonlySet<string> }
> = {
  race: { pkColumn: "race_id", fields: new Set(["key_dates", "office", "district"]) },
  candidate: { pkColumn: "candidate_id", fields: new Set(["qualifying_status"]) },
};

export interface NewsInsertRow {
  item_type: string;
  title: string;
  summary: string | null;
  url: string;
  metro: string | null;
  race_id: string | null;
  candidate_id: string | null;
  published_at: string;
}

export type EffectPlan =
  | { type: "insert_news"; row: NewsInsertRow }
  | {
      type: "update_field";
      table: "race" | "candidate";
      pkColumn: string;
      pkValue: string;
      field: string;
      value: unknown;
    }
  | { type: "record_disposition"; note: string }
  | { type: "refuse"; reason: string };

function planGatedUpdate(
  table: "race" | "candidate",
  pkValue: string,
  field: string,
  value: unknown
): EffectPlan {
  const gate = GATED_FIELDS[table];
  if (!gate.fields.has(field)) {
    return {
      type: "refuse",
      reason: `field '${field}' is not a gated field on ${table}`,
    };
  }
  return { type: "update_field", table, pkColumn: gate.pkColumn, pkValue, field, value };
}

export function planEffect(content: ReviewItemContent): EffectPlan {
  switch (content.kind) {
    case "manual_news": {
      const p = content.payload;
      // Neutrality re-lint is the route's job (authoritative, shared matcher);
      // by the time we plan the insert, the text is already cleared. NOTE:
      // news_item has no verified_by column in the current schema — the
      // operator provenance is recorded in the admin_action audit row instead
      // (see decision route). Flagged as a follow-up in the PR.
      return {
        type: "insert_news",
        row: {
          item_type: p.item_type,
          title: p.title,
          summary: p.summary ?? null,
          url: p.url,
          metro: p.metro ?? null,
          race_id: p.race_id ?? null,
          candidate_id: p.candidate_id ?? null,
          published_at: p.published_at,
        },
      };
    }

    case "gated_diff": {
      const p = content.payload;
      if (p.table !== "race" && p.table !== "candidate") {
        return { type: "refuse", reason: `table '${p.table}' is not a gated table` };
      }
      return planGatedUpdate(p.table, p.pk, p.field, p.new);
    }

    case "date_mismatch": {
      const p = content.payload;
      // date_mismatch always targets a race logistics field.
      return planGatedUpdate("race", p.race_id, p.field, p.official_value);
    }

    case "fact_flag":
    case "unclear_statement":
    case "unverified_fact":
      // No content write — a recorded disposition routed to the Fact-Checker
      // backlog (AFR-032). The audit row is the durable record.
      return {
        type: "record_disposition",
        note: "Recorded — routed to the Fact-Checker backlog. No content write.",
      };
  }
}
