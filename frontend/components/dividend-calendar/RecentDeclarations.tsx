import { T } from "@/components/i18n/T";
import DividendRow from "@/components/dividend-calendar/DividendRow";
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
  const row = (e: CorporateActionEvent) => (
    <li key={`${e.trading_code}-${e.declaration_date}`}>
      <DividendRow e={e} mode="declared" />
    </li>
  );

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

      <ul className="soft-card dc-list overflow-hidden">{events.slice(0, limit).map((e) => row(e))}</ul>
    </section>
  );
}
