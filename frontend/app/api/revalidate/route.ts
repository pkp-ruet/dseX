import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * On-demand cache purge for ISR fetches tagged via `lib/api.ts`.
 * Called by `main.py` scrape-all after a successful scrape.
 *
 * Auth: the `x-revalidate-secret` header, compared in constant time against
 * `REVALIDATE_SECRET` (server-only env var). Not a `?secret=` query param: a
 * URL ends up in access and proxy logs.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "revalidate disabled" }, { status: 503 });
  }

  const provided = Buffer.from(req.headers.get("x-revalidate-secret") ?? "");
  const wanted = Buffer.from(expected);
  if (provided.length !== wanted.length || !timingSafeEqual(provided, wanted)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tagParam = req.nextUrl.searchParams.get("tag");
  const tags = tagParam ? tagParam.split(",").map((t) => t.trim()).filter(Boolean) : ["market-data"];

  for (const tag of tags) {
    revalidateTag(tag);
  }

  return NextResponse.json({ revalidated: tags, at: new Date().toISOString() });
}
