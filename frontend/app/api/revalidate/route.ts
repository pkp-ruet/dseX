import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * On-demand cache purge for ISR fetches tagged via `lib/api.ts`.
 * Called by `main.py` scrape-all after a successful scrape.
 *
 * Auth: shared secret in either `?secret=` or the `x-revalidate-secret` header,
 * compared against `REVALIDATE_SECRET` (server-only env var).
 */
export async function POST(req: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "revalidate disabled" }, { status: 503 });
  }

  const provided =
    req.nextUrl.searchParams.get("secret") ??
    req.headers.get("x-revalidate-secret");
  if (provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tagParam = req.nextUrl.searchParams.get("tag");
  const tags = tagParam ? tagParam.split(",").map((t) => t.trim()).filter(Boolean) : ["market-data"];

  for (const tag of tags) {
    revalidateTag(tag);
  }

  return NextResponse.json({ revalidated: tags, at: new Date().toISOString() });
}
