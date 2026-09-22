import TierPill from "@/components/ui/TierPill";
import StarButton from "@/components/ui/StarButton";
import StockRow, { type StockRowTone } from "@/components/ui/StockRow";
import { formatDate, money, pct } from "@/lib/formatters";
import type { CorporateActionEvent } from "@/lib/api";

type Mode = "record" | "agm" | "declared";

/** The eligibility answer, from the last normal-market buy day. */
function buyStatus(e: CorporateActionEvent): { text: string; tone: StockRowTone } | null {
  if (e.buy_days_left == null || !e.buy_by) return null;
  if (e.buy_days_left > 1) {
    return { text: `Buy by ${formatDate(e.buy_by)} · ${e.buy_days_left} days left`, tone: "positive" };
  }
  if (e.buy_days_left === 1) {
    return { text: `Buy by tomorrow, ${formatDate(e.buy_by)}`, tone: "watch" };
  }
  if (e.buy_days_left === 0) {
    return { text: "Last normal-market buy day is today", tone: "watch" };
  }
  return { text: "Normal-market window closed — spot market only", tone: "negative" };
}

const STATUS_BOX: Record<StockRowTone, string> = {
  positive: "border-positive/30 bg-positive/10 text-positive",
  negative: "border-negative/30 bg-negative/10 text-negative",
  watch: "border-watch/30 bg-watch/10 text-watch",
  info: "border-info/30 bg-info/10 text-info",
  primary: "border-primary/30 bg-primary/10 text-primary",
  muted: "border-border bg-surface-2 text-text-muted",
};

function daysLabel(days: number | null | undefined) {
  if (days == null) return null;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: "positive" | "muted" }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-extrabold uppercase tracking-[0.13em] text-text-muted">{label}</span>
      <span
        className={`text-base font-extrabold leading-none tabular-nums ${
          tone === "positive" ? "text-positive" : tone === "muted" ? "text-text-muted" : "text-text-main"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * One declared corporate action as a card. The identity line at the top is the
 * app-wide `StockRow` (name, code, tier, price + change, star).
 *
 * `mode` picks which date leads: the record date (eligibility), the AGM, or the
 * declaration date. Everything shown is declared fact plus arithmetic — the cash
 * figure, what it's worth at today's price, and the dates. Yields are **gross**;
 * dividend tax is not applied here.
 */
export default function EventCard({
  event: e,
  mode = "record",
}: {
  event: CorporateActionEvent;
  mode?: Mode;
}) {
  const status = mode === "record" ? buyStatus(e) : null;

  const leadDate =
    mode === "agm" ? e.agm_date : mode === "declared" ? e.declaration_date : e.record_date;
  const leadDays = mode === "agm" ? e.agm_days_left : mode === "record" ? e.record_days_left : null;
  const leadLabel = mode === "agm" ? "AGM" : mode === "declared" ? "Declared" : "Record date";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 sm:p-3.5">
      {/* Identity + price */}
      <div className="-mx-2 -mt-1">
        <StockRow
          as="div"
          inset="none"
          className="rounded-md px-2"
          code={e.trading_code}
          name={e.company_name || e.sector}
          tags={
            <>
              {e.tier && <TierPill tier={e.tier} />}
              {e.dividend_type && (
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">{e.dividend_type}</span>
              )}
            </>
          }
          price={e.ltp}
          change={e.change_pct}
          action={<StarButton code={e.trading_code} />}
        />
      </div>

      {/* Figures */}
      <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-2 px-3 py-2.5">
        {e.is_no_dividend ? (
          <div className="col-span-3">
            <Figure label="Declared" value="No dividend" tone="muted" />
          </div>
        ) : (
          <>
            <Figure label="Cash" value={e.cash_pct ? `${pct(e.cash_pct, e.cash_pct % 1 ? 2 : 0)}` : "—"} />
            <Figure
              label="Per share"
              value={e.cash_per_share != null ? money(e.cash_per_share) : "—"}
              tone={e.cash_per_share ? "positive" : undefined}
            />
            <Figure
              label="Yield"
              value={e.yield_pct != null ? pct(e.yield_pct, 2) : "—"}
              tone={e.yield_pct ? "positive" : undefined}
            />
          </>
        )}
      </div>

      {e.stock_pct ? (
        <p className="text-xs font-semibold text-text-muted">
          Plus {pct(e.stock_pct, e.stock_pct % 1 ? 2 : 0)} bonus shares — {e.stock_pct} extra
          shares per 100 held, not cash.
        </p>
      ) : null}

      {/* Dates */}
      <div className="flex flex-col gap-1.5 text-sm font-semibold">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-text-muted">{leadLabel}</span>
          <span className="tabular-nums text-text-main">
            {formatDate(leadDate)}
            {leadDays != null && (
              <span className="ml-1.5 font-bold text-text-muted">({daysLabel(leadDays)})</span>
            )}
          </span>
        </div>

        {mode === "record" && e.agm_date && (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-text-muted">AGM</span>
            <span className="tabular-nums text-text-main">{formatDate(e.agm_date)}</span>
          </div>
        )}
        {mode !== "record" && e.record_date && (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-text-muted">Record date</span>
            <span className="tabular-nums text-text-main">{formatDate(e.record_date)}</span>
          </div>
        )}
        {mode === "declared" && e.period_end && (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-text-muted">For period ending</span>
            <span className="tabular-nums text-text-main">{formatDate(e.period_end)}</span>
          </div>
        )}
      </div>

      {status && (
        <div className={`rounded-lg border px-3 py-2 text-xs font-bold ${STATUS_BOX[status.tone]}`}>{status.text}</div>
      )}

      {e.amended && (
        <p className="text-xs font-semibold text-text-muted">Dates were revised by a later DSE notice.</p>
      )}
    </div>
  );
}
