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

/**
 * Admin proxy: forwards the user's JWT to the backend's
 * `POST /api/admin/daily-pick/shuffle`, then purges the homepage's
 * `market-data` ISR cache so the new pick appears immediately.
 *
 * Auth is enforced server-side by the backend (admin email allowlist).
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "missing bearer token" }, { status: 401 });
  }

  const upstream = await fetch(`${getApiUrl()}/api/admin/daily-pick/shuffle`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    cache: "no-store",
  }).catch((e) => {
    return new Response(JSON.stringify({ error: String(e) }), { status: 502 });
  });

  const body = await upstream.text();
  let parsed: unknown = null;
  try {
    parsed = body ? JSON.parse(body) : null;
  } catch {
    parsed = { raw: body };
  }

  if (upstream.ok) {
    revalidateTag("market-data");
  }
  return NextResponse.json(parsed, { status: upstream.status });
}
