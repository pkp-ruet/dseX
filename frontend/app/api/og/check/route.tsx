import { ImageResponse } from "next/og";
import { getCompanyDetail } from "@/lib/api";
import { getTier, TIER_LABELS, TIER_COLORS } from "@/lib/constants";
import type { CheckKey, Tone } from "@/lib/stock-report";

export const runtime = "edge";

/**
 * One scorecard check of the stock report as a share image (2026-10-28):
 * `/api/og/check?code=SQURPHARMA&k=price`. Shows only what is free on the
 * page — the check's name, its verdict word, the grade — read from the
 * backend (never from the URL, so nobody can print words we didn't say).
 * English only, like every OG route (Satori has no Bengali font here).
 */

const C = {
  bg: "#FAF8F4",
  surface: "#FFFFFF",
  surface2: "#EFEADF",
  border: "#DED6C3",
  text: "#2E2B26",
  muted: "#5C554A",
  clay: "#8F5638",
};
const TONE: Record<Tone, string> = { good: "#047857", fair: "#B45309", bad: "#B91C1C", neutral: "#5C554A" };
const SIZE = { width: 1080, height: 1080 };
const KEYS: CheckKey[] = ["red_flags", "price", "dividend", "this_year", "owners", "cash", "safety", "quality"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") || "").toUpperCase().replace(/[^A-Z0-9&().-]/g, "").slice(0, 20);
  const k = url.searchParams.get("k") as CheckKey | null;
  if (!code || !k || !KEYS.includes(k)) return new Response("Not found", { status: 404 });

  const detail = await getCompanyDetail(code).catch(() => null);
  const check = detail?.report?.scorecard.find((c) => c.key === k);
  if (!detail || !check) return new Response("Not found", { status: 404 });

  const name = detail.profile.company_name ?? code;
  const score = (detail.score_row?.score as number | null) ?? null;
  const tier = getTier(score);
  const color = TONE[check.tone] ?? C.muted;
  const others = (detail.report?.scorecard ?? []).filter((c) => c.key !== k);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: C.bg,
          padding: "72px",
          fontFamily: "sans-serif",
          color: C.text,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: C.clay }}>TopStockBD</div>
          <div style={{ fontSize: 24, color: C.muted }}>Stock report · {code}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 72 }}>
          <div style={{ fontSize: 40, color: C.muted }}>{name}</div>
          <div style={{ fontSize: 34, color: C.muted, marginTop: 40 }}>{check.label.en}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 999, background: color }} />
            <div style={{ fontSize: 120, fontWeight: 800, color, lineHeight: 1 }}>{check.word.en}</div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            marginTop: 64,
            borderTop: `2px solid ${C.border}`,
            paddingTop: 32,
            gap: 20,
          }}
        >
          {others.slice(0, 7).map((o) => (
            <div
              key={o.key}
              style={{
                display: "flex",
                flexDirection: "column",
                width: 290,
                padding: "16px 20px",
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 16,
              }}
            >
              <div style={{ fontSize: 22, color: C.muted }}>{o.label.en}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: TONE[o.tone] ?? C.muted }}>{o.word.en}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", fontSize: 24, color: C.muted }}>
          <span>
            Grade: <b style={{ color: TIER_COLORS[tier], marginLeft: 8 }}>{TIER_LABELS[tier]}</b>
            {score != null ? ` · ${Math.round(score)}/100` : ""}
          </span>
          <span>topstockbd.com/stock/{code}</span>
        </div>
      </div>
    ),
    {
      ...SIZE,
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400" },
    },
  );
}
