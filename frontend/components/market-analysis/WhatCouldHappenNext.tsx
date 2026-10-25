import type { ReactNode } from "react";
import type {
  MarketChanceStock,
  MarketTurningStock,
  MarketUnusualStock,
} from "@/lib/api";
import MarketRow from "./MarketRow";
import MkCard from "./MkCard";
import ShowMore from "./ShowMore";

/** Rows shown before the "See all" button. */
const ROWS = 3;

/** One list card: title, Bengali line, one muted note, three rows + "See all". */
function ListCard({
  title,
  bn,
  note,
  empty,
  rows,
}: {
  title: string;
  bn: string;
  note: string;
  empty: string;
  rows: ReactNode[];
}) {
  return (
    <MkCard title={title} bn={bn} note={note}>
      {rows.length === 0 ? (
        <p className="mk-empty">{empty}</p>
      ) : (
        <ShowMore initial={ROWS} rows={rows} className="mk-rows" />
      )}
    </MkCard>
  );
}

/**
 * Section 3, "Stocks to watch next": four lists in two pairs — unusual buying
 * and fast risers (things moving now), then near the yearly high and low
 * (things at an edge). Free: these are price facts DSE publishes anyway.
 */
export default function WhatCouldHappenNext({
  unusual,
  rising,
  nearHigh,
  nearLow,
}: {
  unusual: MarketUnusualStock[];
  rising: MarketChanceStock[];
  nearHigh: MarketTurningStock[];
  nearLow: MarketTurningStock[];
}) {
  return (
    <div className="mk-stack">
      <div className="mk-pair">
        <ListCard
          title="Unusual buying today"
          bn="আজ অস্বাভাবিক কেনাকাটা"
          note="Far more people than usual are buying these — something may be happening."
          empty="Nothing unusual today — trading looks normal."
          rows={unusual.map((it) => (
            <MarketRow
              key={it.trading_code}
              code={it.trading_code}
              name={it.company_name}
              sector={it.sector}
              price={it.last_price}
              meta={`${it.volume_ratio}× usual${it.change_pct != null ? ` · up ${it.change_pct.toFixed(1)}%` : ""}`}
              tone="pos"
            />
          ))}
        />
        <ListCard
          title="Rising fast this week"
          bn="এই সপ্তাহে দ্রুত বাড়ছে"
          note="Up the most in a week, with real trading behind it. Fast risers can fall just as fast."
          empty="Nothing rising fast this week."
          rows={rising.map((s) => (
            <MarketRow
              key={s.trading_code}
              code={s.trading_code}
              name={s.company_name}
              sector={s.sector}
              price={s.last_price}
              meta={s.ret_1w != null ? `up ${s.ret_1w.toFixed(1)}% this week` : "rising"}
              tone="pos"
            />
          ))}
        />
      </div>

      <div className="mk-pair">
        <ListCard
          title="Near a one-year high"
          bn="এক বছরের সর্বোচ্চ দামের কাছে"
          note="They might keep rising, or slip back."
          empty="Nothing close right now."
          rows={nearHigh.map((it) => (
            <MarketRow
              key={it.trading_code}
              code={it.trading_code}
              name={it.company_name}
              sector={it.sector}
              price={it.last_price}
              meta={`${it.gap_pct.toFixed(1)}% from its high`}
              tone="pos"
            />
          ))}
        />
        <ListCard
          title="Near a one-year low"
          bn="এক বছরের সর্বনিম্ন দামের কাছে"
          note="They might bounce, or keep falling."
          empty="Nothing close right now."
          rows={nearLow.map((it) => (
            <MarketRow
              key={it.trading_code}
              code={it.trading_code}
              name={it.company_name}
              sector={it.sector}
              price={it.last_price}
              meta={`${it.gap_pct.toFixed(1)}% from its low`}
              tone="neg"
            />
          ))}
        />
      </div>
    </div>
  );
}
