import TierPill from "@/components/ui/TierPill";
import StarButton from "@/components/ui/StarButton";
import StockRow, { type StockRowTone } from "@/components/ui/StockRow";
import { formatDate, money, pct } from "@/lib/formatters";
import type { CorporateActionEvent } from "@/lib/api";
import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import { bnDate } from "@/lib/bn";

type Mode = "record" | "agm" | "declared";

/** The eligibility answer, from the last normal-market buy day. */
function buyStatus(e: CorporateActionEvent): { text: ReactNode; tone: StockRowTone } | null {
  if (e.buy_days_left == null || !e.buy_by) return null;
  if (e.buy_days_left > 1) {
    return {
      text: (
        <T
          en={`Buy by ${formatDate(e.buy_by)} · ${e.buy_days_left} days left`}
          bn={`${bnDate(e.buy_by)}-এর মধ্যে কিনুন · আর ${e.buy_days_left} দিন`}
        />
      ),
      tone: "positive",
    };
  }
  if (e.buy_days_left === 1) {
    return {
      text: (
        <T
          en={`Buy by tomorrow, ${formatDate(e.buy_by)}`}
          bn={`আগামীকাল, ${bnDate(e.buy_by)}-এর মধ্যে কিনুন`}
        />
      ),
      tone: "watch",
    };
  }
  if (e.buy_days_left === 0) {
    return {
      text: <T en="Today is the last day to buy in the normal market" bn="সাধারণ বাজারে কেনার শেষ দিন আজ" />,
      tone: "watch",
    };
  }
  return {
    text: (
      <T
        en="The normal-market window has closed. Only the spot market is open now."
        bn="সাধারণ বাজারে কেনার সময় শেষ। এখন শুধু স্পট মার্কেট খোলা।"
      />
    ),
    tone: "negative",
  };
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
  if (days === 0) return <T en="today" bn="আজ" />;
  if (days === 1) return <T en="tomorrow" bn="আগামীকাল" />;
  return <T en={`in ${days} days`} bn={`${days} দিন পর`} />;
}

/** "Final" / "Interim" as DSE's news titles give them. */
const TYPE_BN: Record<string, string> = { Final: "চূড়ান্ত", Interim: "অন্তর্বর্তী" };

/** A date in the reader's language. */
function Day({ iso }: { iso: string | null | undefined }) {
  return <T en={formatDate(iso)} bn={bnDate(iso) || formatDate(iso)} />;
}

function Figure({ label, value, tone }: { label: ReactNode; value: ReactNode; tone?: "positive" | "muted" }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold text-text-muted">{label}</span>
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
  const leadLabel =
    mode === "agm" ? (
      <T en="AGM" bn="এজিএম" />
    ) : mode === "declared" ? (
      <T en="Declared" bn="ঘোষণা" />
    ) : (
      <T en="Record date" bn="রেকর্ড ডেট" />
    );

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
                <span className="text-xs font-semibold text-text-muted">
                  <T en={e.dividend_type} bn={TYPE_BN[e.dividend_type] ?? e.dividend_type} />
                </span>
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
            <Figure
              label={<T en="Declared" bn="ঘোষণা" />}
              value={<T en="No dividend" bn="কোনো ডিভিডেন্ড নেই" />}
              tone="muted"
            />
          </div>
        ) : (
          <>
            <Figure
              label={<T en="Cash" bn="নগদ" />}
              value={e.cash_pct ? `${pct(e.cash_pct, e.cash_pct % 1 ? 2 : 0)}` : "—"}
            />
            <Figure
              label={<T en="Per share" bn="শেয়ারপ্রতি" />}
              value={e.cash_per_share != null ? money(e.cash_per_share) : "—"}
              tone={e.cash_per_share ? "positive" : undefined}
            />
            <Figure
              label={<T en="Yield" bn="ইল্ড" />}
              value={e.yield_pct != null ? pct(e.yield_pct, 2) : "—"}
              tone={e.yield_pct ? "positive" : undefined}
            />
          </>
        )}
      </div>

      {e.stock_pct ? (
        <p className="text-xs font-semibold text-text-muted">
          <T
            en={`Plus ${pct(e.stock_pct, e.stock_pct % 1 ? 2 : 0)} bonus shares: ${e.stock_pct} extra shares for every 100 you hold, not cash.`}
            bn={`সঙ্গে ${pct(e.stock_pct, e.stock_pct % 1 ? 2 : 0)} বোনাস শেয়ার: প্রতি 100টি শেয়ারে ${e.stock_pct}টি নতুন শেয়ার, নগদ নয়।`}
          />
        </p>
      ) : null}

      {/* Dates */}
      <div className="flex flex-col gap-1.5 text-sm font-semibold">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-text-muted">{leadLabel}</span>
          <span className="tabular-nums text-text-main">
            <Day iso={leadDate} />
            {leadDays != null && (
              <span className="ml-1.5 font-bold text-text-muted">({daysLabel(leadDays)})</span>
            )}
          </span>
        </div>

        {mode === "record" && e.agm_date && (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-text-muted">
              <T en="AGM" bn="এজিএম" />
            </span>
            <span className="tabular-nums text-text-main">
              <Day iso={e.agm_date} />
            </span>
          </div>
        )}
        {mode !== "record" && e.record_date && (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-text-muted">
              <T en="Record date" bn="রেকর্ড ডেট" />
            </span>
            <span className="tabular-nums text-text-main">
              <Day iso={e.record_date} />
            </span>
          </div>
        )}
        {mode === "declared" && e.period_end && (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-text-muted">
              <T en="For the period ending" bn="যে সময়ের জন্য, শেষ" />
            </span>
            <span className="tabular-nums text-text-main">
              <Day iso={e.period_end} />
            </span>
          </div>
        )}
      </div>

      {status && (
        <div className={`rounded-lg border px-3 py-2 text-xs font-bold ${STATUS_BOX[status.tone]}`}>{status.text}</div>
      )}

      {e.amended && (
        <p className="text-xs font-semibold text-text-muted">
          <T en="A later DSE notice changed these dates." bn="ডিএসইর পরের একটি নোটিশে তারিখগুলো বদলেছে।" />
        </p>
      )}
    </div>
  );
}
