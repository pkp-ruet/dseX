import Bn from "@/components/i18n/Bn";
import EventCard from "@/components/dividend-calendar/EventCard";
import type { CorporateActionEvent } from "@/lib/api";

/** What DSE companies announced in the last few weeks, newest first. */
export default function RecentDeclarations({
  events,
  limit = 12,
}: {
  events: CorporateActionEvent[];
  limit?: number;
}) {
  if (events.length === 0) return null;

  return (
    <section className="mb-8" id="recent">
      <div className="section-rule-modern">
        <span className="section-rule-text">Just Declared</span>
      </div>

      <p className="mb-1 text-[0.88rem] font-semibold text-[var(--text)]">
        The newest dividend announcements, with the record date each one carries.
      </p>
      <Bn className="mb-4 text-[0.9rem] font-medium leading-[1.85] text-[var(--text-muted)]">
        সদ্য ঘোষিত লভ্যাংশ এবং তার রেকর্ড ডেট।
      </Bn>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {events.slice(0, limit).map((e) => (
          <EventCard
            key={`${e.trading_code}-${e.declaration_date}`}
            event={e}
            mode="declared"
          />
        ))}
      </div>
    </section>
  );
}
