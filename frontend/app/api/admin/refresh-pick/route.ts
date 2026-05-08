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
 * `POST /api/admin/daily-pick/refresh`, then purges the homepage's
 * `market-data` ISR cache so the new pick appears immediately.
 *
 * Body: { slot: 1 | 2 | 3 }
 * Auth is enforced server-side by the backend (admin email allowlist).
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "missing bearer token" }, { status: 401 });
  }

  const body = await req.text();

  const upstream = await fetch(`${getApiUrl()}/api/admin/daily-pick/refresh`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body,
    cache: "no-store",
  }).catch((e) => {
    return new Response(JSON.stringify({ error: String(e) }), { status: 502 });
  });

  const text = await upstream.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }

  if (upstream.ok) {
    revalidateTag("market-data");
  }
  return NextResponse.json(parsed, { status: upstream.status });
}
