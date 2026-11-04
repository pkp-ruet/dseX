import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import { Locked } from "@/components/premium/AnswerLock";
import { pct } from "@/lib/formatters";
import type { CorporateActionEvent } from "@/lib/api";
import { dayShort, daysWords } from "@/components/dividend-calendar/dates";
import RemindButton from "@/components/dividend-calendar/RemindButton";
import ExpandRow from "@/components/dividend-calendar/ExpandRow";
import Button from "@/components/ui/Button";

type Mode = "record" | "agm" | "top" | "declared" | "dated";

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
  if ((mode === "top" || mode === "record" || mode === "agm") && e.declaration_date) {
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

function Sep() {
  return (
    <span className="dc-sep" aria-hidden="true">
      ·
    </span>
  );
}

/**
 * One company on the dividend calendar (and the dashboard's record-dates
 * card). Clean pass 2026-11-04 (user: the page "look messy and hard to
 * understand"): the row is two lines — the company name, then ticker ·
 * Final/Interim · bonus · the "Is it safe?" word — with the money on the
 * right (cash a share over the yield; `top` leads with the yield, `dated`
 * shows a date). A tap opens it in place (`ExpandRow`): "Is it safe?" and
 * "Worth buying for it?" with their sentences, the other dates, then "Open
 * the page" and "Remind me" (`remind`, a cash record date still ahead). The
 * explanations are Premium (`Locked`; the whole calendar is Premium too).
 * `mark` = the H / ★ owner tag on the dashboard. Yields are before tax; no
 * advice is drawn here.
 */
export default function DividendRow({
  e,
  mode = "record",
  rank,
  mark,
  remind = false,
}: {
  e: CorporateActionEvent;
  mode?: Mode;
  rank?: number;
  mark?: ReactNode;
  remind?: boolean;
}) {
  const name = e.company_name || e.trading_code;
  const href = `/stock/${encodeURIComponent(e.trading_code)}#dividends`;
  const cash = e.cash_per_share != null && e.cash_per_share > 0;

  let fig: ReactNode;
  if (mode === "top") {
    fig = (
      <>
        <span className="dc-amt">{e.yield_pct != null ? pct(e.yield_pct, 1) : "—"}</span>
        <span className="dc-amt-x">
          {cash ? (
            <T en={`yield · ${perShareTk(e.cash_per_share as number)} a share`} bn={`ইল্ড · শেয়ারপ্রতি ${perShareTk(e.cash_per_share as number)}`} />
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

  const safety = mode !== "dated" ? e.safety ?? null : null;
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
        {safety && (
          <Locked as="span" className="dc-word">
            <Sep />{" "}
            <b className={`dc-safety-w dc-safety--${safety.level}`}>
              <T en={safety.word_en} bn={safety.word_bn} />
            </b>
          </Locked>
        )}
      </span>
    </>
  );

  if (mode === "dated") return <ExpandRow head={head} fig={fig} body={null} href={href} rank={rank} />;

  const capture = mode === "record" ? e.capture ?? null : null;
  const facts = extras(e, mode);
  const canRemind = remind && mode === "record" && cash && (e.buy_days_left == null || e.buy_days_left >= 0);
  const hasWhy = !!safety || !!capture;
  const body =
    hasWhy || facts.length > 0 || canRemind ? (
      <>
        {hasWhy && (
          <Locked>
            <dl className="dc-why">
              {safety && (
                <div>
                  <dt>
                    <T en="Is it safe?" bn="নিরাপদ কি?" />
                  </dt>
                  <dd>
                    <b className={`dc-safety-w dc-safety--${safety.level}`}>
                      <T en={`${safety.word_en}.`} bn={`${safety.word_bn}।`} />
                    </b>{" "}
                    <T en={safety.line_en} bn={safety.line_bn} />
                  </dd>
                </div>
              )}
              {capture && (
                <div>
                  <dt>
                    <T en="Worth buying for it?" bn="এর জন্য কেনা কি লাভের?" />
                  </dt>
                  <dd>
                    <b className={`dc-safety-w dc-capture--${capture.level}`}>
                      <T en={`${capture.word_en}.`} bn={`${capture.word_bn}।`} />
                    </b>{" "}
                    <T en={capture.line_en} bn={capture.line_bn} />
                  </dd>
                </div>
              )}
            </dl>
          </Locked>
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
          {canRemind && <RemindButton code={e.trading_code} labeled />}
        </div>
      </>
    ) : null;

  return <ExpandRow head={head} fig={fig} body={body} href={href} rank={rank} />;
}
