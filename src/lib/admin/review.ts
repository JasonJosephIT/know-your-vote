import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import type { ReviewItemRow } from "@/types/admin";
import { MISSING_0006, MISSING_SERVICE } from "./monitor";

/* Queue reads (design.md § 4 GET /api/admin/review; handoff A3 §B). Oldest-first
   is the default (a stale item shouldn't hide behind newer ones). Filtered by
   status / kind / source. Read with the service role; degrades honestly when the
   ops plane isn't reachable. Never cached — the queue must be live. */

export interface ReviewQueueFilters {
  status?: string; // 'pending' (default) | 'approved' | 'rejected' | 'all'
  kind?: string; // a ReviewKind | 'all'
  source?: string; // 'operator' | 'agent:R1' | … | 'all'
}

export type ReviewQueueResult =
  | { status: "ok"; items: ReviewItemRow[] }
  | { status: "degraded"; missing: string }
  | { status: "error"; message: string };

export async function getReviewQueue(
  filters: ReviewQueueFilters
): Promise<ReviewQueueResult> {
  let service;
  try {
    service = createServiceClient();
  } catch {
    return { status: "degraded", missing: MISSING_SERVICE };
  }

  let query = service
    .from("review_item")
    .select(
      "id, kind, source, payload, status, created_at, decided_at, decision_note, applied_at, apply_error"
    )
    .order("created_at", { ascending: true });

  const status = filters.status ?? "pending";
  if (status !== "all") query = query.eq("status", status);
  if (filters.kind && filters.kind !== "all") query = query.eq("kind", filters.kind);
  if (filters.source && filters.source !== "all")
    query = query.eq("source", filters.source);

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return { status: "degraded", missing: MISSING_0006 };
    return { status: "error", message: error.message };
  }
  return { status: "ok", items: (data ?? []) as ReviewItemRow[] };
}
