import Bn from "@/components/i18n/Bn";
import EventCard from "@/components/dividend-calendar/EventCard";
import PremiumGate from "@/components/premium/PremiumGate";
import { FREE_CALENDAR_ROWS, splitFree } from "@/lib/free-share";
import type { CorporateActionEvent } from "@/lib/api";
import SectionHeader from "@/components/ui/SectionHeader";

/** What DSE companies announced in the last few weeks, newest first. */
export default function RecentDeclarations({
  events,
  limit = 12,
}: {
  events: CorporateActionEvent[];
  limit?: number;
}) {
  if (events.length === 0) return null;
  const [free, locked] = splitFree(events.slice(0, limit), FREE_CALENDAR_ROWS.declared);
  const card = (e: CorporateActionEvent) => (
    <EventCard key={`${e.trading_code}-${e.declaration_date}`} event={e} mode="declared" />
  );

  return (
    <section className="mb-8" id="recent">
      <SectionHeader title={<>Just declared</>} className="mt-8" />

      <p className="mb-1 text-sm font-semibold text-text-main">
        The newest dividend announcements, with the record date each one carries.
      </p>
      <Bn className="mb-4 text-sm font-medium leading-[1.85] text-text-muted">
        সদ্য ঘোষিত লভ্যাংশ এবং তার রেকর্ড ডেট।
      </Bn>

      {/* Free readers see the newest one; the rest is Premium (screen-only lock). */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{free.map(card)}</div>
      {locked.length > 0 && (
        <PremiumGate label={`${locked.length} more announcements`} preview="blur" peek={140} compact className="mt-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{locked.map(card)}</div>
        </PremiumGate>
      )}
    </section>
  );
}
