import { T } from "@/components/i18n/T";
import DateGroup, { countByDate, groupByDate, splitGroups } from "@/components/dividend-calendar/DateGroup";
import DividendRow from "@/components/dividend-calendar/DividendRow";
import RowLock from "@/components/premium/RowLock";
import LockPanel, { type LockTile } from "@/components/premium/LockPanel";
import { perShareTk } from "@/components/dividend-calendar/DividendRow";
import { CALENDAR_PREVIEW_ROWS, FREE_CALENDAR_ROWS, splitFree } from "@/lib/free-share";
import { pct } from "@/lib/formatters";
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
  const perDate = countByDate(paying, "record_date");
  const groups = (list: typeof freeGroups, half: "free" | "locked", masked = false) =>
    list.map((g, i) => (
      <DateGroup
        key={g.date}
        date={g.date}
        items={g.items}
        kind="record"
        masked={masked}
        total={perDate.get(g.date)}
        part={cont ? (half === "free" && i === list.length - 1 ? "split" : half === "locked" && i === 0 ? "cont" : undefined) : undefined}
      />
    ));
  // The lock: the next paying rows with the company hidden, then what's behind
  // it — the counts come from the hidden rows (free numbers; the names are what's locked).
  const previewGroups = groupByDate(lockedPaying.slice(0, CALENDAR_PREVIEW_ROWS.recordDates), "record_date");
  const week = lockedPaying.filter((e) => e.record_days_left != null && e.record_days_left <= 7).length;
  const maxCash = Math.max(0, ...lockedPaying.map((e) => e.cash_per_share ?? 0));
  const bestYield = Math.max(0, ...lockedPaying.map((e) => e.yield_pct ?? 0));
  const tiles: LockTile[] = [
    week > 0 ? { value: String(week), label: { en: "in the next 7 days", bn: "আগামী 7 দিনে" } } : null,
    maxCash > 0 ? { value: perShareTk(maxCash), label: { en: "biggest cash a share", bn: "সবচেয়ে বেশি শেয়ারপ্রতি নগদ" } } : null,
    bestYield > 0 ? { value: pct(bestYield, 1), label: { en: "best yield", bn: "সর্বোচ্চ ইল্ড" } } : null,
  ].filter((t): t is LockTile => t != null);
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
              rest sits behind the lock (screen-only): a preview with the
              company hidden, then what Premium shows. */}
          {freeGroups.length > 0 && <div className="dc-stack">{groups(freeGroups, "free")}</div>}
          {freeNonPaying.length > 0 && (
            <>
              {noDividendHead}
              {plainList(freeNonPaying)}
            </>
          )}

          {locked > 0 && (
            <RowLock
              className={`dc-gate ${cont ? "dc-gate--cont" : ""}`}
              preview={previewGroups.length > 0 ? <div className="dc-stack">{groups(previewGroups, "locked", true)}</div> : null}
              panel={
                <LockPanel
                  variant="full"
                  title={{
                    en: `See the companies behind ${locked} more record ${locked === 1 ? "date" : "dates"}`,
                    bn: `আরও ${locked}টি রেকর্ড ডেটের কোম্পানিগুলো দেখুন`,
                  }}
                  sub={{
                    en: "Premium shows every record date in the next 120 days: the company, the cash a share, the yield and the last day to buy.",
                    bn: "প্রিমিয়ামে আগামী 120 দিনের প্রতিটি রেকর্ড ডেট: কোম্পানি, শেয়ারপ্রতি নগদ, ইল্ড আর কেনার শেষ দিন।",
                  }}
                  tiles={tiles}
                  codes={lockedRows.map((e) => e.trading_code)}
                  count={locked}
                  lock="Dividend calendar: record dates"
                  what={{ en: "The full dividend calendar", bn: "পুরো ডিভিডেন্ড ক্যালেন্ডার" }}
                />
              }
            >
              {lockedGroups.length > 0 && <div className="dc-stack">{groups(lockedGroups, "locked")}</div>}
              {lockedNonPaying.length > 0 && (
                <>
                  {freeNonPaying.length === 0 && noDividendHead}
                  {plainList(lockedNonPaying)}
                </>
              )}
            </RowLock>
          )}
        </>
      )}
    </section>
  );
}
