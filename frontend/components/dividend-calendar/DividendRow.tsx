import Link from "next/link";
import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import TierPill from "@/components/ui/TierPill";
import { IconLock } from "@/components/ui/icons";
import { pct } from "@/lib/formatters";
import { sectorBn } from "@/lib/bn";
import type { CorporateActionEvent } from "@/lib/api";
import { dayShort, daysWords } from "@/components/dividend-calendar/dates";

type Mode = "record" | "agm" | "top" | "declared" | "dated";

/** "Final" / "Interim" as DSE's news titles give them. */
const TYPE_BN: Record<string, string> = { Final: "চূড়ান্ত", Interim: "অন্তর্বর্তী" };

/** Cash a share with two decimals: a 2.5% cash dividend is ৳0.25, which
 *  `money()` would round to ৳0.3. */
export function perShareTk(v: number): string {
  return v >= 100 ? `৳${Math.round(v).toLocaleString("en-US")}` : `৳${v.toFixed(2)}`;
}

/** The grey bar's width follows the hidden name's length, so a list of
 *  masked rows doesn't read as one repeated shape. */
function maskWidth(name: string): number {
  return Math.max(96, Math.min(190, name.length * 6));
}

function pctWord(v: number): string {
  return pct(v, v % 1 ? 2 : 0);
}

/** The figure on the right: cash a share first, then words for bonus-only or none. */
function MoneyFigure({ e }: { e: CorporateActionEvent }) {
  if (e.is_no_dividend) {
    return (
      <span className="dc-amt dc-amt--muted">
        <T en="No dividend" bn="ডিভিডেন্ড নেই" />
      </span>
    );
  }
  if (e.cash_per_share != null && e.cash_per_share > 0) {
    const y = e.yield_pct != null ? e.yield_pct.toFixed(1) : null;
    return (
      <>
        <span className="dc-amt">{perShareTk(e.cash_per_share)}</span>
        <span className="dc-amt-x">
          <T
            en={y != null ? `a share · ${y}% yield` : "a share"}
            bn={y != null ? `শেয়ারপ্রতি · ${y}% ইল্ড` : "শেয়ারপ্রতি"}
          />
        </span>
      </>
    );
  }
  if (e.stock_pct) {
    return (
      <>
        <span className="dc-amt dc-amt--words">
          <T en={`${pctWord(e.stock_pct)} bonus`} bn={`${pctWord(e.stock_pct)} বোনাস`} />
        </span>
        <span className="dc-amt-x">
          <T en="new shares, not cash" bn="নতুন শেয়ার, নগদ নয়" />
        </span>
      </>
    );
  }
  if (e.cash_pct) {
    return (
      <span className="dc-amt dc-amt--words">
        <T en={`${pctWord(e.cash_pct)} cash`} bn={`${pctWord(e.cash_pct)} নগদ`} />
      </span>
    );
  }
  return <span className="dc-amt dc-amt--muted">—</span>;
}

/** Third-line facts, each only when this row has it. */
function extras(e: CorporateActionEvent, mode: Mode): ReactNode[] {
  const out: ReactNode[] = [];
  const cash = e.cash_per_share != null && e.cash_per_share > 0;
  if ((mode === "record" || mode === "agm" || mode === "declared") && cash && e.stock_pct) {
    out.push(
      <T key="bonus" en={`Also ${pctWord(e.stock_pct)} bonus shares`} bn={`সঙ্গে ${pctWord(e.stock_pct)} বোনাস শেয়ার`} />,
    );
  }
  if ((mode === "agm" || mode === "declared") && e.record_date) {
    const d = dayShort(e.record_date);
    out.push(<T key="rec" en={`Record date ${d.en}`} bn={`রেকর্ড ডেট ${d.bn}`} />);
  }
  if ((mode === "record" || mode === "declared") && e.agm_date) {
    const d = dayShort(e.agm_date);
    out.push(<T key="agm" en={`AGM ${d.en}`} bn={`এজিএম ${d.bn}`} />);
  }
  if (mode === "top" && e.declaration_date) {
    const d = dayShort(e.declaration_date, true);
    out.push(<T key="decl" en={`Declared ${d.en}`} bn={`ঘোষণা ${d.bn}`} />);
  }
  if (e.amended && mode !== "top") {
    out.push(
      <span key="amended" className="dc-tone--watch">
        <T en="Dates changed by a later DSE notice" bn="ডিএসইর পরের নোটিশে তারিখ বদলেছে" />
      </span>,
    );
  }
  return out;
}

/**
 * One company on the dividend calendar (and the dashboard's "Dividends
 * coming" card): company name first, then ticker · grade · Final/Interim, then
 * one muted line of extra facts; on the right the money leads — cash a share
 * with the yield at today's price under it (`top` ranks by the yield, so it
 * leads there; `dated` shows a date instead). Taps through to the stock
 * page's dividend history. Yields are gross; no advice is drawn here.
 * `mark` = the H / ★ owner tag on the dashboard. `masked` = the locked
 * preview (see CalendarLock): same row, company hidden.
 */
export default function DividendRow({
  e,
  mode = "record",
  rank,
  mark,
  masked = false,
}: {
  e: CorporateActionEvent;
  mode?: Mode;
  rank?: number;
  mark?: ReactNode;
  /** A free reader's preview of a locked row: the company hidden, the figures shown. */
  masked?: boolean;
}) {
  const more = extras(e, mode);
  const name = e.company_name || e.trading_code;

  let fig: ReactNode;
  if (mode === "top") {
    fig = (
      <>
        <span className="dc-amt">{e.yield_pct != null ? pct(e.yield_pct, 1) : "—"}</span>
        <span className="dc-amt-x">
          {e.cash_per_share != null && e.cash_per_share > 0 ? (
            <T en={`yield · ${perShareTk(e.cash_per_share)} a share`} bn={`ইল্ড · শেয়ারপ্রতি ${perShareTk(e.cash_per_share)}`} />
          ) : (
            <T en="yield" bn="ইল্ড" />
          )}
        </span>
      </>
    );
  } else if (mode === "dated") {
    const d = dayShort(e.record_date);
    const w = daysWords(e.record_days_left);
    fig = (
      <>
        <span className="dc-amt dc-amt--words">
          <T en={d.en} bn={d.bn} />
        </span>
        {w && (
          <span className="dc-amt-x">
            <T en={w.en} bn={w.bn} />
          </span>
        )}
      </>
    );
  } else {
    fig = <MoneyFigure e={e} />;
  }

  const extraLine =
    more.length > 0 ? (
      <span className="dc-extra">
        {more.map((m, i) => (
          <span key={i}>
            {i > 0 && <span className="dc-sep" aria-hidden="true"> · </span>}
            {m}
          </span>
        ))}
      </span>
    ) : null;

  // Masked (a free reader's preview of a locked row): every figure stays, the
  // company does not — a grey bar and a lock stand in for the name and ticker,
  // and the sector says what kind of business it is. Not a link.
  if (masked) {
    const sector = e.sector ? { en: e.sector, bn: sectorBn(e.sector) || e.sector } : null;
    return (
      <div className={`dc-row dc-row--masked ${rank != null ? "dc-row--rank" : ""}`.trim()}>
        {rank != null && <span className="dc-rank">{rank}</span>}
        <span className="min-w-0">
          <span className="dc-name dc-name--masked">
            <span className="dc-mask" style={{ width: `${maskWidth(name)}px` }} aria-hidden="true" />
            <IconLock size={14} />
            <span className="sr-only">
              <T en="Company shown in Premium" bn="কোম্পানির নাম প্রিমিয়ামে" />
            </span>
          </span>
          <span className="dc-meta">
            {e.tier && <TierPill tier={e.tier} />}
            {e.dividend_type && mode !== "dated" && <T en={e.dividend_type} bn={TYPE_BN[e.dividend_type] ?? e.dividend_type} />}
            {sector && (
              <>
                <span className="dc-sep" aria-hidden="true">·</span>
                <T en={sector.en} bn={sector.bn} />
              </>
            )}
          </span>
          {extraLine}
        </span>
        <span className="dc-fig">{fig}</span>
      </div>
    );
  }

  return (
    <Link
      href={`/stock/${encodeURIComponent(e.trading_code)}#dividends`}
      prefetch={false}
      className={`dc-row ${rank != null ? "dc-row--rank" : ""}`.trim()}
    >
      {rank != null && <span className="dc-rank">{rank}</span>}
      <span className="min-w-0">
        <span className="dc-name">{name}</span>
        <span className="dc-meta">
          <span className="dc-code">{e.trading_code}</span>
          {mark}
          {e.tier && <TierPill tier={e.tier} />}
          {e.dividend_type && mode !== "dated" && (
            <>
              <span className="dc-sep" aria-hidden="true">·</span>
              <T en={e.dividend_type} bn={TYPE_BN[e.dividend_type] ?? e.dividend_type} />
            </>
          )}
        </span>
        {extraLine}
      </span>
      <span className="dc-fig">{fig}</span>
    </Link>
  );
}
