import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getApiUrl(): string {
  const raw = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  const explicit = raw?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "development") return "http://localhost:8000";
  return "https://dsex.onrender.com";
}

function requireBearer(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth : null;
}

async function relay(upstream: Response): Promise<NextResponse> {
  const text = await upstream.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }
  if (upstream.ok) revalidateTag("market-data");
  return NextResponse.json(parsed, { status: upstream.status });
}

/**
 * Admin proxy: exclude a stock from the daily tips.
 * Body: { trading_code: string, reason?: string }
 * Forwards to `POST /api/admin/daily-tips/exclude`, then purges the homepage's
 * `market-data` ISR cache so the tip list updates for all visitors.
 */
export async function POST(req: NextRequest) {
  const auth = requireBearer(req);
  if (!auth) return NextResponse.json({ error: "missing bearer token" }, { status: 401 });
  const body = await req.text();
  const upstream = await fetch(`${getApiUrl()}/api/admin/daily-tips/exclude`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body,
    cache: "no-store",
  }).catch((e) => new Response(JSON.stringify({ error: String(e) }), { status: 502 }));
  return relay(upstream);
}

/**
 * Admin proxy: restore an excluded stock.
 * Query: ?trading_code=XYZ
 * Forwards to `DELETE /api/admin/daily-tips/exclude/{code}`, then revalidates.
 */
export async function DELETE(req: NextRequest) {
  const auth = requireBearer(req);
  if (!auth) return NextResponse.json({ error: "missing bearer token" }, { status: 401 });
  const code = req.nextUrl.searchParams.get("trading_code")?.trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "trading_code required" }, { status: 400 });
  const upstream = await fetch(
    `${getApiUrl()}/api/admin/daily-tips/exclude/${encodeURIComponent(code)}`,
    {
      method: "DELETE",
      headers: { Authorization: auth },
      cache: "no-store",
    },
  ).catch((e) => new Response(JSON.stringify({ error: String(e) }), { status: 502 }));
  return relay(upstream);
}
