import { T } from "@/components/i18n/T";
import DividendRow from "@/components/dividend-calendar/DividendRow";
import CalendarLock from "@/components/dividend-calendar/CalendarLock";
import LockPanel from "@/components/dividend-calendar/LockPanel";
import { CALENDAR_PREVIEW_ROWS, FREE_CALENDAR_ROWS, splitFree } from "@/lib/free-share";
import type { CorporateActionEvent } from "@/lib/api";
import SectionHeader from "@/components/ui/SectionHeader";

/** What DSE companies announced in the last few weeks, newest first — one
 *  card of rows: what was declared on the right, its record date and AGM
 *  under the name. */
export default function RecentDeclarations({
  events,
  limit = 12,
}: {
  events: CorporateActionEvent[];
  limit?: number;
}) {
  if (events.length === 0) return null;
  const [free, locked] = splitFree(events.slice(0, limit), FREE_CALENDAR_ROWS.declared);
  const row = (e: CorporateActionEvent, masked = false) => (
    <li key={`${e.trading_code}-${e.declaration_date}`}>
      <DividendRow e={e} mode="declared" masked={masked} />
    </li>
  );
  const cashHidden = locked.filter((e) => (e.cash_per_share ?? 0) > 0 || (e.cash_pct ?? 0) > 0).length;

  return (
    <section className="dc-section" id="recent">
      <SectionHeader
        title={<T en="Just declared" bn="সদ্য ঘোষিত" />}
        lead={
          <T
            en="The newest dividend announcements, newest first, with the record date of each one."
            bn="সবচেয়ে নতুন ডিভিডেন্ড ঘোষণা, নতুনটি আগে, প্রতিটির রেকর্ড ডেটসহ।"
          />
        }
      />

      {/* Free readers see the newest one; the rest is Premium (screen-only lock)
          and continues inside the same card, so Premium reads one list. */}
      <ul className="soft-card dc-list overflow-hidden">
        {free.map((e) => row(e))}
        {locked.length > 0 && (
          <li className="dc-gate-li">
            <CalendarLock
              preview={<ul className="dc-list">{locked.slice(0, CALENDAR_PREVIEW_ROWS.declared).map((e) => row(e, true))}</ul>}
              panel={
                <LockPanel
                  title={
                    cashHidden > 0
                      ? {
                          en: `${locked.length} more new ${locked.length === 1 ? "declaration" : "declarations"}, ${cashHidden} paying cash`,
                          bn: `আরও ${locked.length}টি নতুন ঘোষণা, এর ${cashHidden}টিতে নগদ ডিভিডেন্ড`,
                        }
                      : { en: `${locked.length} more new declarations`, bn: `আরও ${locked.length}টি নতুন ঘোষণা` }
                  }
                  codes={locked.map((e) => e.trading_code)}
                  count={locked.length}
                  lock="Dividend calendar: just declared"
                />
              }
            >
              <ul className="dc-list">{locked.map((e) => row(e))}</ul>
            </CalendarLock>
          </li>
        )}
      </ul>
    </section>
  );
}
