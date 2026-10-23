import Bn from "@/components/i18n/Bn";
import EventCard from "@/components/dividend-calendar/EventCard";
import PremiumGate from "@/components/premium/PremiumGate";
import { splitFree } from "@/lib/free-share";
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
  const [free, locked] = splitFree(events.slice(0, limit));
  const card = (e: CorporateActionEvent) => (
    <EventCard key={`${e.trading_code}-${e.declaration_date}`} event={e} mode="declared" />
  );

  return (
    <section className="mb-8" id="recent">
      <div className="section-rule-modern">
        <span className="section-rule-text">Just Declared</span>
      </div>

      <p className="mb-1 text-sm font-semibold text-text-main">
        The newest dividend announcements, with the record date each one carries.
      </p>
      <Bn className="mb-4 text-sm font-medium leading-[1.85] text-text-muted">
        সদ্য ঘোষিত লভ্যাংশ এবং তার রেকর্ড ডেট।
      </Bn>

      {/* Free readers see the newest quarter; the rest is Premium (screen-only lock). */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{free.map(card)}</div>
      {locked.length > 0 && (
        <PremiumGate label={`${locked.length} more announcements`} peek={180} className="mt-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{locked.map(card)}</div>
        </PremiumGate>
      )}
    </section>
  );
}
