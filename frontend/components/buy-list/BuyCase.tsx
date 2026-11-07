import Link from "next/link";
import { T } from "@/components/i18n/T";
import { DateTile } from "@/components/dividend-calendar/DateGroup";
import { dayShort } from "@/components/dividend-calendar/dates";
import { IconAlert, IconArrowRight, IconCheck } from "@/components/ui/icons";
import { money } from "@/lib/formatters";
import { cashWords, type BuyListItem, type BuyListNext } from "@/lib/buy-list";

const TONE: Record<string, string> = { good: "text-positive", neutral: "text-text-main", watch: "text-watch" };

/** Today's price on a line against our fair-price range and our buy-under
 *  price. The key under it carries the figures, so nothing overlaps. */
function PriceBar({ item }: { item: BuyListItem }) {
  const { price, buy_below: buy, fair } = item;
  if (!fair || price == null) return null;
  const lo = Math.min(price, buy ?? price, fair.low) * 0.94;
  const hi = Math.max(fair.high, price) * 1.03;
  const at = (v: number) => `${(((v - lo) / (hi - lo)) * 100).toFixed(1)}%`;
  return (
    <div className="bl-pp">
      <p className="bl-k">
        <T en="Today's price against what we think it is worth" bn="আজকের দাম বনাম আমাদের হিসাবের মূল্য" />
      </p>
      <div className="bl-pp-track" aria-hidden="true">
        <span className="bl-pp-line" />
        <span className="bl-pp-band" style={{ left: at(fair.low), width: `calc(${at(fair.high)} - ${at(fair.low)})` }} />
        <span className="bl-pp-mid" style={{ left: at(fair.mid) }} />
        {buy != null && <span className="bl-pp-buy" style={{ left: at(buy) }} />}
        <span className="bl-pp-now" style={{ left: at(price) }} />
      </div>
      <ul className="bl-pp-key">
        <li>
          <span className="bl-key bl-key--now" aria-hidden="true" />
          <span>
            <T en="Today" bn="আজ" />
          </span>
          <b className="nums">{money(price)}</b>
        </li>
        {buy != null && (
          <li>
            <span className="bl-key bl-key--buy" aria-hidden="true" />
            <span>
              <T en="Worth buying under" bn="এর নিচে কেনার মতো" />
            </span>
            <b className="nums">{money(buy)}</b>
          </li>
        )}
        <li>
          <span className="bl-key bl-key--fair" aria-hidden="true" />
          <span>
            <T en="Our fair price" bn="আমাদের ন্যায্য দাম" />
          </span>
          <b className="nums">
            <T en={`${money(fair.low)} to ${money(fair.high)}`} bn={`${money(fair.low)} থেকে ${money(fair.high)}`} />
          </b>
        </li>
      </ul>
    </div>
  );
}

function NextRow({ n }: { n: BuyListNext }) {
  const d = dayShort(n.date);
  if (n.kind === "results") {
    const fallback = n.months
      ? { en: `Results for the last ${n.months} months.`, bn: `শেষ ${n.months} মাসের আর্থিক ফল।` }
      : { en: "Its next results.", bn: "পরের আর্থিক ফল।" };
    const line = n.line ?? fallback;
    return (
      <li className="bl-nx">
        <DateTile iso={n.date} small soon />
        <p>
          <b>
            <T en={`Results due ${d.en}`} bn={`আর্থিক ফল আসবে ${d.bn}`} />
          </b>
          <T en={line.en} bn={line.bn} />
        </p>
      </li>
    );
  }
  const r = dayShort(n.record_date);
  const cash = cashWords(n.cash_ps);
  return (
    <li className="bl-nx">
      <DateTile iso={n.date} small soon />
      <p>
        <b>
          <T en={`Last day to buy for its dividend: ${d.en}`} bn={`ডিভিডেন্ড পেতে কেনার শেষ দিন: ${d.bn}`} />
        </b>
        <T
          en={`Buy by then to get ${cash} a share, before tax. Record date ${r.en}.`}
          bn={`এ দিনের মধ্যে কিনলে শেয়ারপ্রতি ${cash} পাবেন, কর কাটার আগে। রেকর্ড ডেট ${r.bn}।`}
        />
      </p>
    </li>
  );
}

/**
 * One share's case on the Buy List: why it is here, today's price against
 * our fair price and buy-under price, the same four facts as Picked for you,
 * the results and dividend dates coming up, one thing to watch, since when it
 * is on the list and a link to its full analysis. No hooks, so the free
 * reader's example and the Premium list share it.
 */
export default function BuyCase({ item }: { item: BuyListItem }) {
  const since = item.since ? dayShort(item.since, false) : null;
  const more = item.watch?.more ?? 0;
  return (
    <div className="bl-case">
      <p className="bl-why">
        <T en={item.why.en} bn={item.why.bn} />
      </p>

      <div className="bl-case-grid">
        <PriceBar item={item} />
        <dl className="bl-facts">
          {item.facts.map((f) => (
            <div key={f.key} className="bl-fact">
              <dt>
                <T en={f.label.en} bn={f.label.bn} />
              </dt>
              <dd>
                <span className={TONE[f.tone] ?? ""}>
                  <T en={f.value.en} bn={f.value.bn} />
                </span>
                {f.note && (
                  <small>
                    <T en={f.note.en} bn={f.note.bn} />
                  </small>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {item.next.length > 0 ? (
        <div>
          <p className="bl-k">
            <T en="Coming up" bn="সামনে যা আছে" />
          </p>
          <ul className="bl-next">
            {item.next.map((n) => (
              <NextRow key={`${n.kind}-${n.date}`} n={n} />
            ))}
          </ul>
        </div>
      ) : (
        <p className="bl-quiet">
          <b>
            <T en="Coming up: " bn="সামনে: " />
          </b>
          <T en="no results or dividend dates in the next 2 weeks." bn="আগামী 2 সপ্তাহে আর্থিক ফল বা ডিভিডেন্ডের কোনো তারিখ নেই।" />
        </p>
      )}

      {item.watch ? (
        <div className="bl-watch">
          <span className="bl-watch-ic" aria-hidden="true">
            <IconAlert size={14} />
          </span>
          <p>
            <b>
              <T en="One thing to watch. " bn="খেয়াল রাখার একটি বিষয়। " />
            </b>
            <T en={item.watch.en} bn={item.watch.bn} />
            {more > 0 && (
              <T
                en={` Its stock page lists ${more} more smaller thing${more > 1 ? "s" : ""}.`}
                bn={` এর স্টক পেজে আরও ${more}টি ছোট বিষয় আছে।`}
              />
            )}
          </p>
        </div>
      ) : (
        <div className="bl-watch bl-watch--ok">
          <span className="bl-watch-ic" aria-hidden="true">
            <IconCheck size={14} />
          </span>
          <p>
            <b>
              <T en="No warnings. " bn="কোনো সতর্কতা নেই। " />
            </b>
            <T en="Its stock page shows nothing to watch today." bn="আজ এর স্টক পেজে খেয়াল রাখার মতো কিছু নেই।" />
          </p>
        </div>
      )}

      <div className="bl-foot">
        {since && <T en={`On the list since ${since.en}`} bn={`তালিকায় আছে ${since.bn} থেকে`} />}
        <Link prefetch={false} href={`/stock/${item.code}#ch-analysis`} className="bl-read">
          <T en="Read our full analysis" bn="আমাদের পুরো বিশ্লেষণ পড়ুন" />
          <IconArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
