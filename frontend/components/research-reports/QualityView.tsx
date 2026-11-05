"use client";

import { useMemo, useState } from "react";
import { PersonalCodesProvider } from "@/components/market-analysis/PersonalCodes";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { sectorBn } from "@/lib/bn";
import { croreWords, type CashLabel, type EarningsQuality, type QualityItem } from "@/lib/research-reports";
import { Bar, CompanyMeta, CompanyName, RrSection, ShowMore, useMine } from "./parts";

const SHOWN = 6;
const LABEL_CLS: Record<CashLabel, string> = {
  backed: "up",
  partly: "same",
  paper: "loss",
  none: "down",
  loss: "same",
};

type ListKey = keyof EarningsQuality["lists"];
const LISTS: { key: ListKey; title: { en: string; bn: string }; lead: { en: string; bn: string } }[] = [
  {
    key: "paper",
    title: { en: "Profit mostly on paper", bn: "মুনাফা বেশির ভাগই কাগজে" },
    lead: {
      en: "Less than half of the profit these companies showed came in as cash. Worst first.",
      bn: "এসব কোম্পানি যত মুনাফা দেখিয়েছে, তার অর্ধেকেরও কম নগদে এসেছে। সবচেয়ে খারাপটি আগে।",
    },
  },
  {
    key: "outside",
    title: { en: "Profit not from its own business", bn: "মুনাফা নিজের ব্যবসা থেকে নয়" },
    lead: {
      en: "In the latest year, most of the profit came from outside the main business, such as interest or a one-off gain.",
      bn: "সর্বশেষ বছরে মুনাফার বেশির ভাগ এসেছে মূল ব্যবসার বাইরে থেকে, যেমন সুদ বা এককালীন লাভ।",
    },
  },
  {
    key: "dividend_unfunded",
    title: { en: "Paid more dividend than it could afford", bn: "সামর্থ্যের চেয়ে বেশি ডিভিডেন্ড" },
    lead: {
      en: "Over the years, these paid more cash dividends than the business had left after spending on machines and buildings. The rest came from savings or loans.",
      bn: "এসব কোম্পানি বছরজুড়ে যত নগদ ডিভিডেন্ড দিয়েছে, যন্ত্রপাতি ও ভবনে খরচের পর ব্যবসায় তত নগদ ছিল না। বাকিটা এসেছে জমানো টাকা বা ঋণ থেকে।",
    },
  },
  {
    key: "debt_up",
    title: { en: "Growing with borrowed money", bn: "ধার করা টাকায় বাড়ছে" },
    lead: {
      en: "Loans grew much faster than sales over the years.",
      bn: "বছরজুড়ে বিক্রির চেয়ে ঋণ অনেক দ্রুত বেড়েছে।",
    },
  },
  {
    key: "best",
    title: { en: "Strong cash makers", bn: "ভালো নগদ উপার্জনকারী" },
    lead: {
      en: "Almost all of the profit came in as cash, and cash was left after investment. Biggest profit first.",
      bn: "মুনাফার প্রায় পুরোটাই নগদে এসেছে, আর বিনিয়োগের পরও নগদ বেঁচেছে। সবচেয়ে বড় মুনাফা আগে।",
    },
  },
];

/** The earnings-quality report's body (Premium). */
export default function QualityView({ data }: { data: EarningsQuality }) {
  return (
    <PersonalCodesProvider>
      <Inner data={data} />
    </PersonalCodesProvider>
  );
}

function Inner({ data }: { data: EarningsQuality }) {
  const mine = useMine();
  const { bn } = useLang();
  const byCode = useMemo(() => new Map(data.items.map((i) => [i.code, i])), [data.items]);
  const [q, setQ] = useState("");
  const graded = data.counts.backed + data.counts.partly + data.counts.paper + data.counts.none;
  const mineItems = data.items.filter((i) => mine.has(i.code));
  const query = q.trim().toLowerCase();
  const found = query.length >= 2
    ? data.items.filter((i) => i.code.toLowerCase().includes(query) || i.name.toLowerCase().includes(query)).slice(0, 6)
    : [];

  return (
    <>
      <RrSection
        id="rr-q-overall"
        title={<T en="How much profit came in as cash" bn="কতটা মুনাফা নগদে এসেছে" />}
        lead={
          <T
            en={`${graded} companies made a profit over their last ${data.years.window} years of accounts. For each, we added up the profit and the cash its business brought in.`}
            bn={`শেষ ${data.years.window} বছরের হিসাবে ${graded}টি কোম্পানি মুনাফা করেছে। প্রতিটির মুনাফা আর ব্যবসা থেকে আসা নগদ আমরা যোগ করেছি।`}
          />
        }
      >
        <div className="rr-card rr-split-card">
          <p className="rr-big">
            <T
              en={`${data.counts.backed} of ${graded}: almost all of the profit came in as cash.`}
              bn={`${graded}টির মধ্যে ${data.counts.backed}টি: মুনাফার প্রায় পুরোটাই নগদে এসেছে।`}
            />
          </p>
          <span className="rr-split" aria-hidden="true">
            {(["backed", "partly", "paper", "none"] as const).map((k) =>
              data.counts[k] > 0 ? (
                <span key={k} className={`rr-sw--${LABEL_CLS[k]}`} style={{ width: `${(data.counts[k] / graded) * 100}%` }} />
              ) : null,
            )}
          </span>
          <ul className="rr-legend rr-legend--stack">
            {(["backed", "partly", "paper", "none"] as const).map((k) => (
              <li key={k}>
                <span className={`rr-sw rr-sw--${LABEL_CLS[k]}`} aria-hidden="true" />
                <span className="min-w-0">
                  <b>
                    <T en={data.labels[k].title.en} bn={data.labels[k].title.bn} />
                  </b>{" "}
                  <T en={data.labels[k].means.en} bn={data.labels[k].means.bn} />
                </span>
                <b className="nums">{data.counts[k]}</b>
              </li>
            ))}
          </ul>
          <ul className="rr-facts">
            <li>
              <T
                en={`${data.counts.loss} more made a loss over the period, so there is no profit to check.`}
                bn={`আরও ${data.counts.loss}টি এই সময়ে লোকসানে ছিল, তাই যাচাই করার মতো মুনাফা নেই।`}
              />
            </li>
            <li>
              <T
                en={`Left out: ${data.skipped.lenders} banks, finance companies and insurers (their cash works differently), and ${data.skipped.doubtful} whose cash figures look wrong.`}
                bn={`বাদ: ${data.skipped.lenders}টি ব্যাংক, আর্থিক প্রতিষ্ঠান ও বীমা কোম্পানি (তাদের নগদের হিসাব আলাদা), আর ${data.skipped.doubtful}টি, যাদের নগদের হিসাব ভুল মনে হচ্ছে।`}
              />
            </li>
          </ul>
        </div>
      </RrSection>

      <RrSection
        id="rr-q-lookup"
        title={<T en="Check any company" bn="যেকোনো কোম্পানি দেখুন" />}
      >
        <label htmlFor="rr-q-search" className="sr-only">
          <T en="Company name or code" bn="কোম্পানির নাম বা কোড" />
        </label>
        <input
          id="rr-q-search"
          className="input-field rr-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={bn ? "কোম্পানির নাম বা কোড লিখুন" : "Type a company name or code"}
          autoComplete="off"
        />
        {found.length > 0 && (
          <ul className="rr-card rr-list">
            {found.map((i) => (
              <QualityRow key={i.code} i={i} />
            ))}
          </ul>
        )}
        {query.length >= 2 && found.length === 0 && (
          <p className="rr-fine">
            <T
              en="Not in this report. Banks, finance companies, insurers and companies with too few or doubtful cash figures are left out."
              bn="এই প্রতিবেদনে নেই। ব্যাংক, আর্থিক প্রতিষ্ঠান, বীমা কোম্পানি আর যাদের নগদের হিসাব কম বা সন্দেহজনক, তারা বাদ।"
            />
          </p>
        )}
        {mineItems.length > 0 && query.length < 2 && (
          <>
            <h3 className="rr-h3 rr-h3--sub">
              <T en="Your shares" bn="আপনার শেয়ার" />
            </h3>
            <ul className="rr-card rr-list">
              {mineItems.map((i) => (
                <QualityRow key={i.code} i={i} />
              ))}
            </ul>
          </>
        )}
      </RrSection>

      {LISTS.map((l) => (
        <FlagList key={l.key} id={`rr-q-${l.key}`} def={l} rows={data.lists[l.key].map((c) => byCode.get(c)).filter((x): x is QualityItem => !!x)} />
      ))}

      <SectorBlock data={data} />
    </>
  );
}

function FlagList({ id, def, rows }: { id: string; def: (typeof LISTS)[number]; rows: QualityItem[] }) {
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
          <QualityRow key={i.code} i={i} />
        ))}
      </ul>
      <ShowMore open={open} total={rows.length} shown={SHOWN} onToggle={() => setOpen((v) => !v)} />
    </RrSection>
  );
}

function QualityRow({ i }: { i: QualityItem }) {
  const span = i.from === i.to ? `${i.to}` : `${i.from}–${i.to}`;
  const div = croreWords(i.dividends_cr);
  const free = croreWords(Math.abs(i.free_cr));
  return (
    <li className="rr-co">
      <div className="rr-co-head">
        <CompanyName code={i.code} name={i.name} hash="#an-profit" />
        {i.cash_per_100 != null && (
          <span className={`rr-move nums ${i.label === "backed" ? "rr-up" : i.label === "paper" || i.label === "none" ? "rr-down" : ""}`}>
            ৳{i.cash_per_100}
            <small>
              <T en=" of ৳100" bn=" / ৳100" />
            </small>
          </span>
        )}
      </div>
      <CompanyMeta sector={i.sector} tier={i.tier} />
      <ul className="rr-probs">
        <li>
          <span className={`rr-dot ${i.label === "backed" ? "rr-dot--green" : i.label === "partly" ? "rr-dot--amber" : "rr-dot--red"}`} aria-hidden="true" />
          <span className="min-w-0">
            {i.cash_per_100 == null ? (
              <T en={`It made a loss over ${span} in all.`} bn={`${span} সময়ে মোটের ওপর লোকসান হয়েছে।`} />
            ) : (
              <T
                en={`Of every ৳100 of profit in ${span}, ৳${Math.max(0, i.cash_per_100)} came in as cash${i.cash_per_100 < 0 ? ": the business paid out more cash than it took in" : ""}.`}
                bn={`${span} সময়ে প্রতি ৳100 মুনাফার মধ্যে নগদে এসেছে ৳${Math.max(0, i.cash_per_100)}${i.cash_per_100 < 0 ? ": ব্যবসায় যত নগদ এসেছে, খরচ হয়েছে তার বেশি" : ""}।`}
              />
            )}
          </span>
        </li>
        {i.flags.includes("outside") && i.core_per_100 != null && (
          <li>
            <span className="rr-dot rr-dot--amber" aria-hidden="true" />
            <span className="min-w-0">
              <T
                en={`In ${i.to}, only ৳${i.core_per_100} of every ৳100 of profit came from its own business.`}
                bn={`${i.to} সালে প্রতি ৳100 মুনাফার মাত্র ৳${i.core_per_100} এসেছে নিজের ব্যবসা থেকে।`}
              />
            </span>
          </li>
        )}
        {i.flags.includes("dividend_unfunded") && (
          <li>
            <span className="rr-dot rr-dot--amber" aria-hidden="true" />
            <span className="min-w-0">
              <T
                en={`It paid ${div.en} in cash dividends, while the business ${i.free_cr >= 0 ? `had ${free.en}` : `was ${free.en} short`} after investment.`}
                bn={`নগদ ডিভিডেন্ড দিয়েছে ${div.bn}, অথচ বিনিয়োগের পর ব্যবসায় ${i.free_cr >= 0 ? `ছিল ${free.bn}` : `ঘাটতি ছিল ${free.bn}`}।`}
              />
            </span>
          </li>
        )}
        {i.flags.includes("debt_up") && i.debt_growth_pct != null && (
          <li>
            <span className="rr-dot rr-dot--amber" aria-hidden="true" />
            <span className="min-w-0">
              <T
                en={`Loans grew ${i.debt_growth_pct}% while sales grew ${i.sales_growth_pct}%.`}
                bn={`ঋণ বেড়েছে ${i.debt_growth_pct}%, আর বিক্রি বেড়েছে ${i.sales_growth_pct}%।`}
              />
            </span>
          </li>
        )}
      </ul>
    </li>
  );
}

function SectorBlock({ data }: { data: EarningsQuality }) {
  const [open, setOpen] = useState(false);
  const rows = data.sectors;
  if (rows.length === 0) return null;
  const shown = open ? rows : rows.slice(0, 10);
  const top = Math.max(100, ...rows.map((r) => r.median_cash_per_100));
  return (
    <RrSection
      id="rr-q-sectors"
      title={<T en="Sector by sector" bn="সেক্টর ধরে ধরে" />}
      lead={
        <T
          en="For the company in the middle of each sector: cash that came in for every ৳100 of profit. Best first."
          bn="প্রতিটি সেক্টরের মাঝামাঝি কোম্পানির জন্য: প্রতি ৳100 মুনাফায় কত নগদ এসেছে। সবচেয়ে ভালোটি আগে।"
        />
      }
    >
      <ul className="rr-card rr-bars rr-bars--card">
        {shown.map((r) => (
          <li key={r.sector}>
            <span className="rr-bars-top">
              <span>
                <T en={r.sector} bn={sectorBn(r.sector)} />
              </span>
              <span className="nums rr-bars-n">
                <T
                  en={`৳${r.median_cash_per_100} · ${r.backed} of ${r.n} backed`}
                  bn={`৳${r.median_cash_per_100} · ${r.n}টির মধ্যে ${r.backed}টি সমর্থিত`}
                />
              </span>
            </span>
            <Bar n={Math.max(0, r.median_cash_per_100)} of={top} tone={r.median_cash_per_100 >= 90 ? "positive" : r.median_cash_per_100 >= 50 ? "watch" : "negative"} />
          </li>
        ))}
      </ul>
      <ShowMore open={open} total={rows.length} shown={10} onToggle={() => setOpen((v) => !v)} />
    </RrSection>
  );
}

