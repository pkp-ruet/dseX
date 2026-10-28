import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import { IconInfo } from "@/components/ui/icons";
import { pct } from "@/lib/formatters";
import type { DividendCalendarData } from "@/lib/api";

function Answer({ n, q, x }: { n: string; q: ReactNode; x: ReactNode }) {
  return (
    <div className="dc-answer">
      <span className="dc-answer-n">{n}</span>
      <span className="dc-answer-q">{q}</span>
      <span className="dc-answer-x">{x}</span>
    </div>
  );
}

/**
 * Top of the page (2026-10-28 clean redesign): ONE card — the four numbers
 * that say what's ahead in a hairline grid, then the one rule that decides
 * whether a dividend is yours as its footer. No tinted tiles, no ribbon.
 */
export default function CalendarSummary({ data }: { data: DividendCalendarData }) {
  const s = data.stats;
  return (
    <section className="soft-card dc-summary">
      <div className="dc-answers">
        <Answer
          n={String(s.upcoming_record_dates)}
          q={<T en="Record dates ahead" bn="সামনের রেকর্ড ডেট" />}
          x={<T en="in the next 120 days" bn="আগামী 120 দিনে" />}
        />
        <Answer
          n={String(s.record_dates_this_week)}
          q={<T en="This week" bn="এই সপ্তাহে" />}
          x={<T en="record dates within 7 days" bn="7 দিনের মধ্যে রেকর্ড ডেট" />}
        />
        <Answer
          n={String(s.upcoming_agms)}
          q={<T en="AGMs ahead" bn="সামনের এজিএম" />}
          x={<T en="where dividends are approved" bn="যেখানে ডিভিডেন্ড অনুমোদন হয়" />}
        />
        <Answer
          n={s.top_yield_pct != null ? pct(s.top_yield_pct, 1) : "—"}
          q={<T en="Best yield ahead" bn="সামনের সর্বোচ্চ ইল্ড" />}
          x={<T en="cash, at today's price" bn="নগদ, আজকের দামে" />}
        />
      </div>
      <p className="dc-rule">
        <span className="dc-rule-icon" aria-hidden="true">
          <IconInfo size={16} />
        </span>
        <span>
          <T en={data.note_en} bn={data.note_bn} />
        </span>
      </p>
    </section>
  );
}
