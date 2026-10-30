import type { CautionItem, MarketWatchOut, ZRiskItem } from "@/lib/api";
import { Locked } from "@/components/premium/AnswerLock";
import { T } from "@/components/i18n/T";
import MarketRow from "./MarketRow";
import MkCard from "./MkCard";
import ShowMore from "./ShowMore";

/** Rows shown before "See all". */
const ROWS = 3;

/**
 * "Things to watch out for" (2026-10-31, the Premium Desk plan): two cards —
 * shares running hard with no news from the company (the stock report's
 * rumour-rally check, run on every share) and companies close to category Z.
 * Free: how many and which companies, with the size of the run / the category
 * today. Premium (screen-only `Locked`, named by the page's `#ma-premium`
 * card): the reason for each and what it means.
 */
export default function WatchOut({ data }: { data: MarketWatchOut }) {
  const caution = data.caution ?? [];
  const zRisk = data.z_risk ?? [];
  return (
    <div className="mk-pair">
      <MkCard
        title={<T en="Running with no news" bn="খবর ছাড়াই দাম বাড়ছে" />}
        note={
          caution.length > 0 ? (
            <T
              en={`${caution.length} ${caution.length === 1 ? "share has" : "shares have"} risen 30% in a month, or 50% in three, with no news from the company.`}
              bn={`${caution.length}টি শেয়ারের দাম কোম্পানির কোনো খবর ছাড়াই এক মাসে 30% বা তিন মাসে 50% বেড়েছে।`}
            />
          ) : (
            <T
              en="Shares that rose 30% in a month, or 50% in three, with no news from the company."
              bn="যেসব শেয়ারের দাম কোম্পানির কোনো খবর ছাড়াই এক মাসে 30% বা তিন মাসে 50% বেড়েছে।"
            />
          )
        }
      >
        {caution.length === 0 ? (
          <p className="mk-empty">
            <T en="No share is running like this right now." bn="এ মুহূর্তে এমন কোনো শেয়ার নেই।" />
          </p>
        ) : (
          <ShowMore initial={ROWS} rows={caution.map((c) => <CautionRow key={c.code} item={c} />)} className="mk-rows" />
        )}
      </MkCard>

      <MkCard
        title={<T en="Close to category Z" bn="Z ক্যাটাগরির কাছাকাছি" />}
        note={
          zRisk.length > 0 ? (
            <T
              en={`${zRisk.length} ${zRisk.length === 1 ? "company is not in Z yet, but looks" : "companies are not in Z yet, but look"} close to it under DSE's rules.`}
              bn={`${zRisk.length}টি কোম্পানি এখনো Z ক্যাটাগরিতে নেই, তবে ডিএসইর নিয়মে এর কাছাকাছি মনে হচ্ছে।`}
            />
          ) : (
            <T
              en="Companies not in Z yet that look close to it under DSE's rules."
              bn="যেসব কোম্পানি এখনো Z ক্যাটাগরিতে নেই, তবে ডিএসইর নিয়মে এর কাছাকাছি।"
            />
          )
        }
      >
        {zRisk.length === 0 ? (
          <p className="mk-empty">
            <T en="No company looks close to Z right now." bn="এ মুহূর্তে কোনো কোম্পানি Z-এর কাছাকাছি মনে হচ্ছে না।" />
          </p>
        ) : (
          <ShowMore
            initial={ROWS}
            rows={zRisk.map((z) => <ZRow key={z.code} item={z} means={data.z_means} />)}
            className="mk-rows"
          />
        )}
      </MkCard>
    </div>
  );
}

function CautionRow({ item }: { item: CautionItem }) {
  const month = item.days <= 20;
  return (
    <MarketRow
      code={item.code}
      name={item.name}
      sector={item.sector}
      price={item.ltp}
      tone="pos"
      meta={
        <T
          en={`+${Math.round(item.pct)}% in ${month ? "a month" : "3 months"}`}
          bn={`${month ? "এক মাসে" : "3 মাসে"} +${Math.round(item.pct)}%`}
        />
      }
      sub={
        <Locked as="span" className="mk-why">
          <span className={`mk-why-head mk-why--${item.level}`}>
            <T en={item.headline.en} bn={item.headline.bn || item.headline.en} />
          </span>
          {item.lines.map((l) => (
            <span key={l.en} className="mk-why-line">
              <T en={l.en} bn={l.bn || l.en} />
            </span>
          ))}
        </Locked>
      }
    />
  );
}

function ZRow({ item, means }: { item: ZRiskItem; means: MarketWatchOut["z_means"] }) {
  return (
    <MarketRow
      code={item.code}
      name={item.name}
      sector={item.sector}
      tone={item.level === "red" ? "neg" : "neutral"}
      meta={
        item.category && item.category !== "-" ? (
          <T en={`Now in ${item.category}`} bn={`এখন ${item.category}`} />
        ) : (
          <T en="No category" bn="ক্যাটাগরি নেই" />
        )
      }
      sub={
        <Locked as="span" className="mk-why">
          {item.reasons.map((r) => (
            <span key={r.key} className={`mk-why-line mk-why--${r.level}`}>
              <T en={r.en} bn={r.bn || r.en} />
            </span>
          ))}
          {means && (
            <span className="mk-why-line">
              <T en={means.en} bn={means.bn || means.en} />
            </span>
          )}
        </Locked>
      }
    />
  );
}
