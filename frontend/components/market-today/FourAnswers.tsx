import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import { IconChevronDown } from "@/components/ui/icons";
import type { MarketQuestion, MarketQuestionKey, MarketSinceYesterday, MarketStats } from "@/lib/api";
import { crore, signed } from "@/lib/formatters";
import { croreBn } from "@/lib/bn";
import MkCard from "@/components/market-analysis/MkCard";

const FEELING_BN: Record<string, string> = {
  Worried: "উদ্বিগ্ন",
  Calm: "শান্ত",
  Confident: "আত্মবিশ্বাসী",
};

interface Bi {
  en: string;
  bn: string;
}

function idx(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** "৳645 crore" / "645 কোটি টাকা" for running text. */
function croreWords(mn: number): Bi {
  const cr = mn / 10;
  const n = cr >= 100 ? Math.round(cr).toLocaleString("en-US") : cr.toFixed(1);
  return { en: `৳${n} crore`, bn: `${n} কোটি টাকা` };
}

/** "15% more than a normal day" / "about the same as yesterday", in both
 *  languages. `than` is the Bengali comparison word ("গতকালের").  */
function versus(pct: number, en: string, than: string): Bi {
  if (Math.abs(pct) < 3) return { en: `about the same as ${en}`, bn: `${than} প্রায় সমান` };
  const p = Math.round(Math.abs(pct));
  return pct > 0
    ? { en: `${p}% more than ${en}`, bn: `${than} চেয়ে ${p}% বেশি` }
    : { en: `${p}% less than ${en}`, bn: `${than} চেয়ে ${p}% কম` };
}

/* ---------------- the small pictures ---------------- */

function BreadthPicture({ s }: { s: MarketStats }) {
  const total = s.up + s.neutral + s.down;
  if (!total) return null;
  const w = (n: number) => `${(n / total) * 100}%`;
  return (
    <>
      <div className="mk-split" aria-hidden="true">
        <span className="mk-split-u" style={{ width: w(s.up) }} />
        <span className="mk-split-s" style={{ width: w(s.neutral) }} />
        <span className="mk-split-d" style={{ width: w(s.down) }} />
      </div>
      <p className="mk-split-key">
        <span className="text-positive">
          <T en={`${s.up} rose`} bn={`${s.up}টি বেড়েছে`} />
        </span>
        <span>
          <T en={`${s.neutral} same`} bn={`${s.neutral}টি একই`} />
        </span>
        <span className="text-negative">
          <T en={`${s.down} fell`} bn={`${s.down}টি কমেছে`} />
        </span>
      </p>
    </>
  );
}

function ActivityPicture({ s }: { s: MarketStats }) {
  if (s.turnover_mn == null || s.turnover_avg_mn == null) return null;
  const max = Math.max(s.turnover_mn, s.turnover_avg_mn) || 1;
  const rows = [
    { k: { en: "Today", bn: "আজ" }, v: s.turnover_mn, today: true },
    { k: { en: "Normal day", bn: "স্বাভাবিক দিন" }, v: s.turnover_avg_mn, today: false },
  ];
  return (
    <div className="mk-vs" aria-hidden="true">
      {rows.map((r) => (
        <div className="mk-vs-row" key={r.k.en}>
          <span className="mk-vs-k">
            <T en={r.k.en} bn={r.k.bn} />
          </span>
          <span className={`mk-vs-bar ${r.today ? "mk-vs-bar--today" : ""}`}>
            <span style={{ width: `${(r.v / max) * 100}%` }} />
          </span>
          <span className="mk-vs-v">
            <T en={crore(r.v)} bn={croreBn(r.v)} />
          </span>
        </div>
      ))}
    </div>
  );
}

function PricePicture({ s }: { s: MarketStats }) {
  if (s.price_pos_pct == null || s.year_low == null || s.year_high == null) return null;
  const at = Math.min(100, Math.max(0, s.price_pos_pct));
  return (
    <>
      <div className="mk-range" aria-hidden="true">
        <i style={{ left: `${at}%` }} />
      </div>
      <p className="mk-range-key">
        <span>
          <T en={`Low ${idx(s.year_low)}`} bn={`সর্বনিম্ন ${idx(s.year_low)}`} />
        </span>
        <span>
          <T en={`High ${idx(s.year_high)}`} bn={`সর্বোচ্চ ${idx(s.year_high)}`} />
        </span>
      </p>
    </>
  );
}

function ValuePicture({ s }: { s: MarketStats }) {
  if (s.cheap_pct == null) return null;
  const on = Math.round(s.cheap_pct / 10);
  return (
    <div className="mk-tens" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={i < on ? "on" : undefined} />
      ))}
    </div>
  );
}

/* ---------------- the sentence under each answer ---------------- */

function breadthNote(since: MarketSinceYesterday | null | undefined): Bi | null {
  const br = since?.breadth_rank;
  if (!br || br.of < 3) return null;
  if (br.better_than >= br.of / 2) {
    return {
      en: `More shares rose today than on ${br.better_than} of the last ${br.of} trading days.`,
      bn: `গত ${br.of} লেনদেনের দিনের ${br.better_than} দিনের চেয়ে আজ বেশি শেয়ারের দাম বেড়েছে।`,
    };
  }
  const worse = br.of - br.better_than;
  return {
    en: `Fewer shares rose today than on ${worse} of the last ${br.of} trading days.`,
    bn: `গত ${br.of} লেনদেনের দিনের ${worse} দিনের চেয়ে আজ কম শেয়ারের দাম বেড়েছে।`,
  };
}

function activityNote(s: MarketStats, vsYesterdayPct: number | null | undefined): Bi | null {
  if (s.turnover_mn == null) return null;
  const amount = croreWords(s.turnover_mn);
  const parts: Bi[] = [];
  if (s.turnover_ratio != null) parts.push(versus((s.turnover_ratio - 1) * 100, "a normal day this month", "এ মাসের স্বাভাবিক দিনের"));
  if (vsYesterdayPct != null) parts.push(versus(vsYesterdayPct, "yesterday", "গতকালের"));
  if (!parts.length) return { en: `${amount.en} traded today.`, bn: `আজ ${amount.bn}র লেনদেন হয়েছে।` };
  return {
    en: `${amount.en} traded, ${parts.map((p) => p.en).join(" and ")}.`,
    bn: `আজ ${amount.bn}র লেনদেন, ${parts.map((p) => p.bn).join(" আর ")}।`,
  };
}

function priceNote(s: MarketStats): Bi | null {
  if (s.price_pos_pct == null) return null;
  const p = Math.round(s.price_pos_pct);
  return {
    en: `DSEX sits ${p}% of the way up from this year's low to its high.`,
    bn: `এ বছরের সর্বনিম্ন থেকে সর্বোচ্চের পথে ডিএসইএক্স এখন ${p}% ওপরে।`,
  };
}

function valueNote(s: MarketStats): Bi | null {
  if (s.cheap_pct == null) return null;
  const t = Math.round(s.cheap_pct / 10);
  return {
    en: `${t} in 10 shares cost less than usual for the profit they make.`,
    bn: `প্রতি 10টির ${t}টি শেয়ারের দাম মুনাফার তুলনায় স্বাভাবিকের চেয়ে কম।`,
  };
}

/* ---------------- how we decide ---------------- */

interface WhyRow {
  k: Bi;
  v: Bi;
  rule: Bi;
}

/** Every input behind the mood, with the exact cut-off that turns it into a
 *  word. The site's pitch is showing the working — this is where the page does. */
function whyRows(s: MarketStats): WhyRow[] {
  const rows: WhyRow[] = [];
  // advancing_pct = rose / (rose + fell): unchanged and untraded shares are left out.
  if (s.advancing_pct != null && s.up + s.down > 0) {
    const pct = Math.round(s.advancing_pct);
    rows.push({
      k: { en: "Shares that rose today", bn: "আজ যত শেয়ারের দাম বেড়েছে" },
      v: { en: `${s.up} rose, ${s.down} fell · ${pct}% rose`, bn: `${s.up}টি বেড়েছে, ${s.down}টি কমেছে · ${pct}% বেড়েছে` },
      rule: {
        en: "Counted over the shares whose price moved. Over 60% reads as rising and under 40% as falling. Anything in between is mixed.",
        bn: "যেসব শেয়ারের দাম বদলেছে শুধু সেগুলো ধরে হিসাব। 60%-এর বেশি হলে বাজার বাড়ছে, 40%-এর কম হলে কমছে। মাঝামাঝি হলে মিশ্র।",
      },
    });
  }
  if (s.price_pos_pct != null && s.year_low != null && s.year_high != null) {
    rows.push({
      k: { en: "Where the index sits this year", bn: "এ বছর সূচক কোথায় আছে" },
      v: { en: `${Math.round(s.price_pos_pct)}% of the way up its range`, bn: `বছরের সীমার ${Math.round(s.price_pos_pct)}% ওপরে` },
      rule: {
        en: `This year's low is ${idx(s.year_low)} and its high is ${idx(s.year_high)}. Under 25% is near the bottom, and over 75% is near the top.`,
        bn: `এ বছরের সর্বনিম্ন ${idx(s.year_low)} আর সর্বোচ্চ ${idx(s.year_high)}। 25%-এর নিচে মানে সর্বনিম্নের কাছে, 75%-এর ওপরে মানে সর্বোচ্চের কাছে।`,
      },
    });
  }
  if (s.week_change_pct != null) {
    const v = `${signed(s.week_change_pct, 1)}%`;
    rows.push({
      k: { en: "The index over the past week", bn: "গত এক সপ্তাহে সূচক" },
      v: { en: v, bn: v },
      rule: {
        en: "A move bigger than 1% either way sets the direction. A smaller move counts as flat.",
        bn: "যেকোনো দিকে 1%-এর বেশি নড়লে দিক ঠিক হয়। এর কম হলে সমান ধরা হয়।",
      },
    });
  }
  if (s.cheap_pct != null && s.cheap_total > 0) {
    rows.push({
      k: { en: "Shares cheaper than their own usual price", bn: "নিজের স্বাভাবিক দামের চেয়ে সস্তা শেয়ার" },
      v: {
        en: `${s.cheap_n} of ${s.cheap_total} · ${Math.round(s.cheap_pct)}%`,
        bn: `${s.cheap_total}টির মধ্যে ${s.cheap_n}টি · ${Math.round(s.cheap_pct)}%`,
      },
      rule: {
        en: "55% or more is cheap, and 35% or less is expensive. A share counts as cheap when the years of profit you pay for it today are fewer than its own usual of recent years.",
        bn: "55% বা তার বেশি হলে দাম কম, 35% বা তার কম হলে দাম বেশি। আজ শেয়ারটির জন্য যত বছরের মুনাফার দাম দিতে হয়, তা গত কয়েক বছরের নিজের স্বাভাবিকের চেয়ে কম হলে শেয়ারটিকে সস্তা ধরা হয়।",
      },
    });
  }
  if (s.turnover_ratio != null && s.turnover_mn != null && s.turnover_avg_mn != null) {
    const v = `${s.turnover_ratio.toFixed(2)}×`;
    rows.push({
      k: { en: "Money traded today against a normal day", bn: "স্বাভাবিক দিনের তুলনায় আজকের লেনদেন" },
      v: { en: v, bn: v },
      rule: {
        en: `${crore(s.turnover_mn)} today, against ${crore(s.turnover_avg_mn)} on an average day this month. 1.15× or more is busy, and 0.85× or less is quiet.`,
        bn: `আজ ${croreBn(s.turnover_mn)}, এ মাসের গড় দিনে ${croreBn(s.turnover_avg_mn)}। 1.15 গুণ বা বেশি হলে ব্যস্ত, 0.85 গুণ বা কম হলে শান্ত।`,
      },
    });
  }
  if (s.feeling_word && s.feeling_score != null) {
    rows.push({
      k: { en: "How investors feel", bn: "বিনিয়োগকারীরা কেমন বোধ করছেন" },
      v: {
        en: `${s.feeling_word} · ${s.feeling_score} of 100`,
        bn: `${FEELING_BN[s.feeling_word] ?? s.feeling_word} · 100-এর মধ্যে ${s.feeling_score}`,
      },
      rule: {
        en: "This mixes today's share of risers, trading against yesterday and the index move. Under 40 is worried, and over 60 is confident.",
        bn: "এতে আজ কত শেয়ারের দাম বেড়েছে, গতকালের তুলনায় লেনদেন আর সূচকের ওঠানামা মেলানো হয়। 40-এর নিচে উদ্বিগ্ন, 60-এর ওপরে আত্মবিশ্বাসী।",
      },
    });
  }
  return rows;
}

/* ---------------- the card ---------------- */

const ORDER: MarketQuestionKey[] = ["breadth", "activity", "price", "value"];

/**
 * Block 3 of the market page — today in four answers: did more shares rise or
 * fall, is trading busy or quiet, are prices high or low this year, are shares
 * cheap or expensive. Each answer has one small picture and one sentence; the
 * fold under them lists every input and the cut-off that turns it into a word.
 * The answers are the backend's (`market_state_service`), so the dashboard's
 * market card and this page never disagree.
 */
export default function FourAnswers({
  questions,
  stats,
  since,
  turnoverVsYesterdayPct,
}: {
  questions: MarketQuestion[];
  stats: MarketStats;
  since?: MarketSinceYesterday | null;
  turnoverVsYesterdayPct?: number | null;
}) {
  if (!questions.length) return null;
  const sorted = [...questions].sort((a, b) => {
    const ia = a.key ? ORDER.indexOf(a.key) : 9;
    const ib = b.key ? ORDER.indexOf(b.key) : 9;
    return ia - ib;
  });
  const why = whyRows(stats);
  const picture: Record<MarketQuestionKey, ReactNode> = {
    breadth: <BreadthPicture s={stats} />,
    activity: <ActivityPicture s={stats} />,
    price: <PricePicture s={stats} />,
    value: <ValuePicture s={stats} />,
  };
  const note: Record<MarketQuestionKey, Bi | null> = {
    breadth: breadthNote(since),
    activity: activityNote(stats, turnoverVsYesterdayPct),
    price: priceNote(stats),
    value: valueNote(stats),
  };

  return (
    <MkCard
      id="mk-answers"
      title={<T en="Today in four answers" bn="চার প্রশ্নে আজকের বাজার" />}
      note={<T en="Worked out from every share that traded." bn="লেনদেন হওয়া প্রতিটি শেয়ার ধরে হিসাব।" />}
      className="mk-answers"
    >
      <div className="mk-answer-grid">
        {sorted.map((q) => {
          const n = q.key ? note[q.key] : q.extra ? { en: q.extra, bn: q.extra_bn ?? q.extra } : null;
          return (
            <div className={`mk-answer mk-answer--${q.tone}`} key={q.key ?? q.q}>
              <p className="mk-answer-q">
                <T en={q.q} bn={q.q_bn ?? q.q} />
              </p>
              <p className="mk-answer-a">
                <T en={q.a} bn={q.a_bn ?? q.a} />
              </p>
              {q.key ? <div className="mk-answer-pic">{picture[q.key]}</div> : null}
              {n ? (
                <p className="mk-answer-x">
                  <T en={n.en} bn={n.bn} />
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {why.length > 0 && (
        <details className="mk-why">
          <summary>
            <T en="How we decide" bn="আমরা কীভাবে ঠিক করি" />
            <IconChevronDown size={16} />
          </summary>
          <p className="mk-card-note">
            <T
              en="Six plain checks, refreshed after every trading day. Here are today's numbers and the cut-offs that turn them into words."
              bn="ছয়টি সহজ যাচাই, প্রতিটি লেনদেনের দিনের পর হালনাগাদ হয়। এখানে আজকের সংখ্যা আর যে সীমা দিয়ে সেগুলো কথায় বলা হয়, তা দেওয়া আছে।"
            />
          </p>
          <ul className="mk-why-list">
            {why.map((r) => (
              <li className="mk-why-row" key={r.k.en}>
                <span className="mk-why-k">
                  <T en={r.k.en} bn={r.k.bn} />
                </span>
                <span className="mk-why-v">
                  <T en={r.v.en} bn={r.v.bn} />
                </span>
                <span className="mk-why-rule">
                  <T en={r.rule.en} bn={r.rule.bn} />
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </MkCard>
  );
}
