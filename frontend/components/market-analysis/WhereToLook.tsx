import type { CSSProperties } from "react";
import type { MarketChanceStock } from "@/lib/api";
import MarketRow, { type RowTone } from "./MarketRow";

function strengthWord(score?: number): string {
  if (score == null) return "Decent";
  if (score >= 75) return "Very strong";
  if (score >= 60) return "Strong";
  return "Decent";
}

interface Lens {
  key: string;
  title: string;
  desc: string;
  descBn: string;
  ico: string;
  color: string;
  render: (s: MarketChanceStock) => { meta: string; tone?: RowTone };
}

const LENSES: Lens[] = [
  {
    key: "on_sale",
    title: "Good companies on sale",
    desc: "Strong companies that cost less than usual.",
    descBn: "ভালো কোম্পানি, দাম এখন কম।",
    ico: "%",
    color: "var(--primary)",
    render: (s) => ({ meta: `${strengthWord(s.score)} · cheap`, tone: "accent" }),
  },
  {
    key: "income",
    title: "Pay you the most cash",
    desc: "They hand out the biggest yearly cash (dividend).",
    descBn: "বছরে সবচেয়ে বেশি নগদ টাকা (ডিভিডেন্ড) দেয়।",
    ico: "৳",
    color: "var(--warm)",
    render: (s) => ({
      meta: s.div_yield_pct != null ? `pays ~${s.div_yield_pct.toFixed(1)}% a year` : "pays well",
      tone: "accent",
    }),
  },
  {
    key: "rising",
    title: "Rising fast now",
    desc: "Going up the most this week.",
    descBn: "এই সপ্তাহে দ্রুত বাড়ছে।",
    ico: "▲",
    color: "var(--positive)",
    render: (s) => ({
      meta: s.ret_1w != null ? `up ${s.ret_1w.toFixed(1)}% this week` : "rising",
      tone: "pos",
    }),
  },
  {
    key: "fallen",
    title: "Cheap after a big fall",
    desc: "Dropped a lot, but still a decent company.",
    descBn: "অনেক পড়েছে, কিন্তু কোম্পানিটা খারাপ না।",
    ico: "↻",
    color: "#6D28D9",
    render: (s) => ({ meta: `${strengthWord(s.score)} · fell hard`, tone: "accent" }),
  },
];

export default function WhereToLook({
  chances,
}: {
  chances: {
    best: string;
    on_sale: MarketChanceStock[];
    income: MarketChanceStock[];
    rising: MarketChanceStock[];
    fallen: MarketChanceStock[];
  };
}) {
  return (
    <div className="intel-grid">
      {LENSES.map((lens) => {
        const items = (chances[lens.key as keyof typeof chances] as MarketChanceStock[]) ?? [];
        const isBest = chances.best === lens.key;
        return (
          <div
            key={lens.key}
            className={`ms-lens-card${isBest ? " ms-lens-card--best" : ""}`}
            style={{ "--lens": lens.color } as CSSProperties}
          >
            {isBest && <span className="ms-lens-best">★ Best now</span>}
            <div className="ms-lens-head">
              <span className="ms-lens-ico" aria-hidden="true">
                {lens.ico}
              </span>
              <p className="ms-lens-title">{lens.title}</p>
            </div>
            <p className="ms-lens-desc">{lens.desc}</p>
            <p lang="bn" className="font-bn ms-lens-desc-bn">
              {lens.descBn}
            </p>
            {items.length === 0 ? (
              <p className="ms-empty">Nothing fits right now.</p>
            ) : (
              <div className="ms-srow-list">
                {items.map((s) => {
                  const { meta, tone } = lens.render(s);
                  return (
                    <MarketRow
                      key={s.trading_code}
                      code={s.trading_code}
                      name={s.company_name}
                      sector={s.sector}
                      price={s.last_price}
                      meta={meta}
                      tone={tone}
                      accent={lens.color}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
