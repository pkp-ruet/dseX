import Bn from "@/components/i18n/Bn";
import EventCard from "@/components/dividend-calendar/EventCard";
import PremiumGate from "@/components/premium/PremiumGate";
import { splitFree } from "@/lib/free-share";
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
  // The free share is taken from the whole list, paying dates first.
  const [freeRows, lockedRows] = splitFree([...paying, ...nonPaying]);
  const lockedPaying = lockedRows.filter((e) => !e.is_no_dividend);
  const lockedNonPaying = lockedRows.filter((e) => e.is_no_dividend);
  const card = (e: CorporateActionEvent) => (
    <EventCard key={`${e.trading_code}-${e.record_date}`} event={e} mode="record" />
  );

  return (
    <section className="mb-8" id="record-dates">
      <SectionHeader title={<>Upcoming record dates</>} className="mt-8" />

      <p className="mb-1 text-sm font-semibold text-text-main">
        Own the share on the record date and the dividend is yours — the company pays
        whoever is on the register that day, not whoever holds it later.
      </p>
      <Bn className="mb-4 text-sm font-medium leading-[1.85] text-text-muted">
        রেকর্ড ডেটের দিন যার নামে শেয়ার থাকবে, লভ্যাংশ সে-ই পাবে — পরে কিনলে এই লভ্যাংশ পাওয়া যাবে না।
      </Bn>

      {events.length === 0 ? (
        <div className="ms-card">
          <p className="ms-empty">
            No record date is coming up in the next 120 days. New declarations appear here
            the day DSE publishes them.
          </p>
        </div>
      ) : (
        <>
          {/* Free readers see the first quarter of the list (paying dates first);
              the rest sits behind the premium lock (screen-only). */}
          {freeRows.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {freeRows.map(card)}
            </div>
          )}

          {(lockedPaying.length > 0 || lockedNonPaying.length > 0) && (
            <PremiumGate
              label={`${lockedPaying.length + lockedNonPaying.length} more record dates`}
              peek={180}
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
                    Record date, but no dividend declared
                  </h3>
                  <p className="mb-3 text-sm font-semibold text-text-muted">
                    These companies declared no dividend this time. The record date only fixes who
                    can attend and vote at the AGM.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {lockedNonPaying.map(card)}
                  </div>
                </div>
              )}
            </PremiumGate>
          )}
        </>
      )}
    </section>
  );
}
