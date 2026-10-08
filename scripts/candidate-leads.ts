/* R5's tool: the deterministic steps around the agent's own reading and
   checking (spec docs/superpowers/specs/2026-10-07-candidate-leads-agent-design.md §3).

     prep  [--days 14]           sweep; print the stories that matched no
                                 roster candidate. Writes nothing.
     check --stories FILE        mentions (the agent's reading) on stdin;
                                 print { leads, dropped }. Writes nothing.
     queue [--dry-run]           verified leads on stdin; insert one pending
                                 candidate_lead review item per new lead.

   Nothing here decides who is a candidate (the agent does) or what the
   guide covers (the founder does, in /admin). Fail-closed: every error exits
   non-zero before any write. */

import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./env-local.ts";
import { loadRoster, runSweep } from "../src/lib/news-intake.ts";
import { planAttachments } from "../src/lib/news-enqueue.ts";
import { matchArticle } from "../src/lib/news-match.ts";
import { OUTLETS, outletForUrl } from "../src/lib/news-sources.ts";
import { buildLeads, planQueue, type Mention, type StoryRef } from "../src/lib/candidate-leads.ts";

loadEnvLocal(import.meta.url);

const [command, ...args] = process.argv.slice(2);

function die(message: string): never {
  console.error(`candidate-leads: ${message}`);
  process.exit(1);
}

function flag(name: string): string | null {
  const i = args.indexOf(name);
  return i === -1 ? null : (args[i + 1] ?? null);
}

async function stdinJson(): Promise<unknown> {
  const text = await new Promise<string>((resolve, reject) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", () => resolve(buf));
    process.stdin.on("error", reject);
  });
  if (!text.trim()) die("nothing on stdin");
  try {
    return JSON.parse(text);
  } catch (err) {
    die(`stdin is not valid JSON: ${String(err)}`);
  }
}

function database(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) die("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  return createClient(url, key);
}

/** Dedupe keys of every lead already queued, approved or rejected. */
async function existingLeadKeys(db: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await db
    .from("review_item")
    .select("payload")
    .eq("kind", "candidate_lead")
    .in("status", ["pending", "approved", "rejected"]);
  if (error) die(`could not read existing leads: ${error.message}`);
  const keys = new Set<string>();
  for (const r of (data ?? []) as { payload: { dedupe_key?: string } | null }[]) {
    if (r.payload?.dedupe_key) keys.add(r.payload.dedupe_key);
  }
  return keys;
}

if (command === "prep") {
  const days = Number(flag("--days") ?? 14);
  if (!Number.isFinite(days) || days < 1) die("--days must be a positive number");
  const db = database();
  const sweep = await runSweep({ days, log: (line) => console.error(line) });
  const roster = await loadRoster(db);
  if (roster.length === 0) die("the roster is empty; refusing to call every story unmatched");
  const outletFor = (u: string) => outletForUrl(u, OUTLETS);
  const plan = planAttachments(sweep.articles, roster, matchArticle, outletFor);
  const matched = new Set(plan.attachments.map((a) => a.article.url));
  const stories = sweep.articles
    .filter((a) => outletFor(a.url) && !matched.has(a.url))
    .map((a, n) => ({
      i: n + 1,
      title: a.title,
      summary: a.summary,
      url: a.url,
      outlet: a.publisher,
      published_at: a.publishedAt,
    }));
  console.error(`${sweep.summary}; ${stories.length} matched no roster candidate`);
  console.log(JSON.stringify(stories, null, 1));
} else if (command === "check") {
  const file = flag("--stories");
  if (!file) die("check needs --stories <file from prep>");
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    die(`could not read ${file}: ${String(err)}`);
  }
  if (!Array.isArray(raw)) die(`${file} is not the array prep prints`);
  const stories = new Map<number, StoryRef>();
  for (const s of raw as { i: number; title: string; url: string; outlet: string; published_at: string }[]) {
    stories.set(s.i, { url: s.url, title: s.title, outlet: s.outlet, published_at: s.published_at });
  }
  const mentions = await stdinJson();
  if (!Array.isArray(mentions)) die("stdin must be an array of mentions");
  const db = database();
  const roster = await loadRoster(db);
  if (roster.length === 0) die("the roster is empty");
  const result = buildLeads(
    mentions as Mention[],
    stories,
    roster.map((r) => r.legalName),
    await existingLeadKeys(db),
  );
  const reasons = new Map<string, number>();
  for (const d of result.dropped) reasons.set(d.reason, (reasons.get(d.reason) ?? 0) + 1);
  console.error(
    `${mentions.length} mention(s) -> ${result.leads.length} lead(s); dropped: ` +
      ([...reasons].map(([r, n]) => `${r} ${n}`).join(", ") || "none"),
  );
  console.log(JSON.stringify(result, null, 1));
} else if (command === "queue") {
  const dryRun = args.includes("--dry-run");
  const items = await stdinJson();
  const db = database();
  const plan = planQueue(items, await existingLeadKeys(db));
  if (!plan.ok) die(`batch refused, nothing written:\n  ${plan.errors.join("\n  ")}`);
  if (dryRun) {
    console.log(JSON.stringify(plan.rows, null, 1));
    console.error(`dry run: would queue ${plan.rows.length}, skip ${plan.skipped.length}`);
    process.exit(0);
  }
  if (plan.rows.length > 0) {
    const { error } = await db.from("review_item").insert(plan.rows);
    if (error) die(`could not queue: ${error.message}`);
  }
  console.error(
    `queued ${plan.rows.length} pending candidate lead(s)` +
      (plan.skipped.length ? `, skipped ${plan.skipped.length} already queued or decided` : "") +
      ". Nothing is voter-facing.",
  );
} else {
  die("usage: candidate-leads.ts prep [--days N] | check --stories FILE < mentions.json | queue [--dry-run] < verified.json");
}
