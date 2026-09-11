import type { CSSProperties } from "react";
import Link from "next/link";
import Bn from "@/components/i18n/Bn";
import { IconArrowDown, IconArrowUp, IconSparkle } from "@/components/home/personalized/DashIcons";
import { formatDate } from "@/lib/formatters";
import { isoLocal, recordDateInfo, todayDhaka } from "@/lib/dividend-dates";
import type { MarketTurningStock, MarketDividendEvent, MarketUnusualStock } from "@/lib/api";
import MarketRow, { type RowTone } from "./MarketRow";
import ShowMore from "./ShowMore";

/** Rows shown before the "See all" button. */
const ROWS = 3;

function TurningList({
  title,
  sub,
  items,
  edge,
}: {
  title: string;
  sub: string;
  items: MarketTurningStock[];
  edge: "high" | "low";
}) {
  const accent = edge === "high" ? "var(--positive)" : "var(--warm)";
  return (
    <div className="ms-card ms-card--tint" style={{ "--card-accent": accent } as CSSProperties}>
      <div className="ms-edge-head">
        <span className={`ms-edge-ico ms-edge-ico--${edge === "high" ? "up" : "down"}`} aria-hidden="true">
          {edge === "high" ? <IconArrowUp size={18} /> : <IconArrowDown size={18} />}
        </span>
        <p className="ms-edge-title">{title}</p>
      </div>
      <p className="ms-card-note">{sub}</p>
      {items.length === 0 ? (
        <p className="ms-empty">Nothing close right now.</p>
      ) : (
        <ShowMore
          initial={ROWS}
          rows={items.map((it) => (
            <MarketRow
              key={it.trading_code}
              code={it.trading_code}
              name={it.company_name}
              sector={it.sector}
              price={it.last_price}
              meta={`${it.gap_pct.toFixed(1)}% from its ${edge === "high" ? "high" : "low"}`}
              tone={edge === "high" ? "pos" : "neutral"}
              accent={accent}
            />
          ))}
        />
      )}
    </div>
  );
}

function UnusualBuying({ items }: { items: MarketUnusualStock[] }) {
  return (
    <div className="ms-card ms-card--tint" style={{ "--card-accent": "var(--warm)" } as CSSProperties}>
      <div className="ms-edge-head">
        <span
          className="ms-edge-ico"
          aria-hidden="true"
          style={{ background: "color-mix(in srgb, var(--warm) 16%, var(--surface))", color: "var(--warm-ink)" }}
        >
          <IconSparkle size={18} />
        </span>
        <p className="ms-edge-title">Unusual buying today</p>
      </div>
      <p className="ms-card-note">
        Far more people than usual are buying these — something may be happening.
      </p>
      {items.length === 0 ? (
        <p className="ms-empty">Nothing unusual today — trading looks normal.</p>
      ) : (
        <ShowMore
          initial={ROWS}
          rows={items.map((it) => (
            <MarketRow
              key={it.trading_code}
              code={it.trading_code}
              name={it.company_name}
              sector={it.sector}
              price={it.last_price}
              meta={`${it.volume_ratio}× usual${it.change_pct != null ? ` · up ${it.change_pct.toFixed(1)}%` : ""}`}
              tone="pos"
              accent="var(--warm)"
            />
          ))}
        />
      )}
    </div>
  );
}

/** One dividend event → the row's pill, tone and detail lines. Days are counted
 *  from the Dhaka calendar date (the old UTC-midnight count was a day off
 *  between midnight and 6 AM Dhaka), with the same buy-by arithmetic as the
 *  stock page and /dividend-calendar. */
function dividendRow(d: MarketDividendEvent, today: Date) {
  let meta: string;
  let tone: RowTone;
  let dates: string;
  if (d.kind === "record") {
    const info = recordDateInfo(d.date, today);
    if (info) {
      if (info.buyDaysLeft > 0) {
        meta = `${info.buyDaysLeft} day${info.buyDaysLeft === 1 ? "" : "s"} left to buy`;
        tone = info.buyDaysLeft <= 3 ? "neg" : "pos";
      } else if (info.buyDaysLeft === 0) {
        meta = "Last day to buy";
        tone = "neg";
      } else {
        meta = "Too late to buy";
        tone = "neutral";
      }
      dates = `Record ${formatDate(d.date)} · buy by ${formatDate(isoLocal(info.buyBy))}`;
    } else {
      meta = "Cash date set";
      tone = "pos";
      dates = `Record ${formatDate(d.date)}`;
    }
  } else {
    meta = "Just announced";
    tone = "accent";
    dates = `Announced ${formatDate(d.date)} · record date not set yet`;
  }

  let cash: string | null = null;
  if (d.cash_per_share != null && d.cash_per_share >= 0.05) {
    cash = `৳${d.cash_per_share % 1 === 0 ? d.cash_per_share : d.cash_per_share.toFixed(2)} per share`;
    if (d.yield_pct != null && d.yield_pct > 0) cash += ` · ${d.yield_pct.toFixed(1)}% at today's price`;
  } else if (d.stock_pct != null && d.stock_pct > 0) {
    cash = `${d.stock_pct % 1 === 0 ? d.stock_pct : d.stock_pct.toFixed(1)}% bonus shares`;
  }

  return { meta, tone, cash, dates };
}

function Dividends({ items }: { items: MarketDividendEvent[] }) {
  const today = todayDhaka();
  return (
    <div
      className="ms-card ms-card--tint"
      style={{ marginTop: 16, "--card-accent": "var(--positive)" } as CSSProperties}
    >
      <p className="ms-card-title">Cash coming your way soon</p>
      <p className="ms-card-note" style={{ marginBottom: 4 }}>
        A dividend is cash a company gives to the people who own its shares. You must own the share
        before the record date — and normal buys take three trading days to land, so &ldquo;buy by&rdquo; is
        the day that matters.
      </p>
      <p lang="bn" className="font-bn ms-note-bn" style={{ margin: "0 0 12px" }}>
        ডিভিডেন্ড মানে — কোম্পানি লাভ করলে শেয়ারের মালিকদের নগদ টাকা দেয়। রেকর্ড ডেটের অন্তত তিন
        কার্যদিবস আগে কিনলে তবেই পাবেন।
      </p>
      {items.length === 0 ? (
        <p className="ms-empty">No cash dates coming up right now.</p>
      ) : (
        <ShowMore
          initial={4}
          noun="dividends"
          rows={items.map((d) => {
            const r = dividendRow(d, today);
            return (
              <MarketRow
                key={`${d.trading_code}-${d.date}`}
                code={d.trading_code}
                name={d.company_name}
                sector={d.sector}
                price={d.last_price}
                meta={r.meta}
                tone={r.tone}
                accent="var(--positive)"
                sub={
                  <>
                    {r.cash && <span className="ms-srow-sub-line ms-srow-sub-line--cash">{r.cash}</span>}
                    <span className="ms-srow-sub-line">{r.dates}</span>
                  </>
                }
              />
            );
          })}
        />
      )}
      <div className="ms-links">
        <Link href="/dividend-calendar" className="ms-bloglink">
          See the full dividend calendar →
        </Link>
        <Link href="/blog/dividend-record-date" lang="bn" className="font-bn ms-bloglink">
          ডিভিডেন্ড ও রেকর্ড ডেট কীভাবে কাজ করে →
        </Link>
      </div>
    </div>
  );
}

export default function WhatCouldHappenNext({
  unusual,
  nearHigh,
  nearLow,
  dividends,
}: {
  unusual: MarketUnusualStock[];
  nearHigh: MarketTurningStock[];
  nearLow: MarketTurningStock[];
  dividends: MarketDividendEvent[];
}) {
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <UnusualBuying items={unusual} />
      </div>

      <div className="intel-grid">
        <TurningList
          title="Climbing — could break higher"
          sub="At their highest price in a year. They might keep rising, or slip back."
          items={nearHigh}
          edge="high"
        />
        <TurningList
          title="Beaten down — could bounce back"
          sub="At their lowest price in a year. They might bounce, or keep falling."
          items={nearLow}
          edge="low"
        />
      </div>

      <Dividends items={dividends} />
      <div style={{ marginTop: 10 }}>
        <Bn className="ms-note-bn">এগুলো শিক্ষামূলক তথ্য, বিনিয়োগ পরামর্শ নয়।</Bn>
      </div>
    </>
  );
}
