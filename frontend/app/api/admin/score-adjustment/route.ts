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

async function proxy(req: NextRequest, method: "POST" | "DELETE", path: string, body?: string) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "missing bearer token" }, { status: 401 });
  }
  const upstream = await fetch(`${getApiUrl()}${path}`, {
    method,
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body,
    cache: "no-store",
  }).catch((e) => new Response(JSON.stringify({ error: String(e) }), { status: 502 }));

  const text = await upstream.text();
  let parsed: unknown = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text }; }

  if (upstream.ok) revalidateTag("market-data");
  return NextResponse.json(parsed, { status: upstream.status });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  return proxy(req, "POST", "/api/admin/score-adjustment", body);
}

export async function DELETE(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("trading_code") || "";
  if (!code) {
    return NextResponse.json({ error: "trading_code query param required" }, { status: 400 });
  }
  return proxy(req, "DELETE", `/api/admin/score-adjustment/${encodeURIComponent(code)}`);
}
