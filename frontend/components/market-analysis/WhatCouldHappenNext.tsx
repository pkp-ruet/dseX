import type { ReactNode } from "react";
import type {
  MarketChanceStock,
  MarketTurningStock,
  MarketUnusualStock,
} from "@/lib/api";
import MarketRow from "./MarketRow";
import MkCard from "./MkCard";
import ShowMore from "./ShowMore";
import { T } from "@/components/i18n/T";

/** Rows shown before the "See all" button. */
const ROWS = 3;

/** One list card: title, one muted note, three rows + "See all". */
function ListCard({
  title,
  note,
  empty,
  rows,
}: {
  title: ReactNode;
  note: ReactNode;
  empty: ReactNode;
  rows: ReactNode[];
}) {
  return (
    <MkCard title={title} note={note}>
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
          title={<T en="Unusual buying today" bn="আজ অস্বাভাবিক কেনাকাটা" />}
          note={
            <T
              en="Far more people than usual are buying these shares today. Something may be happening."
              bn="আজ স্বাভাবিকের চেয়ে অনেক বেশি মানুষ এই শেয়ারগুলো কিনছেন। কিছু একটা ঘটতে পারে।"
            />
          }
          empty={<T en="Nothing unusual today. Trading looks normal." bn="আজ অস্বাভাবিক কিছু নেই। লেনদেন স্বাভাবিক।" />}
          rows={unusual.map((it) => (
            <MarketRow
              key={it.trading_code}
              code={it.trading_code}
              name={it.company_name}
              sector={it.sector}
              price={it.last_price}
              meta={
                <T
                  en={`${it.volume_ratio}× usual${it.change_pct != null ? ` · up ${it.change_pct.toFixed(1)}%` : ""}`}
                  bn={`স্বাভাবিকের ${it.volume_ratio} গুণ${it.change_pct != null ? ` · ${it.change_pct.toFixed(1)}% বেড়েছে` : ""}`}
                />
              }
              tone="pos"
            />
          ))}
        />
        <ListCard
          title={<T en="Rising fast this week" bn="এ সপ্তাহে দ্রুত বাড়ছে" />}
          note={
            <T
              en="These rose the most this week, with real trading behind the move. Shares that rise fast can fall just as fast."
              bn="এ সপ্তাহে এগুলোর দাম সবচেয়ে বেশি বেড়েছে, আর এর পেছনে আসল লেনদেন আছে। দ্রুত বাড়া শেয়ার দ্রুত কমতেও পারে।"
            />
          }
          empty={<T en="Nothing is rising fast this week." bn="এ সপ্তাহে কোনো শেয়ার দ্রুত বাড়ছে না।" />}
          rows={rising.map((s) => (
            <MarketRow
              key={s.trading_code}
              code={s.trading_code}
              name={s.company_name}
              sector={s.sector}
              price={s.last_price}
              meta={
                s.ret_1w != null ? (
                  <T en={`up ${s.ret_1w.toFixed(1)}% this week`} bn={`এ সপ্তাহে ${s.ret_1w.toFixed(1)}% বেড়েছে`} />
                ) : (
                  <T en="rising" bn="বাড়ছে" />
                )
              }
              tone="pos"
            />
          ))}
        />
      </div>

      <div className="mk-pair">
        <ListCard
          title={<T en="Near the year's highest price" bn="বছরের সর্বোচ্চ দামের কাছে" />}
          note={<T en="They may keep rising, or slip back." bn="এগুলোর দাম আরও বাড়তে পারে, আবার কিছুটা কমেও আসতে পারে।" />}
          empty={<T en="No share is close right now." bn="এখন কোনো শেয়ার এর কাছাকাছি নেই।" />}
          rows={nearHigh.map((it) => (
            <MarketRow
              key={it.trading_code}
              code={it.trading_code}
              name={it.company_name}
              sector={it.sector}
              price={it.last_price}
              meta={<T en={`${it.gap_pct.toFixed(1)}% below its high`} bn={`সর্বোচ্চের ${it.gap_pct.toFixed(1)}% নিচে`} />}
              tone="pos"
            />
          ))}
        />
        <ListCard
          title={<T en="Near the year's lowest price" bn="বছরের সর্বনিম্ন দামের কাছে" />}
          note={<T en="They may recover, or keep falling." bn="এগুলোর দাম ঘুরে দাঁড়াতে পারে, আবার আরও কমতেও পারে।" />}
          empty={<T en="No share is close right now." bn="এখন কোনো শেয়ার এর কাছাকাছি নেই।" />}
          rows={nearLow.map((it) => (
            <MarketRow
              key={it.trading_code}
              code={it.trading_code}
              name={it.company_name}
              sector={it.sector}
              price={it.last_price}
              meta={<T en={`${it.gap_pct.toFixed(1)}% above its low`} bn={`সর্বনিম্নের ${it.gap_pct.toFixed(1)}% ওপরে`} />}
              tone="neg"
            />
          ))}
        />
      </div>
    </div>
  );
}
