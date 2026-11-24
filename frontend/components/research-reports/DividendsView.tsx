"use client";

import { useMemo } from "react";
import ListView from "@/components/lists/ListView";
import { PersonalCodesProvider } from "@/components/market-analysis/PersonalCodes";
import { T } from "@/components/i18n/T";
import type { DividendItem, DividendReliability } from "@/lib/research-reports";
import { SORT_NAME, SORT_PRICE, asTier, withQuote, type ListRow, type ListSort, type Quotes } from "@/lib/lists";
import { RrSection } from "./parts";

const SORTS: ListSort[] = [
  { id: "yield", label: { en: "Highest yield after tax", bn: "কর বাদে সবচেয়ে বেশি আয়" }, dir: "desc" },
  { id: "years", label: { en: "Paid most years", bn: "সবচেয়ে বেশি বছর দিয়েছে" }, dir: "desc" },
  SORT_PRICE,
  SORT_NAME,
];

type ListKey = keyof DividendReliability["lists"];
const LISTS: { key: ListKey; title: { en: string; bn: string }; lead: { en: string; bn: string } }[] = [
  {
    key: "steady",
    title: { en: "Pays every year, looks safe", bn: "প্রতি বছর দেয়, নিরাপদ মনে হচ্ছে" },
    lead: {
      en: "Cash every year for 5 years, a dividend our safety check calls steady, no cut this year, and (where we can tell) profit that came in as cash. Highest yield after tax first.",
      bn: "টানা 5 বছর নগদ, আমাদের নিরাপত্তা যাচাইয়ে স্থিতিশীল, এ বছর কমায়নি, আর (যেখানে বোঝা যায়) মুনাফা নগদে এসেছে। কর বাদে সবচেয়ে বেশি ইল্ড আগে।",
    },
  },
  {
    key: "at_risk",
    title: { en: "May pay less next time", bn: "পরের বার কম দিতে পারে" },
    lead: {
      en: "They paid cash this year, but our safety check says the next one is at risk. The reason is under each.",
      bn: "এ বছর নগদ দিয়েছে, কিন্তু আমাদের নিরাপত্তা যাচাই বলছে পরেরটি ঝুঁকিতে। কারণ প্রতিটির নিচে।",
    },
  },
  {
    key: "cut",
    title: { en: "Paid less this year", bn: "এ বছর কম দিয়েছে" },
    lead: {
      en: "Paid less cash a share than the year before. Biggest cut first.",
      bn: "আগের বছরের চেয়ে শেয়ারপ্রতি কম নগদ দিয়েছে। সবচেয়ে বেশি কমানো আগে।",
    },
  },
  {
    key: "skipped",
    title: { en: "Stopped paying this year", bn: "এ বছর দেওয়া বন্ধ করেছে" },
    lead: {
      en: "Paid a cash dividend last year, and none this year.",
      bn: "গত বছর নগদ ডিভিডেন্ড দিয়েছিল, এ বছর দেয়নি।",
    },
  },
  {
    key: "bonus_instead",
    title: { en: "Gave shares instead of cash", bn: "নগদের বদলে শেয়ার দিয়েছে" },
    lead: {
      en: "Cash a share is lower than three years ago, while it handed out bonus shares. We show what one share held from the start paid then and now, so you can see if the cash really shrank.",
      bn: "শেয়ারপ্রতি নগদ তিন বছর আগের চেয়ে কম, অথচ বোনাস শেয়ার দিয়েছে। শুরু থেকে রাখা একটি শেয়ারে তখন আর এখন কত এসেছে, দেখাচ্ছি, যাতে বোঝা যায় নগদ আসলে কমেছে কি না।",
    },
  },
  {
    key: "raised",
    title: { en: "Paid more this year", bn: "এ বছর বেশি দিয়েছে" },
    lead: {
      en: "Paid more cash a share than the year before. Biggest rise first.",
      bn: "আগের বছরের চেয়ে শেয়ারপ্রতি বেশি নগদ দিয়েছে। সবচেয়ে বেশি বাড়ানো আগে।",
    },
  },
];

/** The dividend reliability report's body (Premium): the counts as the top
 *  card, then every company in THE list view (2026-11-25: a report opens
 *  like every list; the six lists, the company search and "Your shares" are
 *  its chips and search). */
export default function DividendsView({ data, quotes }: { data: DividendReliability; quotes?: Quotes | null }) {
  return (
    <PersonalCodesProvider>
      <Inner data={data} quotes={quotes} />
    </PersonalCodesProvider>
  );
}

function Inner({ data, quotes }: { data: DividendReliability; quotes?: Quotes | null }) {
  const c = data.counts;
  const rows = useMemo<ListRow<DividendItem>[]>(() => {
    const tagsOf = new Map<string, string[]>();
    for (const l of LISTS) for (const code of data.lists[l.key]) tagsOf.set(code, [...(tagsOf.get(code) ?? []), l.key]);
    return data.items
      .map((i) =>
        withQuote<DividendItem>(
          {
            code: i.code,
            name: i.name,
            sector: i.sector,
            tier: asTier(i.tier),
            fig: i.yield_after_tax != null && i.latest_cash_pct > 0
              ? { en: `${i.yield_after_tax}%`, bn: `${i.yield_after_tax}%`, tone: i.safety?.level === "risk" ? "watch" : "positive" }
              : { en: "No cash", bn: "নগদ নেই", tone: "", words: true },
            sort: { yield: i.latest_cash_pct > 0 ? i.yield_after_tax : null, years: i.paid_years * 100 + (i.yield_after_tax ?? 0) },
            tags: tagsOf.get(i.code) ?? [],
            hash: "#dividends",
            data: i,
          },
          quotes,
        ),
      )
      .sort((a, b) => (b.sort!.yield as number ?? -1) - (a.sort!.yield as number ?? -1));
  }, [data.items, data.lists, quotes]);

  return (
    <>
      <RrSection
        id="rr-d-overall"
        title={<T en="Dividends at a glance" bn="এক নজরে ডিভিডেন্ড" />}
        lead={
          <T
            en={`${data.universe} graded companies with at least 3 years of dividend history reaching this year or last.`}
            bn={`রেটিং পাওয়া ${data.universe}টি কোম্পানি, যাদের অন্তত 3 বছরের ডিভিডেন্ড ইতিহাস এ বছর বা গত বছর পর্যন্ত আছে।`}
          />
        }
      >
        <dl className="rr-card rr-tiles">
          {[
            { v: c.paying, en: "paid cash in their latest year", bn: "সর্বশেষ বছরে নগদ দিয়েছে" },
            { v: c.every_year, en: "paid cash every year for 5 years", bn: "টানা 5 বছর নগদ দিয়েছে" },
            { v: c.steady, en: "look steady on every count", bn: "সব দিক থেকে স্থিতিশীল" },
            { v: c.at_risk, en: "pay now, but look at risk", bn: "এখন দিচ্ছে, কিন্তু ঝুঁকিতে", tone: "rr-down" },
            { v: c.cut + c.skipped, en: "cut or stopped this year", bn: "এ বছর কমিয়েছে বা বন্ধ করেছে", tone: "rr-down" },
            { v: c.raised, en: "raised this year", bn: "এ বছর বাড়িয়েছে", tone: "rr-up" },
          ].map((t) => (
            <div key={t.en} className="rr-tile">
              <dd className={`rr-tile-v nums ${t.tone ?? ""}`}>{t.v}</dd>
              <dt className="rr-tile-l">
                <T en={t.en} bn={t.bn} />
              </dt>
            </div>
          ))}
        </dl>
      </RrSection>

      <RrSection
        id="rr-d-list"
        title={<T en="Every company" bn="সব কোম্পানি" />}
        lead={
          <T
            en={`Cash a year after ${data.tax_pct}% tax on today's price, highest first. The chips pick out who looks steady, who may pay less, who cut, stopped, raised, or gave shares instead.`}
            bn={`আজকের দামে ${data.tax_pct}% কর বাদে বছরে নগদ, সবচেয়ে বেশিটি আগে। চিপগুলো আলাদা করে কারা স্থিতিশীল, কারা কম দিতে পারে, কারা কমিয়েছে, বন্ধ করেছে, বাড়িয়েছে বা নগদের বদলে শেয়ার দিয়েছে।`}
          />
        }
      >
        <ListView
          id="dividends"
          track="report-dividends"
          rows={rows}
          figHead={{ en: "A year, after tax", bn: "বছরে, কর বাদে" }}
          sorts={SORTS}
          defaultSort="yield"
          chips={LISTS.filter((l) => data.lists[l.key].length > 0).map((l) => ({ id: l.key, label: l.title }))}
          mineChip
          search
          sync
          renderLines={(r) => <DivLines i={r.data!} showOriginal={r.tags?.includes("bonus_instead")} />}
          empty={{
            title: { en: "No company here", bn: "এখানে কোনো কোম্পানি নেই" },
            message: {
              en: "Not in this report, or not with these choices: too little dividend history, or not graded.",
              bn: "এই প্রতিবেদনে নেই, বা এই বাছাইয়ে মেলেনি: ডিভিডেন্ডের ইতিহাস খুব কম, বা রেটিং নেই।",
            },
          }}
        />
      </RrSection>
    </>
  );
}

/** Five small bars, one per year, the height = that year's cash %. */
function RecordBars({ rec }: { rec: DividendItem["record"] }) {
  const top = Math.max(1, ...rec.map((r) => r.cash_pct));
  return (
    <span className="rr-rec" aria-hidden="true">
      {rec.map((r) => (
        <span key={r.year} className="rr-rec-col">
          <span className="rr-rec-bar">
            <span
              className={r.cash_pct > 0 ? "rr-rec-fill" : "rr-rec-zero"}
              style={{ height: `${r.cash_pct > 0 ? Math.max(8, (r.cash_pct / top) * 100) : 100}%` }}
            />
          </span>
          <span className="rr-rec-y">{String(r.year).slice(2)}</span>
        </span>
      ))}
    </span>
  );
}

/** A company's lines: years paid, its 5-year record, the safety check, and the bonus-share note. */
function DivLines({ i, showOriginal }: { i: DividendItem; showOriginal?: boolean }) {
  const recEn = i.record.map((r) => `${r.year}: ${r.cash_pct}%${r.stock_pct ? ` + ${r.stock_pct}% bonus` : ""}`).join(" · ");
  const recBn = i.record.map((r) => `${r.year}: ${r.cash_pct}%${r.stock_pct ? ` + ${r.stock_pct}% বোনাস` : ""}`).join(" · ");
  const [first, last] = [i.per_original[0], i.per_original[i.per_original.length - 1]];
  return (
    <span className="lv-lines">
      <span className="lv-line lv-line--muted">
        <T
          en={`Paid cash ${i.paid_years} of ${i.n_years} years`}
          bn={`${i.n_years} বছরের ${i.paid_years} বছর নগদ দিয়েছে`}
        />
      </span>
      <span className="rr-rec-row">
        <RecordBars rec={i.record} />
        <span className="rr-rec-text">
          <T en={`Cash as % of the share's face value. ${recEn}`} bn={`নগদ, শেয়ারের অভিহিত মূল্যের %। ${recBn}`} />
        </span>
      </span>
        {i.safety && (
          <span className="lv-line">
            <span
              className={`lv-dot ${i.safety.level === "safe" ? "lv-dot--green" : i.safety.level === "watch" ? "lv-dot--amber" : "lv-dot--red"}`}
              aria-hidden="true"
            />
            <span>
              <b>
                <T en={i.safety.word_en} bn={i.safety.word_bn} />.
              </b>{" "}
              <T en={i.safety.line_en} bn={i.safety.line_bn} />
            </span>
          </span>
        )}
        {showOriginal && first && last && (
          <span className="lv-line">
            <span className="lv-dot" aria-hidden="true" />
            <span>
              <T
                en={`One share held since ${first.year} paid ৳${first.tk.toFixed(2)} in cash then, and ৳${last.tk.toFixed(2)} in ${last.year} with its bonus shares.`}
                bn={`${first.year} থেকে রাখা একটি শেয়ারে তখন নগদ এসেছিল ৳${first.tk.toFixed(2)}, বোনাস শেয়ারসহ ${last.year} সালে ৳${last.tk.toFixed(2)}।`}
              />
            </span>
          </span>
        )}
        {(i.cash_label === "paper" || i.cash_label === "none") && (
          <span className="lv-line">
            <span className="lv-dot lv-dot--amber" aria-hidden="true" />
            <span>
              <T
                en="Less than half of its profit came in as cash, which makes the dividend harder to keep paying."
                bn="মুনাফার অর্ধেকেরও কম নগদে এসেছে, তাই ডিভিডেন্ড ধরে রাখা কঠিন।"
              />
            </span>
          </span>
        )}
    </span>
  );
}
