import { ImageResponse } from "next/og";
import { getScores, getCompanyDetail, getDseToday, getTop20 } from "@/lib/api";
import { getTier, TIER_LABELS, TIER_COLORS } from "@/lib/constants";
import type { ScoreItem, Top20Item } from "@/lib/api";

export const runtime = "edge";

const SIZE = { width: 1080, height: 1080 };
const PORTRAIT = { width: 1080, height: 1350 };
const COLORS = {
  primary: "#1A6B5A",
  accent: "#E07A5F",
  bg: "#FEFDF7",
  text: "#0D0A04",
  muted: "#6B7280",
  surface: "#F3F0E8",
  positive: "#4CAF7D",
  negative: "#D45B5B",
};

const URL_TEXT = "topstockbd.com";

function todayDhakaLabel(): string {
  return new Date().toLocaleDateString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `Tk ${n.toFixed(2)}`;
}

function fmtChangePct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n >= 0 ? "+" : "-";
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

function changeColor(n: number | null | undefined): string {
  if (n == null) return COLORS.muted;
  return n >= 0 ? COLORS.positive : COLORS.negative;
}

// ---- Shared chrome ----
function Header() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 0 24px 0",
        borderBottom: `1px solid ${COLORS.surface}`,
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: "serif",
          fontSize: 40,
          fontWeight: 800,
          color: COLORS.primary,
          letterSpacing: -0.5,
        }}
      >
        TopStockBD
      </div>
      <div
        style={{
          display: "flex",
          background: COLORS.primary,
          color: "white",
          fontSize: 22,
          fontWeight: 700,
          padding: "10px 20px",
          borderRadius: 999,
          letterSpacing: 0.3,
        }}
      >
        {URL_TEXT}
      </div>
    </div>
  );
}

function Footer({ tagline }: { tagline: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: "auto",
        padding: "20px 0 0 0",
        borderTop: `1px solid ${COLORS.surface}`,
      }}
    >
      <div style={{ display: "flex", fontSize: 22, color: COLORS.muted }}>
        {tagline}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 22,
          fontWeight: 700,
          color: COLORS.primary,
        }}
      >
        {URL_TEXT}
      </div>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: COLORS.bg,
        padding: "50px",
        fontFamily: "sans-serif",
        borderTop: `12px solid ${COLORS.primary}`,
      }}
    >
      {children}
    </div>
  );
}

// ---- Template: rankings ----
async function RenderRankings() {
  let top: ScoreItem[] = [];
  try {
    const data = await getScores();
    top = data.tiers.strong_buy.slice(0, 5);
  } catch {
    top = [];
  }

  return (
    <Frame>
      <Header />
      <div style={{ display: "flex", flexDirection: "column", marginTop: 32 }}>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: COLORS.accent,
            fontWeight: 700,
            letterSpacing: 2,
            marginBottom: 8,
          }}
        >
          DSEF RANKINGS · {todayDhakaLabel().toUpperCase()}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 56,
            fontWeight: 800,
            color: COLORS.text,
            lineHeight: 1.05,
          }}
        >
          Top 5 Strong Buy Stocks
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: COLORS.muted,
            marginTop: 8,
          }}
        >
          Ranked by our 5-pillar fundamentals score (0–100)
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 36,
          gap: 14,
        }}
      >
        {top.length === 0 && (
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: COLORS.muted,
              padding: "40px 20px",
            }}
          >
            Rankings unavailable right now.
          </div>
        )}
        {top.map((s, i) => {
          const tier = getTier(s.score);
          const tierColor = TIER_COLORS[tier];
          return (
            <div
              key={s.trading_code}
              style={{
                display: "flex",
                alignItems: "center",
                background: "white",
                border: `1px solid ${COLORS.surface}`,
                borderRadius: 16,
                padding: "18px 24px",
                gap: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 56,
                  height: 56,
                  background: COLORS.primary,
                  color: "white",
                  fontSize: 28,
                  fontWeight: 800,
                  borderRadius: 12,
                }}
              >
                {i + 1}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 36,
                    fontWeight: 800,
                    color: COLORS.text,
                    lineHeight: 1.1,
                  }}
                >
                  {s.trading_code}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 18,
                    color: COLORS.muted,
                    marginTop: 2,
                  }}
                >
                  {s.sector ?? "—"}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  marginRight: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 14,
                    color: COLORS.muted,
                  }}
                >
                  Price
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 26,
                    fontWeight: 700,
                    color: COLORS.text,
                  }}
                >
                  {fmtPrice(s.ltp)}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  background: `${tierColor}22`,
                  border: `2px solid ${tierColor}`,
                  borderRadius: 12,
                  padding: "8px 18px",
                  minWidth: 96,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 30,
                    fontWeight: 800,
                    color: COLORS.text,
                  }}
                >
                  {s.score != null ? s.score.toFixed(1) : "—"}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 12,
                    fontWeight: 700,
                    color: COLORS.text,
                    letterSpacing: 0.5,
                  }}
                >
                  {TIER_LABELS[tier].toUpperCase()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Footer tagline="Smart picks for Dhaka Stock Exchange" />
    </Frame>
  );
}

// ---- Template: stock ----
function PillarBar({ label, value }: { label: string; value: number }) {
  const clamped = Math.max(0, Math.min(25, value));
  const pct = (clamped / 25) * 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 18,
            fontWeight: 700,
            color: COLORS.text,
          }}
        >
          {label}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 16,
            color: COLORS.muted,
            fontWeight: 600,
          }}
        >
          {clamped.toFixed(1)}/25
        </div>
      </div>
      <div
        style={{
          display: "flex",
          width: "100%",
          height: 14,
          background: COLORS.surface,
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            width: `${pct}%`,
            height: "100%",
            background: COLORS.primary,
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}

async function RenderStock(code: string) {
  const cleanCode = code.toUpperCase();
  const detail = await getCompanyDetail(cleanCode).catch(() => null);

  if (!detail) {
    return (
      <Frame>
        <Header />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 56,
              fontWeight: 800,
              color: COLORS.text,
              marginBottom: 16,
            }}
          >
            Stock not found
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: COLORS.muted,
            }}
          >
            We couldn’t load data for “{cleanCode}”.
          </div>
        </div>
        <Footer tagline="Smart picks for Dhaka Stock Exchange" />
      </Frame>
    );
  }

  const name = detail.profile.company_name ?? cleanCode;
  const sector = detail.profile.sector;
  const score = (detail.score_row?.score as number | null | undefined) ?? null;
  const ltp = detail.latest_price.ltp;
  const cp = detail.latest_price.change_pct;
  const tier = getTier(score);
  const tierColor = TIER_COLORS[tier];
  const tierLabel = TIER_LABELS[tier];

  const p1 = (detail.score_row?.p1_biz as number | null | undefined) ?? 0;
  const p2 = (detail.score_row?.p2_health as number | null | undefined) ?? 0;
  const p3 = (detail.score_row?.p3_moat as number | null | undefined) ?? 0;
  const p4 = (detail.score_row?.p4_val as number | null | undefined) ?? 0;

  const greens = (detail.signal_flags?.green ?? []).slice(0, 2);

  return (
    <Frame>
      <Header />

      <div
        style={{
          display: "flex",
          marginTop: 28,
          alignItems: "flex-start",
          gap: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 18,
              color: COLORS.accent,
              fontWeight: 700,
              letterSpacing: 2,
              marginBottom: 4,
            }}
          >
            STOCK SPOTLIGHT
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "serif",
              fontSize: 92,
              fontWeight: 800,
              color: COLORS.text,
              lineHeight: 1,
              letterSpacing: -1,
            }}
          >
            {cleanCode}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: COLORS.muted,
              marginTop: 8,
              maxWidth: 560,
            }}
          >
            {name}
          </div>
          {sector && (
            <div
              style={{
                display: "flex",
                fontSize: 16,
                color: COLORS.text,
                background: COLORS.surface,
                padding: "6px 14px",
                borderRadius: 999,
                marginTop: 10,
                fontWeight: 600,
              }}
            >
              {sector}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: `${tierColor}22`,
            border: `3px solid ${tierColor}`,
            borderRadius: 20,
            padding: "20px 28px",
            minWidth: 200,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 14,
              color: COLORS.muted,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            DSEF SCORE
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 84,
              fontWeight: 800,
              color: COLORS.text,
              lineHeight: 1,
              marginTop: 4,
            }}
          >
            {score != null ? score.toFixed(1) : "—"}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              fontWeight: 800,
              color: COLORS.text,
              marginTop: 6,
              letterSpacing: 0.5,
            }}
          >
            {tierLabel.toUpperCase()}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 32,
          gap: 24,
          alignItems: "center",
          background: "white",
          border: `1px solid ${COLORS.surface}`,
          borderRadius: 16,
          padding: "20px 28px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 16,
              color: COLORS.muted,
              fontWeight: 600,
            }}
          >
            Last Price
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 44,
              fontWeight: 800,
              color: COLORS.text,
              lineHeight: 1.1,
            }}
          >
            {fmtPrice(ltp)}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 16,
              color: COLORS.muted,
              fontWeight: 600,
            }}
          >
            Today
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 44,
              fontWeight: 800,
              color: changeColor(cp),
              lineHeight: 1.1,
            }}
          >
            {fmtChangePct(cp)}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 28,
          gap: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 18,
            color: COLORS.muted,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          PILLAR BREAKDOWN
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          <PillarBar label="Biz" value={Number(p1) || 0} />
          <PillarBar label="Health" value={Number(p2) || 0} />
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          <PillarBar label="Moat" value={Number(p3) || 0} />
          <PillarBar label="Val" value={Number(p4) || 0} />
        </div>
      </div>

      {greens.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 24,
            gap: 8,
          }}
        >
          {greens.map((g) => (
            <div
              key={g}
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: 20,
                color: COLORS.text,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 12,
                  height: 12,
                  background: COLORS.positive,
                  borderRadius: 999,
                  marginRight: 12,
                }}
              />
              {g}
            </div>
          ))}
        </div>
      )}

      <Footer tagline={`Full analysis · ${URL_TEXT}/stock/${cleanCode}`} />
    </Frame>
  );
}

// ---- Template: market ----
async function RenderMarket() {
  const data = await getDseToday().catch(() => null);
  const h = data?.header;
  const movers = data?.movers;

  const dsex = h?.dsex ?? null;
  const dsexCp = h?.dsex_change_pct ?? null;
  const ds30 = h?.ds30 ?? null;
  const dses = h?.dses ?? null;
  const up = h?.up_count ?? 0;
  const down = h?.down_count ?? 0;
  const flat = h?.neutral_count ?? 0;
  const totalValue = h?.total_value_mn ?? null;

  const topGainer = movers?.gainers?.[0] ?? null;
  const topLoser = movers?.losers?.[0] ?? null;

  return (
    <Frame>
      <Header />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                color: COLORS.accent,
                fontWeight: 700,
                letterSpacing: 2,
                marginBottom: 4,
              }}
            >
              DSE MARKET TODAY
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 52,
                fontWeight: 800,
                color: COLORS.text,
                lineHeight: 1.05,
              }}
            >
              {todayDhakaLabel()}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 28,
          background: "white",
          border: `1px solid ${COLORS.surface}`,
          borderRadius: 20,
          padding: "28px 32px",
          alignItems: "center",
          gap: 32,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              color: COLORS.muted,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            DSEX
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 88,
              fontWeight: 800,
              color: COLORS.text,
              lineHeight: 1,
            }}
          >
            {dsex != null ? dsex.toFixed(2) : "—"}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 800,
              color: changeColor(dsexCp),
              marginTop: 6,
            }}
          >
            {fmtChangePct(dsexCp)}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minWidth: 280,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 22,
            }}
          >
            <div
              style={{ display: "flex", color: COLORS.muted, fontWeight: 600 }}
            >
              DS30
            </div>
            <div
              style={{
                display: "flex",
                color: COLORS.text,
                fontWeight: 700,
              }}
            >
              {ds30 != null ? ds30.toFixed(2) : "—"}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 22,
            }}
          >
            <div
              style={{ display: "flex", color: COLORS.muted, fontWeight: 600 }}
            >
              DSES
            </div>
            <div
              style={{
                display: "flex",
                color: COLORS.text,
                fontWeight: 700,
              }}
            >
              {dses != null ? dses.toFixed(2) : "—"}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 22,
            }}
          >
            <div
              style={{ display: "flex", color: COLORS.muted, fontWeight: 600 }}
            >
              Turnover
            </div>
            <div
              style={{
                display: "flex",
                color: COLORS.text,
                fontWeight: 700,
              }}
            >
              {totalValue != null
                ? `Tk ${(totalValue / 10).toFixed(1)} Cr`
                : "—"}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 24,
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: 1,
            background: `${COLORS.positive}22`,
            border: `2px solid ${COLORS.positive}`,
            borderRadius: 16,
            padding: "16px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 18,
              color: COLORS.muted,
              fontWeight: 700,
            }}
          >
            ADVANCED
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 56,
              fontWeight: 800,
              color: COLORS.positive,
            }}
          >
            {up}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: 1,
            background: `${COLORS.negative}22`,
            border: `2px solid ${COLORS.negative}`,
            borderRadius: 16,
            padding: "16px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 18,
              color: COLORS.muted,
              fontWeight: 700,
            }}
          >
            DECLINED
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 56,
              fontWeight: 800,
              color: COLORS.negative,
            }}
          >
            {down}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: 1,
            background: COLORS.surface,
            border: `2px solid ${COLORS.muted}`,
            borderRadius: 16,
            padding: "16px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 18,
              color: COLORS.muted,
              fontWeight: 700,
            }}
          >
            UNCHANGED
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 56,
              fontWeight: 800,
              color: COLORS.muted,
            }}
          >
            {flat}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 24,
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            background: "white",
            border: `1px solid ${COLORS.surface}`,
            borderRadius: 16,
            padding: "18px 24px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 16,
              color: COLORS.muted,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            TOP GAINER
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 800,
              color: COLORS.text,
              marginTop: 4,
            }}
          >
            {topGainer?.trading_code ?? "—"}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.positive,
              marginTop: 2,
            }}
          >
            {fmtChangePct(topGainer?.change_pct ?? null)}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            background: "white",
            border: `1px solid ${COLORS.surface}`,
            borderRadius: 16,
            padding: "18px 24px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 16,
              color: COLORS.muted,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            TOP LOSER
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 800,
              color: COLORS.text,
              marginTop: 4,
            }}
          >
            {topLoser?.trading_code ?? "—"}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.negative,
              marginTop: 2,
            }}
          >
            {fmtChangePct(topLoser?.change_pct ?? null)}
          </div>
        </div>
      </div>

      <Footer tagline="Live market dashboard · topstockbd.com" />
    </Frame>
  );
}

// ---- Template: portfolio ----
type MockHolding = {
  code: string;
  shares: number;
  avg: number;
  current: number;
};

const MOCK_HOLDINGS: MockHolding[] = [
  { code: "GP",         shares: 200, avg: 295.0, current: 332.5 },
  { code: "BEXIMCO",    shares: 500, avg: 118.0, current: 134.2 },
  { code: "SQURPHARMA", shares: 100, avg: 218.0, current: 247.8 },
];

function RenderPortfolio() {
  const rows = MOCK_HOLDINGS.map((h) => {
    const cost = h.shares * h.avg;
    const value = h.shares * h.current;
    const pnl = value - cost;
    const pnlPct = (pnl / cost) * 100;
    return { ...h, cost, value, pnl, pnlPct };
  });
  const totalCost = rows.reduce((a, r) => a + r.cost, 0);
  const totalValue = rows.reduce((a, r) => a + r.value, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = (totalPnl / totalCost) * 100;

  return (
    <Frame>
      <Header />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: COLORS.accent,
            fontWeight: 700,
            letterSpacing: 2,
            marginBottom: 6,
          }}
        >
          PORTFOLIO TRACKER
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 56,
            fontWeight: 800,
            color: COLORS.text,
            lineHeight: 1.05,
          }}
        >
          Track every holding.
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 26,
            color: COLORS.muted,
            marginTop: 8,
          }}
        >
          Live P&amp;L on every DSE stock you own — free.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 28,
          background: "white",
          border: `1px solid ${COLORS.surface}`,
          borderRadius: 20,
          padding: "20px 24px",
          gap: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 16,
            color: COLORS.muted,
            fontWeight: 700,
            letterSpacing: 1,
            paddingBottom: 8,
            borderBottom: `1px solid ${COLORS.surface}`,
          }}
        >
          <div style={{ display: "flex", flex: 2 }}>STOCK</div>
          <div style={{ display: "flex", flex: 1, justifyContent: "flex-end" }}>
            SHARES
          </div>
          <div style={{ display: "flex", flex: 1, justifyContent: "flex-end" }}>
            AVG
          </div>
          <div style={{ display: "flex", flex: 1, justifyContent: "flex-end" }}>
            NOW
          </div>
          <div
            style={{
              display: "flex",
              flex: 1.2,
              justifyContent: "flex-end",
            }}
          >
            RETURN
          </div>
        </div>
        {rows.map((r) => (
          <div
            key={r.code}
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 26,
              fontWeight: 700,
              color: COLORS.text,
            }}
          >
            <div style={{ display: "flex", flex: 2 }}>{r.code}</div>
            <div
              style={{
                display: "flex",
                flex: 1,
                justifyContent: "flex-end",
                color: COLORS.muted,
                fontWeight: 600,
              }}
            >
              {r.shares}
            </div>
            <div
              style={{
                display: "flex",
                flex: 1,
                justifyContent: "flex-end",
                color: COLORS.muted,
                fontWeight: 600,
              }}
            >
              Tk {r.avg.toFixed(1)}
            </div>
            <div
              style={{
                display: "flex",
                flex: 1,
                justifyContent: "flex-end",
              }}
            >
              Tk {r.current.toFixed(1)}
            </div>
            <div
              style={{
                display: "flex",
                flex: 1.2,
                justifyContent: "flex-end",
                color: r.pnlPct >= 0 ? COLORS.positive : COLORS.negative,
                fontWeight: 800,
              }}
            >
              {r.pnlPct >= 0 ? "+" : ""}
              {r.pnlPct.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 24,
          background: COLORS.primary,
          borderRadius: 20,
          padding: "24px 32px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              color: "white",
              opacity: 0.85,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            TOTAL RETURN
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 56,
              fontWeight: 800,
              color: "white",
              lineHeight: 1,
              marginTop: 4,
            }}
          >
            +{totalPnlPct.toFixed(1)}%
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 18,
              color: "white",
              opacity: 0.85,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            UNREALIZED P&amp;L
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 48,
              fontWeight: 800,
              color: "white",
              lineHeight: 1,
              marginTop: 4,
            }}
          >
            +Tk {totalPnl.toLocaleString("en-US")}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 24,
          color: COLORS.text,
          marginTop: 20,
          fontWeight: 700,
        }}
      >
        Free portfolio tracker → topstockbd.com/portfolio
      </div>

      <Footer tagline="Smart picks for Dhaka Stock Exchange" />
    </Frame>
  );
}

// ---- Template: top-ranked (portrait, bold & colorful) ----
async function RenderTopRanked() {
  let ranked: ScoreItem[] = [];
  try {
    const data = await getScores();
    ranked = [
      ...data.tiers.strong_buy,
      ...data.tiers.safe_buy,
      ...data.tiers.watch,
      ...data.tiers.avoid,
    ]
      .filter((s) => s.score != null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  } catch {
    ranked = [];
  }
  const top = ranked.slice(0, 10);

  // Gold / silver / bronze podium; quiet neutral badge for the rest.
  const rankStyle = (i: number): { bg: string; fg: string } => {
    if (i === 0) return { bg: "linear-gradient(135deg,#F59E0B,#D97706)", fg: "white" };
    if (i === 1) return { bg: "linear-gradient(135deg,#94A3B8,#64748B)", fg: "white" };
    if (i === 2) return { bg: "linear-gradient(135deg,#B45309,#92400E)", fg: "white" };
    return { bg: "linear-gradient(135deg,#F1F5F9,#E2E8F0)", fg: "#475569" };
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundImage: "linear-gradient(180deg,#ECFEFF 0%,#FFFFFF 38%)",
        fontFamily: "sans-serif",
      }}
    >
      {/* Hero */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          padding: "36px 52px 32px 52px",
          backgroundImage:
            "linear-gradient(135deg,#0E7268 0%,#14B8A6 60%,#2DD4BF 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: -130,
            right: -80,
            width: 320,
            height: 320,
            borderRadius: 999,
            background: "rgba(255,255,255,0.10)",
          }}
        />

        <div
          style={{
            display: "flex",
            fontSize: 56,
            fontWeight: 800,
            color: "white",
            lineHeight: 1.0,
            letterSpacing: -1.2,
          }}
        >
          Top Ranked DSE Stocks
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 23,
            fontWeight: 500,
            color: "rgba(255,255,255,0.82)",
            marginTop: 10,
            letterSpacing: 0.3,
          }}
        >
          by fundamental analysis
        </div>

        <div style={{ display: "flex", marginTop: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "white",
              borderRadius: 999,
              padding: "9px 24px",
              fontSize: 32,
              fontWeight: 800,
              color: "#0F766E",
              boxShadow: "0 8px 20px rgba(2,6,23,0.18)",
            }}
          >
            topstockbd.com
          </div>
        </div>
      </div>

      {/* Ranking list */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "space-between",
          padding: "18px 40px 16px 40px",
        }}
      >
        {top.length === 0 && (
          <div
            style={{ display: "flex", fontSize: 28, color: "#64748B", padding: 40 }}
          >
            Rankings unavailable right now.
          </div>
        )}

        {top.map((s, i) => (
          <div
            key={s.trading_code}
            style={{
              display: "flex",
              alignItems: "center",
              background: "white",
              borderRadius: 20,
              padding: "11px 24px",
              border: "1px solid #EEF2F6",
              boxShadow: "0 6px 18px rgba(2,6,23,0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 56,
                height: 56,
                borderRadius: 15,
                backgroundImage: rankStyle(i).bg,
                color: rankStyle(i).fg,
                fontSize: 28,
                fontWeight: 800,
              }}
            >
              {i + 1}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minWidth: 0,
                marginLeft: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 34,
                  fontWeight: 800,
                  color: "#0F172A",
                  lineHeight: 1.05,
                  letterSpacing: -0.3,
                }}
              >
                {s.trading_code}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 18,
                  fontWeight: 500,
                  color: "#475569",
                  marginTop: 4,
                  maxWidth: 520,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {s.company_name ?? s.trading_code}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                background: "#ECFDF5",
                border: "1px solid #A7F3D0",
                borderRadius: 12,
                padding: "9px 16px",
                fontSize: 32,
                fontWeight: 800,
                color: "#0F766E",
              }}
            >
              {fmtPrice(s.ltp)}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "6px 40px 34px 40px",
        }}
      >
        {top.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundImage: "linear-gradient(135deg,#0F766E,#14B8A6)",
              borderRadius: 999,
              padding: "17px",
              fontSize: 27,
              fontWeight: 800,
              color: "white",
              boxShadow: "0 8px 22px rgba(13,148,136,0.32)",
            }}
          >
            Visit topstockbd.com for full ranking  →
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Template: top-20 (portrait, DSE Top 20 momentum, top 5) ----
async function RenderTop20() {
  let items: Top20Item[] = [];
  try {
    const data = await getTop20();
    items = data.items ?? [];
  } catch {
    items = [];
  }
  const top = items.slice(0, 5);

  const rankBg = (i: number): string => {
    if (i === 0) return "linear-gradient(135deg,#F59E0B,#D97706)";
    if (i === 1) return "linear-gradient(135deg,#94A3B8,#64748B)";
    if (i === 2) return "linear-gradient(135deg,#B45309,#92400E)";
    return "linear-gradient(135deg,#2DD4BF,#0D9488)";
  };

  const retStyle = (n: number | null): { fg: string; bg: string } => {
    if (n == null) return { fg: "#475569", bg: "#F1F5F9" };
    if (n >= 0) return { fg: "#15803D", bg: "#DCFCE7" };
    return { fg: "#DC2626", bg: "#FEE2E2" };
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundImage: "linear-gradient(180deg,#ECFEFF 0%,#FFFFFF 38%)",
        fontFamily: "sans-serif",
      }}
    >
      {/* Hero */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          padding: "30px 52px 26px 52px",
          backgroundImage:
            "linear-gradient(135deg,#0F766E 0%,#14B8A6 52%,#22D3EE 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: -120,
            right: -70,
            width: 300,
            height: 300,
            borderRadius: 999,
            background: "rgba(255,255,255,0.13)",
          }}
        />

        <div
          style={{
            display: "flex",
            fontSize: 78,
            fontWeight: 800,
            color: "white",
            lineHeight: 1.0,
            letterSpacing: -2,
          }}
        >
          DSE Top 20
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 23,
            color: "rgba(255,255,255,0.85)",
            marginTop: 8,
          }}
        >
          Ranked by the TopStockBD Momentum Score
        </div>

        <div style={{ display: "flex", alignItems: "center", marginTop: 16 }}>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "rgba(255,255,255,0.8)",
              marginRight: 12,
            }}
          >
            by
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "white",
              borderRadius: 999,
              padding: "9px 24px",
              fontSize: 34,
              fontWeight: 800,
              color: "#0F766E",
              boxShadow: "0 6px 18px rgba(0,0,0,0.16)",
            }}
          >
            topstockbd.com
          </div>
        </div>
      </div>

      {/* Top 5 movers */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "space-between",
          padding: "20px 40px 18px 40px",
        }}
      >
        {top.length === 0 && (
          <div
            style={{ display: "flex", fontSize: 28, color: "#64748B", padding: 40 }}
          >
            Top 20 unavailable right now.
          </div>
        )}

        {top.map((item, i) => {
          const ret = item.return_7d_pct;
          const rs = retStyle(ret);
          const chips: { text: string; fg: string; bg: string }[] = [];
          if (item.rs_vs_dsex_pct != null && Math.abs(item.rs_vs_dsex_pct) >= 0.5)
            chips.push({
              text: `${item.rs_vs_dsex_pct > 0 ? "+" : ""}${item.rs_vs_dsex_pct.toFixed(1)}% vs DSEX`,
              fg: "#4338CA",
              bg: "#E0E7FF",
            });
          if (item.volume_ratio != null && item.volume_ratio >= 1.3)
            chips.push({
              text: `${item.volume_ratio.toFixed(1)}x volume`,
              fg: "#B45309",
              bg: "#FEF3C7",
            });
          if (item.days_counted > 0)
            chips.push({
              text: `${item.up_days_7d}/${item.days_counted} up days`,
              fg: "#15803D",
              bg: "#DCFCE7",
            });
          if (chips.length === 0)
            chips.push({ text: "Strong momentum pick", fg: "#475569", bg: "#F1F5F9" });
          return (
            <div
              key={item.trading_code}
              style={{
                display: "flex",
                alignItems: "center",
                background: "white",
                borderRadius: 20,
                padding: "30px 26px",
                border: "1px solid #E3F2EF",
                boxShadow: "0 3px 12px rgba(13,148,136,0.10)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  backgroundImage: rankBg(i),
                  color: "white",
                  fontSize: 32,
                  fontWeight: 800,
                }}
              >
                {item.rank}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  minWidth: 0,
                  marginLeft: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 40,
                    fontWeight: 800,
                    color: "#0F172A",
                    lineHeight: 1.05,
                  }}
                >
                  {item.trading_code}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 18,
                    color: "#64748B",
                    marginTop: 2,
                    maxWidth: 420,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.company_name ?? item.trading_code}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  {chips.map((c) => (
                    <div
                      key={c.text}
                      style={{
                        display: "flex",
                        background: c.bg,
                        color: c.fg,
                        fontSize: 18,
                        fontWeight: 800,
                        padding: "5px 13px",
                        borderRadius: 9,
                      }}
                    >
                      {c.text}
                    </div>
                  ))}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    background: "#0D9488",
                    color: "white",
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: 1,
                    padding: "4px 12px",
                    borderRadius: 7,
                    marginBottom: 7,
                  }}
                >
                  7-DAY RETURN
                </div>
                <div
                  style={{
                    display: "flex",
                    background: rs.bg,
                    color: rs.fg,
                    borderRadius: 12,
                    padding: "6px 14px",
                    fontSize: 30,
                    fontWeight: 800,
                  }}
                >
                  {fmtChangePct(ret)}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 20,
                    color: "#64748B",
                    fontWeight: 600,
                    marginTop: 8,
                  }}
                >
                  {fmtPrice(item.ltp)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "6px 40px 34px 40px",
        }}
      >
        {top.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundImage: "linear-gradient(135deg,#0F766E,#14B8A6)",
              borderRadius: 999,
              padding: "17px",
              fontSize: 27,
              fontWeight: 800,
              color: "white",
              boxShadow: "0 8px 22px rgba(13,148,136,0.32)",
            }}
          >
            Visit topstockbd.com for the full Top 20  →
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Route handler ----
export async function GET(
  req: Request,
  ctx: { params: Promise<{ template: string }> }
) {
  const { template } = await ctx.params;
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") ?? "GP").trim();

  let element: React.ReactElement;
  switch (template) {
    case "rankings":
      element = await RenderRankings();
      break;
    case "top-ranked":
      element = await RenderTopRanked();
      break;
    case "top-20":
      element = await RenderTop20();
      break;
    case "stock":
      element = await RenderStock(code);
      break;
    case "market":
      element = await RenderMarket();
      break;
    case "portfolio":
      element = RenderPortfolio();
      break;
    default:
      return new Response("Unknown template", { status: 404 });
  }

  const size =
    template === "top-ranked" || template === "top-20" ? PORTRAIT : SIZE;
  return new ImageResponse(element, size);
}
