import type { MomentumSnapshot } from "@/lib/api";
import { momentumSummary, type Bi, type MomentumTone } from "@/lib/plain-language";
import { crore, formatDate } from "@/lib/formatters";
import { bnDate, croreBn } from "@/lib/bn";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/stock/SectionTitle";
import { T } from "@/components/i18n/T";

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

const tx = (b: Bi) => <T en={b.en} bn={b.bn} />;

export default function MomentumStrip({ momentum }: Props) {
  if (!momentum) return null;
  const summary = momentumSummary(momentum);
  if (!summary) return null;

  const toneColor = TONE_COLOR[summary.tone];
  // A dividend / bonus record date inside the 7-day window (the return is adjusted for it).
  const ca = momentum.corporate_action ?? null;
  const caWhat: Bi = ca
    ? {
        en: [ca.cash_pct ? `${ca.cash_pct}% cash dividend` : null, ca.stock_pct ? `${ca.stock_pct}% bonus shares` : null]
          .filter(Boolean).join(" and ") || "a dividend",
        bn: [ca.cash_pct ? `${ca.cash_pct}% নগদ ডিভিডেন্ড` : null, ca.stock_pct ? `${ca.stock_pct}% বোনাস শেয়ার` : null]
          .filter(Boolean).join(" ও ") || "ডিভিডেন্ড",
      }
    : { en: "", bn: "" };
  const r7 = momentum.return_7d_pct;
  const rs = momentum.rs_vs_dsex_pct;
  const vr = momentum.volume_ratio;
  const up = momentum.up_days_7d;
  const days = momentum.days_counted;
  const turnover = momentum.avg_turnover_7d_mn;

  const tiles: { key: string; label: Bi; value: string; sub: Bi; color?: string }[] = [
    {
      key: "week",
      label: { en: "Past week", bn: "গত সপ্তাহ" },
      value: signedPct(r7),
      sub: { en: "Price change over 7 days", bn: "7 দিনে দামের পরিবর্তন" },
      color: r7 == null ? undefined : r7 >= 0 ? "var(--positive)" : "var(--negative)",
    },
    {
      key: "market",
      label: { en: "Against the market", bn: "বাজারের তুলনায়" },
      value: signedPct(rs),
      sub: { en: "Ahead of or behind the DSEX index", bn: "DSEX সূচকের চেয়ে এগিয়ে বা পিছিয়ে" },
      color: rs == null ? undefined : rs >= 0 ? "var(--positive)" : "var(--negative)",
    },
    {
      key: "volume",
      label: { en: "Trading", bn: "লেনদেন" },
      value: vr != null ? `${vr.toFixed(1)}×` : "--",
      sub: { en: "Compared with its usual amount", bn: "স্বাভাবিক পরিমাণের তুলনায়" },
      color: vr == null ? undefined : vr >= 1.3 ? "var(--positive)" : vr <= 0.7 ? "var(--watch)" : undefined,
    },
    {
      key: "updays",
      label: { en: "Days up", bn: "দাম বাড়ার দিন" },
      value: up != null && days != null && days > 0 ? `${up}/${days}` : "--",
      sub: { en: "Days the price rose this week", bn: "এ সপ্তাহে যত দিন দাম বেড়েছে" },
    },
  ];

  return (
    <section id="momentum" className="mb-8 stock-anchor">
      <SectionTitle
        title={<T en="The past week" bn="গত এক সপ্তাহ" />}
        sub={<T en="How the share price has moved over the last week." bn="গত এক সপ্তাহে শেয়ারের দাম কীভাবে চলেছে।" />}
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
            {tx(summary.word)}
          </span>
        </div>
        <p className="text-sm leading-snug mt-3 text-text-muted">{tx(summary.line)}</p>
        {ca && (
          <div className="mt-3 rounded-xl px-3 py-2.5 text-sm leading-snug" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
            <p>
              <T
                en={`The record date for ${caWhat.en} (${formatDate(ca.record_date)}) fell within this week. The price usually drops after a record date because the dividend leaves the price, not because people are selling. The change above is adjusted for this; without the adjustment it would be ${signedPct(ca.raw_return_7d_pct)}.`}
                bn={`এ সপ্তাহে ${caWhat.bn}-এর রেকর্ড ডেট (${bnDate(ca.record_date) || formatDate(ca.record_date)}) ছিল। রেকর্ড ডেটের পর দাম সাধারণত কমে, কারণ ডিভিডেন্ড দামের বাইরে চলে যায়, বিক্রির চাপে নয়। ওপরের হিসাবে এটি সমন্বয় করা আছে; সমন্বয় ছাড়া পরিবর্তন হতো ${signedPct(ca.raw_return_7d_pct)}।`}
              />
            </p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <Card key={t.key} padding="none" className="rounded-xl p-4">
            <p className="text-xs font-semibold mb-2 text-text-muted">{tx(t.label)}</p>
            <p className="text-2xl font-bold tabular-nums nums leading-none" style={{ color: t.color ?? "var(--text)" }}>
              {t.value}
            </p>
            <p className="text-xs mt-2 leading-snug text-text-muted">{tx(t.sub)}</p>
          </Card>
        ))}
      </div>

      {turnover != null && (
        <p className="text-xs mt-3 text-text-muted">
          <T
            en={`Over the past week, about ${crore(turnover)} of this share was traded each day.`}
            bn={`গত এক সপ্তাহে এই শেয়ারের দৈনিক লেনদেন ছিল গড়ে প্রায় ${croreBn(turnover)}।`}
          />
        </p>
      )}
    </section>
  );
}
