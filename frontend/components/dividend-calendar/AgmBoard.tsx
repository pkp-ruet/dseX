import { T } from "@/components/i18n/T";
import DateGroup, { countByDate, groupByDate } from "@/components/dividend-calendar/DateGroup";
import type { CorporateActionEvent } from "@/lib/api";
import SectionHeader from "@/components/ui/SectionHeader";

/**
 * Announced AGM dates — where a final dividend gets approved before it's paid.
 * Same shape as the record dates: one card per date, the companies under it
 * with the cash a share up for approval leading.
 */
export default function AgmBoard({ events }: { events: CorporateActionEvent[] }) {
  if (events.length === 0) return null;
  const perDate = countByDate(events, "agm_date");
  const groups = groupByDate(events, "agm_date");

  return (
    <section className="dc-section" id="agms">
      <SectionHeader
        title={<T en="Upcoming AGMs" bn="আসন্ন এজিএম" />}
        lead={
          <T
            en="A final dividend is only a recommendation until shareholders approve it at the AGM. The money usually follows within 30 days."
            bn="এজিএমে শেয়ারহোল্ডাররা অনুমোদন না দেওয়া পর্যন্ত চূড়ান্ত ডিভিডেন্ড শুধু একটি সুপারিশ। এরপর সাধারণত 30 দিনের মধ্যে টাকা আসে।"
          />
        }
      />

      <div className="dc-stack">
        {groups.map((g) => (
          <DateGroup key={g.date} date={g.date} items={g.items} kind="agm" total={perDate.get(g.date)} />
        ))}
      </div>
    </section>
  );
}
