import type { MomentumSnapshot } from "@/lib/api";
import { momentumSummary, type MomentumTone } from "@/lib/plain-language";
import { crore, formatDate } from "@/lib/formatters";
import Card from "@/components/ui/Card";
import Bn from "@/components/i18n/Bn";
import SectionTitle from "@/components/stock/SectionTitle";

interface Props {
  momentum: MomentumSnapshot | null;
}

const TONE_COLOR: Record<MomentumTone, string> = {
  positive: "var(--positive)",
  negative: "var(--negative)",
  watch: "var(--watch)",
  neutral: "var(--text-muted)",
};

function signedPct(v: number | null, decimals = 1): string {
  if (v == null) return "--";
  return `${v >= 0 ? "+" : ""}${v.toFixed(decimals)}%`;
}

export default function MomentumStrip({ momentum }: Props) {
  if (!momentum) return null;
  const summary = momentumSummary(momentum);
  if (!summary) return null;

  const toneColor = TONE_COLOR[summary.tone];
  // A dividend / bonus record date inside the 7-day window (the return is adjusted for it).
  const ca = momentum.corporate_action ?? null;
  const caWhat = ca
    ? [ca.cash_pct ? `${ca.cash_pct}% cash` : null, ca.stock_pct ? `${ca.stock_pct}% bonus` : null]
        .filter(Boolean).join(" + ") || "dividend"
    : "";
  const r7 = momentum.return_7d_pct;
  const rs = momentum.rs_vs_dsex_pct;
  const vr = momentum.volume_ratio;
  const up = momentum.up_days_7d;
  const days = momentum.days_counted;
  const turnover = momentum.avg_turnover_7d_mn;

  const tiles: { label: string; value: string; sub: string; color?: string }[] = [
    {
      label: "Past week",
      value: signedPct(r7),
      sub: "Price move over 7 days",
      color: r7 == null ? undefined : r7 >= 0 ? "var(--positive)" : "var(--negative)",
    },
    {
      label: "Vs market",
      value: signedPct(rs),
      sub: "Ahead/behind the DSEX index",
      color: rs == null ? undefined : rs >= 0 ? "var(--positive)" : "var(--negative)",
    },
    {
      label: "Trading volume",
      value: vr != null ? `${vr.toFixed(1)}×` : "--",
      sub: "vs its normal volume",
      color: vr == null ? undefined : vr >= 1.3 ? "var(--positive)" : vr <= 0.7 ? "var(--watch)" : undefined,
    },
    {
      label: "Up days",
      value: up != null && days != null && days > 0 ? `${up}/${days}` : "--",
      sub: "Green days this week",
    },
  ];

  return (
    <section id="momentum" className="mb-8 stock-anchor">
      <SectionTitle
        title="Recent Momentum"
        sub={<>
            What the share price has been doing over the last week.
        </>}
        bn="গত এক সপ্তাহে শেয়ারের দাম কোন দিকে গেছে।"
      />

      <Card padding="none" className="rounded-xl p-5 mb-4">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center text-sm font-bold px-3 py-1.5 rounded-full"
            style={{
              color: toneColor,
              background: `color-mix(in srgb, ${toneColor} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${toneColor} 35%, transparent)`,
            }}
          >
            {summary.word}
          </span>
        </div>
        <p className="text-sm leading-snug mt-3" style={{ color: "var(--text-muted)" }}>
          {summary.line}
        </p>
        {ca && (
          <div className="mt-3 rounded-xl px-3 py-2.5 text-sm leading-snug" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
            <p>
              Record date {formatDate(ca.record_date)} ({caWhat}) is inside this week. The drop after it is the
              dividend leaving the price, not selling — the move above is adjusted for it
              (unadjusted: {signedPct(ca.raw_return_7d_pct)}).
            </p>
            <Bn className="mt-1">
              এই সপ্তাহে রেকর্ড ডেট ছিল ({caWhat})। এরপর দাম কমা মানে লভ্যাংশ দামের বাইরে যাওয়া, বিক্রির চাপ নয় — ওপরের হিসাব সেটা বাদ দিয়ে।
            </Bn>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <Card key={t.label} padding="none" className="rounded-xl p-4">
            <p
              className="text-xs font-bold uppercase tracking-[0.15em] mb-2"
              style={{ color: "var(--text-muted)" }}
            >
              {t.label}
            </p>
            <p
              className="text-2xl font-bold tabular-nums nums leading-none"
              style={{ color: t.color ?? "var(--text)" }}
            >
              {t.value}
            </p>
            <p className="text-xs mt-2 leading-snug" style={{ color: "var(--text-muted)" }}>
              {t.sub}
            </p>
          </Card>
        ))}
      </div>

      {turnover != null && (
        <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
          Trades around {crore(turnover)} a day on average over the past week.
        </p>
      )}
    </section>
  );
}
