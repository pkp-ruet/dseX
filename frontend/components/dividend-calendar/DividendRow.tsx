import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import { pct } from "@/lib/formatters";
import type { CorporateActionEvent } from "@/lib/api";
import { dayShort, daysWords } from "@/components/dividend-calendar/dates";
import RemindButton from "@/components/dividend-calendar/RemindButton";
import ExpandRow from "@/components/dividend-calendar/ExpandRow";
import Button from "@/components/ui/Button";

type Mode = "record" | "agm" | "declared" | "dated";

/** "Final" / "Interim" as DSE's news titles give them. */
const TYPE_BN: Record<string, string> = { Final: "চূড়ান্ত", Interim: "অন্তর্বর্তী" };

/** Cash a share with two decimals: a 2.5% cash dividend is ৳0.25, which
 *  `money()` would round to ৳0.3. */
export function perShareTk(v: number): string {
  return v >= 100 ? `৳${Math.round(v).toLocaleString("en-US")}` : `৳${v.toFixed(2)}`;
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

/** Facts for the opened row, each only when this row has it. */
function extras(e: CorporateActionEvent, mode: Mode): ReactNode[] {
  const out: ReactNode[] = [];
  if ((mode === "agm" || mode === "declared") && e.record_date) {
    const d = dayShort(e.record_date);
    out.push(<T key="rec" en={`Record date ${d.en}`} bn={`রেকর্ড ডেট ${d.bn}`} />);
  }
  if ((mode === "record" || mode === "declared") && e.agm_date) {
    const d = dayShort(e.agm_date);
    out.push(<T key="agm" en={`AGM ${d.en}`} bn={`এজিএম ${d.bn}`} />);
  }
  if ((mode === "record" || mode === "agm") && e.declaration_date) {
    const d = dayShort(e.declaration_date, true);
    out.push(<T key="decl" en={`Declared ${d.en}`} bn={`ঘোষণা ${d.bn}`} />);
  }
  if (e.amended) {
    out.push(
      <span key="amended" className="dc-tone--watch">
        <T en="Dates changed by a later DSE notice" bn="ডিএসইর পরের নোটিশে তারিখ বদলেছে" />
      </span>,
    );
  }
  return out;
}

function Sep() {
  return (
    <span className="dc-sep" aria-hidden="true">
      ·
    </span>
  );
}

/**
 * One company on the dividend calendar (and the dashboard's record-dates
 * card). The row is two lines — the company name, then ticker ·
 * Final/Interim · bonus — with the money on the right (cash a share over the
 * yield; `dated` shows a date). A tap opens it in place (`ExpandRow`):
 * "Remind me on the last day to buy" first (`remind`, a cash record date still
 * ahead), the other dates, then "Open the page".
 * Since 2026-11-05 (user: the calendar is "purely dedicated for finding
 * dividends that are coming next") no row says whether a dividend looks safe
 * or is worth buying for: dates and taka only. `mark` = the H / ★ owner tag on
 * the dashboard. Yields are before tax; no advice is drawn here.
 */
export default function DividendRow({
  e,
  mode = "record",
  mark,
  remind = false,
}: {
  e: CorporateActionEvent;
  mode?: Mode;
  mark?: ReactNode;
  remind?: boolean;
}) {
  const name = e.company_name || e.trading_code;
  const href = `/stock/${encodeURIComponent(e.trading_code)}#dividends`;
  const cash = e.cash_per_share != null && e.cash_per_share > 0;

  let fig: ReactNode;
  if (mode === "dated") {
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

  const head = (
    <>
      <span className="dc-name">{name}</span>
      <span className="dc-meta">
        <span className="dc-code">{e.trading_code}</span>
        {mark}
        {e.dividend_type && mode !== "dated" && (
          <>
            <Sep />
            <T en={e.dividend_type} bn={TYPE_BN[e.dividend_type] ?? e.dividend_type} />
          </>
        )}
        {cash && e.stock_pct && mode !== "dated" ? (
          <>
            <Sep />
            <T en={`+ ${pctWord(e.stock_pct)} bonus`} bn={`+ ${pctWord(e.stock_pct)} বোনাস`} />
          </>
        ) : null}
      </span>
    </>
  );

  if (mode === "dated") return <ExpandRow head={head} fig={fig} body={null} href={href} />;

  const facts = extras(e, mode);
  const canRemind = remind && mode === "record" && cash && (e.buy_days_left == null || e.buy_days_left >= 0);
  const body =
    facts.length > 0 || canRemind ? (
      <>
        {canRemind && (
          <div className="dc-x-remind">
            <RemindButton code={e.trading_code} labeled />
          </div>
        )}
        {facts.length > 0 && (
          <p className="dc-x-facts">
            {facts.map((m, i) => (
              <span key={i}>
                {i > 0 && <span className="dc-sep" aria-hidden="true"> · </span>}
                {m}
              </span>
            ))}
          </p>
        )}
        <div className="dc-x-act">
          <Button href={href} variant="quiet" size="sm">
            <T en={`Open the ${e.trading_code} page`} bn={`${e.trading_code}-এর পেজ খুলুন`} />
          </Button>
        </div>
      </>
    ) : null;

  return <ExpandRow head={head} fig={fig} body={body} href={href} />;
}
