import Link from "next/link";
import TierPill from "@/components/ui/TierPill";
import StarButton from "@/components/ui/StarButton";
import { formatDate, pct, taka } from "@/lib/formatters";
import type { CorporateActionEvent } from "@/lib/api";

type Mode = "record" | "agm" | "declared";

/** The eligibility answer, from the last normal-market buy day. */
function buyStatus(e: CorporateActionEvent) {
  if (e.buy_days_left == null || !e.buy_by) return null;
  if (e.buy_days_left > 1) {
    return {
      text: `Buy by ${formatDate(e.buy_by)} · ${e.buy_days_left} days left`,
      color: "var(--positive)",
    };
  }
  if (e.buy_days_left === 1) {
    return { text: `Buy by tomorrow, ${formatDate(e.buy_by)}`, color: "var(--warm)" };
  }
  if (e.buy_days_left === 0) {
    return { text: "Last normal-market buy day is today", color: "var(--warm)" };
  }
  return { text: "Normal-market window closed — spot market only", color: "var(--negative)" };
}

function daysLabel(days: number | null | undefined) {
  if (days == null) return null;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function Figure({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9.5px] font-extrabold uppercase tracking-[0.13em] text-[var(--text-muted)]">
        {label}
      </span>
      <span
        className="text-[0.95rem] font-extrabold leading-none tabular-nums"
        style={{ color: color ?? "var(--text)" }}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * One declared corporate action as a card.
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
  const chg = e.change_pct;
  const chgColor =
    chg == null ? "var(--text-muted)" : chg > 0 ? "var(--positive)" : chg < 0 ? "var(--negative)" : "var(--text-muted)";

  const leadDate =
    mode === "agm" ? e.agm_date : mode === "declared" ? e.declaration_date : e.record_date;
  const leadDays = mode === "agm" ? e.agm_days_left : mode === "record" ? e.record_days_left : null;
  const leadLabel = mode === "agm" ? "AGM" : mode === "declared" ? "Declared" : "Record date";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-3.5">
      {/* Identity + price */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/stock/${e.trading_code}`}
              className="font-display text-[1.02rem] font-extrabold leading-none tracking-tight text-[var(--text)] hover:text-[var(--primary)]"
            >
              {e.trading_code}
            </Link>
            {e.tier && <TierPill tier={e.tier} />}
            {e.dividend_type && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {e.dividend_type}
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-[0.78rem] font-semibold text-[var(--text-muted)]">
            {e.company_name || e.sector || "—"}
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <div className="text-right">
            <div className="text-[0.95rem] font-extrabold leading-none tabular-nums text-[var(--text)]">
              {e.ltp != null ? taka(e.ltp) : "—"}
            </div>
            <div className="mt-1 text-[11px] font-bold tabular-nums" style={{ color: chgColor }}>
              {chg != null ? `${chg > 0 ? "+" : ""}${pct(chg, 2)}` : "—"}
            </div>
          </div>
          <StarButton code={e.trading_code} />
        </div>
      </div>

      {/* Figures */}
      <div className="grid grid-cols-3 gap-2 rounded-lg bg-[var(--surface-2)] px-3 py-2.5">
        {e.is_no_dividend ? (
          <div className="col-span-3">
            <Figure label="Declared" value="No dividend" color="var(--text-muted)" />
          </div>
        ) : (
          <>
            <Figure
              label="Cash"
              value={e.cash_pct ? `${pct(e.cash_pct, e.cash_pct % 1 ? 2 : 0)}` : "—"}
            />
            <Figure
              label="Per share"
              value={e.cash_per_share != null ? taka(e.cash_per_share) : "—"}
              color={e.cash_per_share ? "var(--positive)" : undefined}
            />
            <Figure
              label="Yield"
              value={e.yield_pct != null ? pct(e.yield_pct, 2) : "—"}
              color={e.yield_pct ? "var(--positive)" : undefined}
            />
          </>
        )}
      </div>

      {e.stock_pct ? (
        <p className="text-[0.78rem] font-semibold text-[var(--text-muted)]">
          Plus {pct(e.stock_pct, e.stock_pct % 1 ? 2 : 0)} bonus shares — {e.stock_pct} extra
          shares per 100 held, not cash.
        </p>
      ) : null}

      {/* Dates */}
      <div className="flex flex-col gap-1.5 text-[0.8rem] font-semibold">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[var(--text-muted)]">{leadLabel}</span>
          <span className="tabular-nums text-[var(--text)]">
            {formatDate(leadDate)}
            {leadDays != null && (
              <span className="ml-1.5 font-bold text-[var(--text-muted)]">({daysLabel(leadDays)})</span>
            )}
          </span>
        </div>

        {mode === "record" && e.agm_date && (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[var(--text-muted)]">AGM</span>
            <span className="tabular-nums text-[var(--text)]">{formatDate(e.agm_date)}</span>
          </div>
        )}
        {mode !== "record" && e.record_date && (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[var(--text-muted)]">Record date</span>
            <span className="tabular-nums text-[var(--text)]">{formatDate(e.record_date)}</span>
          </div>
        )}
        {mode === "declared" && e.period_end && (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[var(--text-muted)]">For period ending</span>
            <span className="tabular-nums text-[var(--text)]">{formatDate(e.period_end)}</span>
          </div>
        )}
      </div>

      {status && (
        <div
          className="rounded-lg px-3 py-2 text-[0.78rem] font-bold"
          style={{
            color: status.color,
            background: `color-mix(in srgb, ${status.color} 10%, var(--surface))`,
            border: `1px solid color-mix(in srgb, ${status.color} 26%, var(--border))`,
          }}
        >
          {status.text}
        </div>
      )}

      {e.amended && (
        <p className="text-[0.72rem] font-semibold text-[var(--text-muted)]">
          Dates were revised by a later DSE notice.
        </p>
      )}
    </div>
  );
}
