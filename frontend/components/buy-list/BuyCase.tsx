import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import { DateTile } from "@/components/dividend-calendar/DateGroup";
import { dayShort } from "@/components/dividend-calendar/dates";
import { IconAlert, IconArrowRight, IconCheck } from "@/components/ui/icons";
import { money } from "@/lib/formatters";
import { cashWords, tradeWords, type BuyListItem, type BuyListNext } from "@/lib/buy-list";

const TONE: Record<string, string> = { good: "text-positive", neutral: "text-text-main", watch: "text-watch" };

type Rung = { key: "fair" | "buy" | "now"; at: number; label: { en: string; bn: string }; value: { en: string; bn: string } };

/**
 * Today's price as a short ladder, highest first: its usual price (its own
 * past prices for its profit and for what it owns), the price it is worth
 * buying under (the price it would join the list at today) and today's
 * price. Read top to bottom, no key needed. A share kept on the list above
 * that price says what a new buy should wait for.
 */
function PriceLadder({ item }: { item: BuyListItem }) {
  const { price, buy_below: buy, fair } = item;
  if (price == null || (!fair && buy == null)) return null;
  const above = buy != null && price > buy;
  const rungs: Rung[] = [];
  if (fair) {
    rungs.push({
      key: "fair",
      at: fair.mid,
      label: { en: "Its usual price", bn: "এর স্বাভাবিক দাম" },
      value: { en: `${money(fair.low)} to ${money(fair.high)}`, bn: `${money(fair.low)} থেকে ${money(fair.high)}` },
    });
  }
  if (buy != null) {
    rungs.push({
      key: "buy",
      at: buy,
      label: { en: "Worth buying under", bn: "এর নিচে কেনার মতো" },
      value: { en: money(buy), bn: money(buy) },
    });
  }
  rungs.push({ key: "now", at: price, label: { en: "Today", bn: "আজ" }, value: { en: money(price), bn: money(price) } });
  const order = { fair: 0, buy: 1, now: 2 };
  rungs.sort((a, b) => b.at - a.at || order[a.key] - order[b.key]);

  return (
    <div className="bl-lad">
      <p className="bl-k">
        <T en="The price" bn="দাম" />
      </p>
      <ol className="bl-lad-rows">
        {rungs.map((r) => (
          <li key={r.key} className={`bl-lad-row bl-lad-row--${r.key}${r.key === "now" && above ? " is-above" : ""}`}>
            <span className="bl-lad-mk" aria-hidden="true" />
            <span className="bl-lad-label">
              <T en={r.label.en} bn={r.label.bn} />
            </span>
            <b className="nums">
              <T en={r.value.en} bn={r.value.bn} />
              {r.key === "now" && buy != null && !above && (
                <span className="bl-lad-tick" aria-hidden="true">
                  <IconCheck size={12} />
                </span>
              )}
            </b>
          </li>
        ))}
      </ol>
      {above && buy != null && (
        <p className="bl-lad-note">
          <T
            en={`A new buy is better at ${money(buy)} or lower. It stays on the list while it is at least 5% under its usual price.`}
            bn={`নতুন করে কিনতে হলে ${money(buy)} বা তার কম দামে কেনা ভালো। স্বাভাবিক দামের চেয়ে অন্তত 5% কম থাকা পর্যন্ত তালিকায় থাকবে।`}
          />
        </p>
      )}
    </div>
  );
}

/** What to know besides the price: the company, profit, cash dividend and
 *  how much trades on a normal day. The price row of the shared four facts is
 *  left out: the ladder says it. */
function GoodToKnow({ item }: { item: BuyListItem }) {
  const facts = item.facts.filter((f) => f.key !== "price");
  const trade = item.trading_mn != null ? tradeWords(item.trading_mn) : null;
  if (!facts.length && !trade) return null;
  return (
    <div>
      <p className="bl-k">
        <T en="Good to know" bn="জেনে রাখুন" />
      </p>
      <dl className="bl-facts">
        {facts.map((f) => (
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
        {trade && (
          <div className="bl-fact">
            <dt>
              <T en="Trading" bn="লেনদেন" />
            </dt>
            <dd>
              <T en={`About ${trade.en} a day`} bn={`দিনে প্রায় ${trade.bn}`} />
              <small>
                <T en="What changes hands on a normal day." bn="সাধারণ একটি দিনে যত টাকার কেনাবেচা হয়।" />
              </small>
            </dd>
          </div>
        )}
      </dl>
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
 * One share opened on the Buy List. The row above it already says why it is
 * here, so this holds the rest: a note when it missed at the last close, the
 * price ladder, what to know (company, profit, cash dividend, trading), the
 * dates coming up, the thing to watch, since when it is on the list and a
 * link to its full analysis. No hooks, so the free reader's share of the day
 * and the Premium list share it.
 */
export default function BuyCase({ item }: { item: BuyListItem }) {
  const since = item.since ? dayShort(item.since, false) : null;
  const more = item.watch?.more ?? 0;
  return (
    <div className="bl-case">
      {item.grace && (
        <p className="bl-note-line bl-note-line--watch">
          <T en={item.grace.en} bn={item.grace.bn} />
        </p>
      )}

      <div className="bl-case-grid">
        <PriceLadder item={item} />
        <GoodToKnow item={item} />
      </div>

      {item.next.length > 0 && (
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
      )}

      {item.watch ? (
        <div className={`bl-watch${item.watch.level === "red" ? " bl-watch--red" : ""}`}>
          <span className="bl-watch-ic" aria-hidden="true">
            <IconAlert size={14} />
          </span>
          <p>
            <b>
              <T en="Something to watch. " bn="খেয়াল রাখার বিষয়। " />
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
