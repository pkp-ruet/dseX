import { T } from "@/components/i18n/T";
import DividendRow from "@/components/dividend-calendar/DividendRow";
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
  const row = (e: CorporateActionEvent, rank: number) => (
    <li key={`${e.trading_code}-${e.declaration_date}`}>
      <DividendRow e={e} mode="top" rank={rank} />
    </li>
  );

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

      <ol className="soft-card dc-list overflow-hidden">{events.map((e, i) => row(e, i + 1))}</ol>
      <p className="dc-fine">
        <T
          en="Yields are before tax. The company takes 10% dividend tax, or 15% without a TIN, before paying you. Bonus shares are left out, because they are not cash."
          bn="ইল্ড কর কাটার আগের হিসাব। টাকা দেওয়ার আগে কোম্পানি 10% ডিভিডেন্ড কর কাটে, টিআইএন না থাকলে 15%। বোনাস শেয়ার এখানে ধরা হয়নি, কারণ তা নগদ নয়।"
        />
      </p>
    </section>
  );
}
