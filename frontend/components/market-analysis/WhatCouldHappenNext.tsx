import type { CSSProperties } from "react";
import Link from "next/link";
import { taka } from "@/lib/formatters";
import { sectorIcon } from "@/lib/sector-icons";
import type { MarketTurningStock, MarketDividendEvent, MarketUnusualStock } from "@/lib/api";
import MarketRow from "./MarketRow";

function shortDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  } catch {
    return d;
  }
}

// Numbers inside Bengali prose stay Western (9, 6.1%) — matches the rest of the
// site and avoids webfont glyph issues with Bengali numerals on some devices.

/** Whole days from today (UTC midnight) to a YYYY-MM-DD date; null if unparsable. */
function daysUntil(d: string): number | null {
  const target = Date.parse(`${d}T00:00:00Z`);
  if (Number.isNaN(target)) return null;
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - todayUtc) / 86400000);
}

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
          {edge === "high" ? "▲" : "▼"}
        </span>
        <p className="ms-edge-title">{title}</p>
      </div>
      <p className="ms-card-note">{sub}</p>
      {items.length === 0 ? (
        <p className="ms-empty">Nothing close right now.</p>
      ) : (
        <div className="ms-srow-list">
          {items.map((it) => (
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
        </div>
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
          ⚡
        </span>
        <p className="ms-edge-title">Unusual buying today</p>
      </div>
      <p className="ms-card-note">
        Far more people than usual are buying these — something may be happening.
      </p>
      {items.length === 0 ? (
        <p className="ms-empty">Nothing unusual today — trading looks normal.</p>
      ) : (
        <div className="ms-srow-list">
          {items.map((it) => (
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
        </div>
      )}
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

      <div
        className="ms-card ms-card--tint"
        style={{ marginTop: 16, "--card-accent": "var(--positive)" } as CSSProperties}
      >
        <p className="ms-card-title">Cash coming your way soon</p>
        <p className="ms-card-note" style={{ marginBottom: 4 }}>
          A dividend is cash a company gives to the people who own its shares.
        </p>
        <p lang="bn" className="font-bn ms-note-bn" style={{ margin: "0 0 12px" }}>
          ডিভিডেন্ড মানে — কোম্পানি লাভ করলে শেয়ারের মালিকদের নগদ টাকা দেয়।
        </p>
        {dividends.length === 0 ? (
          <p className="ms-empty">No cash dates coming up right now.</p>
        ) : (
          <div className="ms-divgrid">
            {dividends.map((d) => {
              const days = d.kind === "record" ? daysUntil(d.date) : null;
              return (
              <Link
                key={`${d.trading_code}-${d.date}`}
                href={`/stock/${d.trading_code}`}
                className="ms-divcard"
              >
                <span className="ms-divcard-top">
                  <span className={`ms-divkind ms-divkind--${d.kind}`}>
                    {d.kind === "record" ? "Cash date" : "Just announced"}
                  </span>
                  {days != null && days >= 0 && (
                    <span lang="bn" className={`font-bn ms-divdays${days <= 3 ? " ms-divdays--soon" : ""}`}>
                      {days === 0 ? "আজ" : `${days} দিন বাকি`}
                    </span>
                  )}
                </span>
                <div className="ms-divcard-id">
                  <span className="ms-divcard-tkr" aria-hidden="true">
                    {sectorIcon(d.sector) ?? d.trading_code.charAt(0)}
                  </span>
                  <span className="ms-divcard-code">{d.trading_code}</span>
                </div>
                <div className="ms-divcard-meta">
                  <span>{shortDate(d.date)}</span>
                  {d.last_price != null && <span className="ms-divcard-price">{taka(d.last_price)}</span>}
                </div>
                {d.dividend_pct != null && (
                  <div className="ms-divcash">৳ Pays {Math.round(d.dividend_pct)}%</div>
                )}
              </Link>
              );
            })}
          </div>
        )}
        <Link href="/blog/dividend-record-date" lang="bn" className="font-bn ms-bloglink">
          ডিভিডেন্ড ও রেকর্ড ডেট কীভাবে কাজ করে — বিস্তারিত পড়ুন →
        </Link>
      </div>
    </>
  );
}
