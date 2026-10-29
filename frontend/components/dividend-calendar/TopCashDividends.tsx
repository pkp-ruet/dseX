import { T } from "@/components/i18n/T";
import CalendarFold from "@/components/dividend-calendar/CalendarFold";
import DividendRow from "@/components/dividend-calendar/DividendRow";
import PanelHead from "@/components/dividend-calendar/PanelHead";
import type { CorporateActionEvent } from "@/lib/api";

/**
 * Biggest cash dividends declared in the last 12 months, ranked by what the
 * dividend is worth at today's price — one card, numbered rows, the yield
 * leading on the right with the cash a share under it. The top ten are open.
 *
 * Deliberately shows the grade next to the name: a high yield on a Weak
 * company is usually a falling price, not generosity. No advice is drawn
 * here — the ranking is arithmetic, and the grade is context.
 */
export default function TopCashDividends({ events }: { events: CorporateActionEvent[] }) {
  if (events.length === 0) return null;
  const rows = events.map((e, i) => (
    <li key={`${e.trading_code}-${e.declaration_date}`}>
      <DividendRow e={e} mode="top" rank={i + 1} />
    </li>
  ));

  return (
    <>
      <PanelHead
        title={<T en="Biggest cash dividends of the last 12 months" bn="গত 12 মাসের সবচেয়ে বড় নগদ ডিভিডেন্ড" />}
        lead={
          <T
            en="Declared cash against today's price. A very high yield often means the price has fallen, so read the grade first."
            bn="ঘোষিত নগদ ডিভিডেন্ড, আজকের দামের তুলনায়। অনেক বেশি ইল্ড মানে প্রায়ই দাম কমে গেছে, তাই আগে গ্রেড দেখে নিন।"
          />
        }
      />
      <div className="soft-card dc-board">
        <CalendarFold
          as="ul"
          className="dc-list"
          items={rows}
          initial={10}
          more={{ en: `Show all ${rows.length} companies`, bn: `সব ${rows.length}টি কোম্পানি দেখুন` }}
        />
      </div>
      <p className="dc-fine">
        <T
          en="Yields are before tax. The company takes 10% dividend tax, or 15% without a TIN, before paying you. Bonus shares are left out, because they are not cash."
          bn="ইল্ড কর কাটার আগের হিসাব। টাকা দেওয়ার আগে কোম্পানি 10% ডিভিডেন্ড কর কাটে, টিআইএন না থাকলে 15%। বোনাস শেয়ার এখানে ধরা হয়নি, কারণ তা নগদ নয়।"
        />
      </p>
    </>
  );
}
