import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runQuiz } from "@/lib/quiz";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { ZIP_RE } from "@/lib/resolve";

/* ZIP optional since TASK-068: with none, runQuiz uses the statewide races.
   District without ZIP is rejected rather than ignored — it can only come
   from a malformed client, and silently dropping it would answer a different
   question than the one asked. */
const body = z.object({
  zip: z.string().regex(ZIP_RE).optional(),
  district: z
    .string()
    .regex(/^FL-\d{1,2}$/)
    .optional(),
  answers: z
    .array(
      z.object({
        questionId: z.string().max(40),
        choice: z.string().max(40).optional(),
        freeText: z.string().max(1000).optional(),
      })
    )
    .max(20),
})
  .refine((b) => !b.district || b.zip, {
    message: "district requires zip",
    path: ["district"],
  });

export async function POST(request: NextRequest) {
  const { allowed } = rateLimit(`quiz:${clientKey(request)}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests — give it a minute and try again." },
      { status: 429 }
    );
  }

  let parsed;
  try {
    parsed = body.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const result = await runQuiz(
      parsed.data.zip,
      parsed.data.district,
      parsed.data.answers
    );
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, races: result.races ?? [] },
        { status: result.status }
      );
    }
    return NextResponse.json(result.response);
  } catch {
    return NextResponse.json(
      { error: "Couldn't process that — try again." },
      { status: 500 }
    );
  }
}
