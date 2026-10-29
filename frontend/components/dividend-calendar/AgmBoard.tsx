import { T } from "@/components/i18n/T";
import DateBoard from "@/components/dividend-calendar/DateGroup";
import PanelHead from "@/components/dividend-calendar/PanelHead";
import type { CorporateActionEvent } from "@/lib/api";

/**
 * Announced AGM dates — where a final dividend gets approved before it's paid.
 * Same shape as the record dates: one card, the dates in order, the companies
 * under each with the cash a share up for approval leading.
 */
export default function AgmBoard({ events }: { events: CorporateActionEvent[] }) {
  if (events.length === 0) return null;
  return (
    <>
      <PanelHead
        title={<T en="Upcoming AGMs" bn="আসন্ন এজিএম" />}
        lead={
          <T
            en="A final dividend is only a recommendation until shareholders approve it at the AGM. The money usually follows within 30 days."
            bn="এজিএমে শেয়ারহোল্ডাররা অনুমোদন না দেওয়া পর্যন্ত চূড়ান্ত ডিভিডেন্ড শুধু একটি সুপারিশ। এরপর সাধারণত 30 দিনের মধ্যে টাকা আসে।"
          />
        }
      />
      <DateBoard events={events} kind="agm" />
    </>
  );
}
