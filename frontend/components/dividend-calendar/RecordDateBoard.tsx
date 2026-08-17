import Bn from "@/components/i18n/Bn";
import EventCard from "@/components/dividend-calendar/EventCard";
import type { CorporateActionEvent } from "@/lib/api";

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

  return (
    <section className="mb-8" id="record-dates">
      <div className="section-rule-modern">
        <span className="section-rule-text">Upcoming Record Dates</span>
      </div>

      <p className="mb-1 text-[0.88rem] font-semibold text-[var(--text)]">
        Own the share on the record date and the dividend is yours — the company pays
        whoever is on the register that day, not whoever holds it later.
      </p>
      <Bn className="mb-4 text-[0.9rem] font-medium leading-[1.85] text-[var(--text-muted)]">
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {paying.map((e) => (
              <EventCard key={`${e.trading_code}-${e.record_date}`} event={e} mode="record" />
            ))}
          </div>

          {nonPaying.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-1 text-[0.82rem] font-extrabold uppercase tracking-[0.13em] text-[var(--text-muted)]">
                Record date, but no dividend declared
              </h3>
              <p className="mb-3 text-[0.8rem] font-semibold text-[var(--text-muted)]">
                These companies declared no dividend this time. The record date only fixes who
                can attend and vote at the AGM.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {nonPaying.map((e) => (
                  <EventCard key={`${e.trading_code}-${e.record_date}`} event={e} mode="record" />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
