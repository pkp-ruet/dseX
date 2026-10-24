import Bn from "@/components/i18n/Bn";
import TierPill from "@/components/ui/TierPill";
import StockRow, { StockRowValue } from "@/components/ui/StockRow";
import { formatDate, money, pct } from "@/lib/formatters";
import PremiumGate from "@/components/premium/PremiumGate";
import { FREE_CALENDAR_ROWS, splitFree } from "@/lib/free-share";
import type { CorporateActionEvent } from "@/lib/api";
import SectionHeader from "@/components/ui/SectionHeader";

/**
 * Biggest cash dividends declared in the last 12 months, ranked by what the
 * dividend is worth at today's price.
 *
 * Deliberately shows the tier next to the yield: a high yield on a Weak company
 * is usually a falling price, not generosity. No advice is drawn here — the
 * ranking is arithmetic, and the tier is context. Rows are the app-wide
 * `StockRow`: name, code, tier; cash + per-share on the sub line; the yield
 * (the ranking key) leads the right column with today's price under it.
 */
export default function TopCashDividends({ events }: { events: CorporateActionEvent[] }) {
  if (events.length === 0) return null;
  const [free, locked] = splitFree(events, FREE_CALENDAR_ROWS.topCash);
  const row = (e: CorporateActionEvent) => {
    const cash = e.cash_pct ? pct(e.cash_pct, e.cash_pct % 1 ? 2 : 0) : null;
    const perShare = e.cash_per_share != null ? money(e.cash_per_share) : null;
    const sub = [cash ? `${cash} cash` : null, perShare ? `${perShare} per share` : null]
      .filter(Boolean)
      .join(" · ");
    return (
      <StockRow
        key={`${e.trading_code}-${e.declaration_date}`}
        code={e.trading_code}
        name={e.company_name}
        tags={e.tier ? <TierPill tier={e.tier} /> : undefined}
        sub={sub ? <span className="font-semibold tabular-nums nums">{sub}</span> : undefined}
        subTone="watch"
        detail={e.declaration_date ? `Declared ${formatDate(e.declaration_date)}` : undefined}
        right={
          <StockRowValue
            value={e.yield_pct != null ? `${pct(e.yield_pct, 2)} yield` : "—"}
            tone="positive"
            sub={e.ltp != null ? `at ${money(e.ltp)}` : undefined}
          />
        }
      />
    );
  };

  return (
    <section className="mb-8" id="top-payers">
      <SectionHeader title={<>Biggest cash dividends — last 12 months</>} className="mt-8" />

      <p className="mb-1 text-sm font-semibold text-text-main">
        Declared cash, measured against today&apos;s price. A very high yield often means
        the price fell — check the strength rating beside it before chasing the number.
      </p>
      <Bn className="mb-4 text-sm font-medium leading-[1.85] text-text-muted">
        অনেক বেশি ইল্ড মানে প্রায়ই দাম পড়ে গেছে — পাশের রেটিং দেখে কোম্পানির শক্তি যাচাই করুন।
      </Bn>

      {/* Free readers see the top payer; the rest is Premium (screen-only lock). */}
      <ol className="stock-list">{free.map(row)}</ol>
      {locked.length > 0 && (
        <PremiumGate label={`${locked.length} more big cash dividends`} preview="blur" peek={120} compact className="mt-2">
          <ol className="stock-list" start={free.length + 1}>{locked.map(row)}</ol>
        </PremiumGate>
      )}

      <p className="mt-2.5 text-xs font-semibold text-text-muted">
        Yields are gross, before the 10% dividend tax (15% without a TIN) and any AIT
        deducted at source. Bonus shares are excluded — they aren&apos;t cash.
      </p>
    </section>
  );
}
