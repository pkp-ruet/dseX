import { T } from "@/components/i18n/T";
import DividendRow from "@/components/dividend-calendar/DividendRow";
import RowLock from "@/components/premium/RowLock";
import LockPanel from "@/components/premium/LockPanel";
import { CALENDAR_PREVIEW_ROWS, FREE_CALENDAR_ROWS, splitFree } from "@/lib/free-share";
import { pct } from "@/lib/formatters";
import type { CorporateActionEvent } from "@/lib/api";
import SectionHeader from "@/components/ui/SectionHeader";

/**
 * Biggest cash dividends declared in the last 12 months, ranked by what the
 * dividend is worth at today's price — one card, numbered rows, the yield
 * leading on the right with the cash a share under it.
 *
 * Deliberately shows the grade next to the name: a high yield on a Weak
 * company is usually a falling price, not generosity. No advice is drawn
 * here — the ranking is arithmetic, and the grade is context.
 */
export default function TopCashDividends({ events }: { events: CorporateActionEvent[] }) {
  if (events.length === 0) return null;
  const [free, locked] = splitFree(events, FREE_CALENDAR_ROWS.topCash);
  const row = (e: CorporateActionEvent, rank: number, masked = false) => (
    <li key={`${e.trading_code}-${e.declaration_date}`}>
      <DividendRow e={e} mode="top" rank={rank} masked={masked} />
    </li>
  );
  const bestHidden = Math.max(0, ...locked.map((e) => e.yield_pct ?? 0));

  return (
    <section className="dc-section" id="top-payers">
      <SectionHeader
        title={<T en="Biggest cash dividends of the last 12 months" bn="গত 12 মাসের সবচেয়ে বড় নগদ ডিভিডেন্ড" />}
        lead={
          <T
            en="Declared cash, measured against today's price. A very high yield often means the price has fallen, so read the grade beside it first."
            bn="ঘোষিত নগদ ডিভিডেন্ড, আজকের দামের তুলনায়। অনেক বেশি ইল্ড মানে প্রায়ই দাম কমে গেছে, তাই আগে পাশের গ্রেড দেখে নিন।"
          />
        }
      />

      {/* Free readers see the top payer; the rest is Premium (screen-only lock)
          and continues inside the same card, so Premium reads one list. */}
      <ol className="soft-card dc-list overflow-hidden">
        {free.map((e, i) => row(e, i + 1))}
        {locked.length > 0 && (
          <li className="dc-gate-li">
            <RowLock
              preview={
                <ul className="dc-list">
                  {locked.slice(0, CALENDAR_PREVIEW_ROWS.topCash).map((e, i) => row(e, free.length + i + 1, true))}
                </ul>
              }
              panel={
                <LockPanel job="find"
                  title={
                    bestHidden > 0
                      ? {
                          en: `See the companies behind ${locked.length} more big cash dividends, yields up to ${pct(bestHidden, 1)}`,
                          bn: `আরও ${locked.length}টি বড় নগদ ডিভিডেন্ডের কোম্পানি দেখুন, ইল্ড ${pct(bestHidden, 1)} পর্যন্ত`,
                        }
                      : {
                          en: `See the companies behind ${locked.length} more big cash dividends`,
                          bn: `আরও ${locked.length}টি বড় নগদ ডিভিডেন্ডের কোম্পানি দেখুন`,
                        }
                  }
                  codes={locked.map((e) => e.trading_code)}
                  count={locked.length}
                  lock="Dividend calendar: biggest cash"
                  what={{ en: "The full dividend calendar", bn: "পুরো ডিভিডেন্ড ক্যালেন্ডার" }}
                />
              }
            >
              <ol className="dc-list">{locked.map((e, i) => row(e, free.length + i + 1))}</ol>
            </RowLock>
          </li>
        )}
      </ol>

      <p className="dc-fine">
        <T
          en="Yields are before tax. The company takes 10% dividend tax, or 15% without a TIN, before paying you. Bonus shares are left out, because they are not cash."
          bn="ইল্ড কর কাটার আগের হিসাব। টাকা দেওয়ার আগে কোম্পানি 10% ডিভিডেন্ড কর কাটে, টিআইএন না থাকলে 15%। বোনাস শেয়ার এখানে ধরা হয়নি, কারণ তা নগদ নয়।"
        />
      </p>
    </section>
  );
}
