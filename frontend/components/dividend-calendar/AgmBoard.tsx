import { T } from "@/components/i18n/T";
import { bnDate } from "@/lib/bn";
import StockRow, { StockRowValue } from "@/components/ui/StockRow";
import { formatDate, pct } from "@/lib/formatters";
import CalendarLock from "@/components/dividend-calendar/CalendarLock";
import { FREE_CALENDAR_ROWS, splitFree } from "@/lib/free-share";
import type { CorporateActionEvent } from "@/lib/api";
import SectionHeader from "@/components/ui/SectionHeader";

function dividendLabel(e: CorporateActionEvent) {
  const en: string[] = [];
  const bn: string[] = [];
  if (e.cash_pct) {
    const p = pct(e.cash_pct, e.cash_pct % 1 ? 2 : 0);
    en.push(`${p} cash`);
    bn.push(`${p} নগদ`);
  }
  if (e.stock_pct) {
    const p = pct(e.stock_pct, e.stock_pct % 1 ? 2 : 0);
    en.push(`${p} bonus`);
    bn.push(`${p} বোনাস`);
  }
  return en.length
    ? { en: `${en.join(" + ")} up for approval`, bn: `${bn.join(" + ")} অনুমোদনের অপেক্ষায়` }
    : { en: "No dividend up for approval", bn: "অনুমোদনের জন্য কোনো ডিভিডেন্ড নেই" };
}

function daysLabel(days: number | null | undefined) {
  if (days == null) return undefined;
  if (days === 0) return <T en="today" bn="আজ" />;
  if (days === 1) return <T en="tomorrow" bn="আগামীকাল" />;
  return <T en={`in ${days} days`} bn={`${days} দিন পর`} />;
}

/** Announced AGM dates — where the dividend gets approved before it's paid. */
export default function AgmBoard({ events }: { events: CorporateActionEvent[] }) {
  if (events.length === 0) return null;
  // Free readers see the next AGM; the rest is Premium (screen-only lock).
  const [free, locked] = splitFree(events, FREE_CALENDAR_ROWS.agms);
  const row = (e: CorporateActionEvent) => (
    <StockRow
      key={`${e.trading_code}-${e.agm_date}`}
      code={e.trading_code}
      name={e.company_name}
      sub={
        <span className="font-semibold">
          <T en={dividendLabel(e).en} bn={dividendLabel(e).bn} />
        </span>
      }
      subTone={e.cash_pct ? "positive" : "muted"}
      right={
        <StockRowValue
          value={
            <span className="text-xs">
              <T en={`AGM ${formatDate(e.agm_date)}`} bn={`এজিএম ${bnDate(e.agm_date)}`} />
            </span>
          }
          sub={daysLabel(e.agm_days_left)}
          subTone={e.agm_days_left != null && e.agm_days_left <= 1 ? "watch" : "muted"}
        />
      }
      />
  );

  return (
    <section className="mb-8" id="agms">
      <SectionHeader title={<T en="Upcoming AGMs" bn="আসন্ন এজিএম" />} className="mt-8" />

      <p className="mb-4 text-sm font-semibold text-text-main">
        <T
          en="A final dividend is only a recommendation until shareholders approve it at the AGM. Payment follows after that, usually within 30 days."
          bn="এজিএমে শেয়ারহোল্ডাররা অনুমোদন না দেওয়া পর্যন্ত চূড়ান্ত ডিভিডেন্ড শুধু একটি সুপারিশ। এরপর সাধারণত 30 দিনের মধ্যে টাকা আসে।"
        />
      </p>

      <ul className="stock-list">{free.map(row)}</ul>
      {locked.length > 0 && (
        <CalendarLock
          label={{ en: `${locked.length} more AGMs`, bn: `আরও ${locked.length}টি এজিএম` }}
          peek={120}
          compact
          className="mt-2"
        >
          <ul className="stock-list">{locked.map(row)}</ul>
        </CalendarLock>
      )}
    </section>
  );
}
