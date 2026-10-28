import { T } from "@/components/i18n/T";
import DateGroup, { splitGroups } from "@/components/dividend-calendar/DateGroup";
import CalendarLock from "@/components/dividend-calendar/CalendarLock";
import { FREE_CALENDAR_ROWS, splitFree } from "@/lib/free-share";
import type { CorporateActionEvent } from "@/lib/api";
import SectionHeader from "@/components/ui/SectionHeader";

/**
 * Announced AGM dates — where a final dividend gets approved before it's paid.
 * Same shape as the record dates: one card per date, the companies under it
 * with the cash a share up for approval leading.
 */
export default function AgmBoard({ events }: { events: CorporateActionEvent[] }) {
  if (events.length === 0) return null;
  // Free readers see the next AGM; the rest is Premium (screen-only lock).
  const [free, locked] = splitFree(events, FREE_CALENDAR_ROWS.agms);
  const { freeGroups, lockedGroups, cont } = splitGroups(free, locked, "agm_date");
  const groups = (list: typeof freeGroups, half: "free" | "locked") =>
    list.map((g, i) => (
      <DateGroup
        key={g.date}
        date={g.date}
        items={g.items}
        kind="agm"
        part={cont ? (half === "free" && i === list.length - 1 ? "split" : half === "locked" && i === 0 ? "cont" : undefined) : undefined}
      />
    ));

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

      <div className="dc-stack">{groups(freeGroups, "free")}</div>
      {locked.length > 0 && (
        <CalendarLock
          label={{ en: `${locked.length} more AGMs`, bn: `আরও ${locked.length}টি এজিএম` }}
          peek={140}
          compact
          className={`dc-gate ${cont ? "dc-gate--cont" : ""}`}
        >
          <div className="dc-stack">{groups(lockedGroups, "locked")}</div>
        </CalendarLock>
      )}
    </section>
  );
}
