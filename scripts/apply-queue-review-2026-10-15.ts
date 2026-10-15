/* Queue review 2026-10-15: apply the founder's drafted decisions without /admin.

   WHY THIS EXISTS. The founder could not sign in to /admin on 2026-10-15
   (Supabase's built-in mailer refused the operator address) and decided, in
   the session, to publish "via script by founder again", as on 2026-10-06.
   This is that script. It applies the decisions in
   docs/general-election/queue-review-2026-10-15.console.js, one item at a time,
   doing what POST /api/admin/review/:id/decision does
   (src/app/api/admin/review/[id]/decision/route.ts), in the same order:

     reject:  status pending -> rejected (guarded on pending), audit row.
     approve: re-validate the stored payload (ReviewItemContentSchema), the
              neutrality lint on title + summary, planEffect, resolve the source
              exactly as the route's resolveSource does, insert news_item,
              finalize (guarded on pending), audit row. Any failure is
              fail-closed: apply_error recorded, item stays pending, audit row
              with applied:false, and the run stops.

   The audit actor is "founder via Claude Code (2026-10-15)", like the 10-06
   batch. Dry run by default: every check runs, nothing is written.

     node scripts/apply-queue-review-2026-10-15.ts            # dry run
     node scripts/apply-queue-review-2026-10-15.ts --apply    # write */

import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./env-local.ts";
import { planEffect, type NewsInsertRow } from "../src/lib/admin/effects.ts";
import { ReviewItemContentSchema } from "../src/types/admin.ts";
import { findAllBannedTermMatches } from "../src/lib/neutrality.ts";
import {
  givenPageRowProblem,
  listedRowProblem,
  pageRowProblem,
  planSourceAttribution,
  storyPageProblem,
  type AttributionDeps,
  type ListedSourceRow,
} from "../src/lib/news-enqueue.ts";
import { OUTLETS, outletForUrl } from "../src/lib/news-sources.ts";
import { officialForUrl } from "../src/lib/official-sources.ts";
import { urlNorm } from "../src/lib/brief-rows.ts";

const ACTOR = "founder via Claude Code (2026-10-15)";
const APPLY = process.argv.includes("--apply");
const LOOP = new URL("../docs/general-election/queue-review-2026-10-15.console.js", import.meta.url);

type Decision = { id: string; action: "approve" | "reject"; note: string; label: string };
const src = readFileSync(LOOP, "utf8");
const DECISIONS: Decision[] = JSON.parse(
  src.slice(src.indexOf("const DECISIONS = ") + "const DECISIONS = ".length, src.indexOf("];\n") + 1)
);

loadEnvLocal(import.meta.url);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
const db = createClient(url, key, { auth: { persistSession: false } });

const now = () => new Date().toISOString();
const deps: AttributionDeps = {
  outletFor: (u) => outletForUrl(u, OUTLETS),
  officialFor: (u) => officialForUrl(u),
  norm: urlNorm,
};

async function audit(action: "approve" | "reject", id: string, detail: Record<string, unknown>) {
  const { error } = await db.from("admin_action").insert({
    actor: ACTOR, action, subject_kind: "review_item", subject_id: id, detail,
  });
  if (error) throw new Error(`audit row failed for ${id}: ${error.message}`);
}

async function failClosed(id: string, note: string, applyError: string): Promise<never> {
  if (APPLY) {
    await db.from("review_item").update({ apply_error: applyError, decision_note: note })
      .eq("id", id).eq("status", "pending");
    await audit("approve", id, { applied: false, apply_error: applyError });
  }
  throw new Error(`fail-closed ${id}: ${applyError}`);
}

type SourceRowRead = { source_id: string; url_norm: string; type: string; lean_tag: string };
const NO_SOURCE_RULE =
  "Migration 0014 requires a source on every candidate_news and election_news row (\"no source, no card\").";

/* Mirrors resolveSource in the decision route. In a dry run the listed-row
   upsert is skipped, and a row that is not there yet is reported as "would
   create". */
async function resolveSource(row: NewsInsertRow): Promise<
  { ok: true; sourceId: string; via: string; created?: boolean } | { ok: false; reason: string }
> {
  const plan = planSourceAttribution(row, deps);
  const where = async (column: "source_id" | "url_norm", value: string) => {
    const { data, error } = await db.from("source").select("source_id, url_norm, type, lean_tag")
      .eq(column, value).maybeSingle();
    return { row: (data as SourceRowRead | null) ?? null, error };
  };
  const ensureListed = async (listed: ListedSourceRow, via: "given" | "outlet") => {
    const before = await where("url_norm", listed.url_norm);
    if (before.error) return { ok: false as const, reason: `source read failed: ${before.error.message}` };
    if (!before.row && !APPLY) return { ok: true as const, sourceId: listed.source_id, via, created: true };
    if (APPLY) {
      const { error } = await db.from("source").upsert(listed, { onConflict: "url_norm", ignoreDuplicates: true });
      if (error) return { ok: false as const, reason: `Could not write the source row for ${listed.url_norm}: ${error.message}` };
    }
    const found = await where("url_norm", listed.url_norm);
    if (found.error || !found.row) return { ok: false as const, reason: `The source row for ${listed.url_norm} could not be read back.` };
    const problem = listedRowProblem(listed, found.row);
    if (problem) return { ok: false as const, reason: problem };
    return { ok: true as const, sourceId: found.row.source_id, via, created: !before.row };
  };
  switch (plan.kind) {
    case "refused":
      return { ok: false, reason: plan.reason };
    case "given": {
      if (plan.listedRow) {
        if (plan.storyPageNorm) {
          const page = await where("url_norm", plan.storyPageNorm);
          if (page.error) return { ok: false, reason: `Could not check ${plan.storyPageNorm}: ${page.error.message}` };
          const problem = storyPageProblem(page.row, plan.storyPageNorm);
          if (problem) return { ok: false, reason: problem };
        }
        return ensureListed(plan.listedRow, "given");
      }
      const found = await where("source_id", plan.sourceId);
      if (found.error) return { ok: false, reason: `Could not check source ${plan.sourceId}: ${found.error.message}` };
      if (!found.row) return { ok: false, reason: `No source row has id "${plan.sourceId}". ${NO_SOURCE_RULE}` };
      const problem = givenPageRowProblem(plan, found.row.url_norm);
      if (problem) return { ok: false, reason: problem };
      return { ok: true, sourceId: found.row.source_id, via: "given" };
    }
    case "outlet":
      return ensureListed(plan.listedRow, "outlet");
    case "unsigned":
      return { ok: false, reason: `${plan.domain} lean not signed off. ${NO_SOURCE_RULE}` };
    case "page": {
      const found = await where("url_norm", plan.urlNorm);
      if (found.error) return { ok: false, reason: `Could not look up ${plan.urlNorm}: ${found.error.message}` };
      if (!found.row) return { ok: false, reason: `No source found for this story. ${NO_SOURCE_RULE}` };
      const problem = pageRowProblem(row, found.row.source_id, deps);
      if (problem) return { ok: false, reason: problem };
      return { ok: true, sourceId: found.row.source_id, via: "page" };
    }
    case "none":
      return { ok: false, reason: `This story's URL could not be normalised. ${NO_SOURCE_RULE}` };
  }
}

async function decide(d: Decision): Promise<string> {
  const { data: item, error } = await db.from("review_item").select("id, kind, payload, status")
    .eq("id", d.id).maybeSingle();
  if (error) throw new Error(`load ${d.id}: ${error.message}`);
  if (!item) throw new Error(`review item ${d.id} not found`);
  if (item.status !== "pending") return `skip (already ${item.status})`;

  if (d.action === "reject") {
    if (!APPLY) return "would reject";
    const { data: upd, error: e } = await db.from("review_item")
      .update({ status: "rejected", decided_at: now(), decision_note: d.note })
      .eq("id", d.id).eq("status", "pending").select("id");
    if (e) throw new Error(`reject ${d.id}: ${e.message}`);
    if (!upd?.length) return "skip (decided concurrently)";
    await audit("reject", d.id, { note: d.note });
    return "rejected";
  }

  const content = ReviewItemContentSchema.safeParse({ kind: item.kind, payload: item.payload });
  if (!content.success) return failClosed(d.id, d.note, "Stored payload no longer matches its schema — not applied.");
  if (content.data.kind === "manual_news") {
    const p = content.data.payload;
    const flags = findAllBannedTermMatches(`${p.title} ${p.summary ?? ""}`);
    if (flags.length) return failClosed(d.id, d.note, `Neutrality check failed on approval: ${flags.join(", ")} — not published.`);
  }
  const plan = planEffect(content.data);
  if (plan.type === "refuse") return failClosed(d.id, d.note, plan.reason);
  if (plan.type !== "insert_news") return failClosed(d.id, d.note, `unexpected effect ${plan.type} for a news decision`);

  const source = await resolveSource(plan.row);
  if (!source.ok) return failClosed(d.id, d.note, source.reason);
  if (!APPLY) return `would approve (source ${source.sourceId}${source.created ? ", new source row" : ""})`;

  const { error: insErr } = await db.from("news_item").insert({ ...plan.row, source_id: source.sourceId });
  if (insErr) return failClosed(d.id, d.note, `Could not insert news_item: ${insErr.code} ${insErr.message}`);
  const appliedAt = now();
  const { data: fin, error: finErr } = await db.from("review_item")
    .update({ status: "approved", decided_at: appliedAt, applied_at: appliedAt, decision_note: d.note, apply_error: null })
    .eq("id", d.id).eq("status", "pending").select("id");
  if (finErr) throw new Error(`finalize ${d.id}: ${finErr.message}`);
  if (!fin?.length) throw new Error(`finalize ${d.id}: decided concurrently after insert`);
  await audit("approve", d.id, {
    applied: true,
    effect: `news_item inserted (verified_by=operator, source=${source.sourceId})`,
    verified_by: "operator",
    source: { source_id: source.sourceId, via: source.via },
    note: d.note,
  });
  return "approved";
}

const tally: Record<string, number> = {};
console.log(`${APPLY ? "APPLY" : "DRY RUN"}: ${DECISIONS.length} decisions, actor "${ACTOR}"`);
for (const [n, d] of DECISIONS.entries()) {
  let out: string;
  try {
    out = await decide(d);
  } catch (e) {
    console.error(`STOPPED at ${n + 1}/${DECISIONS.length} ${d.action} ${d.label}: ${(e as Error).message}`);
    console.log(tally);
    process.exit(1);
  }
  const k = out.replace(/ \(source .*\)$/, "").replace(/\(.*\)/, "").trim() + (out.includes("new source row") ? " +new source" : "");
  tally[k] = (tally[k] ?? 0) + 1;
  if (APPLY && (n + 1) % 50 === 0) console.log(`${n + 1}/${DECISIONS.length}`, tally);
}
console.log(tally);
