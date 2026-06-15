import type { CSSProperties } from "react";
import Link from "next/link";
import type { MarketChanceStock } from "@/lib/api";

function strengthWord(score?: number): string {
  if (score == null) return "Decent";
  if (score >= 75) return "Very strong";
  if (score >= 60) return "Strong";
  return "Decent";
}

function Row({ s, meta, metaClass }: { s: MarketChanceStock; meta: string; metaClass?: string }) {
  return (
    <Link className="ms-row" href={`/stock/${s.trading_code}`}>
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span className="ms-code">{s.trading_code}</span>
        {s.company_name && (
          <span
            className="ms-name"
            style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {s.company_name}
          </span>
        )}
      </span>
      <span className={`ms-row-meta ${metaClass ?? ""}`}>{meta}</span>
    </Link>
  );
}

interface Lens {
  key: string;
  title: string;
  desc: string;
  ico: string;
  color: string;
  render: (s: MarketChanceStock) => { meta: string; metaClass?: string };
}

const LENSES: Lens[] = [
  {
    key: "on_sale",
    title: "Good companies on sale",
    desc: "Strong companies that cost less than usual.",
    ico: "%",
    color: "var(--primary)",
    render: (s) => ({ meta: `${strengthWord(s.score)} · cheap` }),
  },
  {
    key: "income",
    title: "Pay you the most cash",
    desc: "They hand out the biggest yearly cash (dividend).",
    ico: "৳",
    color: "var(--warm)",
    render: (s) => ({
      meta: s.div_yield_pct != null ? `pays ~${s.div_yield_pct.toFixed(1)}% a year` : "pays well",
    }),
  },
  {
    key: "rising",
    title: "Rising fast now",
    desc: "Going up the most this week.",
    ico: "▲",
    color: "var(--positive)",
    render: (s) => ({
      meta: s.ret_1w != null ? `up ${s.ret_1w.toFixed(1)}% this week` : "rising",
      metaClass: "ms-pos",
    }),
  },
  {
    key: "fallen",
    title: "Cheap after a big fall",
    desc: "Dropped a lot, but still a decent company.",
    ico: "↻",
    color: "#6D28D9",
    render: (s) => ({ meta: `${strengthWord(s.score)} · fell hard` }),
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
          <div key={lens.key} className={`ms-lens-card${isBest ? " ms-lens-card--best" : ""}`}>
            {isBest && <span className="ms-lens-best">★ Best now</span>}
            <div className="ms-lens-head">
              <span
                className="ms-lens-ico"
                aria-hidden="true"
                style={
                  {
                    background: `color-mix(in srgb, ${lens.color} 14%, var(--surface))`,
                    color: lens.color,
                  } as CSSProperties
                }
              >
                {lens.ico}
              </span>
              <p className="ms-lens-title">{lens.title}</p>
            </div>
            <p className="ms-lens-desc">{lens.desc}</p>
            {items.length === 0 ? (
              <p className="ms-empty">Nothing fits right now.</p>
            ) : (
              items.map((s) => {
                const { meta, metaClass } = lens.render(s);
                return <Row key={s.trading_code} s={s} meta={meta} metaClass={metaClass} />;
              })
            )}
          </div>
        );
      })}
    </div>
  );
}
