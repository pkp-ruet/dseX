import { T } from "@/components/i18n/T";
import { IconCalendar, IconInfo } from "@/components/ui/icons";
import { dayShort } from "@/components/dividend-calendar/dates";
import { pct } from "@/lib/formatters";
import type { DividendCalendarData } from "@/lib/api";
import type { CalendarPromo } from "@/lib/dividend-promo";

function Answer({ n, q, x }: { n: string; q: { en: string; bn: string }; x: { en: string; bn: string } }) {
  return (
    <div className="dc-answer">
      <span className="dc-answer-n">{n}</span>
      <span className="dc-answer-q">
        <T en={q.en} bn={q.bn} />
      </span>
      <span className="dc-answer-x">
        <T en={x.en} bn={x.bn} />
      </span>
    </div>
  );
}

/**
 * The top of the calendar (clean pass 2026-11-04, user: the page "look messy
 * and hard to understand"). ONE card that answers "what's ahead?":
 *  1. three numbers — cash dividends ahead, record dates this week, the best
 *     yield (the AGM count left: it is the AGM tab's own count);
 *  2. "Is it safe?" across every cash dividend ahead, as one bar and three
 *     counts in the backend's own words;
 *  3. the next last day to buy, with a link that opens the record dates;
 *  4. the one rule, short (the full answer is in "How a dividend reaches you").
 */
export default function CalendarSummary({ data, promo }: { data: DividendCalendarData; promo: CalendarPromo }) {
  const sf = promo.safety;
  const rated = sf.safe + sf.watch + sf.risk;
  const w = (n: number) => `${(n / rated) * 100}%`;

  // The nearest last day to buy that is still open, and how many cash
  // dividends it is the last day for.
  const next = data.record_dates.find(
    (e) => (e.cash_per_share ?? 0) > 0 && e.buy_by && e.buy_days_left != null && e.buy_days_left >= 0,
  );
  const onNext = next ? data.record_dates.filter((e) => (e.cash_per_share ?? 0) > 0 && e.buy_by === next.buy_by).length : 0;
  const nextDay = next ? dayShort(next.buy_by) : null;
  const nextWhen =
    next?.buy_days_left === 0
      ? { en: "today", bn: "আজ" }
      : next?.buy_days_left === 1
        ? { en: "tomorrow", bn: "আগামীকাল" }
        : nextDay;

  return (
    <section className="soft-card dc-summary">
      <div className="dc-answers">
        <Answer
          n={String(promo.cash)}
          q={{ en: "Cash dividends ahead", bn: "সামনের নগদ ডিভিডেন্ড" }}
          x={{ en: "record dates in the next 120 days", bn: "আগামী 120 দিনে রেকর্ড ডেট" }}
        />
        <Answer
          n={String(promo.thisWeek)}
          q={{ en: "This week", bn: "এই সপ্তাহে" }}
          x={{ en: "record dates within 7 days", bn: "7 দিনের মধ্যে রেকর্ড ডেট" }}
        />
        <Answer
          n={promo.bestYield != null ? pct(promo.bestYield, 1) : "—"}
          q={{ en: "Best yield ahead", bn: "সামনের সর্বোচ্চ ইল্ড" }}
          x={{ en: "cash, at today's price", bn: "নগদ, আজকের দামে" }}
        />
      </div>

      {rated > 0 && (
        <div className="dc-safe">
          <p className="dc-safe-k">
            <T en={`Is it safe? Of the ${rated} cash dividends ahead:`} bn={`নিরাপদ কি? সামনের ${rated}টি নগদ ডিভিডেন্ডের মধ্যে:`} />
          </p>
          <div className="dc-safe-bar" aria-hidden="true">
            {sf.safe > 0 && <span className="dc-safe-seg dc-safe-seg--safe" style={{ width: w(sf.safe) }} />}
            {sf.watch > 0 && <span className="dc-safe-seg dc-safe-seg--watch" style={{ width: w(sf.watch) }} />}
            {sf.risk > 0 && <span className="dc-safe-seg dc-safe-seg--risk" style={{ width: w(sf.risk) }} />}
          </div>
          <ul className="dc-safe-key">
            <li>
              <i className="dc-safe-dot dc-safe-seg--safe" aria-hidden="true" />
              <T en={`${sf.safe} look steady`} bn={`${sf.safe}টি স্থিতিশীল`} />
            </li>
            <li>
              <i className="dc-safe-dot dc-safe-seg--watch" aria-hidden="true" />
              <T en={`${sf.watch} worth a check`} bn={`${sf.watch}টি যাচাই করে নিন`} />
            </li>
            <li>
              <i className="dc-safe-dot dc-safe-seg--risk" aria-hidden="true" />
              <T en={`${sf.risk} at risk`} bn={`${sf.risk}টি ঝুঁকিতে`} />
            </li>
          </ul>
        </div>
      )}

      {next && nextWhen && (
        <p className="dc-next">
          <span className="dc-next-icon" aria-hidden="true">
            <IconCalendar size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <T
              en={`The next last day to buy is ${nextWhen.en}, for ${onNext} cash dividend${onNext === 1 ? "" : "s"}.`}
              bn={`কেনার পরের শেষ দিন ${nextWhen.bn}, ${onNext}টি নগদ ডিভিডেন্ডের জন্য।`}
            />
          </span>
          <a href="#record-dates" className="dc-next-link">
            <T en="See them" bn="দেখুন" />
          </a>
        </p>
      )}

      <p className="dc-rule">
        <span className="dc-rule-icon" aria-hidden="true">
          <IconInfo size={16} />
        </span>
        <span>
          <T
            en="To get a dividend, the shares must be in your account on the record date. Buy by the last day to buy shown on each date."
            bn="ডিভিডেন্ড পেতে রেকর্ড ডেটে শেয়ার আপনার অ্যাকাউন্টে থাকতে হবে। প্রতিটি তারিখে লেখা কেনার শেষ দিনের মধ্যে কিনুন।"
          />
        </span>
      </p>
    </section>
  );
}
