import { T } from "@/components/i18n/T";
import { bnDate } from "@/lib/bn";
import TierPill from "@/components/ui/TierPill";
import StockRow, { StockRowValue } from "@/components/ui/StockRow";
import { formatDate, money, pct } from "@/lib/formatters";
import CalendarLock from "@/components/dividend-calendar/CalendarLock";
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
    const subBn = [cash ? `${cash} নগদ` : null, perShare ? `শেয়ারপ্রতি ${perShare}` : null]
      .filter(Boolean)
      .join(" · ");
    return (
      <StockRow
        key={`${e.trading_code}-${e.declaration_date}`}
        code={e.trading_code}
        name={e.company_name}
        tags={e.tier ? <TierPill tier={e.tier} /> : undefined}
        sub={
          sub ? (
            <span className="font-semibold tabular-nums nums">
              <T en={sub} bn={subBn} />
            </span>
          ) : undefined
        }
        subTone="watch"
        detail={
          e.declaration_date ? (
            <T en={`Declared ${formatDate(e.declaration_date)}`} bn={`ঘোষণা ${bnDate(e.declaration_date)}`} />
          ) : undefined
        }
        right={
          <StockRowValue
            value={
              e.yield_pct != null ? (
                <T en={`${pct(e.yield_pct, 2)} yield`} bn={`${pct(e.yield_pct, 2)} ইল্ড`} />
              ) : (
                "—"
              )
            }
            tone="positive"
            sub={e.ltp != null ? <T en={`at ${money(e.ltp)}`} bn={`${money(e.ltp)} দামে`} /> : undefined}
          />
        }
      />
    );
  };

  return (
    <section className="mb-8" id="top-payers">
      <SectionHeader
        title={<T en="Biggest cash dividends in the last 12 months" bn="গত 12 মাসের সবচেয়ে বড় নগদ ডিভিডেন্ড" />}
        className="mt-8"
      />

      <p className="mb-4 text-sm font-semibold text-text-main">
        <T
          en="Declared cash, measured against today's price. A very high yield often means the price has fallen, so check the grade beside it before you go after the number."
          bn="ঘোষিত নগদ ডিভিডেন্ড, আজকের দামের তুলনায়। অনেক বেশি ইল্ড মানে প্রায়ই দাম কমে গেছে, তাই সংখ্যার পেছনে ছোটার আগে পাশের গ্রেড দেখে নিন।"
        />
      </p>

      {/* Free readers see the top payer; the rest is Premium (screen-only lock). */}
      <ol className="stock-list">{free.map(row)}</ol>
      {locked.length > 0 && (
        <CalendarLock
          label={{ en: `${locked.length} more big cash dividends`, bn: `আরও ${locked.length}টি বড় নগদ ডিভিডেন্ড` }}
          peek={120}
          compact
          className="mt-2"
        >
          <ol className="stock-list" start={free.length + 1}>{locked.map(row)}</ol>
        </CalendarLock>
      )}

      <p className="mt-2.5 text-xs font-semibold text-text-muted">
        <T
          en="Yields are before tax. The company takes 10% dividend tax, or 15% without a TIN, before paying you. Bonus shares are left out, because they are not cash."
          bn="ইল্ড কর কাটার আগের হিসাব। টাকা দেওয়ার আগে কোম্পানি 10% ডিভিডেন্ড কর কাটে, টিআইএন না থাকলে 15%। বোনাস শেয়ার এখানে ধরা হয়নি, কারণ তা নগদ নয়।"
        />
      </p>
    </section>
  );
}
