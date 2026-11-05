"use client";

import { useMemo, useState } from "react";
import { PersonalCodesProvider } from "@/components/market-analysis/PersonalCodes";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import type { DividendItem, DividendReliability } from "@/lib/research-reports";
import { CompanyMeta, CompanyName, RrSection, ShowMore, useMine } from "./parts";

const SHOWN = 6;

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

/** The dividend reliability report's body (Premium). */
export default function DividendsView({ data }: { data: DividendReliability }) {
  return (
    <PersonalCodesProvider>
      <Inner data={data} />
    </PersonalCodesProvider>
  );
}

function Inner({ data }: { data: DividendReliability }) {
  const mine = useMine();
  const { bn } = useLang();
  const byCode = useMemo(() => new Map(data.items.map((i) => [i.code, i])), [data.items]);
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const found = query.length >= 2
    ? data.items.filter((i) => i.code.toLowerCase().includes(query) || i.name.toLowerCase().includes(query)).slice(0, 6)
    : [];
  const mineItems = data.items.filter((i) => mine.has(i.code));
  const c = data.counts;

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

      <RrSection id="rr-d-lookup" title={<T en="Check any company" bn="যেকোনো কোম্পানি দেখুন" />}>
        <label htmlFor="rr-d-search" className="sr-only">
          <T en="Company name or code" bn="কোম্পানির নাম বা কোড" />
        </label>
        <input
          id="rr-d-search"
          className="input-field rr-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={bn ? "কোম্পানির নাম বা কোড লিখুন" : "Type a company name or code"}
          autoComplete="off"
        />
        {found.length > 0 && (
          <ul className="rr-card rr-list">
            {found.map((i) => (
              <DivRow key={i.code} i={i} tax={data.tax_pct} />
            ))}
          </ul>
        )}
        {query.length >= 2 && found.length === 0 && (
          <p className="rr-fine">
            <T en="Not in this report: too little dividend history, or not graded." bn="এই প্রতিবেদনে নেই: ডিভিডেন্ডের ইতিহাস খুব কম, বা রেটিং নেই।" />
          </p>
        )}
        {mineItems.length > 0 && query.length < 2 && (
          <>
            <h3 className="rr-h3 rr-h3--sub">
              <T en="Your shares" bn="আপনার শেয়ার" />
            </h3>
            <ul className="rr-card rr-list">
              {mineItems.map((i) => (
                <DivRow key={i.code} i={i} tax={data.tax_pct} />
              ))}
            </ul>
          </>
        )}
      </RrSection>

      {LISTS.map((l) => (
        <DivList
          key={l.key}
          id={`rr-d-${l.key}`}
          def={l}
          tax={data.tax_pct}
          showOriginal={l.key === "bonus_instead"}
          rows={data.lists[l.key].map((code) => byCode.get(code)).filter((x): x is DividendItem => !!x)}
        />
      ))}
    </>
  );
}

function DivList({ id, def, rows, tax, showOriginal }: {
  id: string;
  def: (typeof LISTS)[number];
  rows: DividendItem[];
  tax: number;
  showOriginal?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (rows.length === 0) return null;
  const shown = open ? rows : rows.slice(0, SHOWN);
  return (
    <RrSection
      id={id}
      title={
        <>
          <T en={def.title.en} bn={def.title.bn} /> <span className="rr-group-n nums">{rows.length}</span>
        </>
      }
      lead={<T en={def.lead.en} bn={def.lead.bn} />}
    >
      <ul className="rr-card rr-list">
        {shown.map((i) => (
          <DivRow key={i.code} i={i} tax={tax} showOriginal={showOriginal} />
        ))}
      </ul>
      <ShowMore open={open} total={rows.length} shown={SHOWN} onToggle={() => setOpen((v) => !v)} />
    </RrSection>
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

function DivRow({ i, tax, showOriginal }: { i: DividendItem; tax: number; showOriginal?: boolean }) {
  const recEn = i.record.map((r) => `${r.year}: ${r.cash_pct}%${r.stock_pct ? ` + ${r.stock_pct}% bonus` : ""}`).join(" · ");
  const recBn = i.record.map((r) => `${r.year}: ${r.cash_pct}%${r.stock_pct ? ` + ${r.stock_pct}% বোনাস` : ""}`).join(" · ");
  const [first, last] = [i.per_original[0], i.per_original[i.per_original.length - 1]];
  return (
    <li className="rr-co">
      <div className="rr-co-head">
        <CompanyName code={i.code} name={i.name} hash="#dividends" />
        {i.yield_after_tax != null && i.latest_cash_pct > 0 && (
          <span className="rr-move nums">
            {i.yield_after_tax}%
            <small>
              <T en={` a year after ${tax}% tax`} bn={` বছরে, ${tax}% কর বাদে`} />
            </small>
          </span>
        )}
      </div>
      <CompanyMeta sector={i.sector} tier={i.tier}>
        <span>
          <T
            en={`Paid cash ${i.paid_years} of ${i.n_years} years`}
            bn={`${i.n_years} বছরের ${i.paid_years} বছর নগদ দিয়েছে`}
          />
        </span>
      </CompanyMeta>
      <div className="rr-rec-row">
        <RecordBars rec={i.record} />
        <span className="rr-rec-text">
          <T en={`Cash as % of the share's face value. ${recEn}`} bn={`নগদ, শেয়ারের অভিহিত মূল্যের %। ${recBn}`} />
        </span>
      </div>
      <ul className="rr-probs">
        {i.safety && (
          <li>
            <span
              className={`rr-dot ${i.safety.level === "safe" ? "rr-dot--green" : i.safety.level === "watch" ? "rr-dot--amber" : "rr-dot--red"}`}
              aria-hidden="true"
            />
            <span className="min-w-0">
              <b>
                <T en={i.safety.word_en} bn={i.safety.word_bn} />.
              </b>{" "}
              <T en={i.safety.line_en} bn={i.safety.line_bn} />
            </span>
          </li>
        )}
        {showOriginal && first && last && (
          <li>
            <span className="rr-dot" aria-hidden="true" />
            <span className="min-w-0">
              <T
                en={`One share held since ${first.year} paid ৳${first.tk.toFixed(2)} in cash then, and ৳${last.tk.toFixed(2)} in ${last.year} with its bonus shares.`}
                bn={`${first.year} থেকে রাখা একটি শেয়ারে তখন নগদ এসেছিল ৳${first.tk.toFixed(2)}, বোনাস শেয়ারসহ ${last.year} সালে ৳${last.tk.toFixed(2)}।`}
              />
            </span>
          </li>
        )}
        {(i.cash_label === "paper" || i.cash_label === "none") && (
          <li>
            <span className="rr-dot rr-dot--amber" aria-hidden="true" />
            <span className="min-w-0">
              <T
                en="Less than half of its profit came in as cash, which makes the dividend harder to keep paying."
                bn="মুনাফার অর্ধেকেরও কম নগদে এসেছে, তাই ডিভিডেন্ড ধরে রাখা কঠিন।"
              />
            </span>
          </li>
        )}
      </ul>
    </li>
  );
}
