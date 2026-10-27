import { T } from "@/components/i18n/T";
import EventCard from "@/components/dividend-calendar/EventCard";
import CalendarLock from "@/components/dividend-calendar/CalendarLock";
import { FREE_CALENDAR_ROWS, splitFree } from "@/lib/free-share";
import type { CorporateActionEvent } from "@/lib/api";
import SectionHeader from "@/components/ui/SectionHeader";

/**
 * Upcoming record dates — the section that answers "can I still get this one?".
 *
 * Cash dividends lead. Record dates with no cash or bonus attached are grouped
 * underneath: they still matter (they fix who may attend and vote at the AGM),
 * but nobody scanning for income should have to read past them.
 */
export default function RecordDateBoard({ events }: { events: CorporateActionEvent[] }) {
  const paying = events.filter((e) => !e.is_no_dividend);
  const nonPaying = events.filter((e) => e.is_no_dividend);
  // The free glimpse is taken from the whole list, paying dates first.
  const [freeRows, lockedRows] = splitFree([...paying, ...nonPaying], FREE_CALENDAR_ROWS.recordDates);
  const lockedPaying = lockedRows.filter((e) => !e.is_no_dividend);
  const lockedNonPaying = lockedRows.filter((e) => e.is_no_dividend);
  const weekLocked = lockedPaying.filter(
    (e) => e.record_days_left != null && e.record_days_left <= 7,
  ).length;
  const card = (e: CorporateActionEvent) => (
    <EventCard key={`${e.trading_code}-${e.record_date}`} event={e} mode="record" />
  );

  return (
    <section className="mb-8" id="record-dates">
      <SectionHeader title={<T en="Upcoming record dates" bn="আসন্ন রেকর্ড ডেট" />} className="mt-8" />

      <p className="mb-4 text-sm font-semibold text-text-main">
        <T
          en="If you own the share on the record date, the dividend is yours. The company pays whoever is on its register that day, not whoever holds the share later."
          bn="রেকর্ড ডেটে শেয়ার আপনার কাছে থাকলে ডিভিডেন্ড আপনার। কোম্পানি সেদিন যাদের নাম তালিকায় থাকে তাদেরই দেয়, পরে যার কাছে শেয়ার যায় তাকে নয়।"
        />
      </p>

      {events.length === 0 ? (
        <div className="ms-card">
          <p className="ms-empty">
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
          {freeRows.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {freeRows.map(card)}
            </div>
          )}

          {(lockedPaying.length > 0 || lockedNonPaying.length > 0) && (
            <CalendarLock
              label={{
                en: `${lockedPaying.length + lockedNonPaying.length} more record dates`,
                bn: `আরও ${lockedPaying.length + lockedNonPaying.length}টি রেকর্ড ডেট`,
              }}
              peek={160}
              stakes={[
                lockedPaying.length > 0
                  ? {
                      en: `${lockedPaying.length} more companies paying a dividend`,
                      bn: `ডিভিডেন্ড দিচ্ছে আরও ${lockedPaying.length}টি কোম্পানি`,
                    }
                  : null,
                weekLocked > 0
                  ? { en: `${weekLocked} of them within the next 7 days`, bn: `এর ${weekLocked}টি সামনের 7 দিনের মধ্যে` }
                  : null,
              ]}
              className="mt-3"
            >
              {lockedPaying.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {lockedPaying.map(card)}
                </div>
              )}

              {lockedNonPaying.length > 0 && (
                <div className={lockedPaying.length > 0 ? "mt-5" : ""}>
                  <h3 className="mb-1 text-sm font-bold text-text-muted">
                    <T en="Record date, but no dividend declared" bn="রেকর্ড ডেট আছে, কিন্তু ডিভিডেন্ড ঘোষণা নেই" />
                  </h3>
                  <p className="mb-3 text-sm font-semibold text-text-muted">
                    <T
                      en="These companies declared no dividend this time. The record date only decides who can attend and vote at the AGM."
                      bn="এই কোম্পানিগুলো এবার কোনো ডিভিডেন্ড ঘোষণা করেনি। এখানে রেকর্ড ডেট শুধু ঠিক করে কারা এজিএমে যোগ দিয়ে ভোট দিতে পারবেন।"
                    />
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {lockedNonPaying.map(card)}
                  </div>
                </div>
              )}
            </CalendarLock>
          )}
        </>
      )}
    </section>
  );
}
