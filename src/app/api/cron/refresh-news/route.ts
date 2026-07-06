import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { secretEquals } from "@/lib/secret-compare";
import { createAnonServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/* Daily refresh (FR-009). Reads recent publication changes from the
   pipeline's output and upserts neutral news_item rows, then revalidates
   cached race pages. A failed run inserts nothing and leaves yesterday's
   feed intact (PRD § 11). */
export async function POST(request: NextRequest) {
  return refresh(request);
}

/* Vercel Cron invokes with GET and `Authorization: Bearer ${CRON_SECRET}`;
   the POST + x-cron-secret form is the PRD's manual/API contract. */
export async function GET(request: NextRequest) {
  return refresh(request);
}

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (
    secretEquals(request.headers.get("x-cron-secret"), secret) ||
    secretEquals(request.headers.get("authorization"), `Bearer ${secret}`)
  );
}

async function refresh(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* Publication state is public data — read it with the anon client. */
  const anon = await createAnonServerClient();
  const [pubsRes, racesRes] = await Promise.all([
    anon
      .from("race_publication")
      .select("race_id, status, published_at")
      .eq("status", "published"),
    anon.from("race").select("race_id, office, district, key_dates"),
  ]);
  if (pubsRes.error || racesRes.error) {
    return NextResponse.json(
      { error: "Pipeline read failed — feed left intact." },
      { status: 502 }
    );
  }
  const offices = new Map(racesRes.data?.map((r) => [r.race_id, r]) ?? []);

  let service;
  try {
    service = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "Service credentials missing — feed left intact." },
      { status: 503 }
    );
  }

  /* Idempotent: one publication item per race. */
  const { data: existing, error: existingErr } = await service
    .from("news_item")
    .select("race_id")
    .eq("item_type", "pipeline_event");
  if (existingErr) {
    return NextResponse.json(
      { error: "Feed read failed — nothing inserted." },
      { status: 502 }
    );
  }
  const alreadyAnnounced = new Set((existing ?? []).map((e) => e.race_id));

  const rows = (pubsRes.data ?? [])
    .filter((p) => !alreadyAnnounced.has(p.race_id))
    .map((p) => {
      const race = offices.get(p.race_id);
      return {
        race_id: p.race_id,
        metro: null,
        item_type: "pipeline_event" as const,
        title: `Race published: ${race?.office ?? p.race_id}`,
        summary:
          "This race passed the Balance Audit — every candidate covered with equal space and comparable scrutiny — and its briefs are now live.",
        url: null,
        published_at: p.published_at ?? new Date().toISOString(),
      };
    });

  if (rows.length > 0) {
    const { error } = await service.from("news_item").insert(rows);
    if (error) {
      return NextResponse.json(
        { error: "Insert failed — feed left intact." },
        { status: 502 }
      );
    }
  }

  revalidateTag("races", "max");
  return NextResponse.json({ inserted: rows.length });
}
