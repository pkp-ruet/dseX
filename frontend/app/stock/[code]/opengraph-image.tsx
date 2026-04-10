import { ImageResponse } from "next/og";
import { getCompanyDetail } from "@/lib/api";
import { getTier, TIER_LABELS, TIER_COLORS } from "@/lib/constants";

export const runtime = "edge";
export const alt = "TopStockBD DSEF Score";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const detail = await getCompanyDetail(code).catch(() => null);

  const name = detail?.profile.company_name ?? code;
  const sector = detail?.profile.sector ?? null;
  const score = detail?.score_row?.score as number | null ?? null;
  const ltp = detail?.latest_price.ltp ?? null;
  const changePct = detail?.latest_price.change_pct as number | null ?? null;
  const epsYoy = detail?.score_row?.eps_yoy_pct as number | null ?? null;
  const divYield = detail?.score_row?.div_yield_pct as number | null ?? null;
  const tier = getTier(score);
  const tierLabel = TIER_LABELS[tier];
  const tierColor = TIER_COLORS[tier];

  const positive = "#4CAF7D";
  const negative = "#D45B5B";
  const changeColor = changePct != null ? (changePct >= 0 ? positive : negative) : "#6B7280";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#FEFDF7",
          padding: "60px",
          fontFamily: "sans-serif",
          borderTop: "12px solid #1A6B5A",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 20, color: "#1A6B5A", fontWeight: 700, marginBottom: 8 }}>
              TopStockBD
            </div>
            <div style={{ fontSize: 56, fontWeight: 800, color: "#0D0A04", lineHeight: 1.1 }}>
              {code}
            </div>
            <div style={{ fontSize: 24, color: "#6B7280", marginTop: 8 }}>
              {name}
            </div>
            {sector && (
              <div style={{
                fontSize: 14,
                color: "#6B7280",
                marginTop: 8,
                background: "#F3F0E8",
                padding: "4px 12px",
                borderRadius: 999,
                alignSelf: "flex-start",
              }}>
                {sector}
              </div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              background: `${tierColor}18`,
              border: `2px solid ${tierColor}`,
              borderRadius: 16,
              padding: "20px 32px",
            }}
          >
            <div style={{ fontSize: 64, fontWeight: 800, color: tierColor }}>
              {score != null ? score.toFixed(1) : "--"}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: tierColor }}>
              {tierLabel}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 32, marginTop: 48, flexWrap: "wrap" }}>
          {ltp != null && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 14, color: "#6B7280" }}>Last Price</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 28, fontWeight: 700 }}>৳{ltp.toFixed(2)}</span>
                {changePct != null && (
                  <span style={{ fontSize: 18, fontWeight: 600, color: changeColor }}>
                    {changePct >= 0 ? "▲" : "▼"}{Math.abs(changePct).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          )}
          {epsYoy != null && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 14, color: "#6B7280" }}>EPS YoY</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: epsYoy >= 0 ? positive : negative }}>
                {epsYoy >= 0 ? "+" : ""}{epsYoy.toFixed(1)}%
              </div>
            </div>
          )}
          {divYield != null && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 14, color: "#6B7280" }}>Div Yield</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{divYield.toFixed(1)}%</div>
            </div>
          )}
        </div>

        <div style={{ marginTop: "auto", fontSize: 14, color: "#6B7280" }}>
          topstockbd.com · Driven by fundamentals · Dhaka Stock Exchange
        </div>
      </div>
    ),
    size
  );
}
