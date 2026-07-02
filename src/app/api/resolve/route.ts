import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveZip, ZIP_RE } from "@/lib/resolve";

const params = z.object({
  zip: z.string().regex(ZIP_RE, "Invalid ZIP"),
  district: z
    .string()
    .regex(/^FL-\d{1,2}$/)
    .optional(),
});

export async function GET(request: NextRequest) {
  const parsed = params.safeParse({
    zip: request.nextUrl.searchParams.get("zip") ?? "",
    district: request.nextUrl.searchParams.get("district") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid ZIP" }, { status: 400 });
  }

  try {
    const result = await resolveZip(parsed.data.zip, parsed.data.district);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Something went wrong looking up that ZIP — try again." },
      { status: 500 }
    );
  }
}
