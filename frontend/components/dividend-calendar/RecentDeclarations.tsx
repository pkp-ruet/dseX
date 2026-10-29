import { T } from "@/components/i18n/T";
import CalendarFold from "@/components/dividend-calendar/CalendarFold";
import DividendRow from "@/components/dividend-calendar/DividendRow";
import PanelHead from "@/components/dividend-calendar/PanelHead";
import type { CorporateActionEvent } from "@/lib/api";

/** How many "Just declared" rows the tab carries (its count says the same). */
export const RECENT_LIMIT = 12;

/** What DSE companies announced in the last few weeks, newest first — one
 *  card of rows: what was declared on the right, its record date and AGM
 *  under the name. The newest six are open. */
export default function RecentDeclarations({ events }: { events: CorporateActionEvent[] }) {
  if (events.length === 0) return null;
  const rows = events.slice(0, RECENT_LIMIT).map((e) => (
    <li key={`${e.trading_code}-${e.declaration_date}`}>
      <DividendRow e={e} mode="declared" />
    </li>
  ));

  return (
    <>
      <PanelHead
        title={<T en="Just declared" bn="সদ্য ঘোষিত" />}
        lead={
          <T
            en="The newest dividend announcements, newest first, with the record date of each one."
            bn="সবচেয়ে নতুন ডিভিডেন্ড ঘোষণা, নতুনটি আগে, প্রতিটির রেকর্ড ডেটসহ।"
          />
        }
      />
      <div className="soft-card dc-board">
        <CalendarFold
          as="ul"
          className="dc-list"
          items={rows}
          initial={6}
          more={{ en: `Show all ${rows.length} announcements`, bn: `সব ${rows.length}টি ঘোষণা দেখুন` }}
        />
      </div>
    </>
  );
}
