import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import type { AdminActionRow } from "@/types/admin";
import { MISSING_0006, MISSING_SERVICE } from "./monitor";

/* admin_action reads for the Log view (design.md § 4 GET /api/admin/log; PRD
   AFR-050). Newest-first, read-only — the table is append-only (no update/delete
   grant even to the service role), so there is nothing to mutate here. */

export type AdminLogResult =
  | { status: "ok"; rows: AdminActionRow[] }
  | { status: "degraded"; missing: string }
  | { status: "error"; message: string };

export async function getAdminLog(limit = 100): Promise<AdminLogResult> {
  let service;
  try {
    service = createServiceClient();
  } catch {
    return { status: "degraded", missing: MISSING_SERVICE };
  }

  const { data, error } = await service
    .from("admin_action")
    .select("id, actor, action, subject_kind, subject_id, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === "42P01") return { status: "degraded", missing: MISSING_0006 };
    return { status: "error", message: error.message };
  }
  return { status: "ok", rows: (data ?? []) as AdminActionRow[] };
}
