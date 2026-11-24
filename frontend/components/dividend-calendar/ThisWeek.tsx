import { T } from "@/components/i18n/T";
import DateBoard from "@/components/dividend-calendar/DateGroup";
import { dayShort } from "@/components/dividend-calendar/dates";
import type { CorporateActionEvent } from "@/lib/api";
import { FREE_WEEK_DAYS, weekEvents } from "@/lib/dividend-promo";

/**
 * The free week (THE Premium line, step 2, 2026-11-22): every dividend-paying
 * record date in the next `FREE_WEEK_DAYS` days, in full, for every reader
 * and for Google — the calendar's door. The rest of the calendar, who
 * declares next, the reader's own dividends in taka and the reminders are
 * Premium (the locked calendar under it, `CalendarLocks`, since 2026-11-25).
 * Rows are the calendar's own; "Remind me" opens the share's Watch sheet.
 */
export default function ThisWeek({ events }: { events: CorporateActionEvent[] }) {
  const week = weekEvents(events);
  const next = events
    .filter((e) => !e.is_no_dividend && e.record_days_left != null && e.record_days_left > FREE_WEEK_DAYS && e.record_date)
    .sort((a, b) => (a.record_date as string).localeCompare(b.record_date as string))[0];
  const nextDay = next ? dayShort(next.record_date) : null;

  return (
    <section id="this-week" className="dc-week" aria-labelledby="dc-week-title">
      <div className="dc-panel-head">
        <h2 id="dc-week-title" className="dc-panel-title">
          <T en="Record dates this week" bn="এই সপ্তাহের রেকর্ড ডেট" />
        </h2>
        <p className="dc-panel-lead">
          <T
            en={`Free for everyone: every company paying a dividend in the next ${FREE_WEEK_DAYS} days, how much a share, and the last day to buy to get it.`}
            bn={`সবার জন্য ফ্রি: আগামী ${FREE_WEEK_DAYS} দিনে যেসব কোম্পানি ডিভিডেন্ড দিচ্ছে, শেয়ারপ্রতি কত, আর পেতে হলে কেনার শেষ দিন।`}
          />
        </p>
      </div>
      {week.length > 0 ? (
        <DateBoard events={week} kind="record" />
      ) : (
        <div className="soft-card">
          <p className="dc-empty">
            {nextDay ? (
              <T
                en={`No dividend record date in the next ${FREE_WEEK_DAYS} days. The next one is on ${nextDay.en}.`}
                bn={`আগামী ${FREE_WEEK_DAYS} দিনে কোনো ডিভিডেন্ডের রেকর্ড ডেট নেই। পরেরটি ${nextDay.bn}।`}
              />
            ) : (
              <T
                en={`No dividend record date in the next ${FREE_WEEK_DAYS} days.`}
                bn={`আগামী ${FREE_WEEK_DAYS} দিনে কোনো ডিভিডেন্ডের রেকর্ড ডেট নেই।`}
              />
            )}
          </p>
        </div>
      )}
    </section>
  );
}
