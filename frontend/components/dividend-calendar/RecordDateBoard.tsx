import { T } from "@/components/i18n/T";
import DateBoard from "@/components/dividend-calendar/DateGroup";
import DividendRow from "@/components/dividend-calendar/DividendRow";
import PanelHead from "@/components/dividend-calendar/PanelHead";
import type { CorporateActionEvent } from "@/lib/api";

/**
 * Upcoming record dates — the tab that answers "can I still get this one?".
 *
 * A calendar reads by date: one card, each record date a small date tile with
 * the weekday and the last day to buy (toned by how much time is left), then
 * every company paying on it with the cash a share leading. Record dates with
 * no cash or bonus attached fold into the card's last row: they still matter
 * (they fix who may attend and vote at the AGM), but nobody scanning for
 * income should have to read past them.
 */
export default function RecordDateBoard({ events }: { events: CorporateActionEvent[] }) {
  const paying = events.filter((e) => !e.is_no_dividend);
  const nonPaying = events.filter((e) => e.is_no_dividend);

  const head = (
    <PanelHead
      title={<T en="Upcoming record dates" bn="আসন্ন রেকর্ড ডেট" />}
      lead={
        <T
          en="Own the share on the record date and the dividend is yours. Each date shows the last day to buy."
          bn="রেকর্ড ডেটে শেয়ার আপনার কাছে থাকলে ডিভিডেন্ড আপনার। প্রতিটি তারিখে কেনার শেষ দিন লেখা আছে।"
        />
      }
    />
  );

  if (events.length === 0) {
    return (
      <>
        {head}
        <div className="soft-card">
          <p className="dc-empty">
            <T
              en="No record date is coming up in the next 120 days. New declarations appear here on the day DSE publishes them."
              bn="সামনের 120 দিনে কোনো রেকর্ড ডেট নেই। ডিএসই নতুন ঘোষণা প্রকাশ করলে সেদিনই তা এখানে দেখা যাবে।"
            />
          </p>
        </div>
      </>
    );
  }

  const noDividend =
    nonPaying.length > 0 ? (
      <details className="dc-details">
        <summary>
          <T
            en={`${nonPaying.length} more record dates with no dividend`}
            bn={`ডিভিডেন্ড ছাড়া আরও ${nonPaying.length}টি রেকর্ড ডেট`}
          />
        </summary>
        <p className="dc-details-note">
          <T
            en="These companies declared no dividend this time. The record date only decides who can attend and vote at the AGM."
            bn="এই কোম্পানিগুলো এবার কোনো ডিভিডেন্ড ঘোষণা করেনি। এখানে রেকর্ড ডেট শুধু ঠিক করে কারা এজিএমে যোগ দিয়ে ভোট দিতে পারবেন।"
          />
        </p>
        <ul className="dc-list">
          {nonPaying.map((e) => (
            <li key={`${e.trading_code}-${e.record_date}`}>
              <DividendRow e={e} mode="dated" />
            </li>
          ))}
        </ul>
      </details>
    ) : null;

  return (
    <>
      {head}
      {paying.length > 0 ? (
        <DateBoard events={paying} kind="record" footer={noDividend} />
      ) : (
        <div className="soft-card dc-board">{noDividend}</div>
      )}
    </>
  );
}
