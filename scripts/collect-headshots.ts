/* Collect candidate headshots (migration 0056; src/lib/headshots.ts).

   Two steps, with a person between them, because a photo of the wrong
   person is the one failure this feature can't be allowed to have:

   1. stage — read the research plan (one JSON array per batch: candidate_id,
      source_kind, source_page_url, source_image_url, credit, confidence,
      notes), download each image, crop it to a 400px square WebP (sharp's
      "attention" crop, which centres on the face), and write a contact sheet
      grouped by race. Nothing leaves this machine. The sheet has a "right
      person" box per photo and a button that copies the confirmed ids.

        node scripts/collect-headshots.ts stage <outDir> <plan.json>...

   2. publish — upload the crops for the confirmed ids only, and write their
      candidate_photo rows as verified by the founder. Unconfirmed photos are
      never uploaded. Needs SUPABASE_SERVICE_ROLE_KEY (.env.local).

        node scripts/collect-headshots.ts publish <outDir> <confirmed.json> <plan.json>...

   Downloads are untrusted: they go in <outDir>/raw, are only ever decoded by
   sharp, must say they are images, and stop at 10 MB. */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./env-local.ts";

type PlanItem = {
  candidate_id: string;
  name: string;
  found: boolean;
  source_kind?: "official" | "campaign" | "social";
  source_page_url?: string;
  source_image_url?: string;
  credit?: string;
  confidence?: "high" | "medium" | "low";
  notes?: string;
  /** Optional manual crop as fractions of the image (0-1), for a group or
      wide photo where the attention crop could pick the wrong face. */
  crop_box?: { x: number; y: number; w: number; h: number };
  race_id?: string;
  office?: string;
};

const MAX_BYTES = 10 * 1024 * 1024;
const SIZE = 400;
const BUCKET = "candidate-photos";

function readPlan(files: string[]): PlanItem[] {
  return files.flatMap(
    (f) => JSON.parse(readFileSync(f, "utf8")) as PlanItem[]
  );
}

function slug(id: string) {
  return id.replace(/[^A-Za-z0-9-]/g, "_");
}

async function download(url: string, page?: string): Promise<Buffer> {
  /* A photo some site builders embed in the page itself rather than host
     (FL-12's Scrivener): decoded here, still only ever read by sharp. */
  const inline = url.match(/^data:image\/(?:jpeg|png|webp);base64,(.+)$/);
  if (inline) {
    const buf = Buffer.from(inline[1], "base64");
    if (buf.length > MAX_BYTES) throw new Error("over 10 MB");
    return buf;
  }
  if (!/^https:\/\//.test(url)) throw new Error("not https");
  const get = (headers: Record<string, string>) =>
    fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers,
    });
  let res = await get({
    "user-agent": "KnowYourVote-headshots/1.0 (+https://knowyour.vote)",
  });
  /* Some official sites refuse an image unless the page it sits on is the
     referrer (hotlink protection). Ask once more the way a reader's browser
     viewing that page would. */
  if (res.status === 403 && page) {
    res = await get({
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36",
      referer: page,
    });
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/"))
    throw new Error(`not an image (${type || "no type"})`);
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES) throw new Error("over 10 MB");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error("over 10 MB");
  return buf;
}

/* Race and office for each candidate, for the sheet's grouping: the same
   listed/published races the site shows, read with the anon key. */
async function annotate(plan: PlanItem[]): Promise<PlanItem[]> {
  loadEnvLocal(import.meta.url);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return plan;
  const { data } = await createClient(url, key)
    .from("race")
    .select("race_id, office, candidate_ids");
  const race = new Map<string, { race_id: string; office: string }>();
  for (const r of (data ?? []) as {
    race_id: string;
    office: string;
    candidate_ids: string[] | null;
  }[]) {
    for (const id of r.candidate_ids ?? [])
      race.set(id, { race_id: r.race_id, office: r.office });
  }
  return plan
    .map((p) => ({ ...p, ...race.get(p.candidate_id) }))
    .sort((a, b) => (a.race_id ?? "").localeCompare(b.race_id ?? ""));
}

async function stage(outDir: string, planFiles: string[]) {
  const plan = await annotate(readPlan(planFiles));
  const raw = path.join(outDir, "raw");
  const crops = path.join(outDir, "crops");
  mkdirSync(raw, { recursive: true });
  mkdirSync(crops, { recursive: true });

  const results: (PlanItem & {
    crop?: string;
    error?: string;
    w?: number;
    h?: number;
  })[] = [];
  for (const item of plan) {
    if (!item.found || !item.source_image_url) {
      results.push({ ...item, error: item.notes || "not found" });
      console.log(`  --  ${item.candidate_id} ${item.name}: not found`);
      continue;
    }
    try {
      const buf = await download(item.source_image_url, item.source_page_url);
      writeFileSync(path.join(raw, slug(item.candidate_id)), buf);
      const meta = await sharp(buf).metadata();
      const out = path.join(crops, `${slug(item.candidate_id)}.webp`);
      let img = sharp(buf).rotate();
      const box = item.crop_box;
      if (box && meta.width && meta.height) {
        const W = meta.width;
        const H = meta.height;
        const left = Math.max(0, Math.round(box.x * W));
        const top = Math.max(0, Math.round(box.y * H));
        img = sharp(
          await img
            .extract({
              left,
              top,
              width: Math.min(W - left, Math.round(box.w * W)),
              height: Math.min(H - top, Math.round(box.h * H)),
            })
            .toBuffer()
        );
      }
      await img
        .resize(SIZE, SIZE, {
          fit: "cover",
          position: sharp.strategy.attention,
        })
        .webp({ quality: 82 })
        .toFile(out);
      results.push({
        ...item,
        crop: `crops/${slug(item.candidate_id)}.webp`,
        w: meta.width,
        h: meta.height,
      });
      console.log(
        `  ok  ${item.candidate_id} ${item.name} (${meta.width}x${meta.height})`
      );
    } catch (err) {
      results.push({ ...item, error: (err as Error).message });
      console.log(
        `FAIL  ${item.candidate_id} ${item.name}: ${(err as Error).message}`
      );
    }
  }
  writeFileSync(
    path.join(outDir, "staged.json"),
    JSON.stringify(results, null, 1)
  );
  writeFileSync(path.join(outDir, "contact-sheet.html"), sheet(results));
  const ok = results.filter((r) => r.crop).length;
  console.log(
    `\n${ok}/${results.length} cropped. Contact sheet: ${path.join(outDir, "contact-sheet.html")}`
  );
}

const esc = (s = "") =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!
  );

function sheet(
  rows: (PlanItem & { crop?: string; error?: string; w?: number; h?: number })[]
) {
  const byRace = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = r.race_id ?? "unknown race";
    byRace.set(k, [...(byRace.get(k) ?? []), r]);
  }
  const races = [...byRace.entries()]
    .map(([race, list]) => {
      const complete = list.every((r) => r.crop);
      const cards = list
        .map(
          (r) => `<article class="card${r.crop ? "" : " missing"}">
  ${r.crop ? `<img src="${esc(r.crop)}" alt="" width="160" height="160">` : `<div class="none">No photo</div>`}
  <h3>${esc(r.name)}</h3>
  <p class="meta">${esc(r.source_kind ?? "")} · ${esc(r.credit ?? "")} · <b class="conf ${esc(r.confidence ?? "")}">${esc(r.confidence ?? "")}</b>${r.w ? ` · ${r.w}×${r.h}` : ""}</p>
  ${r.source_page_url ? `<p class="meta"><a href="${esc(r.source_page_url)}" target="_blank" rel="noreferrer">source page</a></p>` : ""}
  ${r.notes || r.error ? `<p class="note">${esc(r.error ?? r.notes)}</p>` : ""}
  ${r.crop ? `<label><input type="checkbox" data-id="${esc(r.candidate_id)}"> Right person, usable</label>` : ""}
</article>`
        )
        .join("\n");
      return `<section class="race"><h2>${esc(list[0]?.office ?? race)} <small>${esc(race)} · ${list.length} candidates · ${complete ? "all found" : "<b class=gap>missing a photo: this race will show none</b>"}</small></h2><div class="grid">${cards}</div></section>`;
    })
    .join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Headshot Contact Sheet</title>
<style>
:root{--bg:#f6f3ec;--s:#fff;--ink:#22271f;--m:#585e52;--b:#e4ded2;--p:#2f6b4f;--a:#b26836}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 system-ui,sans-serif}
header{position:sticky;top:0;z-index:2;background:var(--ink);color:#fff;padding:12px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
header button{font:inherit;font-weight:600;border:0;border-radius:6px;padding:8px 12px;background:var(--p);color:#fff;cursor:pointer}
main{max-width:1200px;margin:0 auto;padding:16px}
.race{margin:0 0 28px}.race h2{font-size:17px;margin:0 0 8px;border-bottom:2px solid var(--ink);padding-bottom:4px}.race small{font-weight:400;color:var(--m);font-size:12px}.gap{color:var(--a)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}
.card{background:var(--s);border:1px solid var(--b);border-radius:8px;padding:10px}.card.missing{border-style:dashed}
.card img,.none{width:160px;height:160px;border-radius:6px;object-fit:cover;display:block;background:#efeae0}.none{display:grid;place-items:center;color:var(--m)}
.card h3{font-size:14px;margin:8px 0 2px}.meta{margin:0;color:var(--m);font-size:12px}.note{font-size:12px;margin:4px 0;color:#3d4238}
.conf.low{color:var(--a)}label{display:flex;gap:6px;align-items:center;margin-top:6px;font-weight:600}
</style></head><body>
<header><b>Headshot contact sheet</b><span id="count">0 confirmed</span><button id="all">Tick all high-confidence</button><button id="copy">Copy confirmed ids</button><span id="msg"></span></header>
<main>
<p>Tick each photo that shows the right person and is usable. A race shows photos only when every candidate in it is ticked. Then press <b>Copy confirmed ids</b> and paste the result back to Claude.</p>
${races}
</main>
<script>
const boxes=[...document.querySelectorAll('input[data-id]')];
const upd=()=>document.getElementById('count').textContent=boxes.filter(b=>b.checked).length+' confirmed';
boxes.forEach(b=>b.addEventListener('change',upd));
document.getElementById('all').onclick=()=>{boxes.forEach(b=>{if(b.closest('.card').querySelector('.conf.high'))b.checked=true});upd()};
document.getElementById('copy').onclick=async()=>{const ids=JSON.stringify(boxes.filter(b=>b.checked).map(b=>b.dataset.id));try{await navigator.clipboard.writeText(ids);document.getElementById('msg').textContent='Copied.'}catch{prompt('Copy this:',ids)}};
</script></body></html>`;
}

async function publish(
  outDir: string,
  confirmedFile: string,
  planFiles: string[]
) {
  loadEnvLocal(import.meta.url);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
    );
  const db = createClient(url, key);
  const confirmed = new Set(
    JSON.parse(readFileSync(confirmedFile, "utf8")) as string[]
  );
  const plan = new Map(readPlan(planFiles).map((p) => [p.candidate_id, p]));
  const verifiedAt = new Date().toISOString();

  let done = 0;
  for (const id of confirmed) {
    const item = plan.get(id);
    const file = path.join(outDir, "crops", `${slug(id)}.webp`);
    if (
      !item ||
      !item.source_page_url ||
      !item.credit ||
      !item.source_kind ||
      !existsSync(file)
    ) {
      console.log(`skip  ${id}: not staged or missing source/credit`);
      continue;
    }
    const kind = item.source_kind === "official" ? "official" : "campaign";
    const storagePath = `${slug(id)}.webp`;
    const up = await db.storage
      .from(BUCKET)
      .upload(storagePath, readFileSync(file), {
        contentType: "image/webp",
        upsert: true,
      });
    if (up.error) {
      console.log(`FAIL  ${id}: upload ${up.error.message}`);
      continue;
    }
    const { error } = await db.from("candidate_photo").upsert({
      candidate_id: id,
      storage_path: storagePath,
      source_kind: kind,
      source_page_url: item.source_page_url,
      /* An inline image has no URL of its own; the page is the source. */
      source_image_url: item.source_image_url?.startsWith("https://")
        ? item.source_image_url
        : null,
      credit: item.credit.slice(0, 80),
      verified_by: "founder (contact sheet)",
      verified_at: verifiedAt,
    });
    if (error) {
      console.log(`FAIL  ${id}: row ${error.message}`);
      continue;
    }
    done++;
    console.log(`  ok  ${id}`);
  }
  console.log(
    `\n${done}/${confirmed.size} published. Pages refresh within an hour (cache tag candidate-photos).`
  );
}

const [cmd, outDir, ...rest] = process.argv.slice(2);
if (cmd === "stage" && outDir && rest.length > 0) await stage(outDir, rest);
else if (cmd === "publish" && outDir && rest.length > 1)
  await publish(outDir, rest[0], rest.slice(1));
else {
  console.error(
    "usage: stage <outDir> <plan.json>... | publish <outDir> <confirmed.json> <plan.json>..."
  );
  process.exit(2);
}
