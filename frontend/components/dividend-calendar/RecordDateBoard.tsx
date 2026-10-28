import { T } from "@/components/i18n/T";
import DateGroup, { splitGroups } from "@/components/dividend-calendar/DateGroup";
import DividendRow from "@/components/dividend-calendar/DividendRow";
import CalendarLock from "@/components/dividend-calendar/CalendarLock";
import { FREE_CALENDAR_ROWS, splitFree } from "@/lib/free-share";
import type { CorporateActionEvent } from "@/lib/api";
import SectionHeader from "@/components/ui/SectionHeader";

/**
 * Upcoming record dates — the section that answers "can I still get this one?".
 *
 * A calendar reads by date, so each record date is one card: a date tile, the
 * weekday and how far away it is, the last day to buy (toned by how much time
 * is left), then every company paying on it with the cash a share leading.
 * Record dates with no cash or bonus attached are listed underneath: they
 * still matter (they fix who may attend and vote at the AGM), but nobody
 * scanning for income should have to read past them.
 */
export default function RecordDateBoard({ events }: { events: CorporateActionEvent[] }) {
  const paying = events.filter((e) => !e.is_no_dividend);
  const nonPaying = events.filter((e) => e.is_no_dividend);
  // The free glimpse is taken from the whole list, paying dates first.
  const [freeRows, lockedRows] = splitFree([...paying, ...nonPaying], FREE_CALENDAR_ROWS.recordDates);
  const lockedPaying = lockedRows.filter((e) => !e.is_no_dividend);
  const lockedNonPaying = lockedRows.filter((e) => e.is_no_dividend);
  const freePaying = freeRows.filter((e) => !e.is_no_dividend);
  const freeNonPaying = freeRows.filter((e) => e.is_no_dividend);
  const locked = lockedPaying.length + lockedNonPaying.length;

  const { freeGroups, lockedGroups, cont } = splitGroups(freePaying, lockedPaying, "record_date");
  const groups = (list: typeof freeGroups, half: "free" | "locked") =>
    list.map((g, i) => (
      <DateGroup
        key={g.date}
        date={g.date}
        items={g.items}
        kind="record"
        part={cont ? (half === "free" && i === list.length - 1 ? "split" : half === "locked" && i === 0 ? "cont" : undefined) : undefined}
      />
    ));
  const plainList = (rows: CorporateActionEvent[]) => (
    <ul className="soft-card dc-list overflow-hidden">
      {rows.map((e) => (
        <li key={`${e.trading_code}-${e.record_date}`}>
          <DividendRow e={e} mode="dated" />
        </li>
      ))}
    </ul>
  );
  const noDividendHead = (
    <>
      <h3 className="dc-sub-head">
        <T en="Record date, but no dividend declared" bn="রেকর্ড ডেট আছে, কিন্তু ডিভিডেন্ড ঘোষণা নেই" />
      </h3>
      <p className="dc-sub-note">
        <T
          en="These companies declared no dividend this time. The record date only decides who can attend and vote at the AGM."
          bn="এই কোম্পানিগুলো এবার কোনো ডিভিডেন্ড ঘোষণা করেনি। এখানে রেকর্ড ডেট শুধু ঠিক করে কারা এজিএমে যোগ দিয়ে ভোট দিতে পারবেন।"
        />
      </p>
    </>
  );

  return (
    <section className="dc-section" id="record-dates">
      <SectionHeader
        title={<T en="Upcoming record dates" bn="আসন্ন রেকর্ড ডেট" />}
        lead={
          <T
            en="Own the share on the record date and the dividend is yours. Each date shows the last day you can buy and still be on the register."
            bn="রেকর্ড ডেটে শেয়ার আপনার কাছে থাকলে ডিভিডেন্ড আপনার। প্রতিটি তারিখে লেখা আছে, কবের মধ্যে কিনলে আপনার নাম তালিকায় উঠবে।"
          />
        }
      />

      {events.length === 0 ? (
        <div className="soft-card">
          <p className="dc-empty">
            <T
              en="No record date is coming up in the next 120 days. New declarations appear here on the day DSE publishes them."
              bn="সামনের 120 দিনে কোনো রেকর্ড ডেট নেই। ডিএসই নতুন ঘোষণা প্রকাশ করলে সেদিনই তা এখানে দেখা যাবে।"
            />
          </p>
        </div>
      ) : (
        <>
          {/* Free readers get a glimpse — the nearest dates, paying first; the
              rest sits behind the premium lock (screen-only, blurred). */}
          {freeGroups.length > 0 && <div className="dc-stack">{groups(freeGroups, "free")}</div>}
          {freeNonPaying.length > 0 && (
            <>
              {noDividendHead}
              {plainList(freeNonPaying)}
            </>
          )}

          {locked > 0 && (
            <CalendarLock
              label={{ en: `${locked} more record dates`, bn: `আরও ${locked}টি রেকর্ড ডেট` }}
              peek={180}
              className={`dc-gate ${cont ? "dc-gate--cont" : ""}`}
            >
              {lockedGroups.length > 0 && <div className="dc-stack">{groups(lockedGroups, "locked")}</div>}
              {lockedNonPaying.length > 0 && (
                <>
                  {freeNonPaying.length === 0 && noDividendHead}
                  {plainList(lockedNonPaying)}
                </>
              )}
            </CalendarLock>
          )}
        </>
      )}
    </section>
  );
}
