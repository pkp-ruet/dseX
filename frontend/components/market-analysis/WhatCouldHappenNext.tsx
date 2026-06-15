import Link from "next/link";
import type { MarketTurningStock, MarketDividendEvent, MarketUnusualStock } from "@/lib/api";

function shortDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  } catch {
    return d;
  }
}

function StockLink({ code, name, meta }: { code: string; name: string | null; meta: string }) {
  return (
    <Link className="ms-row" href={`/stock/${code}`}>
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span className="ms-code">{code}</span>
        {name && (
          <span
            className="ms-name"
            style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {name}
          </span>
        )}
      </span>
      <span className="ms-row-meta">{meta}</span>
    </Link>
  );
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
  return (
    <div className="ms-card">
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
        items.map((it) => (
          <StockLink
            key={it.trading_code}
            code={it.trading_code}
            name={it.company_name}
            meta={`${it.gap_pct.toFixed(1)}% from its ${edge === "high" ? "high" : "low"}`}
          />
        ))
      )}
    </div>
  );
}

function UnusualBuying({ items }: { items: MarketUnusualStock[] }) {
  return (
    <div className="ms-card">
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
        items.map((it) => (
          <Link className="ms-row" href={`/stock/${it.trading_code}`} key={it.trading_code}>
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span className="ms-code">{it.trading_code}</span>
              {it.company_name && (
                <span
                  className="ms-name"
                  style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {it.company_name}
                </span>
              )}
            </span>
            <span className="ms-row-meta ms-pos">
              {it.volume_ratio}× usual
              {it.change_pct != null ? ` · up ${it.change_pct.toFixed(1)}%` : ""}
            </span>
          </Link>
        ))
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

      <div className="ms-card" style={{ marginTop: 16 }}>
        <p className="ms-card-title">Cash coming your way soon</p>
        <p className="ms-card-note">
          A dividend is cash a company gives to the people who own its shares.
        </p>
        {dividends.length === 0 ? (
          <p className="ms-empty">No cash dates coming up right now.</p>
        ) : (
          <div className="ms-divgrid">
            {dividends.map((d) => (
              <Link
                key={`${d.trading_code}-${d.date}`}
                href={`/stock/${d.trading_code}`}
                className="ms-divcard"
              >
                <span className={`ms-divkind ms-divkind--${d.kind}`}>
                  {d.kind === "record" ? "Cash date" : "Just announced"}
                </span>
                <div className="ms-code" style={{ marginTop: 9 }}>{d.trading_code}</div>
                <div className="ms-name">{shortDate(d.date)}</div>
                {d.dividend_pct != null && (
                  <div className="ms-divcash">৳ Pays {Math.round(d.dividend_pct)}%</div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
